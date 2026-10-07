import type { Page, Transfer } from '../api/types';
import { formatMoney, shortId } from '../format';

interface Props {
  accountId: string;
  page: Page<Transfer> | null;
  onPage: (page: number) => void;
}

export function TransferHistory({ accountId, page, onPage }: Props) {
  if (!page) return null;
  return (
    <section className="card" aria-label="Transfer history">
      <h2>Recent transfers</h2>
      {page.content.length === 0 ? (
        <p className="muted">No transfers yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Direction</th>
              <th>Counterparty</th>
              <th className="num">Amount</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {page.content.map((t) => {
              const outgoing = t.fromAccountId === accountId;
              return (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleString('en-US')}</td>
                  <td>{outgoing ? 'Sent' : 'Received'}</td>
                  <td title={outgoing ? t.toAccountId : t.fromAccountId}>
                    {shortId(outgoing ? t.toAccountId : t.fromAccountId)}
                  </td>
                  <td className={`num ${outgoing ? 'debit' : 'credit'}`}>
                    {outgoing ? '−' : '+'}
                    {formatMoney(t.amount, t.currency)}
                  </td>
                  <td>{t.reference ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {page.totalPages > 1 && (
        <nav className="pager" aria-label="Pagination">
          <button type="button" disabled={page.page === 0} onClick={() => onPage(page.page - 1)}>Previous</button>
          <span>Page {page.page + 1} of {page.totalPages}</span>
          <button type="button" disabled={page.page + 1 >= page.totalPages} onClick={() => onPage(page.page + 1)}>
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
