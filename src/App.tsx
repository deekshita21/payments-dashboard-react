import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApi } from './api/client';
import { DEMO_ACCOUNTS } from './api/mockApi';
import { ApiError, type Account, type Page, type PaymentsApi, type Transfer } from './api/types';
import { AccountCard } from './components/AccountCard';
import { TransferForm } from './components/TransferForm';
import { TransferHistory } from './components/TransferHistory';

const PAGE_SIZE = 5;

export default function App({ api: injected }: { api?: PaymentsApi }) {
  const api = useMemo(() => injected ?? createApi(), [injected]);
  const [accountId, setAccountId] = useState(DEMO_ACCOUNTS[0].id);
  const [account, setAccount] = useState<Account | null>(null);
  const [history, setHistory] = useState<Page<Transfer> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (id: string, page = 0) => {
    setError(null);
    try {
      const [acct, transfers] = await Promise.all([api.getAccount(id), api.listTransfers(id, page, PAGE_SIZE)]);
      setAccount(acct);
      setHistory(transfers);
    } catch (e) {
      setAccount(null);
      setHistory(null);
      setError(e instanceof ApiError ? e.message : 'Could not load the account');
    }
  }, [api]);

  useEffect(() => {
    void load(accountId);
  }, [accountId, load]);

  return (
    <main>
      <header>
        <h1>Payments Dashboard</h1>
        <p className="muted">Demo data only. Connects to payment-transaction-service in live mode.</p>
      </header>

      <label className="picker">
        Account
        <select value={accountId} onChange={(e) => { setNotice(null); setAccountId(e.target.value); }}>
          {DEMO_ACCOUNTS.map((a) => (
            <option key={a.id} value={a.id}>{a.ownerName} ({a.currency})</option>
          ))}
        </select>
      </label>

      {error && <p role="alert" className="error">{error}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}

      {account && (
        <div className="grid">
          <AccountCard account={account} />
          <TransferForm
            api={api}
            from={account}
            onCompleted={(t) => {
              setNotice(`Transfer ${t.id.slice(0, 8)} completed`);
              void load(account.id);
            }}
          />
        </div>
      )}
      {account && <TransferHistory accountId={account.id} page={history} onPage={(p) => void load(account.id, p)} />}
    </main>
  );
}
