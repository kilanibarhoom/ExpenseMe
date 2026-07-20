import { useQuery } from '@tanstack/react-query';
import { and, desc, eq, isNull, or } from 'drizzle-orm';

import { localDb as db } from '@/db/local';
import { accounts, settings, transactions, transfers, type LocalAccount as Account } from '@/db/local-schema';
import { enqueueChange } from '@/features/sync/outbox';
import { newId } from '@/lib/id';
import type { Currency } from '@/lib/money';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useSettings } from '@/lib/settings-store';

import { applyBalanceDelta } from './balance';

export interface AccountWithBalance {
  account: Account;
  balanceMinor: number;
}

/** List of non-archived accounts with their stored balances (own currency, minor units). */
export function useAccountsWithBalances(): { data: AccountWithBalance[]; loaded: boolean } {
  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () =>
      db
        .select()
        .from(accounts)
        .where(isNull(accounts.archivedAt))
        .orderBy(desc(accounts.isDefault), accounts.createdAt),
  });

  const data = (accountsQuery.data ?? []).map((account) => ({
    account,
    balanceMinor: account.balance,
  }));
  return { data, loaded: accountsQuery.data !== undefined };
}

export function useAccount(id: string | undefined): Account | undefined {
  const { data } = useQuery({
    queryKey: queryKeys.account(id ?? ''),
    queryFn: async () => (await db.select().from(accounts).where(eq(accounts.id, id!)))[0],
    enabled: !!id,
  });
  return data;
}

export interface CreateAccountInput {
  name: string;
  type: 'cash' | 'bank';
  currency: Currency;
  balanceMinor: number;
  makeDefault: boolean;
  icon?: string;
  color?: string;
}

export async function createAccount(input: CreateAccountInput): Promise<string> {
  const id = newId();
  const existing = await db.select({ id: accounts.id }).from(accounts).limit(1);
  const makeDefault = input.makeDefault || existing.length === 0;
  const now = new Date();
  db.transaction((tx) => {
    if (makeDefault) {
      tx.update(accounts).set({ isDefault: false, updatedAt: now }).where(eq(accounts.isDefault, true)).run();
    }
    tx.insert(accounts)
      .values({
        id,
        name: input.name,
        type: input.type,
        currency: input.currency,
        balance: input.balanceMinor,
        isDefault: makeDefault,
        icon: input.icon,
        color: input.color,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });
  await enqueueChange('accounts', id, 'insert');
  if (makeDefault) {
    await useSettings.getState().setDefaultAccountId(id);
  }
  await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  return id;
}

export async function setDefaultAccount(id: string): Promise<void> {
  const now = new Date();
  const previousDefaults = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.isDefault, true)));
  db.transaction((tx) => {
    tx.update(accounts).set({ isDefault: false, updatedAt: now }).where(eq(accounts.isDefault, true)).run();
    tx.update(accounts).set({ isDefault: true, updatedAt: now }).where(eq(accounts.id, id)).run();
  });
  for (const row of previousDefaults) {
    if (row.id !== id) await enqueueChange('accounts', row.id, 'update');
  }
  await enqueueChange('accounts', id, 'update');
  await useSettings.getState().setDefaultAccountId(id);
  await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
}

export async function updateAccount(
  id: string,
  patch: { name?: string; icon?: string; color?: string; type?: 'cash' | 'bank'; balance?: number },
): Promise<void> {
  await db.update(accounts).set({ ...patch, updatedAt: new Date() }).where(eq(accounts.id, id));
  await enqueueChange('accounts', id, 'update');
  await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  await queryClient.invalidateQueries({ queryKey: queryKeys.account(id) });
}

/** Spec rule 3: block archiving when the account has any activity. */
export async function archiveAccount(id: string): Promise<'ok' | 'blocked'> {
  const [tx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.accountId, id))
    .limit(1);
  const [tr] = await db
    .select({ id: transfers.id })
    .from(transfers)
    .where(and(eq(transfers.fromAccountId, id)))
    .limit(1);
  const [tr2] = await db
    .select({ id: transfers.id })
    .from(transfers)
    .where(and(eq(transfers.toAccountId, id)))
    .limit(1);
  if (tx || tr || tr2) return 'blocked';
  await db
    .update(accounts)
    .set({ archivedAt: new Date(), isDefault: false, updatedAt: new Date() })
    .where(eq(accounts.id, id));
  await enqueueChange('accounts', id, 'update');
  await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  await queryClient.invalidateQueries({ queryKey: queryKeys.account(id) });
  return 'ok';
}

/**
 * Permanently delete an account and everything that references it: its own
 * transactions, any transfer touching it (as source or destination), and the
 * default-account pointer if it was set to this account. Unlike archiving, this
 * is not blocked by activity — the caller confirms the destructive count first.
 */
export async function deleteAccount(id: string): Promise<void> {
  const wasDefault = useSettings.getState().defaultAccountId === id;
  const [doomedTx, doomedTransfers] = await Promise.all([
    db.select({ id: transactions.id }).from(transactions).where(eq(transactions.accountId, id)),
    db
      .select({
        id: transfers.id,
        fromAccountId: transfers.fromAccountId,
        toAccountId: transfers.toAccountId,
        fromAmount: transfers.fromAmount,
        toAmount: transfers.toAmount,
      })
      .from(transfers)
      .where(or(eq(transfers.fromAccountId, id), eq(transfers.toAccountId, id))),
  ]);

  // Some doomed transfers belong to another account's history — that
  // account's stored balance must be corrected once the transfer is gone.
  const otherAccountIds = new Set<string>();
  for (const t of doomedTransfers) {
    if (t.fromAccountId !== id) otherAccountIds.add(t.fromAccountId);
    if (t.toAccountId !== id) otherAccountIds.add(t.toAccountId);
  }

  db.transaction((tx) => {
    tx.delete(transactions).where(eq(transactions.accountId, id)).run();
    tx.delete(transfers).where(or(eq(transfers.fromAccountId, id), eq(transfers.toAccountId, id))).run();
    for (const t of doomedTransfers) {
      if (t.fromAccountId === id) applyBalanceDelta(tx, t.toAccountId, -t.toAmount);
      else applyBalanceDelta(tx, t.fromAccountId, t.fromAmount);
    }
    if (wasDefault) {
      tx.update(settings).set({ defaultAccountId: null }).where(eq(settings.id, 'singleton')).run();
    }
    tx.delete(accounts).where(eq(accounts.id, id)).run();
  });

  for (const row of doomedTx) await enqueueChange('transactions', row.id, 'delete');
  for (const row of doomedTransfers) await enqueueChange('transfers', row.id, 'delete');
  for (const otherId of otherAccountIds) await enqueueChange('accounts', otherId, 'update');
  if (wasDefault) await enqueueChange('settings', 'singleton', 'update');
  await enqueueChange('accounts', id, 'delete');

  if (wasDefault) await useSettings.getState().hydrate();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.account(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactionsAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transfersAll }),
  ]);
}
