import { getTableColumns } from 'drizzle-orm';

import * as schema from '../schema';

describe('schema', () => {
  it('defines all eight tables from the spec', () => {
    for (const table of [
      schema.accounts,
      schema.categories,
      schema.transactions,
      schema.transfers,
      schema.debts,
      schema.debtEntries,
      schema.fxRates,
      schema.settings,
    ]) {
      expect(table).toBeDefined();
    }
  });

  it('uses the three supported currencies', () => {
    expect(schema.CURRENCY_ENUM).toEqual(['ILS', 'JOD', 'USD']);
    expect(getTableColumns(schema.accounts).currency.enumValues).toEqual(['ILS', 'JOD', 'USD']);
  });

  it('models spec enums exactly', () => {
    expect(getTableColumns(schema.accounts).type.enumValues).toEqual(['cash', 'bank']);
    expect(getTableColumns(schema.transactions).type.enumValues).toEqual(['expense', 'income']);
    expect(getTableColumns(schema.debts).direction.enumValues).toEqual(['i_owe', 'owed_to_me']);
    expect(getTableColumns(schema.debts).status.enumValues).toEqual(['active', 'completed']);
    expect(getTableColumns(schema.debtEntries).kind.enumValues).toEqual(['payment', 'increase']);
    expect(getTableColumns(schema.fxRates).quote.enumValues).toEqual(['USD', 'JOD']);
  });

  it('stores amounts as integers (minor units)', () => {
    expect(getTableColumns(schema.transactions).amount.getSQLType()).toBe('integer');
    expect(getTableColumns(schema.debts).remainingAmount.getSQLType()).toBe('integer');
    expect(getTableColumns(schema.transfers).fromAmount.getSQLType()).toBe('integer');
  });
});
