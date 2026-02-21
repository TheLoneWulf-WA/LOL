# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Land of Leal (LOL)** — Match-3 NFT puzzle game on Solana Mobile. Built with Expo React Native on the Privy SDK starter for the Monolith Solana Mobile Hackathon (deadline: March 9, 2026).

Two players stake NFTs + SKR tokens, play the same seeded board independently, submit scores on-chain, and the higher score wins both stakes.

## Commands

- `npm start` — Start Expo dev server with dev client (`expo start --dev-client`)
- `npx expo run:android` — Build and run on Android (requires Java 17: `export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home`)
- `npx expo run:ios` — Build and run on iOS simulator
- `npx expo lint` — Run ESLint
- `npm run build:apk` — Build release APK via EAS (requires `eas-cli`)
- `npm run build:dev` — Build dev client APK via EAS
- `npx tsx lib/game/__tests__/engine.test.ts` — Run game engine tests (72 tests)

## Architecture

**Routing:** Expo Router (file-based routing in `app/`). Auth gate in `app/index.tsx` shows `LoginScreen` or `LobbyScreen` based on Privy auth state.

**Entry point flow:** `entrypoint.js` loads polyfills (`react-native-get-random-values`, `@ethersproject/shims`, `Buffer` global) in required order before Expo Router boots. This is `"main"` in package.json — polyfill order matters.

**Layout:** `app/_layout.tsx` wraps in `GestureHandlerRootView` > `PrivyProvider` > `PrivyElements` > `ErrorBoundary` > Stack navigator.

### Screen Flow
```
Auth Gate → LoginScreen (unauthenticated)
         → LobbyScreen (authenticated)
              → /match/create — Stake NFT + SKR, create on-chain match
              → /match/[id] — Full match lifecycle (waiting → playing → result)
              → /collection — Owned NFTs (2-column grid)
              → /profile — Wallet, stats, logout
```

### Directory Structure

- `app/` — Expo Router screens
- `components/game/` — Board, Tile, TileIcon, ScoreBar, GameOverView, WaitingView, ResultView, NFTCard, NFTPicker, SKRWagerInput, Logo
- `components/lobby/` — LobbyScreen, MatchCard, WalletBadge
- `components/login/` — Auth methods (SMS, passkey, OAuth)
- `lib/game/` — Pure game engine (no React deps): types, engine, constants, prng, tests
- `lib/anchor/` — Anchor client (transaction builders, PDA derivation, match discovery, IDL)
- `lib/solana/` — Connection, wallet helpers, SKR token, retry utility
- `lib/nft/` — Helius DAS API wrapper for NFT fetching
- `stores/` — Zustand stores: gameStore, matchStore, walletStore, statsStore
- `hooks/` — useWalletBalances, useMatchDiscovery
- `anchor/` — Anchor program source (Rust, separate build)
- `dapp-store/` — dApp Store metadata and asset checklist
- `constants/Colors.ts` — GameColors palette (dark theme)

### State Management (Zustand)

- `gameStore` — Board, score, movesRemaining, combo, lastScoreGain, lastMatchPositions
- `matchStore` — currentMatch, lobbyMatches, myMatches
- `walletStore` — publicKey, solBalance, skrBalance, nfts, loading flags
- `statsStore` — gamesPlayed, gamesWon, totalScore, highScore (in-memory only)

### Game Engine (`lib/game/engine.ts`)

Pure functions, no React deps. Deterministic via seeded Mulberry32 PRNG.
- `generateBoard(seed)` — Creates 6x6 board with no initial matches
- `findMatches(board)` — Finds all 3+ horizontal/vertical matches
- `processTurn(board, move, seed, turnIndex)` — Full cascade loop: swap → match → remove → gravity → fill → repeat
- `isValidSwap(board, move)` — Checks adjacency and resulting match
- `calculateScore(matches, combo)` — Points with 1.5x combo multiplier

### Blockchain

- **Network:** Solana Devnet
- **Program ID:** `Gxxky4YmKSaA2xN3w8h6nrfgVktB3ERNWCc8D3Qf1j6U`
- **SKR Mint:** `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- **Wallet:** Privy embedded Solana wallet (`useEmbeddedSolanaWallet`)
- **No `@coral-xyz/anchor` in RN** — Manual transaction construction with `@coral-xyz/borsh` + pre-computed discriminators. Full Anchor SDK has Node.js deps that break React Native.
- **Anchor instructions:** create_match, join_match, submit_result, cancel_match
- **PDA derivation:** `seeds = ["match", creator_pubkey, match_id]`
- **Match discovery:** `getProgramAccounts` with memcmp filters, polled every 10s

## Configuration

- Privy credentials in `app.json` under `expo.extra`
- Helius API key in `app.json` under `expo.extra.heliusApiKey`
- Metro config forces browser export for `jose` package
- Babel plugin: `react-native-reanimated/plugin` (must be last)
- `tsconfig.json` excludes `anchor/**` to avoid Rust test files polluting RN type checking

## Key Dependencies

- `@privy-io/expo` — Auth and embedded wallet SDK
- `@solana/web3.js` v1 — Solana client
- `@coral-xyz/borsh` — Borsh serialization for Anchor instructions
- `zustand` — State management
- `react-native-reanimated` v4 — Tile and UI animations
- `react-native-gesture-handler` — GestureHandlerRootView
- `react-native-svg` — Tile icons
- `expo-haptics` — Haptic feedback
- `expo-router` v6 — File-based routing with typed routes
- `expo-clipboard` — Copy wallet address
- `bn.js` / `bs58` — Solana encoding utilities
- `viem` — EVM client (pinned via resolutions to 2.32.0)

## Build Notes

- **Expo Go does not work** — native modules require a custom dev build
- **Android requires Java 17** — set `JAVA_HOME` to zulu-17.jdk before building
- **dApp Store requires APK** — not AAB. EAS profiles in `eas.json` are configured for APK output
- **Anchor program** built separately in `anchor/lol_escrow/` with `anchor build`. Requires Solana CLI + Anchor CLI 0.32.1. Pin blake3 to v1.5.5 if build fails on edition 2024.

## Path Aliases

`@/*` maps to the project root via tsconfig paths.
