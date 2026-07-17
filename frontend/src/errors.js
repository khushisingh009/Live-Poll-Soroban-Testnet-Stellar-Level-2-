// Central place that turns raw wallet/SDK/RPC errors into typed,
// user-friendly errors. This is what satisfies the "3 error types handled"
// requirement, plus a couple of extras for a more robust demo.

export const ErrorType = {
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  USER_REJECTED: 'USER_REJECTED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  ALREADY_VOTED: 'ALREADY_VOTED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
};

export class AppError extends Error {
  constructor(type, message, original) {
    super(message);
    this.type = type;
    this.original = original;
  }
}

export function classifyError(err) {
  const raw = (err?.message || err?.toString?.() || '').toLowerCase();

  // 1. Wallet not found / not installed
  if (
    raw.includes('not installed') ||
    raw.includes('not found') ||
    raw.includes('no wallet') ||
    raw.includes('extension not available')
  ) {
    return new AppError(
      ErrorType.WALLET_NOT_FOUND,
      'No compatible wallet was found. Please install Freighter, Albedo, xBull, or another supported Stellar wallet.',
      err
    );
  }

  // 2. User rejected the request / signature
  if (
    raw.includes('reject') ||
    raw.includes('declin') ||
    raw.includes('user cancel') ||
    raw.includes('denied')
  ) {
    return new AppError(
      ErrorType.USER_REJECTED,
      'You rejected the request in your wallet. No transaction was sent.',
      err
    );
  }

  // 3. Insufficient balance (underfunded account / tx submission fails on fee/balance)
  if (
    raw.includes('insufficient') ||
    raw.includes('underfunded') ||
    raw.includes('tx_insufficient_balance') ||
    raw.includes('op_underfunded')
  ) {
    return new AppError(
      ErrorType.INSUFFICIENT_BALANCE,
      'Your account does not have enough XLM to cover this transaction. Fund it via Friendbot (testnet).',
      err
    );
  }

  // 4. Contract-level: already voted
  if (raw.includes('already voted')) {
    return new AppError(
      ErrorType.ALREADY_VOTED,
      'This wallet address has already voted in this poll.',
      err
    );
  }

  // 5. Generic network / RPC failure
  if (
    raw.includes('network') ||
    raw.includes('timeout') ||
    raw.includes('fetch') ||
    raw.includes('failed to connect')
  ) {
    return new AppError(
      ErrorType.NETWORK_ERROR,
      'Could not reach the Stellar testnet. Check your connection and try again.',
      err
    );
  }

  return new AppError(ErrorType.UNKNOWN, err?.message || 'Something went wrong.', err);
}
