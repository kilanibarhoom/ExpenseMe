import { useQuery } from '@tanstack/react-query';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { accounts, transactions, transfers, type Account } from '@/db/schema';
import { newId } from '@/lib/id';
import type { Currency } from '@/lib/money';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useSettings } from '@/lib/settings-store';

import { deriveBalance, type ActivitySums } from './logic';

export interface AccountWithBalance {
  account: Account;
  balanceMinor: number;
}

function sumActivity(
  accountId: string,
  txs: { accountId: string; type: 'expense' | 'income'; amount: number }[],
  trs: { fromAccountId: string; toAccountId: string; fromAmount: number; toAmount: number }[],
): ActivitySums {
  const sums: ActivitySums = { income: 0, expense: 0, transfersIn: 0, transfersOut: 0 };
  for (const tx of txs) {
    if (tx.accountId !== accountId) continue;
    if (tx.type === 'income') sums.income += tx.amount;
    else sums.expense += tx.amount;
  }
  for (const tr of trs) {
    if (tr.toAccountId === accountId) sums.transfersIn += tr.toAmount;
    if (tr.fromAccountId === accountId) sums.transfersOut += tr.fromAmount;
  }
  return sums;
}

/** List of non-archived accounts with derived balances (own currency, minor units). */
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
  const txQuery = useQuery({
    queryKey: queryKeys.transactionsForBalances,
    queryFn: () =>
      db
        .select({ accountId: transactions.accountId, type: transactions.type, amount: transactions.amount })
        .from(transactions),
  });
  const trQuery = useQuery({
    queryKey: queryKeys.transfersForBalances,
    queryFn: () =>
      db
        .select({
          fromAccountId: transfers.fromAccountId,
          toAccountId: transfers.toAccountId,
          fromAmount: transfers.fromAmount,
          toAmount: transfers.toAmount,
        })
        .from(transfers),
  });

  const data = (accountsQuery.data ?? []).map((account) => ({
    account,
    balanceMinor: deriveBalance(
      account.initialBalance,
      sumActivity(account.id, txQuery.data ?? [], trQuery.data ?? []),
    ),
  }));
  return { data, loaded: accountsQuery.data !== undefined };
}

export function useAccount(id: string): Account | undefined {
  const { data } = useQuery({
    queryKey: queryKeys.account(id),
    queryFn: async () => (await db.select().from(accounts).where(eq(accounts.id, id)))[0],
  });
  return data;
}

export interface CreateAccountInput {
  name: string;
  type: 'cash' | 'bank';
  currency: Currency;
  initialBalanceMinor: number;
  makeDefault: boolean;
  icon?: string;
  color?: string;
}

export async function createAccount(input: CreateAccountInput): Promise<string> {
  const id = newId();
  const existing = await db.select({ id: accounts.id }).from(accounts).limit(1);
  const makeDefault = input.makeDefault || existing.length === 0;
  const insert = db.insert(accounts).values({
    id,
    name: input.name,
    type: input.type,
    currency: input.currency,
    initialBalance: input.initialBalanceMinor,
    isDefault: makeDefault,
    icon: input.icon,
    color: input.color,
  });
  if (makeDefault) {
    await db.batch([db.update(accounts).set({ isDefault: false }).where(eq(accounts.isDefault, true)), insert]);
    await useSettings.getState().setDefaultAccountId(id);
  } else {
    await insert;
  }
  await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  return id;
}

export async function setDefaultAccount(id: string): Promise<void> {
  await db.batch([
    db.update(accounts).set({ isDefault: false }).where(eq(accounts.isDefault, true)),
    db.update(accounts).set({ isDefault: true, updatedAt: new Date() }).where(eq(accounts.id, id)),
  ]);
  await useSettings.getState().setDefaultAccountId(id);
  await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
}

export async function updateAccount(
  id: string,
  patch: { name?: string; icon?: string; color?: string; type?: 'cash' | 'bank' },
): Promise<void> {
  await db.update(accounts).set({ ...patch, updatedAt: new Date() }).where(eq(accounts.id, id));
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
  await queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  await queryClient.invalidateQueries({ queryKey: queryKeys.account(id) });
  return 'ok';
}
