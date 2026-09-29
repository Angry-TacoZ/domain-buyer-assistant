# Domain Buyer Assistant

A simulated buyer-research workspace for demonstrating a future human-reviewed domain sales workflow. Real domain examples; fictional businesses and research evidence. No crawling, model calls, messages, payments, or domain transfers.

## Intended scope

Public low-risk portfolio demonstration. Not an operating sales service. Browser state is temporary; export a review packet to retain work. Do not enter confidential customer information.

## Build brief

Choose a domain, run fixture research, inspect evidence and exclusions, shortlist candidates, prepare editable outreach drafts, and export the review packet. Include empty and provider-failure scenarios. Preserve reusable provider contracts and deterministic policy modules for a future authenticated backend.

## Acceptance criteria

- Simulation and fictional evidence are visible throughout the workflow.
- Unsupported, wrong-market, duplicate, and previously contacted candidates cannot silently enter the eligible shortlist.
- Drafts have no invented performance, traffic, SEO, or sales claims.
- Desktop, mobile, keyboard, and failure/retry paths work.
- No paid APIs or secrets; deterministic tests and same-case evaluations run in CI.
- GitHub Pages builds use the repository subpath; release follows review and merge.

## Design decisions

React + TypeScript + Vite; a calm ink-and-paper research workspace with one teal accent. Workflow first, evidence alongside decisions, and restrained panel/research-progress transitions. A fixture provider implements an asynchronous research interface; future providers replace data acquisition without rewriting review UI. No premature backend or outbound messaging integration.

## Run and verify

Use Node 24. `npm ci`, `npx playwright install chromium`, then `npm run dev`. Open the Vite URL under `/domain-buyer-assistant/`. Fonts are bundled locally; no external API credentials or network research are required.

`npm run verify` runs lint, deterministic unit tests, the fixed eligibility evaluation, typecheck/build, and browser smoke checks. `npm audit --audit-level=high` checks dependencies. On the original workspace, run the canonical `scripts/verify-project.cmd --project <project-root>`; CI runs its included copy, `python scripts/verify_project.py --project .`, against `.codex/verify.json` on Ubuntu and Windows. Install Chromium with `--with-deps` on clean Linux machines. No paid APIs or production mutations run in verification.

Browser checks cover mouse/desktop, touch/mobile, keyboard-only shortlisting/drafting/export, excluded candidates, empty research, provider failure/recovery, domain switching, overflow, console errors, and automated WCAG A/AA rules on the evidence screen. Screenshots and smoke results are in `output/playwright/`. Automated accessibility checks do not replace a full manual accessibility audit.

Reviewed visual snapshots are kept in `docs/screenshots/`. Test outputs are ignored so routine verification does not modify committed evidence. Set `PYTHONIOENCODING=utf-8` before running the canonical verifier from a Windows terminal that defaults to a legacy encoding.

## Research and simulation boundary

All six businesses per domain, sources, and contact-history flags are fictional. Prices are illustrative snapshots, not current offers. Research uses a cancellable fixture provider; draft text is a deterministic template, not model output. No contacts, outreach responses, demand estimates, or conversion claims are invented. Changes live in memory only; refresh clears the session. Exported JSON contains example evidence, assessment reasons, edited or default drafts, explicit simulation mode, and unsent status. Treat edited drafts as unverified user text.

See [evaluation methodology and results](evals/README.md) and [the real-app implementation path](docs/real-app-path.md). The provider/result contract and review UI are reusable; live acquisition, verified citations, authoritative contact history, auth, persistence, and cost controls are not implemented.

## Release and recovery

The Pages build targets `/domain-buyer-assistant/`. Enable GitHub Pages with GitHub Actions after PR review. Verification runs on PRs and main pushes; Pages runs only after successful main-push verification and checks out the exact verified commit. Draft PR branches do not deploy. GitHub Pages is for the demonstration, not operating commercial SaaS or sales transactions.

For rollback, revert the reviewed main change through a PR, verify, merge, and let Pages publish the reverted state. Export any session you want to keep; there is no server database or durable browser persistence to recover. Source snapshots and evaluation reports are committed. No secrets are required.

## Known limits

Eligibility checks fixture metadata and evidence presence, not the truth of arbitrary web text. URL-only duplicate detection is illustrative, not robust business entity resolution. No real prospect discovery, AI ranking, email sending, shared accounts, persistent CRM, sales tracking, or live provider is implemented. Production readiness for a real operating service has not been assessed.
