import type { Account } from '../api/types';
import { formatMoney } from '../format';

export function AccountCard({ account }: { account: Account }) {
  return (
    <section className="card" aria-label="Account summary">
      <div className="card-row">
        <h2>{account.ownerName}</h2>
        <span className={`badge badge-${account.status.toLowerCase()}`}>{account.status}</span>
      </div>
      <p className="balance" data-testid="balance">
        {formatMoney(account.balance, account.currency)}
      </p>
      <p className="muted">Account {account.id}</p>
    </section>
  );
}
