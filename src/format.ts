export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}
