import { ApiError, type Account, type Page, type PaymentsApi, type Transfer, type TransferRequest } from './types';

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    let body: { code?: string; detail?: string; errors?: Record<string, string> } = {};
    try {
      body = await response.json();
    } catch {
      // non-JSON error body; fall through with defaults
    }
    throw new ApiError(response.status, body.code ?? 'HTTP_ERROR', body.detail ?? response.statusText, body.errors);
  }
  return (await response.json()) as T;
}

export function createHttpApi(token: string): PaymentsApi {
  return {
    getAccount: (id) => request<Account>(`/api/v1/accounts/${encodeURIComponent(id)}`, token),
    listTransfers: (accountId, page = 0, size = 10) =>
      request<Page<Transfer>>(
        `/api/v1/accounts/${encodeURIComponent(accountId)}/transfers?page=${page}&size=${size}`,
        token,
      ),
    createTransfer: (body: TransferRequest, idempotencyKey: string) =>
      request<Transfer>('/api/v1/transfers', token, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
      }),
  };
}
