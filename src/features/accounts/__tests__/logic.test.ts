import { combinedIlsMinor, deriveBalance } from '../logic';

describe('deriveBalance', () => {
  it('adds income and transfers-in, subtracts expense and transfers-out', () => {
    expect(
      deriveBalance(10000, { income: 5000, expense: 2000, transfersIn: 1000, transfersOut: 500 }),
    ).toBe(13500);
  });

  it('handles empty activity', () => {
    expect(deriveBalance(0, { income: 0, expense: 0, transfersIn: 0, transfersOut: 0 })).toBe(0);
  });

  it('can go negative', () => {
    expect(deriveBalance(0, { income: 0, expense: 700, transfersIn: 0, transfersOut: 0 })).toBe(
      -700,
    );
  });
});

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
