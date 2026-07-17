import { expenseIncomeSchema, fxSnapshotFor, transferSchema } from '../validation';

const RATES = { USD: 3.6, JOD: 5.2 };

describe('expenseIncomeSchema', () => {
  const base = {
    accountId: 'acc-1',
    type: 'expense' as const,
    categoryId: 'cat-1',
    amountMinor: 1050,
    occurredAt: new Date(),
    note: 'coffee',
  };

  it('accepts a valid expense', () => {
    expect(expenseIncomeSchema.parse(base)).toMatchObject({ amountMinor: 1050 });
  });

  it('rejects zero and negative amounts', () => {
    expect(expenseIncomeSchema.safeParse({ ...base, amountMinor: 0 }).success).toBe(false);
    expect(expenseIncomeSchema.safeParse({ ...base, amountMinor: -5 }).success).toBe(false);
  });

  it('rejects non-integer amounts (minor units are integers)', () => {
    expect(expenseIncomeSchema.safeParse({ ...base, amountMinor: 10.5 }).success).toBe(false);
  });

  it('requires account and category', () => {
    expect(expenseIncomeSchema.safeParse({ ...base, accountId: '' }).success).toBe(false);
    expect(expenseIncomeSchema.safeParse({ ...base, categoryId: '' }).success).toBe(false);
  });
});

describe('transferSchema', () => {
  const base = {
    fromAccountId: 'a',
    toAccountId: 'b',
    fromCurrency: 'ILS' as const,
    toCurrency: 'ILS' as const,
    fromAmountMinor: 1000,
    toAmountMinor: 1000,
    occurredAt: new Date(),
  };

  it('accepts a valid same-currency transfer', () => {
    expect(transferSchema.parse(base)).toMatchObject({ toAmountMinor: 1000 });
  });

  it('rejects transfers between the same account (spec 7.3)', () => {
    expect(transferSchema.safeParse({ ...base, toAccountId: 'a' }).success).toBe(false);
  });

  it('rejects same-currency transfers with mismatched amounts (spec rule 5)', () => {
    expect(transferSchema.safeParse({ ...base, toAmountMinor: 999 }).success).toBe(false);
  });

  it('accepts differing amounts across currencies', () => {
    const cross = {
      ...base,
      toCurrency: 'USD' as const,
      toAmountMinor: 278,
    };
    expect(transferSchema.parse(cross)).toMatchObject({ toAmountMinor: 278 });
  });

  it('rejects non-positive amounts', () => {
    expect(transferSchema.safeParse({ ...base, fromAmountMinor: 0 }).success).toBe(false);
  });
});

describe('fxSnapshotFor', () => {
  it('is null for ILS (no conversion needed)', () => {
    expect(fxSnapshotFor('ILS', RATES)).toBeNull();
  });

  it('snapshots the current rate for USD and JOD', () => {
    expect(fxSnapshotFor('USD', RATES)).toBe(3.6);
    expect(fxSnapshotFor('JOD', RATES)).toBe(5.2);
  });
});
