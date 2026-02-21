# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo React Native app built on the Privy SDK starter. Provides multi-chain wallet management (Ethereum, Solana, Bitcoin) with authentication via Privy (SMS, passkeys, OAuth, Apple Sign-In).

## Commands

- `npm start` — Start Expo dev server with dev client (`expo start --dev-client`)
- `expo run:ios` / `expo run:android` — Build and run on device/simulator
- `expo lint` — Run ESLint

No test framework is configured.

## Architecture

**Routing:** Expo Router (file-based routing in `app/`). Single-screen app with `app/index.tsx` as the entry point.

**Entry point flow:** `entrypoint.js` loads polyfills (`react-native-get-random-values`, `@ethersproject/shims`, `Buffer` global) in a required order before Expo Router boots. This file is the `"main"` in package.json — polyfill order matters.

**Auth boundary:** `app/_layout.tsx` wraps the app in `<PrivyProvider>` + `<PrivyElements>`. The index screen conditionally renders `<LoginScreen>` or `<UserScreen>` based on Privy's `usePrivy().user` state.

**Component organization:**
- `components/login/` — Login methods (SMS, passkey, OAuth, Privy UI modal)
- `components/userManagement/` — Post-auth account linking/unlinking and wallet creation
- `components/walletActions/` — Chain-specific transaction UIs (EVM, Solana)

**Path aliases:** `@/*` maps to the project root via tsconfig paths.

## Configuration

Privy credentials and passkey domains are configured in `app.json` under `expo.extra`. The Metro config in `metro.config.js` includes a custom resolver to force the browser export for the `jose` package.

## Key Dependencies

- `@privy-io/expo` — Auth and embedded wallet SDK
- `@solana/web3.js` v1 — Solana client
- `viem` — EVM client (pinned via resolutions to 2.32.0)
- `expo-router` v6 with typed routes enabled
