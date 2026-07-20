import { useQuery } from '@tanstack/react-query';
import { asc, desc, eq } from 'drizzle-orm';

import { localDb as db } from '@/db/local';
import { debtEntries, debts, type LocalDebt as Debt, type LocalDebtEntry as DebtEntry } from '@/db/local-schema';
import { enqueueChange } from '@/features/sync/outbox';
import { newId } from '@/lib/id';
import type { Currency } from '@/lib/money';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

import { applyEntry, foldEntries } from './logic';

async function invalidateDebt(debtId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.debts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debt(debtId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debtEntries(debtId) }),
  ]);
}

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
  await enqueueChange('debts', id, 'insert');
  await queryClient.invalidateQueries({ queryKey: queryKeys.debts });
  return id;
}

/**
 * Record a payment/increase and update the debt row in one local transaction
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
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId));
  if (!debt) throw new Error('Debt not found');
  const next = applyEntry(
    { principal: debt.principalAmount, remaining: debt.remainingAmount, status: debt.status },
    { kind, amount: amountMinor },
  );
  const entryId = newId();
  db.transaction((tx) => {
    tx.insert(debtEntries)
      .values({
        id: entryId,
        debtId,
        kind,
        amount: amountMinor,
        note: note?.trim() ? note.trim() : null,
        occurredAt: occurredAt ?? new Date(),
      })
      .run();
    tx.update(debts)
      .set({
        principalAmount: next.principal,
        remainingAmount: next.remaining,
        status: next.status,
        completedAt: next.status === 'completed' ? (debt.completedAt ?? new Date()) : null,
      })
      .where(eq(debts.id, debtId))
      .run();
  });
  await enqueueChange('debtEntries', entryId, 'insert');
  await enqueueChange('debts', debtId, 'update');
  await invalidateDebt(debtId);
}

/** "Full Pay": one payment equal to remaining → remaining 0, completed (spec rule 6). */
export async function fullPay(debtId: string): Promise<void> {
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId));
  if (!debt || debt.remainingAmount <= 0) return;
  await addDebtEntry(debtId, 'payment', debt.remainingAmount);
}

export async function deleteDebt(debtId: string): Promise<void> {
  const doomedEntries = await db.select({ id: debtEntries.id }).from(debtEntries).where(eq(debtEntries.debtId, debtId));
  db.transaction((tx) => {
    tx.delete(debtEntries).where(eq(debtEntries.debtId, debtId)).run();
    tx.delete(debts).where(eq(debts.id, debtId)).run();
  });
  for (const row of doomedEntries) await enqueueChange('debtEntries', row.id, 'delete');
  await enqueueChange('debts', debtId, 'delete');
  await invalidateDebt(debtId);
}

/** Edit a debt's descriptive fields (person, note). Amounts/status stay entry-driven. */
export async function updateDebt(
  debtId: string,
  patch: { personName?: string; note?: string | null },
): Promise<void> {
  const set: { personName?: string; note?: string | null } = {};
  if (patch.personName !== undefined) set.personName = patch.personName.trim();
  if (patch.note !== undefined) set.note = patch.note?.trim() ? patch.note.trim() : null;
  await db.update(debts).set(set).where(eq(debts.id, debtId));
  await enqueueChange('debts', debtId, 'update');
  await invalidateDebt(debtId);
}

/**
 * Delete a single ledger entry and rebuild the debt's principal/remaining/status
 * from the surviving entries (spec §10 — running totals can't be adjusted in place
 * because payments clamp at 0 and increases raise principal).
 */
export async function deleteDebtEntry(entryId: string, debtId: string): Promise<void> {
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId));
  if (!debt) throw new Error('Debt not found');
  const allEntries = await db
    .select()
    .from(debtEntries)
    .where(eq(debtEntries.debtId, debtId))
    .orderBy(asc(debtEntries.occurredAt), asc(debtEntries.createdAt));

  // Original principal = stored principal minus every increase ever applied.
  const totalIncreases = allEntries
    .filter((e) => e.kind === 'increase')
    .reduce((sum, e) => sum + e.amount, 0);
  const originalPrincipal = debt.principalAmount - totalIncreases;

  const survivors = allEntries.filter((e) => e.id !== entryId);
  const next = foldEntries(originalPrincipal, survivors);

  db.transaction((tx) => {
    tx.delete(debtEntries).where(eq(debtEntries.id, entryId)).run();
    tx.update(debts)
      .set({
        principalAmount: next.principal,
        remainingAmount: next.remaining,
        status: next.status,
        completedAt: next.status === 'completed' ? (debt.completedAt ?? new Date()) : null,
      })
      .where(eq(debts.id, debtId))
      .run();
  });
  await enqueueChange('debtEntries', entryId, 'delete');
  await enqueueChange('debts', debtId, 'update');
  await invalidateDebt(debtId);
}

export function useDebts(filter: { search: string; status: 'active' | 'completed' }): {
  debts: Debt[];
  allActive: Debt[];
} {
  const query = useQuery({
    queryKey: queryKeys.debts,
    queryFn: () => db.select().from(debts).orderBy(desc(debts.createdAt)),
  });
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
  const debtQuery = useQuery({
    queryKey: queryKeys.debt(id),
    queryFn: () => db.select().from(debts).where(eq(debts.id, id)),
  });
  const entriesQuery = useQuery({
    queryKey: queryKeys.debtEntries(id),
    queryFn: () =>
      db.select().from(debtEntries).where(eq(debtEntries.debtId, id)).orderBy(desc(debtEntries.occurredAt)),
  });
  return { debt: debtQuery.data?.[0], entries: entriesQuery.data ?? [] };
}
