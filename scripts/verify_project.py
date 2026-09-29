#!/usr/bin/env python3
"""Run safe, repeatable verification checks for a project.

The verifier auto-detects common Python and Node checks. A project can replace
the detected checks with a declarative .codex/verify.json file. Commands are
executed directly without a shell, paid/live checks are not auto-discovered,
and any Git worktree change caused by verification fails the run.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


EXIT_PASS = 0
EXIT_FAIL = 1
EXIT_NOT_ASSESSED = 2
MAX_CAPTURED_OUTPUT = 20_000
VALID_SCOPES = {
    "private-local-single-user",
    "private-hosted-internal",
    "public-low-risk",
    "public-multi-user",
    "sensitive-high-impact",
    "not-declared",
}


class ConfigError(ValueError):
    """Raised when a verification configuration is unsafe or malformed."""


@dataclass(frozen=True)
class Check:
    name: str
    command: str
    arguments: tuple[str, ...] = ()
    working_directory: str = "."
    timeout_seconds: int = 600
    required: bool = True
    environment: dict[str, str] = field(default_factory=dict)
    source: str = "auto"


@dataclass
class CheckResult:
    name: str
    status: str
    required: bool
    command: list[str]
    working_directory: str
    duration_seconds: float
    exit_code: int | None
    output: str
    reason: str = ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run project verification without destructive or paid/live checks."
    )
    parser.add_argument(
        "--project",
        default=str(Path.cwd()),
        help="Project directory or a path inside it. Defaults to the current directory.",
    )
    parser.add_argument(
        "--config",
        help="Optional verify.json path. Defaults to <project>/.codex/verify.json.",
    )
    parser.add_argument("--report", help="Optional path for a machine-readable JSON report.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show resolved checks without executing them. A dry run is not verification evidence.",
    )
    parser.add_argument(
        "--allow-worktree-changes",
        action="store_true",
        help="Do not fail when verification changes tracked or untracked Git state.",
    )
    return parser.parse_args()


def candidate_ancestors(path: Path) -> list[Path]:
    resolved = path.expanduser().resolve()
    current = resolved.parent if resolved.is_file() else resolved
    return [current, *current.parents]


def find_project_root(path: Path) -> Path:
    ancestors = candidate_ancestors(path)
    for candidate in ancestors:
        if (candidate / ".git").exists():
            return candidate
    for candidate in ancestors:
        if (candidate / "pyproject.toml").is_file() or (candidate / "package.json").is_file():
            return candidate
    raise ConfigError(
        f"No project root found from {path}. Expected .git, pyproject.toml, or package.json."
    )


def is_within(root: Path, candidate: Path) -> bool:
    try:
        candidate.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def safe_relative_directory(root: Path, value: str) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise ConfigError("working_directory must be non-empty text")
    path = (root / value).resolve()
    if not is_within(root, path):
        raise ConfigError("working_directory must stay within the project root")
    if not path.is_dir():
        raise ConfigError(f"working_directory does not exist: {value}")
    return path


def validate_string_list(value: Any, field_name: str) -> tuple[str, ...]:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ConfigError(f"{field_name} must be a list of strings")
    return tuple(value)


def check_from_config(raw: Any, index: int) -> Check:
    if not isinstance(raw, dict):
        raise ConfigError(f"checks[{index}] must be an object")
    allowed = {
        "name",
        "command",
        "arguments",
        "working_directory",
        "timeout_seconds",
        "required",
        "environment",
    }
    unknown = set(raw) - allowed
    if unknown:
        raise ConfigError(f"checks[{index}] contains unsupported fields: {sorted(unknown)}")

    name = raw.get("name")
    command = raw.get("command")
    if not isinstance(name, str) or not name.strip():
        raise ConfigError(f"checks[{index}].name must be non-empty text")
    if not isinstance(command, str) or not command.strip():
        raise ConfigError(f"checks[{index}].command must be non-empty text")

    arguments = validate_string_list(raw.get("arguments", []), f"checks[{index}].arguments")
    working_directory = raw.get("working_directory", ".")
    if not isinstance(working_directory, str):
        raise ConfigError(f"checks[{index}].working_directory must be text")

    timeout_seconds = raw.get("timeout_seconds", 600)
    if not isinstance(timeout_seconds, int) or not 1 <= timeout_seconds <= 3600:
        raise ConfigError(f"checks[{index}].timeout_seconds must be from 1 to 3600")

    required = raw.get("required", True)
    if not isinstance(required, bool):
        raise ConfigError(f"checks[{index}].required must be true or false")

    environment = raw.get("environment", {})
    if not isinstance(environment, dict) or any(
        not isinstance(key, str) or not isinstance(value, str)
        for key, value in environment.items()
    ):
        raise ConfigError(f"checks[{index}].environment must contain text keys and values")

    return Check(
        name=name.strip(),
        command=command.strip(),
        arguments=arguments,
        working_directory=working_directory,
        timeout_seconds=timeout_seconds,
        required=required,
        environment=environment,
        source="config",
    )


def load_config(root: Path, explicit_path: str | None) -> tuple[str, list[Check] | None, bool, Path | None]:
    config_path = Path(explicit_path).expanduser().resolve() if explicit_path else root / ".codex" / "verify.json"
    if not config_path.is_file():
        return "not-declared", None, False, None

    try:
        raw = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ConfigError(f"Could not read {config_path}: {error}") from error
    if not isinstance(raw, dict):
        raise ConfigError("verify.json must contain one JSON object")

    allowed = {"version", "scope", "checks", "secret_scan"}
    unknown = set(raw) - allowed
    if unknown:
        raise ConfigError(f"verify.json contains unsupported fields: {sorted(unknown)}")
    if raw.get("version") != 1:
        raise ConfigError("verify.json version must be 1")

    scope = raw.get("scope", "not-declared")
    if scope not in VALID_SCOPES:
        raise ConfigError(f"verify.json scope must be one of: {sorted(VALID_SCOPES)}")

    raw_checks = raw.get("checks")
    checks = None
    if raw_checks is not None:
        if not isinstance(raw_checks, list):
            raise ConfigError("verify.json checks must be a list")
        checks = [check_from_config(item, index) for index, item in enumerate(raw_checks)]

    secret_scan = raw.get("secret_scan", False)
    if not isinstance(secret_scan, bool):
        raise ConfigError("verify.json secret_scan must be true or false")

    return scope, checks, secret_scan, config_path


def python_executable(root: Path) -> str:
    candidates = [
        root / ".venv" / "Scripts" / "python.exe",
        root / ".venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def node_checks(root: Path) -> list[Check]:
    package_path = root / "package.json"
    if not package_path.is_file():
        return []
    try:
        package = json.loads(package_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ConfigError(f"Could not parse {package_path}: {error}") from error
    scripts = package.get("scripts", {})
    if not isinstance(scripts, dict):
        raise ConfigError("package.json scripts must be an object")

    npm = "npm.cmd" if os.name == "nt" else "npm"
    verify_all_script = scripts.get("verify:all")
    if isinstance(verify_all_script, str) and not any(
        marker in verify_all_script.casefold()
        for marker in ("verify_project.py", "verify-project", "verify_project")
    ):
        return [
            Check(
                name="Node project verify:all",
                command=npm,
                arguments=("run", "verify:all"),
                timeout_seconds=1200,
            )
        ]

    checks = []
    for script_name, timeout in (
        ("lint", 600),
        ("typecheck", 600),
        ("test", 1200),
        ("build", 1200),
    ):
        if script_name in scripts:
            checks.append(
                Check(
                    name=f"Node {script_name}",
                    command=npm,
                    arguments=("run", script_name),
                    timeout_seconds=timeout,
                )
            )
    verify_script = scripts.get("verify")
    if isinstance(verify_script, str) and not any(
        marker in verify_script.casefold()
        for marker in ("verify_project.py", "verify-project", "verify_project")
    ):
        checks.append(
            Check(
                name="Node verify",
                command=npm,
                arguments=("run", "verify"),
                timeout_seconds=1200,
            )
        )
    return checks


def python_checks(root: Path) -> list[Check]:
    pyproject = root / "pyproject.toml"
    if not pyproject.is_file():
        return []
    text = pyproject.read_text(encoding="utf-8").casefold()
    python = python_executable(root)
    checks = []
    if "ruff" in text:
        checks.append(
            Check(
                name="Python Ruff",
                command=python,
                arguments=("-m", "ruff", "check", "."),
                timeout_seconds=600,
            )
        )
    if "pytest" in text or (root / "tests").is_dir():
        checks.append(
            Check(
                name="Python tests",
                command=python,
                arguments=("-m", "pytest"),
                timeout_seconds=1200,
            )
        )
    return checks


def secret_scan_check() -> Check:
    scanner = Path(__file__).resolve().parent / "predeploy-secret-scan.ps1"
    powershell = shutil.which("pwsh") or shutil.which("powershell") or "powershell"
    return Check(
        name="Predeploy secret/API exposure scan",
        command=powershell,
        arguments=("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(scanner), "-Path", "."),
        timeout_seconds=600,
        source="config",
    )


def resolve_command(root: Path, command: str) -> str | None:
    command_path = Path(command)
    if command_path.is_absolute():
        return str(command_path) if command_path.is_file() else None
    if any(separator in command for separator in ("/", "\\")):
        candidate = (root / command_path).resolve()
        if not is_within(root, candidate):
            raise ConfigError(f"Configured command must stay within the project root: {command}")
        return str(candidate) if candidate.is_file() else None
    return shutil.which(command)


def trim_output(output: str) -> str:
    cleaned = output.strip()
    if len(cleaned) <= MAX_CAPTURED_OUTPUT:
        return cleaned
    omitted = len(cleaned) - MAX_CAPTURED_OUTPUT
    return (
        cleaned[:5_000]
        + f"\n\n... {omitted} output characters omitted ...\n\n"
        + cleaned[-15_000:]
    )


def run_check(root: Path, check: Check) -> CheckResult:
    executable = resolve_command(root, check.command)
    working_directory = safe_relative_directory(root, check.working_directory)
    display_command = [check.command, *check.arguments]
    if executable is None:
        return CheckResult(
            name=check.name,
            status="fail" if check.required else "not_verified",
            required=check.required,
            command=display_command,
            working_directory=str(working_directory),
            duration_seconds=0.0,
            exit_code=None,
            output="",
            reason=f"Command was not found: {check.command}",
        )

    environment = os.environ.copy()
    environment.update(check.environment)
    started = datetime.now(UTC)
    try:
        completed = subprocess.run(
            [executable, *check.arguments],
            cwd=working_directory,
            env=environment,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=check.timeout_seconds,
            shell=False,
            check=False,
        )
        duration = (datetime.now(UTC) - started).total_seconds()
        output = trim_output("\n".join(part for part in (completed.stdout, completed.stderr) if part))
        return CheckResult(
            name=check.name,
            status="pass" if completed.returncode == 0 else ("fail" if check.required else "not_verified"),
            required=check.required,
            command=display_command,
            working_directory=str(working_directory),
            duration_seconds=round(duration, 3),
            exit_code=completed.returncode,
            output=output,
            reason="" if completed.returncode == 0 else f"Command exited with {completed.returncode}",
        )
    except subprocess.TimeoutExpired as error:
        duration = (datetime.now(UTC) - started).total_seconds()
        stdout = error.stdout.decode(errors="replace") if isinstance(error.stdout, bytes) else error.stdout or ""
        stderr = error.stderr.decode(errors="replace") if isinstance(error.stderr, bytes) else error.stderr or ""
        return CheckResult(
            name=check.name,
            status="fail" if check.required else "not_verified",
            required=check.required,
            command=display_command,
            working_directory=str(working_directory),
            duration_seconds=round(duration, 3),
            exit_code=None,
            output=trim_output(f"{stdout}\n{stderr}"),
            reason=f"Timed out after {check.timeout_seconds} seconds",
        )
    except OSError as error:
        duration = (datetime.now(UTC) - started).total_seconds()
        return CheckResult(
            name=check.name,
            status="fail" if check.required else "not_verified",
            required=check.required,
            command=display_command,
            working_directory=str(working_directory),
            duration_seconds=round(duration, 3),
            exit_code=None,
            output="",
            reason=f"Could not start command: {error}",
        )


def git_state(root: Path) -> str | None:
    git = shutil.which("git")
    if git is None or not (root / ".git").exists():
        return None
    completed = subprocess.run(
        [git, "-C", str(root), "status", "--porcelain=v1", "--untracked-files=all"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
        shell=False,
        check=False,
    )
    return completed.stdout if completed.returncode == 0 else None


def write_report(path_value: str, report: dict[str, Any]) -> None:
    path = Path(path_value).expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def print_check_result(result: CheckResult) -> None:
    label = {
        "pass": "PASS",
        "fail": "FAIL",
        "not_verified": "NOT VERIFIED",
    }[result.status]
    print(f"{label:<12} {result.name} ({result.duration_seconds:.3f}s)")
    if result.reason:
        print(f"             {result.reason}")
    if result.output:
        for line in result.output.splitlines():
            print(f"             {line}")


def main() -> int:
    args = parse_args()
    try:
        root = find_project_root(Path(args.project))
        scope, configured_checks, run_secret_scan, config_path = load_config(root, args.config)
        if configured_checks is None:
            checks = [*python_checks(root), *node_checks(root)]
        else:
            checks = configured_checks
        if run_secret_scan:
            checks.append(secret_scan_check())
        for check in checks:
            safe_relative_directory(root, check.working_directory)
            resolve_command(root, check.command)
    except ConfigError as error:
        print(f"VERIFY RESULT: NOT ASSESSED\n{error}", file=sys.stderr)
        return EXIT_NOT_ASSESSED

    print(f"Project: {root}")
    print(f"Declared scope: {scope}")
    print(f"Configuration: {config_path or 'automatic detection'}")

    if not checks:
        print("VERIFY RESULT: NOT ASSESSED")
        print("No safe automatic checks were discovered. Add .codex/verify.json.")
        return EXIT_NOT_ASSESSED

    if args.dry_run:
        for check in checks:
            print(f"DRY RUN      {check.name}: {[check.command, *check.arguments]}")
        print("VERIFY RESULT: DRY RUN ONLY")
        return EXIT_PASS

    before_state = git_state(root)
    results = []
    for check in checks:
        print(f"RUN          {check.name}")
        result = run_check(root, check)
        results.append(result)
        print_check_result(result)

    after_state = git_state(root)
    if (
        not args.allow_worktree_changes
        and before_state is not None
        and after_state is not None
        and before_state != after_state
    ):
        results.append(
            CheckResult(
                name="Git worktree preservation",
                status="fail",
                required=True,
                command=["git", "status", "--porcelain=v1"],
                working_directory=str(root),
                duration_seconds=0.0,
                exit_code=1,
                output=trim_output(f"Before:\n{before_state}\nAfter:\n{after_state}"),
                reason="Verification changed the Git worktree. Generated changes were not removed automatically.",
            )
        )
        print_check_result(results[-1])

    failed = any(result.required and result.status == "fail" for result in results)
    required_count = sum(1 for result in results if result.required)
    status = "FAIL" if failed else ("NOT_ASSESSED" if required_count == 0 else "PASS")
    exit_code = EXIT_FAIL if failed else (EXIT_NOT_ASSESSED if required_count == 0 else EXIT_PASS)
    report = {
        "version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "project": str(root),
        "scope": scope,
        "configuration": str(config_path) if config_path else None,
        "status": status,
        "results": [asdict(result) for result in results],
    }
    if args.report:
        write_report(args.report, report)
        print(f"Report: {Path(args.report).expanduser().resolve()}")
    print(f"VERIFY RESULT: {status}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
