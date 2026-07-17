import { newId } from '@/lib/id';

import { db } from './client';
import { categories, settings } from './schema';

// Expense colors are the pie chart's categorical palette — the set below
// passes the dataviz six-checks validator (lightness band, chroma floor,
// CVD separation, contrast) on both light and dark surfaces.
const EXPENSE_SEED: [key: string, en: string, ar: string, icon: string, color: string][] = [
  ['food_drinks', 'Food & Drinks', 'طعام ومشروبات', '🍔', '#B45309'],
  ['shopping', 'Shopping', 'تسوق', '🛍️', '#DC2626'],
  ['transportation', 'Transportation', 'مواصلات', '🚗', '#2563EB'],
  ['internet', 'Internet', 'إنترنت', '🌐', '#7C3AED'],
  ['phone', 'Phone', 'هاتف', '📱', '#0D9488'],
  ['other', 'Other', 'أخرى', '📦', '#4D7C0F'],
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
