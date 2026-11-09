#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$HerdrHome = (Join-Path $HOME '.config\herdr-app')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modFiles = @(
    'main.js', 'mod.json', 'LICENSE', 'LICENSE.pixelherd', 'snes-logo.png',
    'sprites\duck.svg', 'sprites\frog.svg', 'sprites\cat.svg', 'sprites\penguin.svg'
)
$layoutFiles = @('snes.json', 'snes.svg')
$builtIns = @(
    'mods\menu\main.js',
    'mods\new-menu\main.js',
    'mods\workspace-chrome\settings.svg',
    'mods\tabs\win-min.svg',
    'mods\tabs\win-max.svg',
    'mods\tabs\win-restore.svg',
    'mods\tabs\win-close.svg'
)

foreach ($file in $modFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot "mods\snes\$file") -PathType Leaf)) {
        throw "The package is incomplete: mods\snes\$file is missing."
    }
}
foreach ($file in $layoutFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot "layouts\$file") -PathType Leaf)) {
        throw "The package is incomplete: layouts\$file is missing."
    }
}
foreach ($file in $builtIns) {
    if (!(Test-Path -LiteralPath (Join-Path $HerdrHome $file) -PathType Leaf)) {
        throw "Missing Herdr file: $file. Install and start Herdr 0.1.14 or newer before running this installer."
    }
}
$modTarget = Join-Path $HerdrHome 'mods\snes'
$existing = @(foreach ($relative in @('mods\snes', 'layouts\snes.json', 'layouts\snes.svg')) {
    if (Test-Path -LiteralPath (Join-Path $HerdrHome $relative)) { $relative }
})
if ($existing.Count) {
    $manifestPath = Join-Path $modTarget 'mod.json'
    if (!(Test-Path -LiteralPath $modTarget -PathType Container) -or
        !(Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw 'Refusing to overwrite an unrecognized SNES installation. Back up or rename the conflicting files first.'
    }
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json -AsHashtable
    if ($manifest -isnot [System.Collections.IDictionary] -or $manifest['title'] -ne 'Super Herdr') {
        throw 'Refusing to overwrite an unrelated SNES mod. Its mod.json title must be Super Herdr for automatic updates.'
    }
}
$targets = @($modFiles | ForEach-Object { "mods\snes\$_" }) +
    @($layoutFiles | ForEach-Object { "layouts\$_" })
foreach ($relative in $targets) {
    $target = Join-Path $HerdrHome $relative
    if ((Test-Path -LiteralPath $target) -and !(Test-Path -LiteralPath $target -PathType Leaf)) {
        throw "Refusing to replace a non-file destination: $relative."
    }
}

$herdr = Get-Command herdr-app -ErrorAction Stop
if (!$PSCmdlet.ShouldProcess($HerdrHome, 'Install or update the Super Herdr layout (snes)')) {
    return
}

$null = New-Item -ItemType Directory -Path (Join-Path $modTarget 'sprites') -Force
foreach ($file in $modFiles) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "mods\snes\$file") -Destination (Join-Path $modTarget $file) -Force
}
foreach ($file in $layoutFiles) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "layouts\$file") -Destination (Join-Path $HerdrHome "layouts\$file") -Force
}

$check = & $herdr check $modTarget 2>&1 | Out-String
Write-Host $check.Trim()
if ($check -notmatch '(?m)^check passed:') {
    throw "SNES files were copied, but Herdr validation failed. Nothing was activated. Resolve the reported error before switching layouts."
}

Write-Host "Installed or updated Super Herdr in $HerdrHome. Existing settings and the selected layout were not changed."
Write-Host 'Activate it with: herdr-app do layout.switch --name snes'
