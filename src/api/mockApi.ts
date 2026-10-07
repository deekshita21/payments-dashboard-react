import { ApiError, type Account, type Page, type PaymentsApi, type Transfer, type TransferRequest } from './types';

/** Synthetic demo data only. Names and ids are invented. */
export const DEMO_ACCOUNTS: Account[] = [
  {
    id: '3f6c1a52-0d1e-4c1b-9a51-5b8f0e2d7a01',
    ownerName: 'Avery Demo',
    currency: 'USD',
    balance: 2500,
    status: 'ACTIVE',
    createdAt: '2026-01-05T15:00:00Z',
  },
  {
    id: '8b2e4d90-6f3a-4e7c-b1d2-9c0a5e3f1b02',
    ownerName: 'Jordan Sample',
    currency: 'USD',
    balance: 340.5,
    status: 'ACTIVE',
    createdAt: '2026-02-11T18:30:00Z',
  },
  {
    id: 'c7d9e1f2-3a4b-4c5d-8e6f-7a8b9c0d1e03',
    ownerName: 'Riley Placeholder',
    currency: 'EUR',
    balance: 900,
    status: 'FROZEN',
    createdAt: '2026-03-20T09:45:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** In-memory implementation that follows the same rules as payment-transaction-service. */
export function createMockApi(latencyMs = 150): PaymentsApi {
  const accounts = new Map(DEMO_ACCOUNTS.map((a) => [a.id, { ...a }]));
  const transfers: Transfer[] = [];
  const byKey = new Map<string, { hash: string; transfer: Transfer }>();

  const find = (id: string) => {
    const account = accounts.get(id);
    if (!account) throw new ApiError(404, 'NOT_FOUND', `Account ${id} was not found`);
    return account;
  };

  return {
    async getAccount(id) {
      await delay(latencyMs);
      return { ...find(id) };
    },

    async listTransfers(accountId, page = 0, size = 10): Promise<Page<Transfer>> {
      await delay(latencyMs);
      find(accountId);
      const all = transfers
        .filter((t) => t.fromAccountId === accountId || t.toAccountId === accountId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        content: all.slice(page * size, page * size + size),
        page,
        size,
        totalElements: all.length,
        totalPages: Math.ceil(all.length / size),
      };
    },

    async createTransfer(request: TransferRequest, idempotencyKey: string) {
      await delay(latencyMs);
      const hash = JSON.stringify([request.fromAccountId, request.toAccountId, request.amount.toFixed(2),
        request.currency, request.reference ?? '']);
      const previous = byKey.get(idempotencyKey);
      if (previous) {
        if (previous.hash !== hash) {
          throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key was already used with a different request body');
        }
        return previous.transfer;
      }
      if (request.fromAccountId === request.toAccountId) {
        throw new ApiError(422, 'SAME_ACCOUNT', 'Source and destination accounts must differ');
      }
      const from = find(request.fromAccountId);
      const to = find(request.toAccountId);
      if (from.status !== 'ACTIVE' || to.status !== 'ACTIVE') {
        throw new ApiError(422, 'ACCOUNT_NOT_ACTIVE', 'Both accounts must be active');
      }
      if (from.currency !== request.currency || to.currency !== request.currency) {
        throw new ApiError(422, 'CURRENCY_MISMATCH', 'Transfer currency must match both account currencies');
      }
      if (from.balance < request.amount) {
        throw new ApiError(422, 'INSUFFICIENT_FUNDS', 'Source account has insufficient funds');
      }
      from.balance = Math.round((from.balance - request.amount) * 100) / 100;
      to.balance = Math.round((to.balance + request.amount) * 100) / 100;
      const transfer: Transfer = {
        id: crypto.randomUUID(),
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: request.amount,
        currency: request.currency,
        status: 'COMPLETED',
        reference: request.reference ?? null,
        createdAt: new Date().toISOString(),
      };
      transfers.push(transfer);
      byKey.set(idempotencyKey, { hash, transfer });
      return transfer;
    },
  };
}
