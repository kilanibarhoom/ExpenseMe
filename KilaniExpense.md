
# KilaniExpense — Personal Finance Tracker · System Requirements

> **Purpose of this document:** a complete, buildable specification handed off to Claude Code. It defines the stack, data model, screen-by-screen behavior, currency/FX logic, design language, and a suggested build order. Where a decision wasn't fully pinned down, an explicit **Assumption** is recorded in §2 — change any of these before building and the rest of the spec follows.

----------

## 1. Overview

Finny is an **offline-first, bilingual (English/Arabic, RTL-aware) personal finance tracker** for iOS-first (Android as graceful fallback), built with React Native + Expo. It manages:

-   **Wallets / accounts** in three currencies (ILS, JOD, USD) with standalone transactions.
-   **Quick entry** of expenses, income, and cross-currency transfers.
-   **Reports** with a combined net balance converted to ILS via live exchange rates, plus period breakdowns.
-   **Debts & liabilities** — money owed to and by the user, per-currency, with a payment ledger.

Visual direction: generous white space, clean cards, bold titles, 3D-emoji accents for empty states, and **iOS 26 liquid glass** used for navigation chrome and controls (floating tab bar, quick-add FAB, modals) — never for primary content surfaces.

----------

## 2. Key decisions & assumptions

These were resolved from the requirements + reference screenshots. Flag any you want changed.

1.  **Persistence: local-first.** All data lives on-device in SQLite (via Drizzle ORM). The "Sign in to backup" affordance in the design maps to an **optional** cloud backup/sync module, scoped as a later phase (§13), not a launch blocker.
2.  **Platform: iOS-first.** Real liquid glass renders on iOS 26; iOS ≤ 18 and Android get automatic solid/translucent fallbacks. Android should be functional and clean but is not the polish target.
3.  **Debts are a standalone ledger.** Recording a debt or a debt payment does **not** move money in/out of any wallet (this matches the reference screens, where debts are grouped purely by currency and carry no account link). If you'd rather link debt payments to a wallet, that's a one-line model change (add `accountId` to `debt_entries`) — call it out and I'll revise.
4.  **Navigation is a custom glass tab bar, not `NativeTabs`.** The floating pill bar in the Budget screenshot is a custom component; `expo-router/unstable-native-tabs` renders the _system_ `UITabBarController` bar and can't produce that floating-pill look. We build a custom bar with `expo-glass-effect` + Reanimated, guarded by `isLiquidGlassAvailable()`.
5.  **FX conversion:** live combined totals use the **latest cached rate**; each non-ILS transaction also stores a **rate snapshot at creation time** so historical period reports can optionally be exact-at-time. Base currency is **ILS** (fixed).
6.  **FX provider is a swappable adapter.** Default recommendation: a free, key-less endpoint (e.g. `open.er-api.com`) that covers ILS/JOD/USD. Confirm the provider; the `FxProvider` interface makes swapping trivial.
7.  **Money is stored as integer minor units**, never floats. Note the per-currency scale: **ILS = 2** decimals (agorot), **USD = 2** (cents), **JOD = 3** (fils). This matters for rounding and display.
8.  **Bilingual + RTL** (en/ar) is a first-class requirement, evidenced by the Arabic debt screens.

----------

## 3. Tech stack

Concern

Choice

Notes

Framework

**Expo SDK 57** (React Native 0.86), TypeScript strict

Latest stable line. Requires an **EAS development build** — native glass modules are not reliable in Expo Go on iOS.

Routing

**Expo Router** (file-based)

Liquid glass

**`expo-glass-effect`** (`GlassView`, `GlassContainer`, `isLiquidGlassAvailable()`)

Backs onto iOS `UIVisualEffectView`. Used for the tab bar, FAB, modals, summary chips.

Native controls (optional)

**`@expo/ui`** (SwiftUI primitives, stable since SDK 56)

Optional for native segmented control / date picker; RN equivalents are fine too.

Persistence

**`expo-sqlite` + Drizzle ORM** + drizzle-kit migrations

Matches existing tooling; enables live queries.

Server state / async

**TanStack Query**

For FX fetch/cache/retry. Local reads use Drizzle live queries.

UI state

**Zustand** (lightweight)

Quick-add modal state, filters, active month.

Animation / gesture

**react-native-reanimated**, **react-native-gesture-handler**

Tab bar, FAB, sheet transitions.

Lists

**FlashList**

Virtualized transaction/debt lists.

Charts

**victory-native** (or `react-native-gifted-charts`)

Category pie + trend line/bar.

i18n / RTL

**i18next** + **expo-localization** + `I18nManager`

en/ar with RTL flip.

Dates

**date-fns** (or dayjs)

Period grouping, ranges.

Forms/validation

**react-hook-form** + **zod**

Money math

**dinero.js** or a small custom minor-units helper

No floating point for currency.

**Minimum iOS target:** iOS 15.1 for the app; liquid glass is a progressive enhancement on iOS 26+.

----------

## 4. Data model

Amounts are integers in **minor units** of the row's currency. `currency` is always one of `ILS | JOD | USD`.

### 4.1 `accounts`

Column

Type

Notes

`id`

text (uuid) PK

`name`

text

e.g. "Cash", "Bank of Palestine"

`type`

enum `cash | bank`

"credit-card" is modeled as `bank`

`currency`

enum `ILS | JOD | USD`

immutable after creation

`initial_balance`

integer (minor units)

opening balance, default 0

`is_default`

boolean

exactly one row true; enforced in app logic

`color`

text

UI accent, optional

`icon`

text

emoji or icon key, optional

`archived_at`

timestamp null

soft delete

`created_at` / `updated_at`

timestamp

**Derived balance** (in the account's own currency) = `initial_balance + Σ income − Σ expense + Σ transfers_in − Σ transfers_out`.

### 4.2 `categories`

Seeded with defaults, extensible.

Column

Type

Notes

`id`

text PK

`kind`

enum `expense | income`

`key`

text

stable slug for i18n lookups

`label_en` / `label_ar`

text

`icon` / `color`

text

`is_system`

boolean

`sort_order`

integer

Seed — **expense:** `food_drinks, shopping, transportation, internet, phone, other`. **income** (proposed, adjust freely): `salary, business, gift, refund, other`.

### 4.3 `transactions` (expenses & income)

Column

Type

Notes

`id`

text PK

`account_id`

text FK → accounts

`type`

enum `expense | income`

`amount`

integer (minor units)

positive

`currency`

enum

denormalized from account for integrity

`category_id`

text FK → categories

must match `type` kind

`note`

text null

short description

`occurred_at`

timestamp

defaults now

`fx_rate_to_ils`

real null

snapshot: 1 unit currency = N ILS at creation

`created_at` / `updated_at`

timestamp

### 4.4 `transfers`

Column

Type

Notes

`id`

text PK

`from_account_id`

text FK

`to_account_id`

text FK

`from_amount`

integer (minor units, from currency)

`to_amount`

integer (minor units, to currency)

`from_currency` / `to_currency`

enum

denormalized

`implied_rate`

real null

`to_amount / from_amount` when currencies differ

`note`

text null

`occurred_at`

timestamp

defaults now

`created_at`

timestamp

Transfers are **excluded** from income/expense report totals; they adjust both account balances only.

### 4.5 `debts`

Column

Type

Notes

`id`

text PK

`direction`

enum `i_owe | owed_to_me`

red / green

`person_name`

text

searchable

`currency`

enum

fixed at creation

`principal_amount`

integer (minor units)

original amount; grows via `increase` entries

`remaining_amount`

integer (minor units)

maintained = principal + Σ increases − Σ payments

`status`

enum `active | completed`

→ `completed` when `remaining_amount <= 0`

`note`

text null

`created_at`

timestamp

the debt "date"

`completed_at`

timestamp null

### 4.6 `debt_entries` (payment ledger)

Column

Type

Notes

`id`

text PK

`debt_id`

text FK → debts

`kind`

enum `payment | increase`

"Full Pay" = a payment equal to remaining; "Add" = increase

`amount`

integer (minor units)

positive

`note`

text null

`occurred_at`

timestamp

defaults now; every entry is date-logged

`created_at`

timestamp

### 4.7 `fx_rates` (cache)

Column

Type

Notes

`id`

text PK

`quote`

enum `USD | JOD`

(ILS→ILS is identity)

`rate_to_ils`

real

1 unit of `quote` = `rate_to_ils` ILS

`fetched_at`

timestamp

`source`

text

provider id

### 4.8 `settings` (single row / key-value)

`default_account_id`, `base_currency` = `ILS` (const), `last_fx_sync_at`, `locale` (`en \| ar`), `theme` (`system \| light \| dark`), `fx_refresh_hours` (default 12).

----------

## 5. Currency & FX logic

-   **Base currency: ILS.** Per-account balances always display in the account's own currency; only combined/cross-currency figures convert to ILS.
-   **Convert foreign → ILS:** `ils_minor = round(foreign_minor × rate_to_ils × scaleAdjust)` accounting for differing minor-unit exponents (ILS=2, JOD=3, USD=2).
-   **Refresh policy:** on app foreground, if `now − last_fx_sync_at > fx_refresh_hours` **and** online, fetch and upsert `fx_rates`. Always fall back to the most recent cached rate when offline. Surface `fetched_at` in the UI ("rates as of …").
-   **Reports "combined total"** uses the latest cached rate. **Historical period reports** default to the latest rate but can use each transaction's `fx_rate_to_ils` snapshot when "exact-at-time" is toggled.
-   **Cross-currency transfer:** user enters `from_amount`; if currencies differ, pre-fill `to_amount` using the cached rate (via ILS) but leave it **fully editable** so the user records the precise received amount.

### `FxProvider` interface (swappable)

```ts
interface FxProvider {
  id: string;
  // returns { USD: ilsPerUsd, JOD: ilsPerJod }
  fetchRatesToILS(): Promise<Record<'USD' | 'JOD', number>>;
}

```

Default adapter recommendation: a free key-less endpoint covering ILS/JOD/USD (confirm choice at build time).

----------

## 6. Navigation & app structure

**Root:** custom **liquid-glass floating tab bar** (glass pill, `GlassView`, `isLiquidGlassAvailable()` guard, Material/solid fallback) with a prominent **center Quick-Add FAB**.

Tabs: **Home · Reports · Debts · Settings** + center FAB → Quick-Add modal.

```
app/
  _layout.tsx                 # providers: db, query, i18n, theme, RTL
  (tabs)/
    _layout.tsx               # custom glass tab bar
    home/                     # wallets overview + account detail
    reports/
    debts/                    # list, [id] detail, add
    settings/
  quick-add.tsx               # modal: Expense | Income | Transfer
components/
  glass/                      # GlassTabBar, GlassFab, GlassCard fallbacks
  ...
db/ (drizzle schema, migrations, queries)
features/ (accounts, transactions, transfers, debts, reports, fx)
i18n/ (en.json, ar.json)
lib/ (money, dates, fx)

```

----------

## 7. Screen specs

### 7.1 Onboarding

Paged intro (Finny welcome), dark pill **Get Started** CTA, page dots. On completion → create first account flow (name, type, currency, optional opening balance, set as default).

### 7.2 Home (Wallets / Overview)

-   Large bold title; month-selector pills (This month, prior months) like the Budget screen.
-   **Combined balance in ILS** at top (converted), with per-account cards below (each in native currency).
-   Tapping an account → **Account detail**: that account's standalone transactions list (search + filter), running balance, edit/archive.
-   Recent activity feed. Clean empty states with 3D-emoji illustration + hint text.

### 7.3 Quick-Add (center FAB → modal)

Segmented control at top: **Expense · Income · Transfer**.

-   **Expense:** account (defaults to the default account), category (expense set), amount, date & time (defaults now), note.
-   **Income:** account, category (income set), amount, date & time (now), note.
-   **Transfer:** from-account, to-account, from-amount; if currencies differ show **both** amount fields with `to_amount` pre-filled from cached rate and editable; note; date.
-   Validation: positive amount; transfer requires two distinct accounts. On save, write row + (for non-ILS) snapshot `fx_rate_to_ils`.

### 7.4 Reports

-   **Combined** and **per-wallet** stats. Combined figures convert to ILS.
-   **Total balance** (combined, ILS) with "rates as of {fetched_at}".
-   Period selector: **day / week / month / year / custom range**.
-   Breakdowns: expense-by-category (pie), income vs expense over time (bar/line), per-account subtotals.
-   Optional "exact-at-time FX" toggle (uses snapshots).

### 7.5 Debts & Liabilities

Matches the reference screens:

-   Header **"Search for people…"** (filters by `person_name`).
-   Two summary cards: **You are owed** (green, totals listed per currency) and **You owe** (red, per currency). No cross-currency conversion here — list each currency separately.
-   Tabs: **Active Debts** / **Completed Debts**.
-   List rows: colored directional arrow (green ↗ owed-to-me / red ↘ owed-by-me), person name, **Owed by me / Owed to me** badge, amount in native currency, chevron → detail. Blue **+** FAB.
-   **Debt detail:**
    -   Top card: directional icon + label (You owe / You are owed), remaining amount, currency-colored.
    -   Three actions: **Payment** (modal: amount in debt currency, note, register → `payment` entry), **Full Pay** (payment equal to remaining → status `completed`), **Add** (increase principal → `increase` entry). Every entry date-logged.
    -   **Details** section: Date, Currency, Status.
    -   **Delete** (trash, top-right) with confirm.
    -   Below (proposed addition): the debt's **entry history** list, since entries are logged.
-   **Add debt** flow: direction (Money I owe [red] / Money I'm owed [green]), person name, amount, currency, date.
-   Completed tab: all fully-paid / zeroed debts.

### 7.6 Settings

Default account, locale (en/ar) + RTL toggle, theme, FX refresh interval + manual "refresh rates now", data export, **Sign in to backup** (optional cloud, Phase 2), about.

----------

## 8. Search & filtering (cross-cutting)

-   **Transactions:** filter by account, category, type (expense/income), date range; free-text search on `note`.
-   **Debts:** search by `person_name` (as in the design); filter by direction, currency; status split via Active/Completed tabs.
-   Debounced text input; filters persisted per screen in UI state.

----------

## 9. Design language

-   **Surfaces:** near-white background (~`#F6F7F9`), white rounded cards (radius ~20–24), soft low-opacity shadows, ample padding.
-   **Typography:** large bold titles (SF Pro / system), high contrast; secondary text in muted gray.
-   **Semantic color:** green = money owed to me / income; red = money I owe / expense; amber/orange accent (avatars, highlights). Keep the palette restrained.
-   **Liquid glass usage (HIG-aligned):** apply to **navigation chrome and controls only** — floating tab bar, quick-add FAB, modal/sheet backgrounds, summary chips. **Do not** glass primary content cards. Always wrap in `isLiquidGlassAvailable()`; provide a solid/translucent fallback for iOS ≤ 18 and Android (Material 3). Respect the OS **reduce-transparency** accessibility setting.
-   **Empty states:** centered 3D-emoji illustration + short helper line ("Tap + to create your first …").
-   **RTL:** full mirroring in Arabic; currency labels localized (شيكل / دينار أردني / دولار أمريكي).

----------

## 10. Non-functional requirements

-   **Offline-first:** every core action works with no network; FX degrades to cached rates.
-   **No floating-point money:** integer minor units end-to-end; centralize conversion/formatting in `lib/money`.
-   **Performance:** 60fps lists (FlashList), no JS-thread jank on the glass tab bar (native effect + Reanimated).
-   **Accessibility:** dynamic type, sufficient contrast on glass, reduce-transparency fallback, RTL, VoiceOver labels.
-   **Data integrity:** all multi-row mutations (transfer, full-pay) wrapped in a DB transaction; recompute `remaining_amount` and `status` atomically.
-   **Testability:** pure functions for balance, FX conversion, and debt-remaining logic — unit-tested independently of UI.

----------

## 11. Core business rules (acceptance criteria)

1.  Exactly one account is `is_default`; changing it unsets the previous.
2.  Account currency and debt currency are immutable after creation.
3.  Deleting an account is a soft-archive; its transactions are retained (or blocked if non-empty — choose one, default: block with a warning).
4.  A transfer never appears in expense/income totals; it appears in both accounts' histories.
5.  Same-currency transfer: `to_amount == from_amount`. Cross-currency: both editable, `implied_rate` stored.
6.  "Full Pay" sets remaining to exactly 0 and status to `completed`, timestamped.
7.  "Add" (increase) raises principal and remaining; a completed debt returning to positive remaining flips back to `active`.
8.  Combined ILS totals never mix currencies without conversion; per-currency debt summaries never convert.

----------

## 12. Suggested build order

1.  **Scaffold:** Expo SDK 57 + TS, Expo Router, EAS dev build, Drizzle + expo-sqlite, i18n/RTL, theme.
2.  **Glass shell:** custom glass tab bar + FAB with availability guard and fallbacks.
3.  **Accounts + money lib:** CRUD, default logic, minor-units helpers, balance derivation.
4.  **Quick-Add:** expense/income first, then transfer (incl. cross-currency).
5.  **FX module:** provider adapter, cache, refresh policy, snapshotting.
6.  **Debts:** list + summaries + detail + entries + add + full/partial/increase flows.
7.  **Reports:** period grouping, conversions, charts.
8.  **Search/filter**, empty states, polish, accessibility pass.
9.  **(Phase 2)** cloud backup/sign-in, data export/import.

----------

## 13. Deferred / Phase 2

-   Cloud backup & multi-device sync ("Sign in to backup").
-   Budgets per category (the reference "Budget" tab) — not in current requirements but the design anticipates it.
-   Recurring transactions, attachments/receipts, CSV export.

----------

## 14. Open items to confirm before/during build

-   Cloud backup provider & auth (if Phase 2 gets pulled forward).
-   Exact FX provider/endpoint for the default adapter.
-   Whether debt payments should optionally debit/credit a wallet (currently standalone).
-   Account-delete behavior when transactions exist (block vs cascade-archive).
-   Income category set (proposed list above).
