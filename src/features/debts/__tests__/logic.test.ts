import { applyEntry, foldEntries, perCurrencyTotals } from '../logic';

describe('applyEntry', () => {
  const active = { principal: 10000, remaining: 10000, status: 'active' as const };

  it('partial payment reduces remaining, stays active', () => {
    expect(applyEntry(active, { kind: 'payment', amount: 4000 })).toEqual({
      principal: 10000,
      remaining: 6000,
      status: 'active',
    });
  });

  it('exact payment completes the debt (spec rule 6)', () => {
    expect(applyEntry(active, { kind: 'payment', amount: 10000 })).toEqual({
      principal: 10000,
      remaining: 0,
      status: 'completed',
    });
  });

  it('overpayment clamps remaining to exactly 0', () => {
    expect(applyEntry(active, { kind: 'payment', amount: 15000 })).toEqual({
      principal: 10000,
      remaining: 0,
      status: 'completed',
    });
  });

  it('increase raises principal and remaining (spec rule 7)', () => {
    expect(applyEntry(active, { kind: 'increase', amount: 2500 })).toEqual({
      principal: 12500,
      remaining: 12500,
      status: 'active',
    });
  });

  it('increase reactivates a completed debt (spec rule 7)', () => {
    const completed = { principal: 10000, remaining: 0, status: 'completed' as const };
    expect(applyEntry(completed, { kind: 'increase', amount: 500 })).toEqual({
      principal: 10500,
      remaining: 500,
      status: 'active',
    });
  });
});

describe('foldEntries (recompute after an entry is deleted)', () => {
  it('rebuilds remaining from the surviving entries', () => {
    // Original principal 10000; a 4000 payment then a 3000 payment → remaining 3000.
    const result = foldEntries(10000, [
      { kind: 'payment', amount: 4000 },
      { kind: 'payment', amount: 3000 },
    ]);
    expect(result).toEqual({ principal: 10000, remaining: 3000, status: 'active' });
  });

  it('deleting the only payment restores the full remaining (fold with no entries)', () => {
    expect(foldEntries(10000, [])).toEqual({
      principal: 10000,
      remaining: 10000,
      status: 'active',
    });
  });

  it('drops the principal back down when an increase entry is removed', () => {
    // Started at 10000, an increase of 5000 was deleted, leaving just a 2000 payment.
    expect(foldEntries(10000, [{ kind: 'payment', amount: 2000 }])).toEqual({
      principal: 10000,
      remaining: 8000,
      status: 'active',
    });
  });

  it('re-opens a debt when the payment that completed it is removed', () => {
    // originalPrincipal 10000, remaining entry is a partial 6000 payment → active again.
    expect(foldEntries(10000, [{ kind: 'payment', amount: 6000 }])).toEqual({
      principal: 10000,
      remaining: 4000,
      status: 'active',
    });
  });

  it('folds a mixed increase+payment history in order', () => {
    // 10000 principal, +5000 increase (principal 15000, remaining 15000), −7000 payment.
    expect(
      foldEntries(10000, [
        { kind: 'increase', amount: 5000 },
        { kind: 'payment', amount: 7000 },
      ]),
    ).toEqual({ principal: 15000, remaining: 8000, status: 'active' });
  });
});

describe('perCurrencyTotals', () => {
  it('buckets remaining amounts per direction and currency without conversion (spec rule 8)', () => {
    const totals = perCurrencyTotals([
      { direction: 'i_owe', currency: 'ILS', remainingAmount: 5000 },
      { direction: 'i_owe', currency: 'ILS', remainingAmount: 2500 },
      { direction: 'i_owe', currency: 'USD', remainingAmount: 10000 },
      { direction: 'owed_to_me', currency: 'JOD', remainingAmount: 30000 },
    ]);
    expect(totals.i_owe).toEqual({ ILS: 7500, USD: 10000 });
    expect(totals.owed_to_me).toEqual({ JOD: 30000 });
  });

  it('returns empty buckets for no debts', () => {
    const totals = perCurrencyTotals([]);
    expect(totals.i_owe).toEqual({});
    expect(totals.owed_to_me).toEqual({});
  });
});
