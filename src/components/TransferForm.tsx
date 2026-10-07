import { useState, type FormEvent } from 'react';
import { ApiError, type Account, type PaymentsApi, type Transfer } from '../api/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

interface Props {
  api: PaymentsApi;
  from: Account;
  onCompleted: (transfer: Transfer) => void;
}

export function validate(from: Account, toId: string, amount: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!UUID_PATTERN.test(toId.trim())) {
    errors.toAccountId = 'Enter a valid destination account id';
  } else if (toId.trim() === from.id) {
    errors.toAccountId = 'Destination must be a different account';
  }
  if (!AMOUNT_PATTERN.test(amount.trim()) || Number(amount) <= 0) {
    errors.amount = 'Enter an amount greater than 0 with at most 2 decimals';
  } else if (Number(amount) > from.balance) {
    errors.amount = 'Amount exceeds the available balance';
  }
  return errors;
}

export function TransferForm({ api, from, onCompleted }: Props) {
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // One key per logical transfer: reused if the user retries after a network error,
  // replaced when the inputs change or the transfer succeeds.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const edit = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setIdempotencyKey(crypto.randomUUID());
    setServerError(null);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(from, toId, amount);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const transfer = await api.createTransfer(
        {
          fromAccountId: from.id,
          toAccountId: toId.trim(),
          amount: Number(amount),
          currency: from.currency,
          reference: reference.trim() || undefined,
        },
        idempotencyKey,
      );
      setToId('');
      setAmount('');
      setReference('');
      setIdempotencyKey(crypto.randomUUID());
      onCompleted(transfer);
    } catch (error) {
      setServerError(error instanceof ApiError ? `${error.message} (${error.code})` : 'Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-label="New transfer">
      <h2>Send money</h2>
      <label>
        To account id
        <input value={toId} onChange={(e) => edit(setToId)(e.target.value)} aria-invalid={!!errors.toAccountId} />
      </label>
      {errors.toAccountId && <p role="alert" className="error">{errors.toAccountId}</p>}

      <label>
        Amount ({from.currency})
        <input inputMode="decimal" value={amount} onChange={(e) => edit(setAmount)(e.target.value)}
               aria-invalid={!!errors.amount} />
      </label>
      {errors.amount && <p role="alert" className="error">{errors.amount}</p>}

      <label>
        Reference (optional)
        <input maxLength={140} value={reference} onChange={(e) => edit(setReference)(e.target.value)} />
      </label>

      {serverError && <p role="alert" className="error">{serverError}</p>}
      <button type="submit" disabled={submitting || from.status !== 'ACTIVE'}>
        {submitting ? 'Sending…' : 'Send transfer'}
      </button>
    </form>
  );
}
