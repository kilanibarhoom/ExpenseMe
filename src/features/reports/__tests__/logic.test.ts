import {
  incomeVsExpenseSeries,
  periodRange,
  perAccountSubtotals,
  sumByCategoryIls,
  txIlsMinor,
  type ReportTx,
} from '../logic';

const RATES = { USD: 3.6, JOD: 5.2 };

function tx(partial: Partial<ReportTx> & { amountMinor: number }): ReportTx {
  return {
    type: 'expense' as const,
    currency: 'ILS' as const,
    fxRateToIls: null,
    occurredAt: new Date('2026-07-10T12:00:00'),
    accountId: 'a1',
    categoryId: 'c1',
    categoryLabelEn: 'Food & Drinks',
    categoryLabelAr: 'طعام ومشروبات',
    categoryColor: '#F5A623',
    categoryIcon: '🍔',
    ...partial,
  };
}

describe('periodRange', () => {
  const ref = new Date('2026-07-15T10:30:00'); // a Wednesday

  it('computes day bounds', () => {
    const p = periodRange('day', ref);
    expect(p.start.getDate()).toBe(15);
    expect(p.end.getDate()).toBe(15);
    expect(p.start.getHours()).toBe(0);
    expect(p.end.getHours()).toBe(23);
  });

  it('computes week bounds starting Monday', () => {
    const p = periodRange('week', ref);
    expect(p.start.getDay()).toBe(1); // Monday
    expect(p.start.getDate()).toBe(13);
    expect(p.end.getDay()).toBe(0); // Sunday
  });

  it('computes month and year bounds', () => {
    expect(periodRange('month', ref).start.getDate()).toBe(1);
    expect(periodRange('year', ref).start.getMonth()).toBe(0);
  });

  it('normalizes custom ranges to whole days', () => {
    const start = new Date(2026, 0, 5, 14, 30);
    const end = new Date(2026, 1, 2, 9, 0);
    const p = periodRange('custom', ref, { start, end });
    expect(p.start).toEqual(new Date(2026, 0, 5, 0, 0, 0, 0));
    expect(p.end.getDate()).toBe(2);
    expect(p.end.getHours()).toBe(23);
  });
});

describe('txIlsMinor', () => {
  it('uses the latest rate by default', () => {
    expect(txIlsMinor(tx({ amountMinor: 2500, currency: 'USD', fxRateToIls: 3.9 }), RATES, false)).toBe(
      9000,
    );
  });

  it('uses the stored snapshot when exact-at-time is on', () => {
    expect(txIlsMinor(tx({ amountMinor: 2500, currency: 'USD', fxRateToIls: 3.9 }), RATES, true)).toBe(
      9750,
    );
  });

  it('falls back to latest rate when snapshot missing', () => {
    expect(txIlsMinor(tx({ amountMinor: 2500, currency: 'USD', fxRateToIls: null }), RATES, true)).toBe(
      9000,
    );
  });
});

describe('sumByCategoryIls', () => {
  it('groups expenses by category in ILS, descending', () => {
    const rows = sumByCategoryIls(
      [
        tx({ amountMinor: 1000 }),
        tx({ amountMinor: 500 }),
        tx({ amountMinor: 2500, currency: 'USD', categoryId: 'c2', categoryLabelEn: 'Shopping' }),
        tx({ amountMinor: 999, type: 'income', categoryId: 'c3' }), // excluded: income
      ],
      RATES,
      false,
      'en',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ categoryId: 'c2', ilsMinor: 9000, label: 'Shopping' });
    expect(rows[1]).toMatchObject({ categoryId: 'c1', ilsMinor: 1500 });
  });
});

describe('incomeVsExpenseSeries', () => {
  it('buckets by day within a month and converts to ILS', () => {
    const period = periodRange('month', new Date('2026-07-15'));
    const series = incomeVsExpenseSeries(
      [
        tx({ amountMinor: 1000, occurredAt: new Date('2026-07-10T09:00:00') }),
        tx({ amountMinor: 2000, type: 'income', occurredAt: new Date('2026-07-10T15:00:00') }),
        tx({ amountMinor: 2500, currency: 'USD', occurredAt: new Date('2026-07-11T08:00:00') }),
      ],
      period,
      RATES,
      false,
    );
    expect(series).toHaveLength(31);
    const day10 = series[9];
    expect(day10.incomeIls).toBe(2000);
    expect(day10.expenseIls).toBe(1000);
    expect(series[10].expenseIls).toBe(9000);
  });

  it('buckets by month for a year period', () => {
    const period = periodRange('year', new Date('2026-07-15'));
    const series = incomeVsExpenseSeries(
      [tx({ amountMinor: 1000, occurredAt: new Date('2026-03-05') })],
      period,
      RATES,
      false,
    );
    expect(series).toHaveLength(12);
    expect(series[2].expenseIls).toBe(1000);
  });
});

describe('perAccountSubtotals', () => {
  it('sums income and expense per account in native minor units', () => {
    const rows = perAccountSubtotals([
      tx({ amountMinor: 1000, accountId: 'a1' }),
      tx({ amountMinor: 300, accountId: 'a1', type: 'income' }),
      tx({ amountMinor: 2500, accountId: 'a2', currency: 'USD' }),
    ]);
    expect(rows).toEqual([
      { accountId: 'a1', incomeMinor: 300, expenseMinor: 1000 },
      { accountId: 'a2', incomeMinor: 0, expenseMinor: 2500 },
    ]);
  });
});
