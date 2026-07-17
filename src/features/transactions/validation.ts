import { z } from 'zod';

import type { Currency } from '@/lib/money';

const currencyEnum = z.enum(['ILS', 'JOD', 'USD']);
const positiveMinor = z.number().int().positive();

export const expenseIncomeSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(['expense', 'income']),
  categoryId: z.string().min(1),
  amountMinor: positiveMinor,
  occurredAt: z.date(),
  note: z.string().optional(),
});
export type ExpenseIncomeInput = z.infer<typeof expenseIncomeSchema>;

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    fromCurrency: currencyEnum,
    toCurrency: currencyEnum,
    fromAmountMinor: positiveMinor,
    toAmountMinor: positiveMinor,
    occurredAt: z.date(),
    note: z.string().optional(),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, { message: 'same-account' })
  .refine((v) => v.fromCurrency !== v.toCurrency || v.fromAmountMinor === v.toAmountMinor, {
    // Spec rule 5: same-currency transfers move the exact same amount
    message: 'amount-mismatch',
  });
export type TransferInput = z.infer<typeof transferSchema>;

/** Rate snapshot stored with a non-ILS transaction at creation (spec §2.5). */
export function fxSnapshotFor(
  currency: Currency,
  rates: { USD: number; JOD: number },
): number | null {
  if (currency === 'ILS') return null;
  return rates[currency];
}
