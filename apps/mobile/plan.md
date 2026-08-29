# Finance App — Product & Development Plan

## Vision

Finance App is a local-first personal financial operating system designed to help users understand, manage, and plan their financial life from a single application.

The initial foundation covers:

- Assets
- Liabilities
- Zakat
- Hijri date calculations
- Nisab checks
- Payment reminders
- Local SQLite persistence
- Local notifications

The long-term goal is to evolve the application beyond expense tracking into a comprehensive financial platform covering:

- Money and accounts
- Assets and liabilities
- Transactions and cash flow
- Bills and recurring commitments
- Budgeting
- Financial goals
- Investments
- Zakat
- Financial forecasting
- Financial health
- What-if simulations
- AI-powered financial insights
- Household/family finance
- External financial integrations

The application should eventually function as a:

> Personal Financial Operating System

---

# Core Product Questions

The application should answer three fundamental questions.

## 1. Where is my money?

- Cash
- Bank accounts
- Savings
- E-wallets
- Investments
- Gold
- Crypto
- Other assets
- Liabilities and debts

## 2. Where is my money going?

- Transactions
- Bills
- Subscriptions
- Loans
- Insurance
- Utilities
- Recurring commitments
- Budgets

## 3. What will happen to my money?

- Upcoming payments
- Cash-flow forecasts
- Financial goals
- Investment projections
- Zakat obligations
- Emergency-fund runway
- Debt planning
- What-if simulations
- AI financial insights

---

# Architecture Principles

## Local-First / Server-Optional

SQLite is the primary source of truth for personal financial data.

The application must remain fully functional without:

- A user account
- A Finance App backend
- Internet connectivity
- Cloud synchronization

The core application must work entirely from the local SQLite database.

External services are integrations rather than dependencies.

Potential external integrations include:

- Moomoo
- Market-data providers
- AI providers
- Google Drive
- Optional cloud synchronization
- Banking providers

No external service should be required for:

- Financial tracking
- Budgeting
- Payment reminders
- Zakat calculations
- Financial calculations
- Goals
- Forecasting
- Financial health
- What-if simulations

---

# High-Level Architecture

```text
                         Finance App
                              │
                     ┌────────┴────────┐
                     │                 │
                  UI Layer        Domain Logic
                                       │
                                  ┌────┴────┐
                                  │ SQLite  │
                                  └────┬────┘
                                       │
                         ┌─────────────┼─────────────┐
                         │             │             │
                      Local        Integrations    Backup
                      Logic             │             │
                                       │             │
                              ┌────────┼───────┐     │
                              │        │       │     │
                           Moomoo     AI    Market  Google
                                             Data   Drive
```

SQLite remains the source of truth.

External integrations synchronize or retrieve information but should not replace the local database.

---

# Financial Domain Model

The application should eventually be structured around a shared financial domain rather than isolated features.

```text
User
 │
 ├── Accounts
 │
 ├── Assets
 │
 ├── Liabilities
 │
 ├── Transactions
 │
 ├── Income
 │
 ├── Expenses
 │
 ├── Bills / Commitments
 │
 ├── Goals
 │
 ├── Investments
 │
 └── Zakat
       │
       ▼
   Cash Flow
       │
       ▼
 Financial Forecast
       │
       ├── Financial Health
       ├── What-if Simulation
       └── AI Insights
```

The transaction and cash-flow layer should eventually become the central source from which many other features derive information.

---

# Current Foundation

The existing application already provides:

- Personal finance dashboard
- Asset management
- Liability management
- Zakat tracking
- Hijri date calculations
- Nisab checks
- Local mobile data services
- Backend API with SQLite persistence
- Expo Router mobile application
- SQLite-backed services
- Local notifications through `expo-notifications`
- Background notification synchronization

The backend should remain optional for the local-first mobile experience.

---

# Phase 1 — Financial Foundation

## Existing

- [x] Assets
- [x] Liabilities
- [x] Zakat
- [x] Hijri date calculations
- [x] Nisab calculations
- [x] Local SQLite persistence
- [x] Local notification infrastructure

## Improvements

- [ ] Review and standardize financial domain models
- [x] Improve net-worth calculations
- [ ] Establish shared date/calculation utilities
- [x] Establish shared database migration strategy
- [ ] Establish repository/service patterns
- [ ] Separate domain logic from UI
- [x] Ensure core functionality does not depend on backend availability

---

# Phase 2 — Payment Reminders

## Status: Implemented

`payment_reminders` table/service, the shared notification-core refactor
(zakat + reminders each with their own identifier prefix and background
sync task), and the `reminders.tsx` tab (Upcoming/Due Today/Overdue/
Completed, add/edit, mark-paid, pause/resume) are live on `main`. Reminder
offsets default to 7/3/1/0 days before due date at 9am local time, and are
now user-configurable globally (Reminders tab → Notification Timing):
switch to Custom for your own comma-separated day-offsets and a specific
HH:MM time, applied to every reminder. Verified working end-to-end on the
development build.

Not yet done from this phase's spec: currency field (app is RM-only
throughout, so skipped as unnecessary for now) and per-reminder offsets
(the customizable schedule above is global, not per individual reminder).

## Goal

Add a new mobile tab for managing payment reminders such as:

- Rent
- Insurance
- Subscriptions
- Utilities
- Loan payments
- Credit card payments
- School fees
- Other recurring commitments

The feature should allow users to:

- Create reminders
- See upcoming payments
- See payments due today
- See overdue payments
- See completed payments
- Mark payments as paid
- Receive local notifications before each due date

---

## Existing Building Blocks

- Mobile app uses Expo Router tabs in `apps/mobile/app/(tabs)/_layout.tsx`.
- Existing `expo-notifications` implementation for zakat reminders.
- Existing background task for refreshing scheduled zakat reminders.
- Liability records support a `commitment` category.
- Mobile app has local SQLite-backed services.
- Go/Fiber backend with SQLite persistence.

---

## Reminder Data Model

Add:

- Typed reminder interface
- Input DTOs
- Stable reminder identifier
- Status
- Amount
- Currency
- Due date
- Recurrence
- Reminder offsets
- Last paid date
- Next due date
- Optional notes

Recurrence:

- One-time
- Monthly
- Yearly
- Custom interval

Reminder offsets:

- 7 days before
- 3 days before
- 1 day before
- Due day

Keep payment reminders independent from liabilities initially to avoid changing existing debt behavior.

---

# Reminder User Experience

Add:

`apps/mobile/app/(tabs)/reminders.tsx`

The screen should provide:

- Upcoming
- Due Today
- Overdue
- Completed

Users should be able to:

- Add
- Edit
- Delete
- Pause
- Resume
- Mark as paid

After a recurring payment is marked paid:

1. Calculate the next due date.
2. Generate the next reminder cycle.
3. Schedule future notifications.

---

# Financial Commitment Intelligence

The reminder system should eventually calculate:

- Monthly equivalent cost
- Annual commitment cost
- Upcoming commitment total
- Amount already reserved
- Amount still required before payment
- Commitment-to-income ratio

Example:

```text
Car Insurance

Annual payment:      RM1,800
Monthly equivalent:  RM150

Next payment:        12 Oct 2026
Reserved:             RM850
Required:             RM950
```

This turns reminders into a financial planning system rather than a simple notification feature.

---

# Local Persistence

Create a local SQLite table and migration for payment reminders.

Implement:

- Create
- Read
- Update
- Delete
- Mark paid
- Pause/resume

Queries:

- Upcoming reminders
- Due today
- Overdue
- Completed
- Paused

Add tests for:

- Month-end recurrence
- Leap years
- Yearly recurrence
- Date rollover
- Custom intervals
- Notification-date calculations

---

# Notification Architecture

Generalize the current zakat notification infrastructure.

Create shared notification functionality for:

- Zakat
- Payment reminders
- Goal milestones
- Budget warnings
- Debt payments
- Investment events
- Financial health alerts

Each feature should have its own notification identifier/prefix.

Payment reminder synchronization must never cancel zakat notifications.

Schedule notifications only for dates that are not already in the past.

---

# Background Synchronization

Add a payment-reminder background task or safely generalize the existing notification background task.

The task should:

- Re-read local reminders
- Rebuild future notifications
- Handle app restarts
- Handle disabled reminders
- Handle completed one-time reminders
- Remove stale payment-reminder notifications

Background execution must be treated as best effort because iOS and Android may delay execution.

---

# Phase 3 — Accounts & Transactions

## Status: Accounts removed by request — Transactions is now a standalone, account-less feature

Originally shipped as Accounts + Transactions together (accounts holding a
running balance, transactions referencing an account and optionally
transferring between two). On 2026-08-28, per explicit user request,
Accounts was removed entirely — no balances, no transfers, no "which
account is this in" step. Transactions is now a flat list of standalone
records (type, amount, date, description, note, optional tax-relief tag —
see Phase 4), reachable from the Dashboard's Quick Actions
(`app/transactions.tsx`) rather than nested under an account.

Removed: `app/(tabs)/accounts.tsx`, `app/account/[id].tsx`,
`components/accounts/*`, `interface/account.ts`,
`local/account-service.ts`, `services/account.ts`, the `transfer`
transaction type (nothing to transfer between anymore), and the
`accounts` table from fresh installs. `local/db.ts` migration version 5
(`dropAccountColumnsFromTransactions`) restructures an existing device's
`transactions` table (SQLite can't just drop a NOT NULL column, so it's a
recreate-and-copy) — old `transfer`-type rows are recategorized as
`expense` since the amount/date/notes are still worth keeping even though
the transfer semantics no longer apply. The old `accounts` table itself is
left in place on an upgraded device, just unreferenced by any code —
deleting it outright wasn't necessary and isn't reversible if that turns
out to be wrong. Covered by `local/__tests__/db-migration.test.ts`
(pre-seeds the old schema, runs the real migration, asserts columns are
gone and rows survived) and `local/__tests__/transaction-service.test.ts`
(plain CRUD, no balance side effects to verify anymore).

Transaction types remaining: income, expense, investment buy/sell,
dividend, interest, debt payment, zakat payment.

**Not yet built** (deferred, mostly moot without accounts/balances):
Cash Flow view/summaries, Financial Commitment Intelligence, recurring/
scheduled transactions, category/tag taxonomy beyond the Phase 4 tax
relief tagging, and any backend involvement.

## Financial Accounts

Introduce:

- Bank accounts
- Cash wallets
- Savings accounts
- E-wallets
- ASB
- Brokerage accounts
- Crypto wallets

Account fields:

- ID
- Name
- Institution
- Type
- Currency
- Balance
- Active/archived state

---

# Transactions

Add transaction tracking.

Support:

- Income
- Expense
- Transfer
- Investment purchase
- Investment sale
- Dividend
- Interest/profit
- Debt payment
- Zakat payment

Transaction fields:

- Amount
- Currency
- Date/time
- Account
- Category
- Description
- Notes
- Related asset
- Related liability
- Related investment
- Recurring transaction reference

Transactions should be designed for future import and synchronization.

---

# Cash Flow

Create a unified cash-flow system.

Example:

```text
September 2026

Income
+ RM4,500 Salary
+ RM120 Dividend

Commitments
- RM1,200 Rent
- RM700 Car
- RM150 Insurance
- RM50 Subscription

Investment
- RM500

Projected surplus:
RM2,020
```

Support:

- Historical cash flow
- Current cash flow
- Projected cash flow
- Monthly summaries
- Annual summaries
- Recurring income
- Recurring expenses

---

# Phase 4 — Receipts & Tax Relief

## Status: Receipt Capture + Tax Relief Calculation implemented

Receipts attach to a transaction (Phase 3), matching the design intent
below. New `receipt_attachments` SQLite table
(`id, transaction_id, file_name, mime_type, size_bytes, data BLOB,
created_at`) — bytes are stored as a BLOB directly in the app's SQLite
database rather than as files on disk, so the existing Google Drive backup
(`services/backup.ts`, Phase 11) captures receipts automatically with zero
changes, at the cost of the .db file growing with photo/PDF sizes.
`local/receipt-service.ts` keeps metadata reads (list) separate from a
`getReceiptData(id)` byte read, so listing a transaction's receipts never
pulls BLOB data. `local/transaction-service.ts`'s `deleteTransaction`
explicitly deletes a transaction's receipts first — there's no DB-level
`ON DELETE CASCADE` since the `foreign_keys` pragma is off.

`components/transactions/receipts-section.tsx` (via `services/receipt.ts`
React Query hooks) is embedded in `AddTransactionModal`, at the very top
of the form (per user request — it was previously easy to miss further
down). Behavior differs by mode, also per user request:

- **Add (new transaction):** Camera/Photo/File buttons are available
  immediately, before the transaction is saved. Attaching a receipt before
  the transaction exists lazily creates it in the background
  (`ensureDraftTransaction` in `add-transaction-modal.tsx`, using whatever
  amount/date/type is filled in so far — it errors with a friendly message
  if those aren't valid yet), and remembers its id as a draft. Tapping
  "Add Transaction" afterward updates that same draft row rather than
  creating a second one. If the sheet is dismissed (Cancel/X) after a
  receipt was attached but before finalizing, the draft transaction (and
  its receipts) is deleted so nothing orphaned is left behind.
- **Edit (existing transaction):** shows previously attached receipts
  (view full-screen/share, delete) but hides the Camera/Photo/File
  buttons — new attachments only happen through the Add flow.
  `ReceiptsSection` takes a `hideUploadButtons` prop for this.

Lets users: capture a photo (`expo-image-picker` camera), pick photos from
the library (multi-select), or pick documents/PDFs
(`expo-document-picker`, multi-select); view an image full-screen with
pinch-to-zoom (`expo-image` + `ScrollView` zoom); open a non-image file
(e.g. PDF) through the system share sheet (`expo-sharing`) since there's
no in-app PDF viewer; and delete an attachment with the existing
`ConfirmDeleteModal`. Thumbnails aren't rendered in the list (would mean
reading every attachment's full BLOB just to render a list row) — each row
shows a file-type icon, name, and size instead, with bytes only fetched on
tap. Verified with a real-SQLite Jest suite
(`local/__tests__/receipt-service.test.ts`) covering BLOB round-trip
fidelity, metadata-only list reads, and cascade delete on transaction
removal.

The "Full — Tax Relief Calculation" half is now built too.
`transactions` gained `tax_relief_category` and `assessment_year` columns
(migration v3/v4 in `local/db.ts`, `ensureColumn`-based so existing
installs pick them up via `ALTER TABLE`). A static category taxonomy
(`interface/tax-relief.ts`, `TAX_RELIEF_CATEGORIES` — Lifestyle, Lifestyle
Sports, Medical Self/Spouse/Child, Parents' Medical, Education Fees, Life
Insurance & EPF, PRS, SSPN, Disabled Equipment, Breastfeeding Equipment,
Child Care, EV Charging) ships with `DEFAULT_TAX_RELIEF_CAPS` — starting-
point amounts based on recent LHDN individual reliefs. Caps themselves are
per-assessment-year and editable: a new `tax_relief_caps` table
(`assessment_year, category_key, cap_amount`) is lazily seeded from the
defaults the first time a year is opened (`local/tax-relief-service.ts`'s
`getCapsForYear`); after that the DB row is authoritative, so editing a
cap in the Tax Relief screen is never clobbered by re-seeding. This
matters because LHDN revises the relief list and caps with each annual
Budget — the defaults are a starting point to verify/adjust per year, not
a guarantee of accuracy for any given YA.

`AddTransactionModal` gained a "Tax Relief (optional)" section
(`components/transactions/tax-relief-picker.tsx`), shown only for
`type === "expense"` — a category chip picker plus an assessment-year
field that defaults to the current calendar year once a category is
picked. A new `app/tax-relief.tsx` screen (reached from the Dashboard's
Quick Actions, not the tab bar — see the tab-bar decluttering note under
Phase 3) shows, per assessment year: total claimed, each category's
claimed/cap/remaining with an over-cap warning, tap-to-edit caps, and an
"Export Evidence" button that generates a CSV (category totals +
transaction-level detail with receipt counts) and hands it off via the
system share sheet (`expo-sharing`) — the transaction-level detail comes
from `getReliefTransactions`, fetched lazily only on export rather than
held for the whole screen's lifetime. Verified with a real-SQLite Jest
suite (`local/__tests__/tax-relief-service.test.ts`) covering default-cap
seeding, cap edits surviving re-seeding, and per-year claimed-amount
aggregation (including that a different year's or an untagged
transaction's amount never leaks into a year's summary).

**Not yet built:** true evidence _bundling_ (the CSV export lists receipt
counts per transaction but doesn't package the receipt files themselves
into the export — each receipt is still only viewable/shareable
individually from its transaction, per the MVP section above).

**Also shipped, beyond the original spec: live LHDN relief-cap sync.**
`local/lhdn-relief-sync-service.ts` scrapes hasil.gov.my's public relief
page (`CATEGORY_ANCHORS`, a fixed English-language anchor phrase per
relief category verified against the YA2025 listing) and looks for a
thousands-separated RM amount near each anchor. A scheduled check runs at
most once per `app/tax-relief.tsx` mount, gated to roughly quarterly
(`SYNC_CHECK_INTERVAL_DAYS = 90`) via `shouldRunScheduledCheck`; a manual
"Check LHDN for relief updates" button on the same screen runs it anytime.
Results are never applied automatically — matches (`pendingDiffs`, current
cap vs. scraped amount) and categories the scraper couldn't confidently
locate (`unmatched`, surfaced rather than silently treated as "no
change") both sit in `lhdn_relief_sync_state` until the user reviews them
in the "LHDN Relief Check" dialog and selectively applies or dismisses
them. Since this is HTML scraping against a page LHDN could restyle at
any time, failures (network or zero matches) just populate
`syncState.lastError` for the manual retry path rather than blocking the
screen. Covered by `local/__tests__/lhdn-relief-sync-service.test.ts`.

## Goal

Give users a durable, LHDN-ready evidence trail for purchases that qualify
for personal income tax relief — starting with simply capturing proof,
evolving into full relief-category calculation.

Keep receipts attached at the transaction level (Phase 3) rather than as
an unrelated feature — a receipt is evidence for a specific expense, and
relief-category tagging can reuse whatever category/tag taxonomy
Transactions eventually gets.

---

## MVP — Receipt Capture

Allow users to attach evidence to a transaction:

- Photo capture (camera) or image picker
- PDF/document picker, for e-invoices and emailed receipts
- Multiple attachments per transaction
- View/zoom a stored receipt
- Delete an attachment

Local storage:

- Store attachments as files referenced by path/URI in SQLite, or as
  BLOBs directly in SQLite — needs a decision, since file-based storage
  would need its own path added to Phase 11's backup process for the
  existing Google Drive backup to capture attachments automatically.
- No cloud upload required for the MVP — local-first, same as every other
  feature.

---

## Full — Tax Relief Calculation

Once attachments exist, extend transactions with:

- LHDN tax relief category (e.g. Lifestyle, Medical — self/spouse/child,
  Parents' medical & care, Education fees, Life insurance/EPF, PRS, SSPN,
  Disabled individual/equipment, and other LHDN categories)
- Assessment year (YA) the transaction applies to

Relief categories and their caps should be configurable/versioned per
year, since LHDN typically revises the relief list and caps with each
annual Budget.

Calculate:

- Total claimed per relief category, per assessment year
- Remaining headroom under each category's cap
- Warn when a category is at or over its cap

Provide:

- A Tax Relief dashboard per assessment year — category totals vs caps,
  ready to reference during e-Filing
- Evidence export per assessment year (receipts + a summary bundle) for
  LHDN audit purposes

Example:

```text
Tax Relief — YA2026

Lifestyle
Claimed:    RM1,850
Cap:        RM2,500
Remaining:  RM650

Medical (Self/Spouse/Child)
Claimed:    RM4,200
Cap:        RM10,000
Remaining:  RM5,800
```

---

# Phase 5 — Money Management

# Budgeting

Support:

- Monthly budgets
- Annual budgets
- Category budgets
- Spending limits
- Remaining budget
- Budget rollover
- Budget alerts

Example:

```text
Food

Budget:       RM800
Spent:        RM620
Remaining:    RM180
```

---

# Subscription Management

Track:

- Subscription name
- Amount
- Billing interval
- Next billing date
- Annual cost
- Category

Show:

```text
Monthly subscriptions: RM180
Annual cost:            RM2,160
```

Potential features:

- Renewal alerts
- Price increase detection
- Unused subscription warnings
- Cancellation reminders

---

# Net Worth

Create a dedicated net-worth system.

```text
Total Assets
      -
Total Liabilities
      =
Net Worth
```

Track historical net worth.

Provide:

- Net-worth history
- Asset allocation
- Liability breakdown
- Net-worth growth
- Monthly change
- Annual change

---

# Emergency Fund

Calculate:

- Monthly essential expenses
- Current emergency savings
- Months of coverage
- Target coverage
- Required additional savings

Example:

```text
Essential expenses: RM3,000/month

Current fund:       RM12,000
Coverage:           4 months

Target:             6 months
Required:           RM6,000
```

---

# Debt Planning

Expand liability functionality.

Track:

- Principal
- Interest/profit rate
- Monthly payment
- Remaining balance
- Start date
- End date
- Payment schedule
- Total cost
- Early repayment scenarios

Provide:

- Debt-to-income ratio
- Debt payoff timeline
- Snowball simulation
- Avalanche simulation
- Early repayment simulation

---

# Phase 6 — Financial Goals & Planning

# Financial Goals

Allow users to create:

- Emergency fund
- New car
- House deposit
- Vacation
- Laptop
- Hajj/Umrah
- Investment target
- Retirement
- Debt repayment

Fields:

- Target amount
- Current amount
- Target date
- Monthly contribution
- Linked account
- Priority

Calculate:

```text
Target:          RM30,000
Current:         RM12,000
Remaining:       RM18,000

Target date:     Dec 2027

Required/month:  RM1,059
Current/month:   RM800

Shortfall:       RM259/month
```

---

# Financial Calendar

Create a unified financial calendar combining:

- Salary
- Bills
- Loans
- Insurance
- Subscriptions
- Investment contributions
- Dividends
- Zakat
- Financial goals
- Other financial events

The calendar should become the central timeline for future financial events.

---

# Financial Forecasting

Build a forecasting engine using:

- Recurring income
- Recurring expenses
- Payment reminders
- Current balances
- Investment income
- Debt schedules
- Goals

Forecast:

- End-of-month cash
- End-of-year cash
- Upcoming shortfalls
- Expected surplus
- Goal completion dates
- Emergency-fund growth

Example:

```text
Projected cash balance

Today:       RM8,000
30 days:     RM9,200
60 days:     RM10,350
90 days:     RM11,100
```

---

# What-If Financial Simulator

Build a simulation engine that never modifies real financial data.

## Purchase Simulation

Example:

```text
"What happens if I buy a RM80,000 car?"
```

Calculate:

- Down payment
- Loan amount
- Monthly payment
- Remaining monthly surplus
- Emergency-fund impact
- Goal impact
- Financial-health impact

## Investment Simulation

```text
"What happens if I invest RM1,000/month instead of RM500?"
```

Calculate projected portfolio growth using configurable assumptions.

## Income Simulation

```text
"What happens if my salary increases by RM1,000?"
```

Calculate:

- Monthly surplus
- Goal acceleration
- Investment capacity
- Debt repayment acceleration

## Income Interruption

```text
"What happens if I have no income for 6 months?"
```

Calculate:

- Cash runway
- Emergency-fund requirements
- Upcoming commitments
- Potential investment liquidation requirement

---

# Phase 7 — Investment Platform

Investment tracking should integrate with the existing asset system.

Support:

- Stocks
- ETFs
- REITs
- Gold
- Crypto
- ASB
- Other investments

Track:

- Cost basis
- Current value
- Quantity
- Current price
- Unrealized P/L
- Realized P/L
- Dividends
- Yield
- Allocation
- Portfolio growth

---

# Investment Provider Architecture

Do not couple the investment domain directly to Moomoo.

Create:

```text
InvestmentProvider
 ├── MoomooProvider
 ├── ManualProvider
 └── FutureBrokerProvider
```

This allows additional brokers to be added without redesigning the investment system.

---

# Moomoo Integration

Moomoo should be the first external brokerage integration.

The preferred user experience is:

> Connect Moomoo once, then automatically retrieve portfolio information instead of manually entering prices and values.

The user should not need to manually maintain:

- Quantity
- Current price
- Market value
- Portfolio P/L

when the Moomoo integration can provide the information.

---

## Moomoo Workflow

```text
Finance App
    │
    │ Connect Moomoo
    ▼
Moomoo Authorization
    │
    ▼
User grants permission
    │
    ▼
Moomoo Provider
    │
    ├── Account information
    ├── Positions
    ├── Holdings
    ├── Market prices
    └── Portfolio information
    │
    ▼
SQLite
    │
    ▼
Finance App UI
```

The application should store the synchronized investment state locally.

Moomoo remains the source of truth for broker position and market data.

---

# Moomoo Synchronization

Support:

- Initial portfolio import
- Position synchronization
- Current price updates
- Portfolio value calculation
- Cost basis synchronization where available
- Dividend/corporate-action information where available
- Manual refresh
- Scheduled refresh where technically appropriate

Avoid unnecessary continuous polling.

Cache external market data where appropriate.

---

# Investment Data Separation

Separate user financial state from external market data.

```text
User Financial State
    │
    ├── Holdings
    ├── Quantity
    ├── Cost basis
    └── Historical transactions

External Market Data
    │
    ├── Current price
    ├── Market status
    └── Corporate actions
```

Market-price changes must not modify historical financial records.

---

# Manual Investment Fallback

Users must still be able to track investments manually when:

- A broker is unsupported
- API authorization is unavailable
- The investment is held outside a supported provider
- The user wants to track an external asset

---

# Investment Analytics

Provide:

- Portfolio allocation
- Cost vs current value
- Unrealized P/L
- Realized P/L
- Dividend income
- Dividend yield
- Annual dividend estimate
- Portfolio growth
- Asset-class allocation
- Market allocation
- Currency exposure
- Concentration analysis

---

# Shariah Investment Support

Extend the existing Shariah-oriented capabilities into investments.

Potential functionality:

- Shariah-compliant status
- Shariah screening
- Compliance status
- Screening source/date
- Status-change warnings

The screening system should remain separate from the core investment model.

---

# Phase 8 — Zakat Expansion

## Status: Per-state nisab detection shipped (ahead of the rest of this phase)

Zakat previously used a single nationwide gold-price-derived nisab for
every user. `interface/nisab-state.ts` adds a `MalaysiaStateKey` union for
all 14 states/federal territories and a `NisabSource` discriminant
(`state` / `ppz_fallback` / `gold_price`) so the UI can always say _why_
a given nisab figure is what it is — see `pages.md` §4.2 for the banner's
exact copy per state.

`local/nisab-state-sync-service.ts` (`STATE_AUTHORITIES`) live-scrapes
8 of the 14 states' own zakat authorities (Selangor/LZS via an AJAX
endpoint with a bespoke fetcher, WP KL-Putrajaya-Labuan/PPZ-MAIWP, Johor/
MAIJ, Kedah/LZNK, Melaka/MAIM, Negeri Sembilan, Sabah, Terengganu — each
via an anchor-phrase HTML scrape similar in spirit to the LHDN relief
sync above); the other 6 states have no live source configured yet and
always fall back to PPZ-MAIWP's published rate. A scheduled resync runs
at most every `STATE_SYNC_INTERVAL_DAYS = 30` (shorter than the LHDN
relief sync's 90, since ~14 heterogeneous sites scraped at once is more
failure-prone and a broken anchor should surface sooner); `local/nisab-
resolver.ts` picks the effective nisab per user (their detected state's
live rate → PPZ-MAIWP fallback → nationwide gold price, in that order).

`local/state-location-service.ts` detects the user's state via
`expo-location` foreground GPS + reverse-geocoding, matching the
geocoder's free-text region/subregion against a per-state alias list
(handles iOS/Android geocoder wording differences, e.g. "Kuala Lumpur"
vs. "W.P. Kuala Lumpur"). Detection is manual (a refresh icon on the
nisab source banner), not automatic/background — the user triggers it
from the Dashboard or Zakat Tracker.

`services/nisab-notifications.ts` fires a local "Zakat Nisab Updated"
notification whenever the resolved nisab changes from what the user was
last notified about (checked on every global sync pass, foreground or
background) — except the very first run, which just records a silent
baseline so a fresh install doesn't announce a "change" for a number the
user has never seen. Covered by `local/__tests__/nisab-resolver.test.ts`,
`local/__tests__/nisab-state-sync-service.test.ts`, and
`local/__tests__/state-location-service.test.ts`.

**Not yet built:** the other 6 states' live sources, zakat history (a
log of past payments beyond the single `last_paid_date` per category),
and everything else below this heading (business-asset zakat, a
dedicated zakat-position dashboard, deeper zakat/transactions/financial-
calendar integration).

Continue expanding the existing zakat system.

Support:

- Cash zakat
- Investment zakat
- Gold
- Business assets
- Other eligible assets
- Nisab
- Hijri dates
- Zakat due date
- Paid amount
- Remaining amount
- Zakat history

Potential dashboard:

```text
Zakat Position

Eligible assets:    RM60,000
Nisab:              RM28,000
Estimated zakat:    RM1,500

Paid:               RM500
Remaining:          RM1,000
```

Zakat should integrate with:

- Assets
- Investments
- Transactions
- Financial calendar
- Payment reminders

---

# Phase 9 — Financial Intelligence

# Financial Health Score

Create a transparent financial-health score.

Potential components:

- Emergency-fund coverage
- Savings rate
- Debt-to-income ratio
- Monthly cash-flow surplus
- Investment allocation
- Commitment ratio
- Goal progress
- Net-worth growth

Example:

```text
Financial Health

78 / 100

Emergency Fund       92
Savings Rate         75
Debt                 84
Cash Flow            81
Investments          70
Goals                68
```

Explain why the score changed.

---

# Automatic Financial Insights

Generate actionable insights such as:

- Spending increased compared with previous month.
- Subscription costs increased.
- Upcoming commitments are unusually high.
- Emergency-fund coverage decreased.
- Investment concentration increased.
- Savings rate improved.
- Zakat payment is approaching.
- Financial goal is falling behind schedule.

Insights should be actionable rather than merely descriptive.

---

# AI Financial Assistant

Eventually add an AI assistant that can use structured financial data.

Example questions:

- "Can I afford this?"
- "Why did my spending increase?"
- "How much can I safely invest?"
- "When will I reach my emergency-fund target?"
- "How much do I need to save monthly?"
- "What are my biggest upcoming commitments?"
- "What happens if I increase my investment contribution?"
- "How much zakat should I prepare for?"
- "Which financial goal should I prioritize?"

The AI should operate on structured financial data rather than relying only on conversation context.

---

# AI Action Layer

Eventually allow AI to suggest actions.

Example:

```text
You have RM950 of upcoming commitments
that are not yet covered.

Suggested action:

Reserve RM317/month for the next 3 months.
```

Or:

```text
Your subscription spending increased 24%.

Suggested action:

Review 3 recurring subscriptions
totaling RM87/month.
```

AI actions must require user confirmation before modifying financial data.

---

# Local vs Cloud AI

AI should not be required for core financial functionality.

Many insights can be generated locally through deterministic calculations.

Examples:

- Monthly spending increase
- Emergency-fund coverage
- Cash runway
- Commitment totals
- Goal progress
- Budget status
- Zakat calculations

Potential AI architecture:

```text
SQLite
  │
  ├── Local financial calculations
  │
  └── Optional AI provider
           │
           ▼
      Natural-language
         insights
```

When using an external AI provider:

- Send only required data.
- Avoid unnecessary personal financial information.
- Make external processing clear to the user.
- Keep core calculations available without AI.

---

# Phase 10 — Household / Family Finance

Eventually support shared financial spaces.

```text
Household
 │
 ├── User
 ├── Spouse
 ├── Child
 └── Shared Accounts
```

Potential functionality:

- Shared bills
- Household budget
- Family goals
- Shared assets
- Shared liabilities
- Education savings
- Insurance
- Family emergency fund
- Zakat planning

Permissions:

- Private data
- Shared data
- Household administrator
- Read-only member

---

# Phase 11 — Data Backup & Restore

## Status: Working end-to-end in development

Google Cloud OAuth setup (Android + Web clients, Drive API enabled, test
users added) is complete, and connect / Backup Now / Load Backup / Restore
have all been verified working on the `development` build. See
`apps/mobile/env.md` for the full credentials/package/keystore reference —
keep it updated whenever any of that changes, since it's what avoids
signature-mismatch install failures.

App-side code: `@react-native-google-signin/google-signin` (drive.appdata
scope) + Drive v3 REST client, AES-256 local encryption with a device-held
key and recovery-key export/import, GFS retention (daily/weekly/monthly),
restore with integrity-check + schema-version compatibility check (reusing
the versioned migration runner) + a local safety snapshot, and a
`backup.tsx` settings screen (gear icon on the dashboard).

`development` now builds as a separate Android package
(`com.lumvyr.zakattracker.dev`, via `app.config.js` + `APP_VARIANT`) so it
can be installed alongside `preview`/`production` on the same device — each
package has its own Google OAuth Android client and signing keystore (see
env.md).

Fixed: dev and preview/production backups no longer collide in the shared
Drive `appDataFolder` (Drive's `appdata` scope isolates by Google Cloud
project + account, not by which app package made the request). Development
builds now write/list/prune backups named `FinanceApp-Backup-DEV-...`
(`services/backup-naming.ts`), determined at runtime from
`Constants.expoConfig.android.package` (`services/backup.ts`); preview/
production keep the original untagged filename for backward compatibility
with backups already in users' Drive folders. `listAvailableBackups` and
`pruneRetention` both filter to the current environment's tag, so a dev
build never lists, restores, or prunes a preview/production backup or vice
versa.

**Not yet rebuilt:** `preview` still has an older bug (`SQLite.defaultDatabaseDirectory`
returning a non-absolute path, breaking `FileSystemFile.copy`) that was
fixed in `development` via live reload but needs a fresh preview build to
pick up, since preview bundles JS at build time rather than connecting to
Metro.

**Uncommitted, not yet built:** `app.config.js` now sets an iOS
`bundleIdentifier` (same dev/prod split as the existing Android
`package`) and `eas.json`'s `preview` profile now sets `"distribution":
"internal"` explicitly — neither has an iOS Google OAuth client, keystore,
or build yet, so this is prep, not a working iOS path. See
`apps/mobile/env.md` before building for either platform.

## Goal

The application must remain local-first while protecting users against device loss or database corruption.

Google Drive is an optional backup destination.

It is not the application's backend.

The user's SQLite database remains the source of truth.

---

# Google Drive Integration

Allow users to connect their own Google account.

If Google Drive backup is not configured:

- Prompt the user to connect a Google account when enabling automatic backup.
- Prompt when pressing `Backup Now`.
- Provide a clear account connection flow.

The application should:

1. Detect whether Google Drive is connected.
2. Ask the user to connect a Google account if necessary.
3. Securely store authorization credentials on the device.
4. Request minimum required permissions.
5. Use the user's own Google Drive storage.
6. Create/manage a dedicated Finance App backup location.
7. Never upload financial data to a Finance App-owned server.

---

# Automatic Backup

When enabled:

- Automatically back up once per day.
- Target time: 2:00 AM.
- Use the device's local timezone.
- Treat 2:00 AM as best-effort because mobile operating systems may delay background execution.
- Retry when appropriate if the scheduled execution was missed.
- Record last successful backup.
- Record backup errors locally.

If Google Drive is unavailable, the application must continue working normally.

---

# Backup Process

Before uploading:

1. Verify Google Drive connection.
2. Verify SQLite availability.
3. Create a consistent SQLite backup/snapshot.
4. Do not simply copy a database while it is being actively written.
5. Optionally encrypt the backup locally.
6. Upload the backup.
7. Verify successful upload.
8. Store backup metadata locally.

Potential metadata:

- Backup ID
- Created timestamp
- Database schema version
- Application version
- File size
- Google Drive file ID
- Backup status

---

# Backup File Naming

Use predictable, human-readable filenames.

Example:

```text
FinanceApp-Backup-2026-08-27-020000.sqlite
```

If encrypted:

```text
FinanceApp-Backup-2026-08-27-020000.enc
```

---

# Backup Now

Provide a manual:

`Backup Now`

Behavior:

1. Check Google Drive connection.
2. If not connected:
   - Ask user to connect a Google account.
3. Create a fresh database snapshot.
4. Upload immediately.
5. Show progress.
6. Show success/failure.
7. Update last-backup metadata.

Example:

```text
Backup

Last backup:
27 Aug 2026, 2:00 AM

Google Drive:
Connected

[Backup Now]
```

---

# Load / Restore

Use a user-friendly:

`Load Backup`

or:

`Restore Backup`

The user should not need to:

- Open Google Drive manually.
- Understand folders.
- Find SQLite files.
- Download files manually.
- Use a file manager.

The application should automatically find Finance App backups.

---

# Restore Workflow

```text
Load Backup
     │
     ▼
Check Google Drive
     │
     ├── Not connected
     │       ↓
     │   Connect account
     │
     ▼
Search Finance App backups
     │
     ▼
Display available backups
     │
     ▼
User selects backup
     │
     ▼
Download
     │
     ▼
Validate
     │
     ▼
Create safety backup
     │
     ▼
Restore SQLite
     │
     ▼
Reinitialize database
     │
     ▼
Refresh application state
     │
     ▼
Rebuild notifications
```

---

# Backup Search

The user should not need to know Google Drive's folder structure.

Search automatically using:

- Known backup filename prefix
- Application-specific metadata
- Google Drive file ID when known
- Backup timestamp
- Schema version
- Application version

Example:

```text
Restore Backup

Available backups

● 27 Aug 2026 • 2:00 AM
  2.4 MB

○ 26 Aug 2026 • 2:00 AM
  2.3 MB

○ 25 Aug 2026 • 2:00 AM
  2.3 MB

[Restore Selected]
```

Optional search:

```text
Search backups
[ 2026-08-25 ]
```

The application should perform the Google Drive search rather than sending the user into the Google Drive application.

---

# Restore Safety

Never immediately overwrite the current database.

Before restoration:

1. Create a local safety snapshot.
2. Download selected backup.
3. Verify SQLite integrity.
4. Verify schema compatibility.
5. Confirm with user.
6. Replace active database.
7. Reinitialize SQLite connections.
8. Refresh application state.
9. Rebuild relevant notifications.

Confirmation:

```text
Restore this backup?

27 Aug 2026 • 2:00 AM

This will replace your current
financial data with the selected backup.

A safety copy of your current data
will be created before restoring.

[Cancel] [Restore]
```

---

# Database Version Compatibility

Every backup should contain or be associated with:

- Database schema version
- Application version

Restore must detect incompatible versions.

If migration is possible:

- Run migration.

If migration is not possible:

- Reject restore.
- Explain the problem clearly.

Never silently load an incompatible database.

---

# Backup Retention

Support configurable retention.

Recommended default:

- 30 daily backups
- 12 weekly backups
- 12 monthly backups

Future retention options:

```text
Daily backups:     30
Weekly backups:    12
Monthly backups:   12
```

Never delete files outside the Finance App backup scope.

---

# Backup Encryption

Future recommended implementation:

```text
SQLite
   ↓
Local encryption
   ↓
Encrypted backup
   ↓
Google Drive
```

The financial database should ideally be encrypted before upload.

The encryption key must not be stored beside the backup.

Provide a secure recovery mechanism so users do not permanently lose access to encrypted backups.

---

# Backup Status

Display clear states:

- Not configured
- Connected
- Backup pending
- Backing up
- Backup successful
- Backup failed
- Google account disconnected
- Storage unavailable
- Restore available

Example:

```text
Google Drive Backup

● Connected

Automatic backup:
ON

Schedule:
Every day at 2:00 AM

Last successful backup:
27 Aug 2026, 2:00 AM

Status:
Up to date
```

---

# Privacy

Financial data is sensitive.

Therefore:

- Use secure OAuth handling.
- Never store Google passwords.
- Store tokens using secure device storage.
- Use encrypted transport.
- Prefer client-side encrypted backups.
- Never send backups through a Finance App backend.
- Do not make cloud storage mandatory.
- Allow users to disconnect Google Drive.
- Allow users to delete their cloud backups.

---

# Phase 12 — Reports

Provide:

- Monthly financial report
- Annual financial report
- Net-worth report
- Cash-flow report
- Investment report
- Zakat report
- Debt report
- Goal-progress report

Potential export formats:

- PDF
- CSV
- JSON

---

# Phase 13 — External Integrations

Potential integrations:

## Brokerage

- Moomoo
- Future brokers

## Banking

Potential bank/open-banking integrations where available.

## Financial Services

- ASB
- EPF/KWSP
- Other investment platforms

## Data Providers

- Market data
- Currency rates
- Gold prices
- Shariah screening data

All external services should use provider interfaces.

---

# Optional Backend

A backend should only be introduced when there is a clear requirement.

Potential reasons:

- Multi-device synchronization
- Cloud account
- Household sharing
- Remote processing
- Remote notifications
- Server-side AI
- Centralized market-data processing

The backend must not become a requirement for core functionality.

---

# Multi-Device Strategy

Initial version:

```text
Phone
 │
 └── SQLite
```

One device can operate independently.

Future optional synchronization:

```text
Phone A
  │
 SQLite A
  │
  ├────────── Sync ──────────┐
                              │
                           Cloud
                              │
  ┌────────── Sync ───────────┘
  │
 SQLite B
  │
Phone B
```

Synchronization should be an optional layer.

---

# Offline-First Requirements

The following must continue working without internet:

- Assets
- Liabilities
- Transactions
- Receipts and tax relief tracking
- Budgeting
- Payment reminders
- Local notifications
- Zakat
- Hijri calculations
- Goals
- Financial forecasting
- Financial health
- What-if simulations
- Investment records
- Reports

Online connectivity is required only for external integrations such as:

- Moomoo synchronization
- Market data
- Google Drive backup/restore
- External AI
- Optional cloud synchronization

---

# Security Principles

Because the application contains financial information:

- Encrypt sensitive local data where appropriate.
- Secure OAuth credentials.
- Never store broker passwords.
- Never store Google passwords.
- Use least-privilege permissions.
- Provide connection revocation.
- Provide data export.
- Provide data deletion.
- Minimize financial data sent to external services.
- Make external data processing transparent.
- Keep integrations opt-in.

---

# Suggested Delivery Milestones

## Milestone 1 — Local Financial Foundation

- Assets
- Liabilities
- Zakat
- SQLite
- Existing notifications
- Database migrations
- Net worth

## Milestone 2 — Payment Reminders

- Reminder model
- SQLite persistence
- Recurring schedules
- Reminder UI
- Create/edit/delete
- Mark paid
- Local notifications

## Milestone 3 — Receipts & Tax Relief

- Receipt/document capture and storage
- Attach evidence to transactions
- Tax relief category tagging
- Relief cap tracking and summary
- Assessment-year evidence export

## Milestone 4 — Financial Management

- Accounts
- Transactions
- Income
- Expenses
- Cash flow
- Budgeting
- Subscription tracking

## Milestone 5 — Planning

- Financial goals
- Emergency fund
- Debt planning
- Financial calendar
- Forecasting
- What-if simulator

## Milestone 6 — Investment

- Investment domain model
- Manual investments
- Moomoo integration
- Portfolio synchronization
- Investment analytics
- Dividend tracking
- Shariah screening

## Milestone 7 — Backup & Restore

- Google OAuth
- Google Drive connection
- Automatic daily backup
- 2:00 AM schedule
- Backup Now
- Automatic backup discovery
- Load/Restore
- Backup validation
- Restore safety snapshot
- Backup retention
- Optional encryption

## Milestone 8 — Financial Intelligence

- Financial health
- Automatic insights
- Forecasting improvements
- AI financial assistant
- AI action suggestions

## Milestone 9 — Household

- Household
- Shared accounts
- Shared expenses
- Shared goals
- Permissions

## Milestone 10 — Optional Ecosystem

- Cloud synchronization
- Multi-device support
- Additional brokers
- Banking integrations
- ASB/EPF integrations
- Advanced reports
- Additional external data providers

---

# Recommended Product Evolution

```text
Assets
   +
Liabilities
   +
Zakat
   +
Payment Reminders
        │
        ▼
Accounts + Transactions
        │
        ▼
Receipts + Tax Relief
        │
        ▼
Cash Flow + Budget
        │
        ▼
Goals + Forecast
        │
        ▼
Investments + Moomoo
        │
        ▼
Financial Health
        │
        ▼
What-If Simulator
        │
        ▼
AI Financial Assistant
        │
        ▼
Household Finance
        │
        ▼
Optional Ecosystem
```

Backup exists across all phases:

```text
             SQLite
                │
       ┌────────┴────────┐
       │                 │
    Local App       Google Drive
       │                 │
   Source of Truth    Backup Only
```

---

# Initial Scope Recommendation

Do not attempt to build the entire super app immediately.

The initial priority should be:

1. Keep SQLite/local-first architecture strong.
2. Complete payment reminders.
3. Build accounts and transactions.
4. Build receipts and tax relief tracking.
5. Build cash flow and budgeting.
6. Build goals and forecasting.
7. Add Google Drive backup/restore.
8. Add Moomoo integration.
9. Add financial health and simulations.
10. Add AI.
11. Add household and optional synchronization later.

The most important architectural decision is to establish a strong financial domain model and transaction/cash-flow layer before adding AI or many external integrations.

The application should ultimately become:

> A private, local-first Personal Financial Operating System that understands where your money is, where it is going, and what will happen to it next.
