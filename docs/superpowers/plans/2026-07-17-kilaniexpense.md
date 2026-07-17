# KilaniExpense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Finny/KilaniExpense — an offline-first, bilingual (en/ar RTL) personal finance tracker (wallets in ILS/JOD/USD, quick-add expense/income/transfer, FX-converted reports, standalone debts ledger) per `KilaniExpense.md`.

**Architecture:** Expo SDK 57 + Expo Router app. All data local in SQLite via Drizzle ORM; pure business logic (money math, FX conversion, balances, debt ledger, period grouping) lives in `lib/` + `features/*/logic.ts` and is unit-tested with jest-expo. UI reads via Drizzle live queries; FX rates fetched via a swappable `FxProvider` cached in SQLite with TanStack Query. Liquid-glass chrome (custom tab bar, FAB, modals) via `expo-glass-effect` guarded by `isLiquidGlassAvailable()` with solid fallbacks.

**Tech Stack:** Expo SDK 57 (RN 0.86, TS strict), expo-router, expo-sqlite + drizzle-orm + drizzle-kit, @tanstack/react-query, zustand, react-native-reanimated, react-native-gesture-handler, @shopify/flash-list, react-native-gifted-charts (+ react-native-svg, expo-linear-gradient), i18next + react-i18next + expo-localization, date-fns, react-hook-form + zod, expo-glass-effect, jest-expo.

## Global Constraints

- Money is **integer minor units** end-to-end. Scales: **ILS=2, USD=2, JOD=3**. No floats in stored amounts.
- Base currency **ILS** (fixed). Combined totals convert via latest cached rate; each non-ILS transaction stores `fx_rate_to_ils` snapshot.
- Currencies: `ILS | JOD | USD` only. Account/debt currency immutable after creation.
- Debts are a **standalone ledger** — no wallet linkage.
- Transfers excluded from income/expense totals; same-currency transfer `to_amount == from_amount`.
- Exactly one account `is_default`. Account delete = soft archive; **block** archive when transactions exist (warning).
- Glass only on chrome/controls (tab bar, FAB, modals, chips) — never content cards; guard with `isLiquidGlassAvailable()`, respect reduce-transparency.
- Bilingual en/ar with full RTL mirroring; localized currency labels (شيكل / دينار أردني / دولار أمريكي).
- All multi-row mutations (transfer, full-pay) in DB transactions; recompute `remaining_amount`/`status` atomically.
- TypeScript strict; typecheck (`npx tsc --noEmit`) and `npx jest` must pass at every commit.
- FX provider default: `https://open.er-api.com/v6/latest/ILS` (key-less). Response `rates.USD` = USD per 1 ILS ⇒ `ilsPerUsd = 1 / rates.USD` (same for JOD).

---

### Task 1: Scaffold

**Files:** whole Expo app scaffolded into repo root (`app/`, `package.json`, `tsconfig.json`, …); `jest.config.js`; `.gitignore`; directory skeleton `components/glass/`, `db/`, `features/`, `i18n/`, `lib/`.

**Steps:**
- [ ] `git init`, commit the spec + this plan.
- [ ] Scaffold Expo SDK 57 TS app with expo-router (create-expo-app default template into a temp dir, move into root, keep `KilaniExpense.md` + `docs/`). App name **KilaniExpense**, slug `kilaniexpense`, scheme `kilaniexpense`. Reset the example screens (`npm run reset-project` or manual removal).
- [ ] Install deps: `npx expo install expo-sqlite expo-glass-effect expo-localization expo-linear-gradient react-native-svg @shopify/flash-list react-native-reanimated react-native-gesture-handler` and `npm i drizzle-orm @tanstack/react-query zustand react-native-gifted-charts i18next react-i18next date-fns react-hook-form zod @hookform/resolvers uuid` plus dev `drizzle-kit jest jest-expo @types/jest babel-plugin-inline-import`.
- [ ] Configure jest-expo (`"jest": {"preset": "jest-expo"}` or jest.config.js), add `test`/`typecheck` scripts. Add smoke test `lib/__tests__/smoke.test.ts` (`expect(1+1).toBe(2)`), run `npx jest` → PASS, `npx tsc --noEmit` → clean.
- [ ] app.json: `"newArchEnabled": true`, iOS `deploymentTarget` default, `userInterfaceStyle: "automatic"`, locales en/ar, `supportsRTL: true` via `extra`/`locales` plugin config.
- [ ] Commit `chore: scaffold expo app`.

### Task 2: Money lib (TDD)

**Files:** Create `lib/money.ts`, `lib/__tests__/money.test.ts`.

**Interfaces (Produces):**
```ts
export type Currency = 'ILS' | 'JOD' | 'USD';
export const CURRENCIES: Currency[];
export function minorScale(c: Currency): number;            // ILS 2, USD 2, JOD 3
export function toMinor(major: string | number, c: Currency): number;  // parse user input, round half-up; throws on NaN/negative
export function fromMinor(minor: number, c: Currency): number;         // major units as number (display only)
export function formatMoney(minor: number, c: Currency, locale: string): string; // Intl.NumberFormat currency style
export function convertToIlsMinor(foreignMinor: number, c: Currency, rateToIls: number): number;
// ilsMinor = round(foreignMinor * rateToIls * 10^2 / 10^scale(c)); identity for ILS
export function impliedRate(fromMinor: number, fromC: Currency, toMinor: number, toC: Currency): number;
// major(to)/major(from)
```

**Steps:**
- [ ] Write failing tests: scales; `toMinor('12.345','JOD')===12345`; `toMinor('10.50','ILS')===1050`; rounding `toMinor('1.005','USD')===101`; rejects negative/NaN; `convertToIlsMinor(100000,'JOD',5.2)===52000` (100 JOD × 5.2 = 520 ILS = 52000 agorot); `convertToIlsMinor(2500,'USD',3.6)===9000`; ILS identity; `impliedRate` cross-scale; format smoke (contains digits, no exceptions for ar locale).
- [ ] Run `npx jest lib` → FAIL (module missing). Implement `lib/money.ts`. Run → PASS. Commit `feat: money minor-units lib`.

### Task 3: DB schema, migrations, seed

**Files:** Create `db/schema.ts`, `db/client.ts`, `db/seed.ts`, `drizzle.config.ts`, generated `drizzle/` migrations, `db/__tests__/schema.test.ts` (schema shape smoke), modify `metro.config.js` (`.sql` asset) + `babel.config.js` (inline-import for `.sql`).

**Interfaces (Produces):** Drizzle tables exactly per spec §4: `accounts, categories, transactions, transfers, debts, debtEntries, fxRates, settings` with columns/enums as specified (timestamps as `integer({mode:'timestamp_ms'})`, amounts `integer`, enums via `text({enum:[...]})`, uuid text PKs via `uuid()` default). `db/client.ts` exports `db` (drizzle over `openDatabaseSync('kilani.db', { enableChangeListener: true })`) and `runMigrationsAndSeed()`. `db/seed.ts` seeds categories (expense: food_drinks, shopping, transportation, internet, phone, other; income: salary, business, gift, refund, other) with en/ar labels + emoji icons + colors, and a settings row (`locale:'en'`, `theme:'system'`, `fx_refresh_hours:12`).

**Steps:**
- [ ] Write schema; `npx drizzle-kit generate`; wire `useMigrations`/manual migrate call in `db/client.ts`.
- [ ] Root `app/_layout.tsx`: SQLiteProvider-independent init — run migrations+seed before rendering (suspense/gate), wrap in GestureHandlerRootView + QueryClientProvider.
- [ ] Test: schema exports exist & enum values match spec (pure import test, no sqlite needed). `npx jest` + `npx tsc --noEmit` → PASS. Commit `feat: drizzle schema, migrations, seed`.

### Task 4: i18n, RTL, theme tokens

**Files:** Create `i18n/index.ts`, `i18n/en.json`, `i18n/ar.json`, `lib/theme.ts`, `lib/settings-store.ts` (zustand persisted to settings table), `lib/__tests__/i18n.test.ts`.

**Interfaces (Produces):** `initI18n(locale)`, `t()` via react-i18next; `useSettings()` zustand store `{ locale, theme, setLocale, setTheme, defaultAccountId, fxRefreshHours }` hydrated from DB; `theme.ts` exports `colors` (bg `#F6F7F9`, card `#FFFFFF`, green `#22A06B`, red `#E5484D`, amber `#F5A623`, textMuted), `radii` (card 22), spacing scale, dark variants. Locale switch calls `I18nManager.allowRTL/forceRTL` + reload prompt. Full key coverage for all screens (tabs, home, quick-add, reports, debts, settings, empty states, currency names incl. Arabic شيكل / دينار أردني / دولار أمريكي).
- [ ] Test: en/ar files have identical key sets (recursive). PASS → commit `feat: i18n en/ar + theme tokens`.

### Task 5: Glass shell — tab bar + FAB + navigation

**Files:** Create `components/glass/GlassTabBar.tsx`, `components/glass/GlassFab.tsx`, `components/glass/Glass.tsx` (shared `GlassSurface` w/ availability + reduce-transparency fallback), `app/(tabs)/_layout.tsx`, placeholder screens `app/(tabs)/index.tsx` (home), `app/(tabs)/reports.tsx`, `app/(tabs)/debts/index.tsx`, `app/(tabs)/settings.tsx`, modal route `app/quick-add.tsx` registered in root stack (`presentation:'formSheet'`/modal).

**Interfaces (Produces):** `<GlassSurface style intensity>` renders `GlassView` when `isLiquidGlassAvailable() && !reduceTransparency`, else solid translucent View. Custom `tabBar` prop on `<Tabs>` renders floating pill (absolute bottom, inset 16, radius 32) with 4 icons + center FAB opening `/quick-add` (router.push). Reanimated scale-on-press. Labels from i18n.
- [ ] Typecheck + jest pass; commit `feat: glass tab bar shell`.

### Task 6: Accounts + balances (logic TDD, then UI)

**Files:** Create `features/accounts/logic.ts`, `features/accounts/queries.ts`, `features/accounts/__tests__/logic.test.ts`, `app/onboarding.tsx`, `app/account/new.tsx`, `app/account/[id].tsx`, `components/AccountCard.tsx`, `components/EmptyState.tsx`, `components/MonthPills.tsx`; modify `app/(tabs)/index.tsx` (real Home), root layout (redirect to onboarding when no accounts).

**Interfaces (Produces):**
```ts
// logic.ts (pure)
export function deriveBalance(initial: number, sums: {income:number; expense:number; transfersIn:number; transfersOut:number}): number;
export function combinedIlsMinor(accounts: {balanceMinor:number; currency:Currency}[], rates: {USD:number; JOD:number}): number;
// queries.ts
export function useAccountsWithBalances(): {account: Account; balanceMinor: number}[]; // drizzle live query + SQL sums
export async function createAccount(input): Promise<void>; // enforces single is_default in tx
export async function setDefaultAccount(id): Promise<void>;
export async function archiveAccount(id): Promise<'ok'|'blocked'>; // blocked when transactions exist
```
**Steps:**
- [ ] TDD `logic.ts`: deriveBalance arithmetic; combinedIlsMinor mixes ILS+USD+JOD correctly (uses `convertToIlsMinor`); default-account invariant helper. FAIL → implement → PASS.
- [ ] Onboarding: paged intro (2 pages, emoji hero, dark pill "Get Started") → create-first-account form (name, type cash|bank, currency picker, opening balance, becomes default). react-hook-form + zod.
- [ ] Home: big title, month pills (UI state only for now), combined ILS balance card ("rates as of…" placeholder until Task 7), account cards (native currency), recent activity list (last 10 transactions across accounts), empty state.
- [ ] Account detail: transactions list (FlashList), search + type/category filters, running balance header, edit name/icon/color, set default, archive (blocked alert when has transactions).
- [ ] Typecheck + tests pass; commit `feat: accounts, onboarding, home`.

### Task 7: FX module (TDD adapter + cache + refresh)

**Files:** Create `features/fx/provider.ts`, `features/fx/repo.ts`, `features/fx/useFxRates.ts`, `features/fx/__tests__/provider.test.ts`; modify Home/Reports to show real "rates as of".

**Interfaces (Produces):**
```ts
export interface FxProvider { id: string; fetchRatesToILS(): Promise<Record<'USD'|'JOD', number>>; }
export const openErApiProvider: FxProvider; // GET open.er-api.com/v6/latest/ILS → {USD: 1/rates.USD, JOD: 1/rates.JOD}
// repo.ts
export async function getCachedRates(): Promise<{USD:number; JOD:number; fetchedAt:Date|null}>; // fallback {USD:3.6,JOD:5.1} if never fetched
export async function upsertRates(r, source): Promise<void>;
// useFxRates.ts — TanStack Query: reads cache, background-refetch when now - lastSync > fxRefreshHours && online (expo-network / NetInfo via fetch failure tolerance), refetch on app foreground (AppState listener), manual refresh fn.
export function useFxRates(): {rates:{USD:number;JOD:number}; fetchedAt:Date|null; refresh:()=>void; isRefreshing:boolean};
```
- [ ] TDD provider parsing with mocked `fetch` (sample er-api payload; asserts inversion 1/r and error propagation). Implement → PASS.
- [ ] Wire hook, foreground listener, cache upsert. Home combined balance now uses live rates + shows `fetched_at`. Commit `feat: fx provider + cache + refresh`.

### Task 8: Quick-Add (expense / income / transfer)

**Files:** Create `features/transactions/mutations.ts`, `features/transactions/__tests__/mutations.test.ts` (pure validation/zod), `app/quick-add.tsx` full implementation, `components/SegmentedControl.tsx`, `components/AmountInput.tsx`, `components/PickerRow.tsx` (account/category/date pickers).

**Interfaces (Produces):**
```ts
export const expenseIncomeSchema: z.ZodType<{accountId:string; type:'expense'|'income'; categoryId:string; amountMinor:number; occurredAt:Date; note?:string}>;
export const transferSchema; // refine: from!==to, positive amounts; same-currency ⇒ toAmount=fromAmount
export async function addTransaction(input, rates): Promise<void>; // snapshots fx_rate_to_ils for non-ILS
export async function addTransfer(input): Promise<void>; // stores implied_rate when cross-currency, single tx
```
- [ ] TDD schemas + `impliedRate` usage + snapshot decision (`fxSnapshotFor(currency, rates)` pure fn: null for ILS). Implement → PASS.
- [ ] Build modal UI: glass sheet background, segmented Expense·Income·Transfer, category grid (emoji + label), amount keypad-friendly input with currency suffix, date/time picker (default now), account selectors (default preselected), transfer dual-amount with prefilled editable `to_amount` from cached rate, validation errors localized.
- [ ] Manual flow check via typecheck/tests; commit `feat: quick-add expense/income/transfer`.

### Task 9: Debts

**Files:** Create `features/debts/logic.ts`, `features/debts/queries.ts`, `features/debts/__tests__/logic.test.ts`, `app/(tabs)/debts/index.tsx`, `app/debt/[id].tsx`, `app/debt/new.tsx`, `components/DebtRow.tsx`, `components/DebtSummaryCards.tsx`.

**Interfaces (Produces):**
```ts
// logic.ts (pure)
export function applyEntry(debt:{principal:number; remaining:number; status:'active'|'completed'}, entry:{kind:'payment'|'increase'; amount:number}): {principal:number; remaining:number; status:'active'|'completed'};
// payment: remaining-=amount, clamp ≥0, status completed when 0; increase: principal+=a, remaining+=a, completed→active when remaining>0
export function perCurrencyTotals(debts): Record<'i_owe'|'owed_to_me', Partial<Record<Currency, number>>>;
// queries.ts
export async function createDebt(input); export async function addDebtEntry(debtId, kind, amountMinor, note?, occurredAt?); // tx: insert entry + update debt row atomically, set completed_at
export async function fullPay(debtId); export async function deleteDebt(debtId); // cascade entries
export function useDebts(filter:{q:string; status:'active'|'completed'}): DebtWithMeta[];
```
- [ ] TDD `applyEntry` (partial payment, exact full pay, overpay clamps to 0 & completes, increase reactivates completed, timestamps) + `perCurrencyTotals` (no conversion, per-currency buckets). Implement → PASS.
- [ ] List screen: search bar ("Search for people…"), green **You are owed** / red **You owe** summary cards listing per-currency totals, Active/Completed tabs, FlashList rows (directional arrow, name, badge, native-currency amount, chevron), blue + FAB → `/debt/new`.
- [ ] Detail: top card (direction icon/label, remaining, currency-colored), actions **Payment** (modal amount+note) / **Full Pay** (confirm) / **Add** (increase modal), Details section (Date, Currency, Status), entry history list, trash delete w/ confirm.
- [ ] Add flow: direction toggle (red "Money I owe" / green "Money I'm owed"), person name, amount, currency, date.
- [ ] Tests + typecheck pass; commit `feat: debts ledger`.

### Task 10: Reports

**Files:** Create `features/reports/logic.ts`, `features/reports/__tests__/logic.test.ts`, `app/(tabs)/reports.tsx`, `components/charts/CategoryPie.tsx`, `components/charts/TrendBars.tsx`, `components/PeriodSelector.tsx`.

**Interfaces (Produces):**
```ts
export type Period = {kind:'day'|'week'|'month'|'year'|'custom'; start:Date; end:Date};
export function periodRange(kind, ref:Date, custom?:{start:Date;end:Date}): Period; // date-fns startOf/endOf
export function sumByCategoryIls(txs: TxWithCat[], rates, exactAtTime:boolean): {categoryId:string; label:string; color:string; ilsMinor:number}[];
export function incomeVsExpenseSeries(txs, period, rates, exactAtTime): {bucketLabel:string; incomeIls:number; expenseIls:number}[]; // day buckets for day/week/month, month buckets for year
export function perAccountSubtotals(txs, accounts, rates): {accountId:string; incomeMinor:number; expenseMinor:number}[]; // native currency
```
- [ ] TDD: periodRange edges (week starts Monday, custom passthrough); exactAtTime uses tx snapshot when present else latest rate; transfers never included (input already excludes, but assert filter); series bucketing.
- [ ] Screen: total balance (combined ILS + "rates as of"), period selector (day/week/month/year/custom via two date pickers), pie (gifted-charts) for expense-by-category, income-vs-expense bars, per-wallet subtotal cards, exact-at-time toggle.
- [ ] Tests + typecheck; commit `feat: reports`.

### Task 11: Settings + polish

**Files:** Create full `app/(tabs)/settings.tsx`, `features/export/exportJson.ts`; modify screens for empty states & a11y labels.

- [ ] Settings rows: default account picker, language (en/ar → RTL switch + reload), theme (system/light/dark), FX refresh hours + "Refresh rates now" (shows fetchedAt), Export data (JSON share via expo-sharing/Share API), "Sign in to backup" row marked Coming soon (Phase 2), About (version).
- [ ] Sweep: every list has 3D-emoji empty state + hint; VoiceOver labels on FAB/tab bar/actions; dark theme colors applied.
- [ ] Tests + typecheck; commit `feat: settings + polish`.

### Task 12: Final verification

- [ ] `npx tsc --noEmit` clean; `npx jest` all green.
- [ ] `npx expo export --platform ios` bundles without error (validates the whole import graph).
- [ ] Attempt `npx expo run:ios` (dev build w/ pods) in background; report result honestly (glass modules require dev build; Expo Go not sufficient).
- [ ] Write `README.md` (setup, dev-build instructions, architecture map). Final commit.

## Self-Review Notes

- Spec coverage checked §1–§12: onboarding (T6), home (T6), quick-add (T8), reports (T10), debts (T9), settings (T11), FX (T7), glass (T5), i18n/RTL (T4), model (T3), money (T2), acceptance criteria 1–8 mapped to T6/T8/T9/T10 tests.
- Phase 2 items (cloud backup, budgets, recurring, CSV) intentionally excluded (YAGNI).
- Types consistent: minor-unit `number` everywhere; `Currency` from `lib/money` is the single source.
