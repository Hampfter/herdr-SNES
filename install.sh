#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'HELP'
Usage: bash install.sh [--herdr-home PATH] [--dry-run]

Install or update Super Herdr without changing settings or the selected layout.

  --herdr-home PATH  Herdr configuration folder (default: ~/.config/herdr-app)
  --dry-run          Check prerequisites and conflicts without changing files
  -h, --help         Show this help

Requires Bash, Python 3, and herdr-app. Start Herdr at least once first.
Bundled theme files, including local edits, are replaced during updates.
HELP
}

die() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

herdr_home="${HOME:?HOME must be set}/.config/herdr-app"
dry_run=false
while (($#)); do
    case "$1" in
        --herdr-home)
            (($# >= 2)) && [[ -n "$2" ]] || die '--herdr-home requires a path.'
            herdr_home="$2"
            shift 2
            ;;
        --dry-run)
            dry_run=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1. Use --help for usage."
            ;;
    esac
done

command -v python3 >/dev/null || die 'Python 3 is required for safe installation checks.'
command -v herdr-app >/dev/null || die 'herdr-app must be available in PATH.'
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
[[ -d "$herdr_home" ]] || die "Herdr configuration folder not found: $herdr_home. Install and start Herdr first."
herdr_home="$(cd -- "$herdr_home" && pwd -P)"

mod_files=(
    main.js mod.json LICENSE LICENSE.pixelherd snes-logo.png
    sprites/duck.svg sprites/frog.svg sprites/cat.svg sprites/penguin.svg
)
layout_files=(snes.json snes.svg)
built_ins=(
    mods/menu/main.js
    mods/new-menu/main.js
    mods/workspace-chrome/settings.svg
    mods/tabs/win-min.svg
    mods/tabs/win-max.svg
    mods/tabs/win-restore.svg
    mods/tabs/win-close.svg
)
files=()
for file in "${mod_files[@]}"; do
    files+=("mods/snes/$file")
done
for file in "${layout_files[@]}"; do
    files+=("layouts/$file")
done
for file in "${files[@]}"; do
    [[ -f "$script_dir/$file" ]] || die "The package is incomplete: $file is missing."
done
for file in "${built_ins[@]}"; do
    [[ -f "$herdr_home/$file" ]] || die "Missing Herdr file: $file. Install and start Herdr 0.1.14 or newer first."
done
for directory in mods layouts mods/snes mods/snes/sprites; do
    target="$herdr_home/$directory"
    [[ ! -L "$target" ]] || die "Refusing to install through a symbolic-link directory: $directory."
    [[ ! -e "$target" || -d "$target" ]] || die "Refusing to replace a non-directory destination: $directory."
done

mod_target="$herdr_home/mods/snes"
if [[ -e "$mod_target" || -e "$herdr_home/layouts/snes.json" || -e "$herdr_home/layouts/snes.svg" ]]; then
    [[ -d "$mod_target" && -f "$mod_target/mod.json" && ! -L "$mod_target/mod.json" ]] ||
        die 'Refusing to overwrite an unrecognized SNES installation. Back up or rename the conflicting files first.'
    python3 - "$mod_target/mod.json" <<'PYTHON'
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8-sig") as source:
        manifest = json.load(source)
except (OSError, UnicodeError, json.JSONDecodeError) as error:
    sys.exit(f"Unable to read the existing SNES manifest: {error}")
if not isinstance(manifest, dict) or manifest.get("title") != "Super Herdr":
    sys.exit("Refusing to overwrite an unrelated SNES mod. Its mod.json title must be Super Herdr for automatic updates.")
PYTHON
fi
for file in "${files[@]}"; do
    target="$herdr_home/$file"
    [[ ! -L "$target" ]] || die "Refusing to replace a symbolic-link destination: $file."
    [[ ! -e "$target" || -f "$target" ]] || die "Refusing to replace a non-file destination: $file."
done

if "$dry_run"; then
    printf 'Would install or update Super Herdr in %s:\n' "$herdr_home"
    printf '  %s\n' "${files[@]}"
    exit 0
fi

mkdir -p -- "$mod_target/sprites" "$herdr_home/layouts"
for file in "${files[@]}"; do
    cp -f -- "$script_dir/$file" "$herdr_home/$file"
done

check_status=0
check="$(HERDR_APP_HOME="$herdr_home" herdr-app check "$mod_target" 2>&1)" || check_status=$?
printf '%s\n' "$check"
if ((check_status != 0)) || ! grep -q '^check passed:' <<<"$check"; then
    die 'SNES files were copied, but Herdr validation failed. Nothing was activated. Resolve the reported error before switching layouts.'
fi

printf 'Installed or updated Super Herdr in %s. Existing settings and the selected layout were not changed.\n' "$herdr_home"
printf 'Activate it with: HERDR_APP_HOME=%q herdr-app do layout.switch --name snes\n' "$herdr_home"
