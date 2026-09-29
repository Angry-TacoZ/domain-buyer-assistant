param(
  [Parameter(Mandatory = $false)]
  [string]$Path = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$resolved = Resolve-Path -LiteralPath $Path
$root = $resolved.Path

$blockedDirs = @(
  "\node_modules\",
  "\.git\",
  "\.npm-cache\",
  "\.firebase\",
  "\coverage\"
)

$patterns = @(
  "AIza[0-9A-Za-z_-]{20,}",
  "generativelanguage\.googleapis\.com",
  "x-goog-api-key",
  "Authorization['""]?\s*:\s*['""]Bearer\s+[A-Za-z0-9._~+/=-]{20,}",
  "sk-[A-Za-z0-9]{20,}",
  "sk-ant-[A-Za-z0-9_-]{20,}",
  "-----BEGIN PRIVATE KEY-----",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "VITE_GEMINI_KEY\s*=\s*[^`r`n#]+",
  "VITE_OPENAI_API_KEY\s*=\s*[^`r`n#]+",
  "VITE_ANTHROPIC_API_KEY\s*=\s*[^`r`n#]+"
)

$textExtensions = @(
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".html", ".css", ".json", ".env", ".md", ".txt",
  ".yml", ".yaml", ".toml", ".xml"
)

$files = Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    # Normalize separators so dependency exclusions also work on Linux CI.
    $full = $_.FullName.Replace([char]47, [char]92)
    foreach ($dir in $blockedDirs) {
      if ($full.Contains($dir)) {
        return $false
      }
    }
    if ($_.Length -gt 5242880) {
      return $false
    }
    if ($textExtensions -notcontains $_.Extension.ToLowerInvariant()) {
      return $false
    }
    return $true
  }

$findings = @()

foreach ($file in $files) {
  $relative = $file.FullName
  if ($relative.StartsWith($root)) {
    $relative = $relative.Substring($root.Length).TrimStart("\", "/")
  }
  foreach ($pattern in $patterns) {
    $matches = Select-String -LiteralPath $file.FullName -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue
    foreach ($match in $matches) {
      $findings += [PSCustomObject]@{
        File = $relative
        Line = $match.LineNumber
        Pattern = $pattern
        Text = $match.Line.Trim()
      }
    }
  }
}

if ($findings.Count -gt 0) {
  Write-Host "Predeploy secret/API exposure scan failed for $root" -ForegroundColor Red
  $findings | Format-Table -AutoSize
  exit 1
}

Write-Host "Predeploy secret/API exposure scan passed for $root" -ForegroundColor Green
