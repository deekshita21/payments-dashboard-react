import { describe, expect, it } from 'vitest';
import { createMockApi, DEMO_ACCOUNTS } from '../api/mockApi';
import { ApiError } from '../api/types';

const [avery, jordan, riley] = DEMO_ACCOUNTS;

describe('mock payments API', () => {
  it('moves money and records history for both accounts', async () => {
    const api = createMockApi(0);
    await api.createTransfer({ fromAccountId: avery.id, toAccountId: jordan.id, amount: 100.25, currency: 'USD' }, 'k1');

    expect((await api.getAccount(avery.id)).balance).toBe(2399.75);
    expect((await api.getAccount(jordan.id)).balance).toBe(440.75);
    expect((await api.listTransfers(jordan.id)).totalElements).toBe(1);
  });

  it('replays the same idempotency key without charging twice', async () => {
    const api = createMockApi(0);
    const body = { fromAccountId: avery.id, toAccountId: jordan.id, amount: 10, currency: 'USD' };
    const first = await api.createTransfer(body, 'same-key');
    const second = await api.createTransfer(body, 'same-key');

    expect(second.id).toBe(first.id);
    expect((await api.getAccount(avery.id)).balance).toBe(2490);
  });

  it('rejects key reuse with a different body', async () => {
    const api = createMockApi(0);
    await api.createTransfer({ fromAccountId: avery.id, toAccountId: jordan.id, amount: 10, currency: 'USD' }, 'k');
    await expect(
      api.createTransfer({ fromAccountId: avery.id, toAccountId: jordan.id, amount: 11, currency: 'USD' }, 'k'),
    ).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it.each([
    [{ fromAccountId: jordan.id, toAccountId: avery.id, amount: 1000, currency: 'USD' }, 'INSUFFICIENT_FUNDS'],
    [{ fromAccountId: avery.id, toAccountId: riley.id, amount: 1, currency: 'USD' }, 'ACCOUNT_NOT_ACTIVE'],
    [{ fromAccountId: avery.id, toAccountId: avery.id, amount: 1, currency: 'USD' }, 'SAME_ACCOUNT'],
  ])('rejects invalid transfers (%#)', async (request, code) => {
    const api = createMockApi(0);
    const error = await api.createTransfer(request, crypto.randomUUID()).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(code);
  });
});
