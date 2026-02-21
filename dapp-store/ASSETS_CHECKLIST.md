# dApp Store Asset Checklist

Assets required for Solana dApp Store submission (Monolith Hackathon).

## App Icon

- [ ] **icon.png** -- 512x512 PNG, no transparency
- Place in `dapp-store/assets/icon.png`
- Should feature the Land of Leal logo/gem on the dark background (#0F0B1E)
- Same icon used in `assets/images/icon.png` can be resized to 512x512 if it meets requirements

## Feature Graphic

- [ ] **feature-graphic.png** -- 1024x500 PNG
- Place in `dapp-store/assets/feature-graphic.png`
- Banner image shown at the top of the dApp Store listing
- Should show game title, a sample game board or gem artwork, and the dark fantasy theme

## Screenshots

- [ ] **screenshot-1.png** -- Phone dimensions (1080x1920 or similar 9:16 ratio)
- [ ] **screenshot-2.png** -- Phone dimensions (1080x1920 or similar 9:16 ratio)
- Place in `dapp-store/assets/screenshots/`
- Minimum 2 screenshots required
- Recommended screenshots:
  1. Game board with gems mid-match (shows core gameplay)
  2. Wallet/login screen (shows Solana integration)
  3. (Optional) Score or reward screen

## Short Description

- **Max 80 characters**
- Current: "Match-3 NFT puzzle game on Solana" (34 chars -- within limit)
- Set in `dapp-store/metadata.json` under `short_description`

## Long Description

- No strict character limit, but keep it concise
- Should cover: what the game is, how it plays, Solana integration, hackathon context
- Set in `dapp-store/metadata.json` under `long_description`

## Build Artifact

- [ ] **land-of-leal.apk** -- Signed APK (NOT AAB)
- Generated via `npm run build:apk` (uses EAS Build preview profile)
- The Solana dApp Store requires APK format specifically

## How to Generate the APK

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Log in to Expo account
eas login

# Build the APK locally
npm run build:apk

# Or build on EAS servers (faster if local build tools aren't set up)
eas build --platform android --profile preview
```

## Directory Structure (Target)

```
dapp-store/
  metadata.json
  ASSETS_CHECKLIST.md
  assets/
    icon.png              (512x512)
    feature-graphic.png   (1024x500)
    screenshots/
      screenshot-1.png    (1080x1920)
      screenshot-2.png    (1080x1920)
```
