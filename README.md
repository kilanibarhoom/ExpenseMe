# KilaniExpense (Finny)

Offline-first, bilingual (English/Arabic, RTL-aware) personal finance tracker for iOS-first, built with **Expo SDK 57 + React Native 0.86**. Full spec: [`KilaniExpense.md`](./KilaniExpense.md).

- **Wallets** in ILS / JOD / USD with derived balances and a combined total converted to ILS.
- **Quick add** — expense, income and (cross-currency) transfers from a center liquid-glass FAB.
- **Reports** — period breakdowns (day/week/month/year/custom), expense-by-category donut, income-vs-expense trend, per-wallet subtotals, optional exact-at-time FX.
- **Debts** — standalone per-currency ledger with payment / full-pay / increase flows and entry history.
- **Liquid glass** (iOS 26) on navigation chrome only, with solid fallbacks for older iOS / Android / reduce-transparency.

## Getting started

```bash
npm install
npx expo run:ios      # dev build — glass modules are NOT reliable in Expo Go
```

Requires Xcode 26+ for the iOS 26 liquid-glass effects (older Xcode/iOS get the solid fallback automatically). For a cloud build use EAS: `eas build --profile development --platform ios`.

```bash
npm test          # jest unit tests (money, fx, debts, reports logic)
npm run typecheck # tsc --noEmit
```

## Architecture

```
src/
  app/                  # expo-router routes
    (tabs)/             # Home · Reports · Debts · Settings + glass tab bar
    quick-add.tsx       # modal: Expense | Income | Transfer
    onboarding.tsx      # first-launch intro → first wallet
    account/            # new wallet, wallet detail
    debt/               # new debt, debt detail
  components/           # UI building blocks (glass/, charts/, cards, forms)
  db/                   # drizzle schema, client, migrations gate, seed
  features/             # accounts, transactions, transfers, debts, reports, fx
    */logic.ts          # pure, unit-tested business rules
    */queries.ts        # drizzle live queries + mutations
  i18n/                 # en.json, ar.json + i18next setup
  lib/                  # money (integer minor units), theme, settings store, ids
drizzle/                # generated SQL migrations (bundled via metro/babel)
```

Key invariants (see spec §11):

- Money is stored as **integer minor units** (ILS ×100, USD ×100, JOD ×1000) — never floats.
- Base currency is **ILS**; combined totals use the latest cached rate from a swappable `FxProvider` (default: open.er-api.com, key-less); non-ILS transactions snapshot `fx_rate_to_ils` at creation.
- Transfers never appear in income/expense totals; debts never touch wallet balances; per-currency debt summaries are never converted.
- Multi-row mutations (transfers, debt entries + status) run inside SQLite transactions.
