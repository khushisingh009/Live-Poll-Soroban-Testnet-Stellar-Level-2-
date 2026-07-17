// Update CONTRACT_ID after deployment (see README "Deploy" section).
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID || 'REPLACE_WITH_DEPLOYED_CONTRACT_ID';

export const NETWORK = 'TESTNET';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const EXPLORER_TX_URL = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const EXPLORER_CONTRACT_URL = (id) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;
