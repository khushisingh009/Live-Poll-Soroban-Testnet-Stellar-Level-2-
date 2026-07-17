# 🗳️ Live Poll — Soroban Testnet (Stellar Level 2)

A real-time, one-question polling dApp built on **Soroban** (Stellar smart contracts). Users connect any supported Stellar wallet, vote once, and watch results update live as other votes stream in via on-chain events.

> Built for the Stellar Dev Onboarding Program — Level 2 (Green Belt) submission.

---

## ✨ What this project demonstrates

| Requirement | Where it lives |
|---|---|
| **Multi-wallet integration** | `frontend/src/wallet.js` — [StellarWalletsKit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) with `allowAllModules()`, supporting Freighter, Albedo, xBull, Lobstr, Hana, Rabet, WalletConnect, Ledger |
| **3+ error types handled** | `frontend/src/errors.js` — wallet not found, user rejected, insufficient balance, already voted, network error |
| **Contract deployed on testnet** | `contract/src/lib.rs` — see [Deployed Contract](#-deployed-contract) below |
| **Contract called from frontend** | `frontend/src/contractClient.js` — `vote()` write call, `get_question/get_options/get_votes/has_voted` read calls |
| **Transaction status visible** | UI shows `pending → success/fail` with link to Stellar Expert |
| **Real-time event sync** | `pollVoteEvents()` polls Soroban RPC `getEvents` for the contract's `voted` topic and re-syncs vote counts + activity feed |

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

### How voting works
1. User connects a wallet via the StellarWalletsKit modal.
2. Frontend reads `get_question`, `get_options`, `get_votes`, `has_voted` via `simulateTransaction` (free, no signature).
3. On vote: frontend builds a `vote(voter, option_index)` invocation, calls `prepareTransaction`, asks the wallet to sign the XDR, then submits via `sendTransaction`.
4. UI polls `getTransaction` until status resolves to `SUCCESS` or fails — shown live as **pending → success/fail**.
5. The contract emits a `voted` event on every successful vote. The frontend polls `getEvents` every few seconds, and on a new event it re-fetches vote counts and appends an entry to the **Live Activity Feed** — this is what keeps all connected clients in sync without a backend.

---

## 🔒 Error handling (3+ types)

Implemented in `errors.js` / `classifyError()`:

1. **Wallet not found** — no compatible extension/app detected when opening the connect modal.
2. **User rejected** — the wallet's confirm/sign dialog was declined.
3. **Insufficient balance** — account underfunded to cover the transaction fee.
4. **Already voted** *(contract-level)* — the connected address already has a recorded vote.
5. **Network/RPC error** — testnet RPC unreachable or timed out.

Each is surfaced as a plain-language message in the UI's error banner rather than a raw stack trace.

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

### 2. Deploy the contract
```bash
cd ../scripts
./deploy.sh
```
This will:
- Generate/fund a testnet identity via Friendbot
- Build the contract to WASM
- Deploy it to testnet
- Initialize it with a default question + options
- Print the deployed **Contract ID**

### 3. Configure the frontend
```bash
cd ../frontend
cp .env.example .env
# paste the Contract ID printed above into VITE_CONTRACT_ID
```

### 4. Run locally
```bash
npm run dev
```
Visit `http://localhost:5173`.

### 5. Build for production / deploy
```bash
npm run build
# deploy the `dist/` folder to Vercel/Netlify, with VITE_CONTRACT_ID set as an env var
```

---

## 🌐 Live demo

- **Live demo link:** `<ADD YOUR VERCEL/NETLIFY URL HERE>`

## 📦 Deployed contract

- **Contract ID (Testnet):** `<ADD DEPLOYED CONTRACT ID HERE>`
- **View on Stellar Expert:** `https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>`

## 🧾 Sample transaction

- **Tx hash of a `vote` call:** `<ADD TX HASH HERE>`
- **View on Stellar Expert:** `https://stellar.expert/explorer/testnet/tx/<TX_HASH>`

## 📸 Screenshot: wallet options

`<ADD SCREENSHOT OF THE STELLARWALLETSKIT MODAL HERE>`

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
