import { createHttpApi } from './httpApi';
import { createMockApi } from './mockApi';
import type { PaymentsApi } from './types';

export function createApi(): PaymentsApi {
  if (import.meta.env.VITE_API_MODE === 'live') {
    return createHttpApi(import.meta.env.VITE_API_TOKEN ?? '');
  }
  return createMockApi();
}
