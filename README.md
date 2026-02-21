# Land of Leal

**Match-3 NFT puzzle game on Solana Mobile**

Land of Leal is a competitive match-3 puzzle game built for Solana Mobile. Players stake NFTs and SKR tokens, compete on deterministic seeded boards, and settle results entirely on-chain through an Anchor escrow program. The higher score wins both NFTs and the full SKR wager.

---

## Hackathon

| | |
|---|---|
| **Event** | Monolith Solana Mobile Hackathon |
| **Category** | Gaming / NFT / SKR Integration |
| **Deadline** | March 9, 2026 |
| **SKR Token** | Yes -- wager system using SKR mint `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` |

---

## Features

- **Match-3 puzzle gameplay** with 6 elemental tile types (Fire, Water, Earth, Air, Light, Dark) on a 6x6 board
- **On-chain match creation and settlement** via a custom Anchor escrow program with 4 instructions
- **NFT staking in escrow** -- both players deposit an NFT into a PDA vault during a match
- **SKR token wagering** -- configurable SKR stakes locked in escrow alongside NFTs
- **Deterministic seeded boards** -- both players generate the identical board from the same on-chain seed using Mulberry32 PRNG
- **Combo and cascade scoring** -- chain reactions multiply points at 1.5x per cascade level
- **Privy embedded wallet** -- SMS, passkey, and OAuth login with no external wallet app required
- **Helius DAS API integration** -- fetch and display player NFT collections for stake selection
- **Real-time match discovery** -- lobby polls on-chain `getProgramAccounts` to find open matches
- **Practice mode** -- quick play with a local seed for offline gameplay without staking

---

## How It Works

Land of Leal follows a five-step match lifecycle, all settled through the on-chain escrow program:

```
1. Create Match    Player A stakes an NFT + SKR tokens, generating a seeded match PDA
        |
2. Opponent Joins  Player B deposits a matching NFT + SKR stake into the same escrow
        |
3. Play            Both players independently play the same deterministic board (20 moves)
        |
4. Submit Scores   Each player submits their final score on-chain via submit_result
        |
5. Settlement      The program compares scores and transfers all escrowed assets to the winner
```

Both players receive the same board seed from the match PDA. The Mulberry32 PRNG guarantees identical board generation and cascade fills across clients. Scores are submitted on-chain, and the Anchor program handles winner determination and asset distribution in a single atomic transaction.

---

## Architecture

```
+--------------------------+       +--------------------+
|   Expo React Native App  |       |  Solana Devnet     |
|                          |       |                    |
|  Expo Router (screens)   |       |  lol_escrow        |
|  Zustand (state mgmt)    | <---> |  Anchor Program    |
|  Reanimated (animations) |       |  (PDA escrow)      |
|  Privy SDK (auth/wallet) |       |                    |
|  Helius DAS (NFT data)   |       +--------------------+
+--------------------------+
```

- **Expo React Native** with Expo Router for file-based navigation
- **Zustand** for client-side state management (game state, match state, wallet state)
- **react-native-reanimated** for 60fps tile swap and cascade animations
- **Anchor program** (`lol_escrow`) for on-chain match escrow, score submission, and settlement
- **Privy SDK** for authentication (SMS, passkey, Apple, OAuth) and embedded Solana wallet
- **Helius DAS API** for fetching NFT metadata and collection data
- **Mulberry32 PRNG** for deterministic, verifiable board generation from on-chain seeds

---

## Tech Stack

| Technology | Purpose | Version |
|---|---|---|
| Expo | React Native framework and build tooling | 54 |
| React Native | Cross-platform mobile UI | 0.81.4 |
| Expo Router | File-based navigation with typed routes | 6.0.8 |
| TypeScript | Type-safe development | 5.9.2 |
| Zustand | Lightweight state management | 5.0.11 |
| react-native-reanimated | High-performance animations | 4.1.0 |
| @privy-io/expo | Auth and embedded wallet SDK | 0.58.1 |
| @solana/web3.js | Solana RPC client | 1.98.4 |
| @solana/spl-token | SPL Token program interactions | 0.4.14 |
| @coral-xyz/borsh | Borsh serialization for Anchor | 0.32.1 |
| expo-haptics | Tactile feedback on tile interactions | 15.0.8 |
| react-native-gesture-handler | Touch gesture handling | 2.28.0 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- iOS Simulator (Xcode) or Android Emulator
- An Expo development build (Expo Go is **not** supported due to native module dependencies)

### Installation

```bash
git clone https://github.com/your-username/land-of-leal.git
cd land-of-leal
npm install
```

### Configuration

Update `app.json` with your credentials:

```json
{
  "expo": {
    "extra": {
      "privyAppId": "your_privy_app_id",
      "privyClientId": "your_privy_client_id",
      "heliusApiKey": "your_helius_api_key"
    }
  }
}
```

### Running

```bash
npx expo start --dev-client
```

> **Note:** This project requires a custom dev client build. Expo Go will not work because the app depends on native modules (expo-secure-store, react-native-passkeys, expo-haptics). Run `npx expo run:ios` or `npx expo run:android` to create a development build first.

---

## Solana Program

| | |
|---|---|
| **Program ID** | `Gxxky4YmKSaA2xN3w8h6nrfgVktB3ERNWCc8D3Qf1j6U` |
| **Network** | Devnet |
| **Framework** | Anchor |
| **SKR Mint** | `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` |

### Instructions

| Instruction | Description |
|---|---|
| `create_match` | Creator stakes NFT + SKR into a PDA escrow vault. Stores board seed, wager amount, and NFT mint. |
| `join_match` | Opponent deposits matching NFT + SKR stake. Transitions match status from Waiting to Active. |
| `submit_result` | Player submits their final score. When both scores are in, the program settles the match and distributes assets to the winner. |
| `cancel_match` | Creator can cancel a Waiting match to reclaim staked assets before an opponent joins. |

### PDA Derivation

Match accounts are derived as Program Derived Addresses:

```
seeds = ["match", creator_pubkey, match_id_bytes]
program = Gxxky4YmKSaA2xN3w8h6nrfgVktB3ERNWCc8D3Qf1j6U
```

Vault token accounts (for NFTs and SKR) are Associated Token Accounts owned by the match PDA, enabling the program to custody assets during gameplay.

---

## Project Structure

```
land-of-leal/
|-- app/                        # Expo Router screens
|   |-- _layout.tsx             # Root layout (PrivyProvider, fonts)
|   |-- index.tsx               # Auth boundary (login vs lobby)
|   |-- collection.tsx          # NFT collection viewer
|   |-- profile.tsx             # Player profile and wallet info
|   |-- match/
|       |-- create.tsx          # Match creation (NFT picker, SKR wager)
|       |-- [id].tsx            # Match lifecycle (join, play, submit, settle)
|-- components/
|   |-- game/                   # Game UI components
|   |   |-- Board.tsx           # 6x6 interactive game board
|   |   |-- Tile.tsx            # Animated tile with gesture handling
|   |   |-- TileIcon.tsx        # SVG element icons per tile type
|   |   |-- ScoreBar.tsx        # Score, moves remaining, combo display
|   |   |-- GameOverView.tsx    # End-of-game score submission prompt
|   |   |-- ResultView.tsx      # Win/loss/tie result display
|   |   |-- WaitingView.tsx     # Waiting for opponent screen
|   |   |-- NFTCard.tsx         # NFT display card
|   |   |-- NFTPicker.tsx       # NFT selection for staking
|   |   |-- SKRWagerInput.tsx   # SKR wager amount input
|   |   |-- Logo.tsx            # Animated game logo
|   |-- lobby/                  # Lobby and match discovery
|   |   |-- LobbyScreen.tsx     # Main lobby with match lists
|   |   |-- MatchCard.tsx       # Match preview card
|   |   |-- WalletBadge.tsx     # Wallet address display
|   |-- login/                  # Authentication screens
|   |-- userManagement/         # Account linking and wallet creation
|   |-- walletActions/          # Chain-specific transaction UIs
|-- lib/
|   |-- game/                   # Game engine (pure logic, no UI)
|   |   |-- engine.ts           # Board generation, matching, cascades, scoring
|   |   |-- types.ts            # Game type definitions
|   |   |-- constants.ts        # Board size, scoring rules, animation timing
|   |   |-- prng.ts             # Mulberry32 deterministic PRNG
|   |-- anchor/                 # On-chain program interaction
|   |   |-- client.ts           # Transaction builders and account deserialization
|   |   |-- pda.ts              # PDA derivation helpers
|   |-- solana/                 # Solana utilities
|   |   |-- connection.ts       # Devnet RPC connection
|   |   |-- wallet.ts           # Transaction signing and sending
|   |   |-- skr.ts              # SKR token balance queries
|   |   |-- retry.ts            # Transaction retry logic
|   |-- nft/
|   |   |-- helius.ts           # Helius DAS API for NFT fetching
|   |-- haptics.ts              # Haptic feedback utilities
|-- stores/                     # Zustand state stores
|   |-- gameStore.ts            # Game board state, score, moves
|   |-- matchStore.ts           # On-chain match state, lobby data
|   |-- walletStore.ts          # Wallet balances, NFT holdings
|   |-- statsStore.ts           # Player statistics
|-- hooks/                      # Custom React hooks
|   |-- useMatchDiscovery.ts    # Polls on-chain matches for lobby
|   |-- useWalletBalances.ts    # SOL and SKR balance tracking
|-- anchor/
|   |-- lol_escrow/             # Anchor program source
|-- constants/
|   |-- Colors.ts               # Theme and game color definitions
|-- entrypoint.js               # Polyfill loader (must run before Expo Router)
```

---

## Game Engine Details

The game engine is a pure TypeScript module with no UI dependencies, making it deterministic and testable.

- **Board**: 6x6 grid with 6 tile types
- **Moves**: 20 moves per match
- **Scoring**: 10 points per matched tile, multiplied by 1.5x for each cascade level
- **Cascades**: After a match is cleared and gravity fills gaps, new matches trigger automatically with increasing multipliers
- **Board Generation**: Seeded Mulberry32 PRNG ensures no pre-existing matches on initial board
- **Fill Determinism**: Cascade refills use `baseSeed + turnIndex * 1000 + cascadeLevel` to guarantee identical results across clients
- **Validation**: Only adjacent swaps that produce at least one match are accepted

---

## Judging Criteria Alignment

### Technical Depth
- Custom Anchor escrow program with PDA-based match accounts and vault token custody
- Deterministic game engine using seeded PRNG for verifiable fair play across clients
- Borsh serialization for direct on-chain account deserialization without IDL dependency
- Full match lifecycle managed through on-chain state transitions (Waiting, Active, Settled, Cancelled)

### Mobile Optimization
- 60fps animations via react-native-reanimated for tile swaps, cascades, and score popups
- Haptic feedback on tile selection, matches, and combos using expo-haptics
- Responsive layout designed for portrait mobile play
- Privy embedded wallet eliminates the need to switch to an external wallet app

### Creative Solana Usage
- NFTs staked as competitive collateral in PDA escrow vaults
- SKR token wagering with configurable stake amounts
- Deterministic board seeds stored on-chain enable future replay verification
- Match discovery via `getProgramAccounts` with discriminator filtering
- Cross-NFT settlement: winner receives the opponent's staked NFT directly

### Vision and Clarity
- Clear game loop: create, join, play, submit, settle
- Expandable architecture: game engine is decoupled from UI and blockchain layers
- Practice mode for onboarding without requiring tokens or NFTs
- Lobby-based matchmaking with pull-to-refresh discovery

---

## Future Roadmap

- **Tournament system** -- bracket-style competitions with prize pools
- **AI opponents** -- single-player matches against on-chain verifiable AI scores
- **Leaderboards** -- global and seasonal rankings stored on-chain
- **Saga dApp Store publishing** -- native distribution through Solana Mobile dApp Store
- **Cross-platform support** -- Android build alongside iOS
- **Replay verification** -- reconstruct and verify games from on-chain move logs
- **Additional game modes** -- timed challenges, special element boards, power-ups

---

## License

MIT
