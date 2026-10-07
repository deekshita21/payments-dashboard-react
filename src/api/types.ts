export type AccountStatus = 'ACTIVE' | 'FROZEN';

export interface Account {
  id: string;
  ownerName: string;
  currency: string;
  balance: number;
  status: AccountStatus;
  createdAt: string;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: 'COMPLETED';
  reference: string | null;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  reference?: string;
}

/** Mirrors the service's RFC 9457 problem-detail body. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PaymentsApi {
  getAccount(id: string): Promise<Account>;
  listTransfers(accountId: string, page?: number, size?: number): Promise<Page<Transfer>>;
  createTransfer(request: TransferRequest, idempotencyKey: string): Promise<Transfer>;
}
