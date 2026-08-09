# Install repo git hooks (strips Cursor Co-authored-by trailers on every commit).
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "githooks\commit-msg"
$destDir = Join-Path $root ".git\hooks"
$dest = Join-Path $destDir "commit-msg"
if (-not (Test-Path $src)) { Write-Error "Missing githooks/commit-msg"; exit 1 }
Copy-Item -Force $src $dest
Write-Host "Installed commit-msg hook -> $dest"
