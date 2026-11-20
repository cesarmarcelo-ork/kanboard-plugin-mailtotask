#!/usr/bin/env bash
# Build Kanboard-compatible ZIP from the plugin repository root.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
VERSION="$(grep 'function getPluginVersion' Plugin.php | cut -d "'" -f 2)"
test -n "$VERSION"
for command in zip unzip; do command -v "$command" >/dev/null || { echo "Missing: $command" >&2; exit 1; }; done
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/MailToTask" "$ROOT/dist"
cp -R Asset Controller Locale Service Template Test Plugin.php README.md LICENSE THIRD-PARTY-NOTICES.md "$TMP/MailToTask/"
(cd "$TMP" && zip -qr "$ROOT/dist/MailToTask-${VERSION}.zip" MailToTask)
unzip -tq "$ROOT/dist/MailToTask-${VERSION}.zip"
echo "Ready: $ROOT/dist/MailToTask-${VERSION}.zip"
