#!/usr/bin/env bash
# Builds and deploys the LivePoll contract to Stellar testnet.
# Prerequisites:
#   - Rust + `wasm32-unknown-unknown` target installed
#   - Soroban CLI installed: `cargo install --locked soroban-cli`
#   - A funded testnet identity (see step 1 below)
set -e

IDENTITY=${1:-poll-admin}
NETWORK=testnet

echo "== 1. Ensure identity exists and is funded =="
soroban keys generate $IDENTITY --network $NETWORK 2>/dev/null || true
soroban keys fund $IDENTITY --network $NETWORK

echo "== 2. Build contract =="
cd "$(dirname "$0")/../contract"
soroban contract build

WASM_PATH="target/wasm32-unknown-unknown/release/live_poll.wasm"

echo "== 3. Deploy contract =="
CONTRACT_ID=$(soroban contract deploy \
  --wasm "$WASM_PATH" \
  --source "$IDENTITY" \
  --network "$NETWORK")

echo "Deployed contract: $CONTRACT_ID"
echo "$CONTRACT_ID" > ../deployed_contract_id.txt

echo "== 4. Initialize poll =="
ADMIN_ADDRESS=$(soroban keys address "$IDENTITY")

soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- \
  initialize \
  --admin "$ADMIN_ADDRESS" \
  --question "Which Stellar wallet do you use most?" \
  --options '["Freighter","Albedo","xBull","Lobstr"]'

echo ""
echo "Done. Contract ID: $CONTRACT_ID"
echo "Add this to frontend/.env as VITE_CONTRACT_ID=$CONTRACT_ID"
