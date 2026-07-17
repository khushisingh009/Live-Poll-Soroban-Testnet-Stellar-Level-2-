import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';
import { NETWORK_PASSPHRASE } from './config';

// allowAllModules() auto-registers every supported wallet adapter:
// Freighter, Albedo, xBull, Lobstr, Hana, Rabet, WalletConnect, Ledger, etc.
export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

/**
 * Opens the wallet-selection modal (this is what gives users the
 * "choose your wallet" screen — Freighter / Albedo / xBull / etc).
 * Resolves with { address } or rejects with a typed error the caller
 * can classify (see errors.js).
 */
export function openWalletModal() {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          localStorage.setItem('selectedWalletId', option.id);
          resolve({ address, walletId: option.id });
        } catch (err) {
          reject(err);
        }
      },
      onClosed: (err) => {
        if (err) reject(err);
      },
    });
  });
}

export async function reconnectIfPossible() {
  const savedId = localStorage.getItem('selectedWalletId');
  if (!savedId) return null;
  try {
    kit.setWallet(savedId);
    const { address } = await kit.getAddress();
    return { address, walletId: savedId };
  } catch {
    localStorage.removeItem('selectedWalletId');
    return null;
  }
}

export function disconnectWallet() {
  localStorage.removeItem('selectedWalletId');
}

export async function signTransactionXDR(xdr, address) {
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    address,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  return signedTxXdr;
}
