import { db } from '@/db/client';
import { transactions, transfers } from '@/db/schema';
import { newId } from '@/lib/id';
import { impliedRate, type Currency } from '@/lib/money';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

import {
  expenseIncomeSchema,
  fxSnapshotFor,
  transferSchema,
  type ExpenseIncomeInput,
  type TransferInput,
} from './validation';

async function invalidateAccountsAndTransactions(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactionsAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactionsForBalances }),
  ]);
}

/** Insert a validated expense/income row, snapshotting the FX rate for non-ILS. */
export async function addTransaction(
  input: ExpenseIncomeInput & { currency: Currency },
  rates: { USD: number; JOD: number },
): Promise<void> {
  const parsed = expenseIncomeSchema.parse(input);
  await db.insert(transactions).values({
    id: newId(),
    accountId: parsed.accountId,
    type: parsed.type,
    amount: parsed.amountMinor,
    currency: input.currency,
    categoryId: parsed.categoryId,
    note: parsed.note?.trim() ? parsed.note.trim() : null,
    occurredAt: parsed.occurredAt,
    fxRateToIls: fxSnapshotFor(input.currency, rates),
  });
  await invalidateAccountsAndTransactions();
}

/** Insert a validated transfer, storing the implied rate when currencies differ. */
export async function addTransfer(input: TransferInput): Promise<void> {
  const parsed = transferSchema.parse(input);
  await db.insert(transfers).values({
    id: newId(),
    fromAccountId: parsed.fromAccountId,
    toAccountId: parsed.toAccountId,
    fromAmount: parsed.fromAmountMinor,
    toAmount: parsed.toAmountMinor,
    fromCurrency: parsed.fromCurrency,
    toCurrency: parsed.toCurrency,
    impliedRate:
      parsed.fromCurrency === parsed.toCurrency
        ? null
        : impliedRate(parsed.fromAmountMinor, parsed.fromCurrency, parsed.toAmountMinor, parsed.toCurrency),
    note: parsed.note?.trim() ? parsed.note.trim() : null,
    occurredAt: parsed.occurredAt,
  });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transfersAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transfersForBalances }),
  ]);
}
