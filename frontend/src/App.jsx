import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  openWalletModal,
  reconnectIfPossible,
  disconnectWallet,
} from './wallet';
import {
  castVote,
  getQuestion,
  getOptions,
  getVotes,
  hasVoted,
  pollVoteEvents,
} from './contractClient';
import { AppError, ErrorType } from './errors';
import { CONTRACT_ID, EXPLORER_TX_URL, EXPLORER_CONTRACT_URL } from './config';

const TX_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAIL: 'fail',
};

export default function App() {
  const [address, setAddress] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([]);
  const [votes, setVotes] = useState([]);
  const [voted, setVoted] = useState(false);
  const [loadingPoll, setLoadingPoll] = useState(false);

  const [txStatus, setTxStatus] = useState(TX_STATUS.IDLE);
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [feed, setFeed] = useState([]); // live activity feed from events

  const stopPollingRef = useRef(null);

  const refreshPollState = useCallback(async (addr) => {
    if (!addr) return;
    setLoadingPoll(true);
    try {
      const [q, opts, v, hv] = await Promise.all([
        getQuestion(addr),
        getOptions(addr),
        getVotes(addr),
        hasVoted(addr),
      ]);
      setQuestion(q);
      setOptions(opts);
      setVotes(v);
      setVoted(hv);
      setErrorMsg(null);
    } catch (err) {
      const classified = err instanceof AppError ? err : new AppError(ErrorType.UNKNOWN, err.message);
      setErrorMsg(classified.message);
    } finally {
      setLoadingPoll(false);
    }
  }, []);

  // Attempt silent reconnect on load
  useEffect(() => {
    (async () => {
      const saved = await reconnectIfPossible();
      if (saved) {
        setAddress(saved.address);
        setWalletId(saved.walletId);
      }
    })();
  }, []);

  // Load poll state + start event polling once connected
  useEffect(() => {
    if (!address) return;
    refreshPollState(address);

    pollVoteEvents((evt) => {
      setFeed((prev) =>
        [
          {
            id: `${evt.id}`,
            time: new Date().toLocaleTimeString(),
            topic: evt.topic,
          },
          ...prev,
        ].slice(0, 20)
      );
      // Re-sync counts whenever a vote event arrives (real-time sync)
      refreshPollState(address);
    }).then((stop) => {
      stopPollingRef.current = stop;
    });

    return () => {
      if (stopPollingRef.current) stopPollingRef.current();
    };
  }, [address, refreshPollState]);

  async function handleConnect() {
    setConnecting(true);
    setErrorMsg(null);
    try {
      const { address: addr, walletId: wid } = await openWalletModal();
      setAddress(addr);
      setWalletId(wid);
    } catch (err) {
      const classified = err instanceof AppError ? err : new AppError(ErrorType.UNKNOWN, err.message);
      setErrorMsg(classified.message);
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    disconnectWallet();
    setAddress(null);
    setWalletId(null);
    setQuestion('');
    setOptions([]);
    setVotes([]);
    setFeed([]);
    if (stopPollingRef.current) stopPollingRef.current();
  }

  async function handleVote(index) {
    if (!address) return;
    setErrorMsg(null);
    setTxStatus(TX_STATUS.PENDING);
    setTxHash(null);
    try {
      const { hash } = await castVote(address, index);
      setTxHash(hash);
      setTxStatus(TX_STATUS.SUCCESS);
      await refreshPollState(address);
    } catch (err) {
      setTxStatus(TX_STATUS.FAIL);
      const classified = err instanceof AppError ? err : new AppError(ErrorType.UNKNOWN, err.message);
      setErrorMsg(classified.message);
    }
  }

  const totalVotes = votes.reduce((a, b) => a + b, 0);

  return (
    <div className="wrap">
      <header>
        <h1>🗳️ Live Poll — Soroban Testnet</h1>
        <p className="sub">
          Contract:{' '}
          <a href={EXPLORER_CONTRACT_URL(CONTRACT_ID)} target="_blank" rel="noreferrer">
            {CONTRACT_ID.slice(0, 8)}…{CONTRACT_ID.slice(-6)}
          </a>
        </p>
      </header>

      <div className="wallet-bar">
        {!address ? (
          <button className="btn primary" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <span className="dot" />
            <span>
              {walletId} · {address.slice(0, 6)}…{address.slice(-4)}
            </span>
            <button className="btn ghost" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {errorMsg && <div className="alert error">{errorMsg}</div>}

      {!address && (
        <div className="card empty">
          Connect a wallet to view and participate in the live poll.
        </div>
      )}

      {address && (
        <>
          <section className="card">
            {loadingPoll ? (
              <p>Loading poll…</p>
            ) : (
              <>
                <h2>{question || 'Loading question…'}</h2>
                <div className="options">
                  {options.map((opt, i) => {
                    const count = votes[i] ?? 0;
                    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    return (
                      <button
                        key={i}
                        className="option"
                        disabled={voted || txStatus === TX_STATUS.PENDING}
                        onClick={() => handleVote(i)}
                      >
                        <div className="option-row">
                          <span>{opt}</span>
                          <span className="count">
                            {count} vote{count === 1 ? '' : 's'} ({pct}%)
                          </span>
                        </div>
                        <div className="bar-bg">
                          <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                {voted && <p className="voted-note">✅ You've already voted with this wallet.</p>}
                <p className="total">{totalVotes} total vote{totalVotes === 1 ? '' : 's'}</p>
              </>
            )}
          </section>

          <section className="card tx-status">
            <h3>Transaction Status</h3>
            <div className={`status-pill ${txStatus}`}>{txStatus}</div>
            {txHash && (
              <p>
                <a href={EXPLORER_TX_URL(txHash)} target="_blank" rel="noreferrer">
                  View on Stellar Explorer ↗
                </a>
              </p>
            )}
          </section>

          <section className="card feed">
            <h3>Live Activity Feed</h3>
            {feed.length === 0 ? (
              <p className="muted">Waiting for votes… (polls chain events every few seconds)</p>
            ) : (
              <ul>
                {feed.map((f) => (
                  <li key={f.id}>
                    <span className="time">{f.time}</span> — new vote event received
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <footer>
        <p>Built with Soroban + StellarWalletsKit — Testnet only.</p>
      </footer>
    </div>
  );
}
