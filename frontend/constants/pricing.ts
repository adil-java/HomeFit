/**
 * Order pricing shown in the app. The server is the source of truth and
 * charges with the same rate (backend/services/order.service.js TAX_RATE) —
 * keep the two in sync.
 */
export const TAX_RATE = 0.1;

// Thousands separators without Intl (works the same on every Hermes build).
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Totals and receipts: always two decimals — "Rs. 12,500.00". */
export const formatPKR = (amount: number) => {
  const [int, dec] = (Number(amount) || 0).toFixed(2).split('.');
  return `Rs. ${group(int)}.${dec}`;
};

/** Product prices: decimals only when needed — "Rs. 12,500", "Rs. 99.50". */
export const formatPrice = (amount: number) => {
  const n = Number(amount) || 0;
  const [int, dec] = (Number.isInteger(n) ? String(n) : n.toFixed(2)).split('.');
  return `Rs. ${group(int)}${dec ? `.${dec}` : ''}`;
};
