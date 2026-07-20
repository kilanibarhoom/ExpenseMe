import { eq } from 'drizzle-orm';

import { localDb as db } from '@/db/local';
import { transactions, transfers } from '@/db/local-schema';
import { applyBalanceDelta } from '@/features/accounts/balance';
import { enqueueChange } from '@/features/sync/outbox';
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
  ]);
}

async function invalidateAccountsAndTransfers(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transfersAll }),
  ]);
}

/** Signed effect of an expense/income on its account's balance. */
function transactionDelta(type: 'expense' | 'income', amount: number): number {
  return type === 'income' ? amount : -amount;
}

/** Insert a validated expense/income row, snapshotting the FX rate for non-ILS. */
export async function addTransaction(
  input: ExpenseIncomeInput & { currency: Currency },
  rates: { USD: number; JOD: number },
): Promise<void> {
  const parsed = expenseIncomeSchema.parse(input);
  const id = newId();
  db.transaction((tx) => {
    tx.insert(transactions)
      .values({
        id,
        accountId: parsed.accountId,
        type: parsed.type,
        amount: parsed.amountMinor,
        currency: input.currency,
        categoryId: parsed.categoryId,
        note: parsed.note?.trim() ? parsed.note.trim() : null,
        occurredAt: parsed.occurredAt,
        fxRateToIls: fxSnapshotFor(input.currency, rates),
      })
      .run();
    applyBalanceDelta(tx, parsed.accountId, transactionDelta(parsed.type, parsed.amountMinor));
  });
  await enqueueChange('transactions', id, 'insert');
  await enqueueChange('accounts', parsed.accountId, 'update');
  await invalidateAccountsAndTransactions();
}

/** Insert a validated transfer, storing the implied rate when currencies differ. */
export async function addTransfer(input: TransferInput): Promise<void> {
  const parsed = transferSchema.parse(input);
  const id = newId();
  db.transaction((tx) => {
    tx.insert(transfers)
      .values({
        id,
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
      })
      .run();
    applyBalanceDelta(tx, parsed.fromAccountId, -parsed.fromAmountMinor);
    applyBalanceDelta(tx, parsed.toAccountId, parsed.toAmountMinor);
  });
  await enqueueChange('transfers', id, 'insert');
  await enqueueChange('accounts', parsed.fromAccountId, 'update');
  await enqueueChange('accounts', parsed.toAccountId, 'update');
  await invalidateAccountsAndTransfers();
}

/** Update an existing expense/income row, re-snapshotting the FX rate for non-ILS. */
export async function updateTransaction(
  id: string,
  input: ExpenseIncomeInput & { currency: Currency },
  rates: { USD: number; JOD: number },
): Promise<void> {
  const parsed = expenseIncomeSchema.parse(input);
  const [existing] = await db
    .select({ accountId: transactions.accountId, type: transactions.type, amount: transactions.amount })
    .from(transactions)
    .where(eq(transactions.id, id));
  if (!existing) throw new Error('Transaction not found');

  db.transaction((tx) => {
    tx.update(transactions)
      .set({
        accountId: parsed.accountId,
        type: parsed.type,
        amount: parsed.amountMinor,
        currency: input.currency,
        categoryId: parsed.categoryId,
        note: parsed.note?.trim() ? parsed.note.trim() : null,
        occurredAt: parsed.occurredAt,
        fxRateToIls: fxSnapshotFor(input.currency, rates),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .run();
    // Reverse the old effect, then apply the new one — correct whether the
    // amount, type, account, or any combination of the three changed, since
    // applyBalanceDelta composes via a SQL increment.
    applyBalanceDelta(tx, existing.accountId, -transactionDelta(existing.type, existing.amount));
    applyBalanceDelta(tx, parsed.accountId, transactionDelta(parsed.type, parsed.amountMinor));
  });

  await enqueueChange('transactions', id, 'update');
  for (const accId of new Set([existing.accountId, parsed.accountId])) {
    await enqueueChange('accounts', accId, 'update');
  }
  await invalidateAccountsAndTransactions();
}

/** Permanently delete an expense/income row. */
export async function deleteTransaction(id: string): Promise<void> {
  const [existing] = await db
    .select({ accountId: transactions.accountId, type: transactions.type, amount: transactions.amount })
    .from(transactions)
    .where(eq(transactions.id, id));
  if (!existing) return;
  db.transaction((tx) => {
    tx.delete(transactions).where(eq(transactions.id, id)).run();
    applyBalanceDelta(tx, existing.accountId, -transactionDelta(existing.type, existing.amount));
  });
  await enqueueChange('transactions', id, 'delete');
  await enqueueChange('accounts', existing.accountId, 'update');
  await invalidateAccountsAndTransactions();
}

/** Update an existing transfer, recomputing the implied rate when currencies differ. */
export async function updateTransfer(id: string, input: TransferInput): Promise<void> {
  const parsed = transferSchema.parse(input);
  const [existing] = await db
    .select({
      fromAccountId: transfers.fromAccountId,
      toAccountId: transfers.toAccountId,
      fromAmount: transfers.fromAmount,
      toAmount: transfers.toAmount,
    })
    .from(transfers)
    .where(eq(transfers.id, id));
  if (!existing) throw new Error('Transfer not found');

  db.transaction((tx) => {
    tx.update(transfers)
      .set({
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
      })
      .where(eq(transfers.id, id))
      .run();
    // Reverse the old effect on the old from/to accounts...
    applyBalanceDelta(tx, existing.fromAccountId, existing.fromAmount);
    applyBalanceDelta(tx, existing.toAccountId, -existing.toAmount);
    // ...then apply the new effect on the (possibly different) new from/to accounts.
    applyBalanceDelta(tx, parsed.fromAccountId, -parsed.fromAmountMinor);
    applyBalanceDelta(tx, parsed.toAccountId, parsed.toAmountMinor);
  });

  await enqueueChange('transfers', id, 'update');
  for (const accId of new Set([existing.fromAccountId, existing.toAccountId, parsed.fromAccountId, parsed.toAccountId])) {
    await enqueueChange('accounts', accId, 'update');
  }
  await invalidateAccountsAndTransfers();
}

/** Permanently delete a transfer. */
export async function deleteTransfer(id: string): Promise<void> {
  const [existing] = await db
    .select({
      fromAccountId: transfers.fromAccountId,
      toAccountId: transfers.toAccountId,
      fromAmount: transfers.fromAmount,
      toAmount: transfers.toAmount,
    })
    .from(transfers)
    .where(eq(transfers.id, id));
  if (!existing) return;
  db.transaction((tx) => {
    tx.delete(transfers).where(eq(transfers.id, id)).run();
    applyBalanceDelta(tx, existing.fromAccountId, existing.fromAmount);
    applyBalanceDelta(tx, existing.toAccountId, -existing.toAmount);
  });
  await enqueueChange('transfers', id, 'delete');
  await enqueueChange('accounts', existing.fromAccountId, 'update');
  await enqueueChange('accounts', existing.toAccountId, 'update');
  await invalidateAccountsAndTransfers();
}
