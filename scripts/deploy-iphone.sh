#!/bin/bash
#
# Build KilaniExpense as a standalone Release app (JS bundle embedded, no Metro,
# no dev menu, no "Refreshing" banner — behaves like an App Store install) and
# install it on a connected iPhone.
#
# This is also the WEEKLY RE-SIGN command: a free Apple account signs the app for
# only ~7 days, after which it stops opening. Just plug in the phone and re-run
# this to refresh the signature.
#
# Usage:
#   scripts/deploy-iphone.sh [device-udid]
# If no udid is given, the first connected physical iPhone is used.
#
# Requirements: phone plugged in + unlocked + trusted, Developer Mode enabled,
# and ios/../.env.local present with EXPO_PUBLIC_DATABASE_URL (baked into the bundle).

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# --- Preconditions -----------------------------------------------------------
if [[ ! -f .env.local ]]; then
  echo "error: .env.local not found. It must contain EXPO_PUBLIC_DATABASE_URL so the" >&2
  echo "       Neon connection string gets embedded in the release bundle." >&2
  exit 1
fi

# Resolve the target device.
DEVICE_ID="${1:-}"
if [[ -z "$DEVICE_ID" ]]; then
  DEVICE_ID="$(xcrun xctrace list devices 2>/dev/null \
    | awk '/^== Devices ==/{d=1;next} /^== /{d=0} d && /\([0-9A-F]{8}-[0-9A-F]{16}\)/{print}' \
    | grep -iv 'mac' | head -1 | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' | head -1 || true)"
fi
if [[ -z "$DEVICE_ID" ]]; then
  echo "error: no connected iPhone found. Plug it in, unlock it, and trust this Mac." >&2
  exit 1
fi
echo "Target device: $DEVICE_ID"

# Warn on low disk — a Release build needs a couple of GB and this repo's disk runs full.
FREE_MB="$(df -m /System/Volumes/Data | tail -1 | awk '{print $4}')"
echo "Free disk: ${FREE_MB} MB"
if [[ "$FREE_MB" -lt 3000 ]]; then
  echo "warning: low disk. Clearing this project's DerivedData to make room..."
  rm -rf ~/Library/Developer/Xcode/DerivedData/KilaniExpense-* || true
fi

# --- Build (Release, embedded bundle) ---------------------------------------
# No -derivedDataPath: keep build output OUT of the iCloud-synced repo, or codesign
# fails with a "resource fork / Finder information" detritus error.
echo "Building Release (this compiles native arm64 and embeds the JS bundle)…"
xcodebuild \
  -workspace ios/KilaniExpense.xcworkspace \
  -scheme KilaniExpense \
  -configuration Release \
  -destination "id=${DEVICE_ID}" \
  -allowProvisioningUpdates \
  build

# --- Install -----------------------------------------------------------------
APP_PATH="$(ls -dt ~/Library/Developer/Xcode/DerivedData/KilaniExpense-*/Build/Products/Release-iphoneos/KilaniExpense.app 2>/dev/null | head -1)"
if [[ -z "$APP_PATH" ]]; then
  echo "error: build succeeded but KilaniExpense.app was not found in DerivedData." >&2
  exit 1
fi
echo "Installing $APP_PATH …"
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

echo ""
echo "Done. Open KilaniExpense on your phone."
echo "First launch after a fresh signature: if iOS blocks it, go to"
echo "Settings → General → VPN & Device Management → trust your developer profile."
echo "This build is standalone — Metro does NOT need to be running."
