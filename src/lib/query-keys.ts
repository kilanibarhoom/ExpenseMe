/**
 * Central query-key registry so mutations can invalidate exactly the reads
 * they affect. Each key must map to exactly one query *shape* — React Query
 * dedupes/caches by key alone, so two hooks sharing a key but selecting
 * different columns will silently serve each other's cached rows.
 */
export const queryKeys = {
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
  // Full-shape rows (occurredAt, currency, category info, ...) for the activity feed.
  transactionsAll: ['transactions', 'all'] as const,
  transfersAll: ['transfers', 'all'] as const,
  // Single full rows for the edit form.
  transaction: (id: string) => ['transactions', 'one', id] as const,
  transfer: (id: string) => ['transfers', 'one', id] as const,
  categories: (kind?: 'expense' | 'income') => ['categories', kind ?? 'all'] as const,
  debts: ['debts'] as const,
  debt: (id: string) => ['debts', id] as const,
  debtEntries: (debtId: string) => ['debtEntries', debtId] as const,
};
