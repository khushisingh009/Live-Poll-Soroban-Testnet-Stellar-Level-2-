import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  scValToNative,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from './config';
import { signTransactionXDR } from './wallet';
import { classifyError } from './errors';

const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

async function buildAndSubmit(method, args, sourceAddress) {
  try {
    const account = await server.getAccount(sourceAddress);
    const contract = new Contract(CONTRACT_ID);

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(60)
      .build();

    tx = await server.prepareTransaction(tx);

    const signedXDR = await signTransactionXDR(tx.toXDR(), sourceAddress);

    const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const sendResult = await server.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error(`tx submission failed: ${JSON.stringify(sendResult.errorResult)}`);
    }

    // Poll for final status: pending -> success/fail
    let getResult = await server.getTransaction(sendResult.hash);
    let attempts = 0;
    while (getResult.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise((r) => setTimeout(r, 1500));
      getResult = await server.getTransaction(sendResult.hash);
      attempts++;
    }

    if (getResult.status !== 'SUCCESS') {
      throw new Error(`Transaction ${getResult.status}: ${JSON.stringify(getResult)}`);
    }

    return { hash: sendResult.hash, result: getResult };
  } catch (err) {
    throw classifyError(err);
  }
}

export async function castVote(voterAddress, optionIndex) {
  const args = [
    new Address(voterAddress).toScVal(),
    nativeToScVal(optionIndex, { type: 'u32' }),
  ];
  return buildAndSubmit('vote', args, voterAddress);
}

// ---- Read-only calls (simulate, no signature/fee needed) ----
// Simulation needs a *source account* object to build a valid tx envelope,
// but the account does not need to sign anything for a read. We reuse the
// connected wallet's address since the app requires a wallet connection
// before it renders poll data anyway — this avoids depending on any
// separate placeholder account existing/being funded on testnet.
async function simulateRead(method, args = [], sourceAddress) {
  if (!sourceAddress) {
    throw classifyError(new Error('network: no source address available for read'));
  }

  const account = await server.getAccount(sourceAddress).catch(() => {
    throw classifyError(new Error('network: could not load account for simulation'));
  });

  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw classifyError(new Error(sim.error));
  }
  return scValToNative(sim.result.retval);
}

export const getQuestion = (address) => simulateRead('get_question', [], address);
export const getOptions = (address) => simulateRead('get_options', [], address);
export const getVotes = (address) => simulateRead('get_votes', [], address);
export const hasVoted = (address) =>
  simulateRead('has_voted', [new Address(address).toScVal()], address);

// ---- Real-time event listening (polling-based, works with public RPC) ----
export async function pollVoteEvents(onEvent, { fromLedger, intervalMs = 4000 } = {}) {
  let lastLedger = fromLedger;
  if (!lastLedger) {
    const latest = await server.getLatestLedger();
    lastLedger = latest.sequence - 100 > 0 ? latest.sequence - 100 : 1;
  }

  const timer = setInterval(async () => {
    try {
      const events = await server.getEvents({
        startLedger: lastLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [CONTRACT_ID],
          },
        ],
        limit: 50,
      });

      if (events.events?.length) {
        for (const evt of events.events) {
          onEvent(evt);
        }
        lastLedger = events.latestLedger + 1;
      }
    } catch (err) {
      // Non-fatal: event polling errors shouldn't crash the UI
      console.warn('event poll failed', err);
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
