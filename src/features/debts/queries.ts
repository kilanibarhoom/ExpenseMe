import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { debtEntries, debts, type Debt, type DebtEntry } from '@/db/schema';
import { newId } from '@/lib/id';
import type { Currency } from '@/lib/money';

import { applyEntry } from './logic';

export interface CreateDebtInput {
  direction: 'i_owe' | 'owed_to_me';
  personName: string;
  currency: Currency;
  principalMinor: number;
  occurredAt?: Date;
  note?: string;
}

export async function createDebt(input: CreateDebtInput): Promise<string> {
  const id = newId();
  await db.insert(debts).values({
    id,
    direction: input.direction,
    personName: input.personName.trim(),
    currency: input.currency,
    principalAmount: input.principalMinor,
    remainingAmount: input.principalMinor,
    status: 'active',
    note: input.note?.trim() ? input.note.trim() : null,
    createdAt: input.occurredAt ?? new Date(),
  });
  return id;
}

/**
 * Record a payment/increase and update the debt row in one DB transaction
 * (spec §10 data integrity — remaining/status recomputed atomically).
 */
export async function addDebtEntry(
  debtId: string,
  kind: 'payment' | 'increase',
  amountMinor: number,
  note?: string,
  occurredAt?: Date,
): Promise<void> {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Amount must be a positive integer of minor units');
  }
  await db.transaction(async (tx) => {
    const [debt] = await tx.select().from(debts).where(eq(debts.id, debtId));
    if (!debt) throw new Error('Debt not found');
    const next = applyEntry(
      { principal: debt.principalAmount, remaining: debt.remainingAmount, status: debt.status },
      { kind, amount: amountMinor },
    );
    await tx.insert(debtEntries).values({
      id: newId(),
      debtId,
      kind,
      amount: amountMinor,
      note: note?.trim() ? note.trim() : null,
      occurredAt: occurredAt ?? new Date(),
    });
    await tx
      .update(debts)
      .set({
        principalAmount: next.principal,
        remainingAmount: next.remaining,
        status: next.status,
        completedAt:
          next.status === 'completed' ? (debt.completedAt ?? new Date()) : null,
      })
      .where(eq(debts.id, debtId));
  });
}

/** "Full Pay": one payment equal to remaining → remaining 0, completed (spec rule 6). */
export async function fullPay(debtId: string): Promise<void> {
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId));
  if (!debt || debt.remainingAmount <= 0) return;
  await addDebtEntry(debtId, 'payment', debt.remainingAmount);
}

export async function deleteDebt(debtId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(debtEntries).where(eq(debtEntries.debtId, debtId));
    await tx.delete(debts).where(eq(debts.id, debtId));
  });
}

export function useDebts(filter: { search: string; status: 'active' | 'completed' }): {
  debts: Debt[];
  allActive: Debt[];
} {
  const query = useLiveQuery(db.select().from(debts).orderBy(desc(debts.createdAt)));
  const all = query.data ?? [];
  const q = filter.search.trim().toLowerCase();
  return {
    debts: all.filter(
      (d) => d.status === filter.status && (q === '' || d.personName.toLowerCase().includes(q)),
    ),
    allActive: all.filter((d) => d.status === 'active'),
  };
}

export function useDebt(id: string): { debt: Debt | undefined; entries: DebtEntry[] } {
  const debtQuery = useLiveQuery(db.select().from(debts).where(eq(debts.id, id)), [id]);
  const entriesQuery = useLiveQuery(
    db.select().from(debtEntries).where(eq(debtEntries.debtId, id)).orderBy(desc(debtEntries.occurredAt)),
    [id],
  );
  return { debt: debtQuery.data?.[0], entries: entriesQuery.data ?? [] };
}
