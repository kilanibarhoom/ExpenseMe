import { convertToIlsMinor, type Currency } from '@/lib/money';

export interface ActivitySums {
  income: number;
  expense: number;
  transfersIn: number;
  transfersOut: number;
}

/** Account balance in its own currency's minor units. */
export function deriveBalance(initialBalance: number, sums: ActivitySums): number {
  return initialBalance + sums.income - sums.expense + sums.transfersIn - sums.transfersOut;
}

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
