---
name: deploy-to-iphone
description: Use when asked to run KilaniExpense on the iOS simulator, or to build/install/re-sign a standalone Release build on Ibrahim's physical iPhone via the free personal Apple developer account — including "run on my phone", "deploy to iPhone", "the app won't open" (expired 7-day signature), or "untrusted developer" errors.
---

# Deploy KilaniExpense to iPhone

## Overview

KilaniExpense installs on Ibrahim's physical iPhone via **free personal
Apple ID signing**, not TestFlight or the App Store. Free signatures expire
every ~7 days, so "deploy" and "re-sign" are the same command —
`scripts/deploy-iphone.sh` does both.

## Quick reference

| Goal | Command |
|---|---|
| Run in the iOS **simulator** (dev build, Metro-connected) | `npm run ios` (or `npx expo run:ios --device <sim-udid>`) |
| Build + install a **standalone Release** on the physical iPhone (first install or weekly re-sign) | `scripts/deploy-iphone.sh [device-udid]` |
| List connected/available devices | `xcrun xctrace list devices` |
| List simulators | `xcrun simctl list devices available` |

## Simulator vs physical device — key differences

- **Simulator**: a Debug build that loads JS from Metro, shows the dev
  "Refreshing…" banner and dev menu. Needs `npx expo start`/Metro running.
  Good for fast iteration; not representative of the real install.
- **Physical iPhone (`scripts/deploy-iphone.sh`)**: builds **Release**
  configuration, which embeds `main.jsbundle` at build time (see
  `AppDelegate.swift`'s non-DEBUG branch) — no Metro, no dev banner, behaves
  like an App Store install. `EXPO_PUBLIC_DATABASE_URL` from `.env.local` is
  baked into the bundle at build time, so it reaches Neon with no dev server
  running.
- The **simulator app's bundle id may lag behind** `app.json` if its native
  shell was built before a bundle-id change — rebuild with `npx expo
  run:ios` (not just `expo start`) after any `app.json`/`ios/` native config
  change to pick up the new id.

## Deploying to the physical iPhone

```bash
scripts/deploy-iphone.sh          # auto-detects the connected iPhone
scripts/deploy-iphone.sh <udid>   # or target a specific device
```

Preconditions (the script checks/handles most of these, but if it fails, check):
- iPhone plugged in, unlocked, and this Mac trusted on it.
- `.env.local` exists at repo root with `EXPO_PUBLIC_DATABASE_URL` — required, the script hard-fails without it since that's what gets embedded in the Release bundle.
- Xcode signing is already configured for free personal signing: `bundleIdentifier` in `app.json` (currently `com.ibrahimkilani.kilaniexpense` — must NOT be Expo's default `com.anonymous.*`, which is already registered by someone else and breaks free signing), `appleTeamId` in `app.json`, and `DEVELOPMENT_TEAM`/`CODE_SIGN_STYLE = Automatic` in both Debug and Release configs of the Xcode project.

The script itself:
1. Resolves the target device UDID (via `xcrun xctrace list devices`, first non-Mac entry if none given).
2. Warns/clears `~/Library/Developer/Xcode/DerivedData/KilaniExpense-*` if free disk < 3 GB.
3. Runs `xcodebuild ... -configuration Release -destination "id=$DEVICE_ID" -allowProvisioningUpdates build` — **no `-derivedDataPath`**, so build output stays out of the iCloud-synced repo (in-repo builds hit a codesign "resource fork" error under iCloud Drive sync).
4. Finds the built `.app` in DerivedData and installs it via `xcrun devicectl device install app`.

## Common mistakes / gotchas

| Symptom | Fix |
|---|---|
| App won't open, was working before | Free signature expired (~weekly). Just re-run `scripts/deploy-iphone.sh`. |
| "Developer Mode disabled" on first device build | Settings → Privacy & Security → Developer Mode (only appears as an option after a build first targets the device) — enable, reboot if prompted, re-run. |
| "Untrusted developer" on first launch | Settings → General → VPN & Device Management → trust the developer profile. |
| `xcodebuild: error: ... Device is busy (Preparing …)` | Transient — phone is copying developer-support files. Wait until `xcrun devicectl list devices` shows "available", then re-run. |
| Build fails with a codesign "resource fork / Finder information" error | Build output landed inside the iCloud-synced repo path. Don't add `-derivedDataPath` pointing into the repo; let it use the default (out-of-repo) DerivedData location. See [[icloud-desktop-breaks-xcode-builds]] memory. |
| Low disk warnings / build failures from disk space | `rm -rf ~/Library/Developer/Xcode/DerivedData/KilaniExpense-*` is safe and frees several GB; the script does this automatically under 3 GB free. |

## Not this skill

- Building for the App Store / TestFlight (this project isn't set up for that — no distribution certificate, no App Store Connect record).
- Android — see `npm run android` / `expo run:android` separately, unrelated signing setup.
