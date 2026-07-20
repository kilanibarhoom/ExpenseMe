import { convertToIlsMinor, type Currency } from '@/lib/money';

/** Combined balance across accounts, converted to ILS agorot with the given rates. */
export function combinedIlsMinor(
  accounts: { balanceMinor: number; currency: Currency }[],
  rates: { USD: number; JOD: number },
): number {
  return accounts.reduce((total, { balanceMinor, currency }) => {
    const rate = currency === 'ILS' ? 1 : rates[currency];
    return total + convertToIlsMinor(balanceMinor, currency, rate);
  }, 0);
}
