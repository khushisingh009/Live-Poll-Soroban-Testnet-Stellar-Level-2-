# Live Poll ✦ Stellar Soroban Smart Polling Portal

**Live Poll** is a premium, real-time decentralized polling application built on the **Stellar Soroban Smart Contract Platform**. It provides a sleek, glassmorphic dark-theme interface that connects multiple browser extension wallets, tracks contract state through transaction simulation, and streams ledger event logs in real-time.

---

## 🚀 Verifiable Testnet Deployment

The smart contract is compiled, deployed, initialized, and seeded on the **Stellar Testnet**:

*   **Live Portal Link:** [https://live-poll-soroban-testnet-stellar-l.vercel.app/](https://live-poll-soroban-testnet-stellar-l.vercel.app/)
*   **Smart Contract Address:** `CAA6JWF24DJ2PELRBIIC5FN2UBZ37CYVSOVUEJBBDGSSCBUROC7EA5IK`
    *   *Verify on Stellar.expert:* [Stellar Explorer Contract Link](https://stellar.expert/explorer/testnet/contract/CAA6JWF24DJ2PELRBIIC5FN2UBZ37CYVSOVUEJBBDGSSCBUROC7EA5IK)
*   **WASM Upload Transaction Hash:** `3b926f4266743d7bfd7f8e24abdd81f2c206faf5f29f64d871cf32739961a676`
    *   *Verify on Stellar.expert:* [WASM Upload Tx Details](https://stellar.expert/explorer/testnet/tx/3b926f4266743d7bfd7f8e24abdd81f2c206faf5f29f64d871cf32739961a676)
*   **Contract Instantiation Transaction Hash:** `cb2928bb059de7de476efe2e0d8ef50653ea9c75be7ff2de5559c44085fc2494`
    *   *Verify on Stellar.expert:* [Instantiation Tx Details](https://stellar.expert/explorer/testnet/tx/cb2928bb059de7de476efe2e0d8ef50653ea9c75be7ff2de5559c44085fc2494)
*   **Contract Initialization (`initialize`) Transaction Hash:** `f15bf0cc6fad656d1f6af58524ce58d5411b3d9b1750a97baba6e33b112c4059`
    *   *Verify on Stellar.expert:* [Initialization Tx Details](https://stellar.expert/explorer/testnet/tx/f15bf0cc6fad656d1f6af58524ce58d5411b3d9b1750a97baba6e33b112c4059)

### Default Initialized State
The contract is deployed with the default question and options:
*   **Question:** "Which Stellar wallet do you use most?"
*   **Options:** Freighter, Albedo, xBull, Lobstr

---

## 🛡️ Core Features & Level 2 Requirements Met

### 1. Multi-Wallet Integration
*   **Stellar Wallets Kit:** Implements `allowAllModules()` supporting Freighter, Albedo, xBull, Lobstr, Hana, Rabet, WalletConnect, and Ledger.

### 2. Comprehensive Error Handling (3+ types handled)
*   **Wallet Not Found:** Detects when no compatible extension/app is available.
*   **User Rejected:** Handles scenarios where the wallet's confirm/sign dialog is declined.
*   **Insufficient Balance:** Detects underfunded accounts for transaction fees.
*   **Contract Level Rejection:** Prevents duplicate voting via smart contract persistent storage `HasVoted(Address)`.

### 3. Real-Time Interactions
*   **Event Polling:** UI polls Soroban RPC `getEvents` for the contract's `voted` topic, re-syncing vote counts and live activity feed without a centralized backend.
*   **Simulated Reads:** Queries like `get_question` and `has_voted` use `simulateTransaction` for fast, signature-free reads.

---

## 📸 Screenshots

### Product Demo
![Product Demo](./images/product%20demo.png)

### Wallet Options
![Wallet Options](./images/wallet%20options.png)

---

## 🧾 Sample Voting Transaction

*   **Tx Hash:** `cfa41be30aa49f272b79435d59efc1de14f8691baebc6a5e92d1e4ef7dc6a49c`
*   **View on Stellar Expert:** [View Transaction](https://stellar.expert/explorer/testnet/tx/cfa41be30aa49f272b79435d59efc1de14f8691baebc6a5e92d1e4ef7dc6a49c)

---

## 🏗️ Architecture

```
stellar-live-poll/
├── contract/              # Soroban smart contract (Rust)
│   ├── src/lib.rs         # LivePoll contract: initialize, vote, reset, getters
│   └── src/test.rs        # Unit tests
├── frontend/               # React + Vite app
│   └── src/
│       ├── wallet.js       # StellarWalletsKit setup + connect/disconnect
│       ├── errors.js       # Typed error classification
│       ├── contractClient.js  # Build/sign/submit txs, reads, event polling
│       ├── App.jsx         # UI: connect, vote, tx status, live feed
│       └── config.js       # Network + contract constants
└── scripts/deploy.sh       # Build + deploy + initialize helper script
```

---

## 🚀 Setup instructions

### Prerequisites
- Node.js 18+
- Rust + `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Soroban CLI: `cargo install --locked soroban-cli`
- A Stellar wallet browser extension for testing (e.g. [Freighter](https://www.freighter.app/)), set to **Testnet**

### 1. Clone and install
```bash
git clone <your-repo-url>
cd stellar-live-poll
cd frontend && npm install
```

### 2. Configure the frontend
```bash
cd frontend
cp .env.example .env
# Set VITE_CONTRACT_ID=CAA6JWF24DJ2PELRBIIC5FN2UBZ37CYVSOVUEJBBDGSSCBUROC7EA5IK
```

### 3. Run locally
```bash
npm run dev
```
Visit `http://localhost:5173`.

### 4. Build for production / deploy
```bash
npm run build
# deploy the `dist/` folder to Vercel/Netlify, with VITE_CONTRACT_ID set as an env var
```

---

## 🧪 Running contract tests

```bash
cd contract
cargo test
```

Covers: full poll flow (init → vote → tally), and rejection of a duplicate vote from the same address.

---

## 🛠️ Tech stack

- **Contract:** Rust + [Soroban SDK](https://soroban.stellar.org/) 21
- **Frontend:** React 18 + Vite
- **Wallets:** [@creit.tech/stellar-wallets-kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- **Chain interaction:** `@stellar/stellar-sdk` (SorobanRpc)
- **Network:** Stellar Testnet

---

## 📝 Notes for reviewers

- The contract enforces **one vote per address** via persistent storage (`HasVoted(Address)`), checked with `require_auth()` so a vote can't be spoofed on behalf of another account.
- Reads use `simulateTransaction` (no fee, no signature) so browsing the poll is free; only `vote` requires a signed, submitted transaction.
- Event sync uses polling (`getEvents`) rather than a websocket subscription, since Soroban RPC's public endpoints expose polling-friendly `getEvents` — this keeps the demo backend-free and easy to self-host.
