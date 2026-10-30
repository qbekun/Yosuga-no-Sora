param([string]$Godot = "$PSScriptRoot/tools/Godot_v4.6.1-stable_win64_console.exe")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force "$PSScriptRoot/publish" | Out-Null
& $Godot --headless --editor --path "$PSScriptRoot/project" --import --quit
if ($LASTEXITCODE -ne 0) { throw 'Project import failed' }
& $Godot --headless --path "$PSScriptRoot/project" --export-release Web
if ($LASTEXITCODE -ne 0) { throw 'Web export failed' }
python "$PSScriptRoot/version_web.py"
if ($LASTEXITCODE -ne 0) { throw 'Web asset versioning failed' }
Copy-Item "$PSScriptRoot/index.html","$PSScriptRoot/config.js","$PSScriptRoot/asset-bridge.js","$PSScriptRoot/launcher.js","$PSScriptRoot/sky.png","$PSScriptRoot/app.webmanifest" "$PSScriptRoot/publish/"
Set-Content -LiteralPath "$PSScriptRoot/publish/.nojekyll" -Value ''
