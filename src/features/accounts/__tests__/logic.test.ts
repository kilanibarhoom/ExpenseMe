import { combinedIlsMinor } from '../logic';

describe('combinedIlsMinor', () => {
  const rates = { USD: 3.6, JOD: 5.2 };

  it('converts every non-ILS balance and sums in agorot', () => {
    const accounts = [
      { balanceMinor: 10000, currency: 'ILS' as const }, // 100 ILS
      { balanceMinor: 2500, currency: 'USD' as const }, // 25 USD -> 90 ILS
      { balanceMinor: 100000, currency: 'JOD' as const }, // 100 JOD -> 520 ILS
    ];
    expect(combinedIlsMinor(accounts, rates)).toBe(10000 + 9000 + 52000);
  });

  it('handles negative balances', () => {
    expect(combinedIlsMinor([{ balanceMinor: -2500, currency: 'USD' }], rates)).toBe(-9000);
  });

  it('returns 0 for no accounts', () => {
    expect(combinedIlsMinor([], rates)).toBe(0);
  });
});
