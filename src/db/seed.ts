import { newId } from '@/lib/id';

import { db } from './client';
import { categories, settings } from './schema';

const EXPENSE_SEED: [key: string, en: string, ar: string, icon: string, color: string][] = [
  ['food_drinks', 'Food & Drinks', 'طعام ومشروبات', '🍔', '#F5A623'],
  ['shopping', 'Shopping', 'تسوق', '🛍️', '#E5484D'],
  ['transportation', 'Transportation', 'مواصلات', '🚗', '#3B82F6'],
  ['internet', 'Internet', 'إنترنت', '🌐', '#8B5CF6'],
  ['phone', 'Phone', 'هاتف', '📱', '#06B6D4'],
  ['other', 'Other', 'أخرى', '📦', '#6B7280'],
];

const INCOME_SEED: [key: string, en: string, ar: string, icon: string, color: string][] = [
  ['salary', 'Salary', 'راتب', '💼', '#22A06B'],
  ['business', 'Business', 'أعمال', '🏪', '#0EA5E9'],
  ['gift', 'Gift', 'هدية', '🎁', '#EC4899'],
  ['refund', 'Refund', 'استرداد', '💸', '#F59E0B'],
  ['other', 'Other', 'أخرى', '💰', '#6B7280'],
];

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length === 0) {
    const rows = [
      ...EXPENSE_SEED.map((c, i) => ({ kind: 'expense' as const, seed: c, sortOrder: i })),
      ...INCOME_SEED.map((c, i) => ({ kind: 'income' as const, seed: c, sortOrder: i })),
    ].map(({ kind, seed, sortOrder }) => ({
      id: newId(),
      kind,
      key: seed[0],
      labelEn: seed[1],
      labelAr: seed[2],
      icon: seed[3],
      color: seed[4],
      isSystem: true,
      sortOrder,
    }));
    await db.insert(categories).values(rows);
  }

  const settingsRow = await db.select({ id: settings.id }).from(settings).limit(1);
  if (settingsRow.length === 0) {
    await db.insert(settings).values({ id: 'singleton' });
  }
}
