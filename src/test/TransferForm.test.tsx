import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEMO_ACCOUNTS } from '../api/mockApi';
import { ApiError, type PaymentsApi } from '../api/types';
import { TransferForm, validate } from '../components/TransferForm';

const [avery, jordan] = DEMO_ACCOUNTS;

function fakeApi(overrides: Partial<PaymentsApi> = {}): PaymentsApi {
  return {
    getAccount: vi.fn(),
    listTransfers: vi.fn(),
    createTransfer: vi.fn().mockResolvedValue({
      id: 'abc', fromAccountId: avery.id, toAccountId: jordan.id, amount: 5, currency: 'USD',
      status: 'COMPLETED', reference: null, createdAt: '2026-01-01T00:00:00Z',
    }),
    ...overrides,
  };
}

describe('validate', () => {
  it('flags bad ids, same account, bad amounts and overdrafts', () => {
    expect(validate(avery, 'nope', '5').toAccountId).toBeDefined();
    expect(validate(avery, avery.id, '5').toAccountId).toMatch(/different/);
    expect(validate(avery, jordan.id, '1.234').amount).toBeDefined();
    expect(validate(avery, jordan.id, '0').amount).toBeDefined();
    expect(validate(avery, jordan.id, '999999').amount).toMatch(/exceeds/);
    expect(validate(avery, jordan.id, '12.50')).toEqual({});
  });
});

describe('TransferForm', () => {
  it('does not call the API when the form is invalid', async () => {
    const api = fakeApi();
    render(<TransferForm api={api} from={avery} onCompleted={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /send transfer/i }));

    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it('submits a valid transfer with an idempotency key', async () => {
    const api = fakeApi();
    const onCompleted = vi.fn();
    render(<TransferForm api={api} from={avery} onCompleted={onCompleted} />);

    await userEvent.type(screen.getByLabelText(/to account id/i), jordan.id);
    await userEvent.type(screen.getByLabelText(/amount/i), '5');
    await userEvent.click(screen.getByRole('button', { name: /send transfer/i }));

    expect(api.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ fromAccountId: avery.id, toAccountId: jordan.id, amount: 5, currency: 'USD' }),
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(onCompleted).toHaveBeenCalled();
  });

  it('reuses the same idempotency key when retrying after a failure', async () => {
    const createTransfer = vi.fn()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockRejectedValueOnce(new ApiError(422, 'INSUFFICIENT_FUNDS', 'Source account has insufficient funds'));
    const api = fakeApi({ createTransfer });
    render(<TransferForm api={api} from={avery} onCompleted={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/to account id/i), jordan.id);
    await userEvent.type(screen.getByLabelText(/amount/i), '5');
    await userEvent.click(screen.getByRole('button', { name: /send transfer/i }));
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /send transfer/i }));
    expect(await screen.findByText(/INSUFFICIENT_FUNDS/)).toBeInTheDocument();

    const [firstKey, secondKey] = createTransfer.mock.calls.map((call) => call[1]);
    expect(secondKey).toBe(firstKey);
  });
});
