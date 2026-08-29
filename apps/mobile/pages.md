# Zakat / Wealth Tracker — Screen & Modal Reference

A functional description of every screen, tab, detail page, and popup/modal in the
mobile app (`apps/mobile/app` + `apps/mobile/components`). It covers each surface's
purpose, its sections, the data shown, every field, the loading / empty / error
states, and every interaction — so it can be used as the basis for a new mockup
design. It intentionally does **not** describe the current visual styling.

---

## App overview

A personal finance tracker for a Muslim user in Malaysia (currency: Malaysian
Ringgit, "RM"). It covers:

- **Assets** — everything the user owns, bucketed into Cash, Gold, Crypto, Stock.
- **Liabilities** — debts and recurring commitments.
- **Zakat** — tracks, per asset category, whether the holding has reached _nisab_
  (the threshold, resolved per Malaysian state where available), where it is in
  the _haul_ (one lunar-year holding period), how much zakat is due (2.5%), and
  when it is next due — and schedules reminders.
- **Transactions** — a flat, account-less log of income/expense/investment/etc.
  events, optionally with photo/PDF receipts attached and LHDN tax-relief tagging.
- **Payment Reminders** — recurring or one-time bills (rent, insurance,
  subscriptions, loans, …) with their own due-date notification schedule.
- **Tax Relief** — per-assessment-year LHDN relief category tracking, driven by
  Transactions tagged with a relief category.
- **Backup & Restore** — optional, user-owned Google Drive backup of the local
  SQLite database.

A **Dashboard** rolls Assets, Liabilities, and Zakat together and is the jumping-off
point for everything else.

## Navigation structure

- **Bottom tab bar** with three destinations, always visible:
  1. **Dashboard**
  2. **Assets**
  3. **Liabilities**
- Screens reachable from the Dashboard/Assets/Liabilities but **not** on the tab
  bar (kept off it to stay lean — `href: null` routes):
  - **Zakat Tracker** — from the Dashboard's Nisab Status "View Details" link and
    the Quick Actions "Zakat" button.
  - **Reminders** — from the notification-bell button in the Dashboard header.
  - **Transactions** — from the Dashboard's Quick Actions "Transactions" button.
  - **Tax Relief** — from the Dashboard's Quick Actions "Tax Relief" button.
  - **Backup & Restore** — from the gear/settings button in the Dashboard header.
- Two **detail screens** pushed on top of the tabs, each with a back control:
  - **Asset Detail** (`asset/[id]`)
  - **Liability Detail** (`liability/[id]`)
- A brief **splash screen** on cold launch.
- **Modals** (bottom sheets and centered dialogs) launched from within screens, all
  listed below.

Every screen header follows the same pattern: a small caption line above a large
screen title (e.g. caption "Overview" / title "My Assets"). Screens reached by
push (Transactions, Tax Relief, Backup, Asset/Liability Detail) instead use a
back-chevron + inline title row.

---

# 1. Dashboard

**Purpose:** a read-only, at-a-glance summary of net worth, asset mix, and zakat
obligations, plus the entry points into every other screen. No data is created or
edited here.

**Header:** caption "Overview", title "My Wealth". Two round icon buttons on the
right: a **notification bell** (→ Reminders) and a **gear** (→ Backup & Restore).

**States:**

- _Loading_ — a spinner while assets, liabilities, and zakat data all load.
- No dedicated empty state; sections simply show zeros.

**Content, top to bottom:**

1. **Net Worth hero card** — one prominent figure: `total assets − total
   liabilities` (only assets still marked "include in total" count; assets held
   for someone else are excluded from both net worth and this figure, not just
   zakat). Below it, two rows of smaller stats:
   - **Assets** — sum of every included asset's value, with a "+RM… excluded"
     note when any assets are toggled out.
   - **Debt** — sum of every liability's outstanding balance.
   - **Debt ratio** — `total liabilities / total assets`, as a percentage.
   - **Avg commitment** — sum, across liabilities, of each one's average monthly
     payment (falls back to its fixed monthly payment when no payment history
     exists yet).
2. **Asset Distribution** — a segmented bar plus a 2-column grid, one entry per
   category in fixed order **Cash & Savings, Gold, Crypto, Stock**: color swatch,
   category label, RM amount, and percentage of total assets. Categories with no
   assets still appear, at 0%.
3. **Nisab Status** — one card combining:
   - the **nisab source banner** (see §4 for its states) — where the nisab figure
     currently in use came from (a specific state's authority, the PPZ-MAIWP
     fallback, or the nationwide gold-price fallback), with a refresh-location
     control and a "view all states" list control,
   - **Total Zakatable** — sum of `zakat_due` across categories that have reached
     nisab, even before their haul year completes,
   - **Total Zakat Due** — sum of `zakat_due` across categories that are Due or
     Overdue (haul year complete),
   - a **View Details** link → Zakat Tracker.
4. **Quick Actions** — five buttons, each navigating elsewhere: **Transactions**,
   **Assets**, **Liabilities**, **Zakat**, **Tax Relief**.

**Modals:** none directly, but the Nisab Status card can open the **Nisab by
State** list modal (§4.2).

---

# 2. Assets tab

**Purpose:** list everything the user owns, organized by category and then by the
platform/account it is held in; entry point for adding assets and for updating a
platform's balance.

**Header:** caption "Overview", title "My Assets". An **Add** button opens the
**Add Asset** sheet (§2.1) with nothing pre-filled.

**States:**

- _Loading_ — placeholder cards.
- _Empty_ — "No assets yet" / "Add your first asset to get started".
- _Populated_ — see below.

**Populated content** — a list of **category sections**, ordered by total value
(largest first). Each section has:

- **Section header:** the category name, the category's total value, and — if any
  asset in it is excluded from zakat — a secondary "RM… zakatable" figure (the total
  that _does_ count toward zakat).
- **Section items**, ordered by value (largest first), each being one of:
  - **Platform group** — two or more assets that share the same category **and**
    platform (e.g. "TNG eWallet"). Shows:
    - platform name and entry count,
    - the combined value of the group,
    - a combined profit percentage, when at least one entry has a cost basis,
    - a "RM… zakatable" figure when some entries are excluded,
    - an **Update Balance** action (only when the group has more than one entry) →
      opens the **Update Balance** dialog (§2.2),
    - an **Add** action → opens **Add Asset** (§2.1) pre-filled with this platform,
    - then the individual **asset rows**.
  - **Standalone asset** — an asset with no platform, shown as a single row in its
    own card, with an **Add** action that opens **Add Asset** pre-filled with this
    asset's name as the platform (on save, the two are grouped together).

**Asset row** — shows:

- an optional `quantity + unit` line,
- the asset name (with a marker if it is the platform's auto-tracked catch-all
  balance — see Platform Total in §2.1),
- an optional note (truncated),
- the asset's value (or "N/A" if none),
- a profit percentage, when the row has a cost basis and is not inside a multi-entry
  group,
- a **toggle** for "include in zakat calculation" (rows toggled off are visually
  de-emphasized),
- tapping the row (not the toggle) opens **Asset Detail** (§2.3).

### 2.1 Add Asset (modal — bottom sheet)

**Purpose:** create a new asset. Presented as a scrollable bottom sheet.

**Header:** "New Asset" / "Add a new investment to track". A close control.

**Layout, top to bottom:**

1. **Asset Category** — four options: Cash / Gold / Crypto / Stock (default Cash).
2. **Asset Name** (required).
3. **Platform / Account**.
4. **Weight (grams)** and a **Use Live Gold Price** toggle — _Gold only_.
5. **Current Value (RM)**.
6. **Add more details** — a collapsible section (collapsed by default) containing:
   Quantity + Unit (not shown for Gold), Cost Basis, Goal Amount, Note, Platform
   Total, Include in Zakat Calculation.
7. **Actions:** Cancel, and **Create Asset**.

**Field reference** — every field, what it is for, and how it behaves. The same
fields appear in Asset Detail edit mode (§2.3); differences are noted there.

| Field                                                                     | Input                               | Required                                                          | Default | Purpose & behavior                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Asset Category**                                                        | one of Cash / Gold / Crypto / Stock | yes                                                               | Cash    | Buckets the asset everywhere (Dashboard distribution, Assets sections, Zakat categories). Choosing **Gold** reveals the Weight field and the live-price toggle, and hides the generic Quantity/Unit pair.                                                                                                                                                                                             |
| **Asset Name**                                                            | text                                | **yes**                                                           | —       | Free label ("Apple Stock", "Emergency fund"). Used as the row/card title.                                                                                                                                                                                                                                                                                                                             |
| **Platform / Account**                                                    | text                                | no (may be pre-filled)                                            | —       | Where the asset is held ("Maybank", "Touch 'n Go", "Luno"). Assets sharing the **same category + platform** are merged into one **platform group**, and zakat withdrawals are broken out per platform. Leave blank for a standalone asset.                                                                                                                                                            |
| **Weight (grams)** — _Gold only; this is the `quantity` field relabelled_ | numeric                             | only if Use Live Gold Price is on                                 | —       | Gram weight of the gold. Combined with the live price to derive value.                                                                                                                                                                                                                                                                                                                                 |
| **Use Live Gold Price** — _Gold only_                                     | toggle                              | no                                                                | off     | Disabled until a weight is entered. When on: the manual value field is hidden, the unit is forced to "gram", and the value is recomputed daily as `weight × Bank Negara Malaysia gold price`. When off, the value is entered by hand.                                                                                                                                                                 |
| **Current Value (RM)** — _(`price`)_                                      | numeric                             | yes, **unless** Platform Total or Use Live Gold Price provides it | —       | The asset's present value — the figure that feeds net worth, distribution, and zakat. Shown as a read-only note ("auto-computed…") when it is derived rather than entered.                                                                                                                                                                                                                             |
| **Quantity** — _non-Gold, optional_                                       | numeric                             | no                                                                | —       | Informational context only ("15" shares, "0.5" BTC). Displayed with the unit above the name. Does **not** affect value.                                                                                                                                                                                                                                                                               |
| **Unit** — _non-Gold, optional_                                           | text                                | no                                                                | —       | Label paired with Quantity ("shares", "BTC", "lots"). Display only.                                                                                                                                                                                                                                                                                                                                    |
| **Cost Basis (RM)**                                                       | numeric                             | no                                                                | —       | Total amount paid in. Drives the **profit %** on the row/card: `(current value − cost basis) / cost basis`. Empty = no profit shown. In a multi-entry platform group the profit is aggregated once on the group, not per entry.                                                                                                                                                                       |
| **Goal Amount (RM)**                                                      | numeric                             | no                                                                | —       | A savings target. Enables the **Goal Progress** display on Asset Detail (`current value / goal`). No effect on zakat or net worth.                                                                                                                                                                                                                                                                    |
| **Note**                                                                  | multiline text                      | no                                                                | —       | Free note ("Holding for Ali, repay by Sept"). Shown truncated on the row, in full on the detail page.                                                                                                                                                                                                                                                                                                  |
| **Platform Total (RM)** — _(`platform_total`)_                            | numeric                             | no                                                                | —       | Editable only once a Platform is set. Marks this entry as the platform's **catch-all balance**: its value is derived as `platform total − the sum of the other entries on the same category + platform`. Use it for a balance that changes on its own (e.g. interest) so only one number needs updating. Such an entry is marked in the list. (In edit mode, clearing this field un-marks the entry.) |
| **Include in Zakat Calculation** — _(`is_calculate`)_                     | toggle                              | —                                                                 | on      | On = counts toward zakatable totals and nisab. Off = excluded from zakat (e.g. money held for someone else) but still counted in net worth and distribution. Also toggleable directly from the asset row.                                                                                                                                                                                             |

**Create is disabled until:** a Name is entered **and** a value source exists — a
Current Value, or a Platform Total (which also needs a Platform), or Use Live Gold
Price (which also needs a weight).

**Pre-fill variants:**

- From a platform group's Add action → Platform pre-filled; the new entry joins that
  group.
- From a standalone asset's Add action → Platform pre-filled with that asset's name;
  on save the existing asset is also moved onto that platform, forming a group.

**On error:** the **Error dialog** (§10.1) is shown.

### 2.2 Update Balance (modal — centered dialog)

**Purpose:** update the real total of a multi-entry platform in one number, letting
the app back-calculate the drift. Opened from a platform group's Update Balance
action.

**Content:**

- Title: "Update {platform} Balance".
- Explanatory text: enter the platform's real current total; the difference from the
  other entries is tracked automatically.
- One numeric input, pre-filled with the current catch-all total if one exists.
- Actions: Cancel, and **Save** (disabled while empty or saving).

On save, the app updates the platform's existing catch-all entry, or creates one
named "Balance" if none exists.

**On error:** the **Error dialog** (§10.1).

### 2.3 Asset Detail (screen)

**Purpose:** view one asset in full, edit any of its fields inline, or delete it.

**Header:** back control (returns to the Assets tab), title "Asset Details".

**States:** _Loading_ ("Loading…"), _Not found_ ("Asset not found"), otherwise the
asset card in **view mode** or **edit mode**.

**View mode shows:**

- Category, and — when set — platform, status, an "Excluded from Zakat" marker, and
  an "Auto-tracked balance" marker.
- Controls to enter **edit mode** and to **delete**.
- Asset name.
- Platform / Account ("Not set" if empty).
- **Current Value**, with the profit percentage beside it (when there is a cost basis
  and the asset is not in a multi-entry group). Below it: `quantity + unit`; an
  explanation of the platform-total derivation when applicable; the note.
- **Goal Progress** (only when a goal is set): percentage, a progress bar, and
  `current value / goal`.
- **Timestamps:** created date, and updated date when present.

**Edit mode** — same field set and behavior as the **Add Asset field reference**
(§2.1): Category, Name, Platform, Current Value (or its auto-computed note), Quantity

- Unit, Gold's Use Live Gold Price toggle, Cost Basis, Platform Total, Note, Goal
  Amount, Include in Zakat Calculation. Differences from the create form:

* All fields are shown at once — there is no "Add more details" collapse.
* Clearing a previously-set Platform Total un-marks the catch-all entry.
* Actions: **Cancel** (reverts every field to the last saved values) and **Save**.
* **On error:** the **Error dialog** (§10.1).

**Delete** → **Confirm Delete** dialog (§10.2), titled "Delete Asset".

---

# 3. Liabilities tab

**Purpose:** list the user's debts and commitments, and let them record payments
against a debt directly from the list.

**Header:** caption "Overview", title "My Liabilities". An **Add** button opens the
**Add Debt / Commitment** sheet (§3.1).

**States:**

- _Loading_ — placeholder cards.
- _Empty_ — "No liabilities yet" / "Add your first liability to get started".
- _Populated_ — a list, one card per liability.

**Liability card** shows:

- category — **Debt** or **Commitment**,
- name,
- a summary line: `RM… / month • N months` remaining (the monthly figure is the
  liability's average of its recently logged payments when any exist, falling
  back to its fixed monthly payment otherwise — lets a commitment whose amount
  varies month to month, e.g. a Buy-Now-Pay-Later plan, still show a realistic
  figure instead of a fixed guess),
- the outstanding total balance,
- a short indicator of months remaining, or "Due",
- tapping the card opens **Liability Detail** (§3.2).
- **Inline "Make Payment"** (only when months remaining > 0):
  - an amount input, pre-filled with the monthly payment,
  - a **Reset** control (restores the monthly-payment amount),
  - a **Pay Now** button.
  - Paying subtracts the amount from the balance; when the balance reaches 0 the
    liability becomes inactive.
  - **On error:** the **Error dialog** (§10.1).

### 3.1 Add Debt / Commitment (modal — bottom sheet)

**Purpose:** create a new liability. Scrollable bottom sheet.

**Header:** "Add Debt / Commitment" / "Manage your financial obligations". A close
control.

**Fields:**

| Field                    | Input              | Required                                          | Default | Purpose & behavior                                                                                                                         |
| ------------------------ | ------------------- | -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                 | text                | **yes**                                           | —       | Free label ("Car Loan", "Credit Card").                                                                                                    |
| **Category**             | Debt or Commitment | yes                                                | Debt    | **Debt** = a balance that is paid down to zero over a defined term. **Commitment** = an open-ended recurring obligation with no fixed end. |
| **Total Balance (RM)**   | numeric             | **yes for Debt** (field is hidden for Commitment) | —       | The amount currently owed. Payments reduce it.                                                                                             |
| **Monthly Payment (RM)** | numeric             | no                                                 | —       | The regular monthly amount. Used to pre-fill the payment input and to estimate the months remaining.                                       |

An explanatory line adapts to the chosen category.

**Actions:** Cancel, and **Add Obligation** (disabled until Name is set and, for
Debt, a Total Balance is entered).

**On error:** the **Error dialog** (§10.1).

### 3.2 Liability Detail (screen)

**Purpose:** view one liability in full, edit its fields inline, record a payment, or
delete it.

**Header:** back control (returns to the Liabilities tab), title "Liability Details".

**States:** _Loading_ ("Loading…"), _Not found_ ("Liability not found"), otherwise
the liability card in **view mode** or **edit mode**.

**View mode shows:**

- category (Debt / Commitment),
- controls to enter **edit mode** and to **delete**,
- name,
- **Total Balance** and **Monthly Payment** side by side (Monthly Payment reflects
  the same average-of-recent-payments logic as the list card, described in §3),
- a **Payment Commitment** panel (when months remaining is known): the number of
  months left, and an approximate number of years,
- a **Make Payment** block: an amount input pre-filled with the monthly payment, a
  **Reset** control, and a **Pay Now** button (same payment behavior as the list —
  balance hits 0 → liability becomes inactive).

**Edit mode** fields:

| Field                    | Input              | Notes      |
| ------------------------ | ------------------- | ----------- |
| **Category**             | Debt or Commitment | as in §3.1 |
| **Name**                 | text                |            |
| **Total Balance (RM)**   | numeric             |            |
| **Monthly Payment (RM)** | numeric             |            |

Actions: **Cancel** (exits edit mode) and **Save**. **On error:** the **Error
dialog** (§10.1).

**Delete** → **Confirm Delete** dialog (§10.2), titled "Delete Liability".

---

# 4. Zakat Tracker (screen, off the tab bar)

**Purpose:** track, per asset category, the zakat obligation — nisab status, the
haul cycle, the amount due, and the next due date — and manage the record of when
zakat was last paid. Every category is always tracked (there is no per-category
"stop tracking" control); all four expand and show full detail.

Reached from the Dashboard's Nisab Status "View Details" link or the Quick Actions
"Zakat" button.

**Header:** caption "Islamic Finance", title "Zakat Tracker".

**States:**

- _Loading_ — a spinner.
- _Error_ — "Couldn't load your zakat categories."
- _Loaded_ — see below.

**Content:**

1. **Totals card:**
   - **Total Zakat Due** — the sum of `zakat_due` across categories that are
     currently Due or Overdue (haul year complete). Caption: "Calculated at 2.5%
     of eligible assets".
   - **Total Zakatable** — the sum of `zakat_due` across categories that have
     reached nisab, even before their haul year is complete — lets the user see
     what they'd owe today even before it's formally due.
2. **One card per asset category** (Cash, Gold, Crypto, Stock), each expandable:
   - **Collapsed:**
     - category name,
     - a status pill — **PENDING**, **DUE**, or **OVERDUE** (glows amber/rose when
       Due/Overdue),
     - current value vs. nisab (`RM… / RM…`) and a percentage,
     - a progress bar toward nisab (percentage display is capped just under 100%
       until nisab is actually reached, so e.g. 99.6% never misleadingly rounds
       to "100%"; once reached, the bar and percentage can exceed 100%),
     - tapping the card expands/collapses it.
   - **Expanded**, adds:
     - **Zakat Payable** and **Nisab** info cards side by side,
     - **Nisab Reached** — Yes / No,
     - **Last Paid Date** — the recorded date (with its Hijri equivalent when
       available) or "Never"; has a pencil **edit** control → **Edit Last Paid
       Date** dialog (§4.1),
     - **Next Due Date** — the computed date (with Hijri) or "Awaiting nisab",
     - When Due or Overdue: a **Pay Zakat Now** button that pays as of today
       directly (no date entry needed) and resets the haul cycle.

### 4.1 Edit Last Paid Date (modal — centered dialog)

**Purpose:** record the date zakat was actually paid for a category, including
backdating a correction. Opened from the Last Paid Date pencil control.

**Content:**

- Title: "{Category} — Last Paid Date".
- Explanatory text: record when zakat was actually paid, even if a while ago; this
  resets the haul cycle from that date.
- Three numeric inputs: **Day**, **Month**, **Year**, pre-filled with the existing
  paid date or today.
- Inline validation messages: "Enter a valid date" / "That date doesn't exist" /
  "Date can't be in the future".
- Actions: Cancel, and **Save**.

On save: the paid date is stored, the category is set active, and the due-date
reminders are rescheduled.

### 4.2 Nisab source banner & Nisab by State (modal — bottom sheet)

**Purpose:** show where the nisab figure currently used comes from, and let the
user browse the live rate published by every Malaysian state's zakat authority.
The banner appears on both the Dashboard's Nisab Status card and inside the Zakat
Tracker's totals area.

**Banner states** (varies by `nisab_source.kind`):

- **State** — "Nisab from {State}'s zakat authority" + "Checked {date}".
- **PPZ fallback** — "{Using / {State}'s own rate isn't available yet — using}
  PPZ-MAIWP's published rate" + "Checked {date}". Used as a generic stand-in for a
  state with no live source configured.
- **Gold-price fallback** — copy varies by why: never detected ("Using nationwide
  gold-price nisab" / "Detect your state for its official nisab rate"); detected
  but unsupported ("Detected: {State}" / "This state's official rate isn't
  available yet — using nationwide gold-price nisab"); detection failed
  ("Couldn't detect your location" / "Check that location access is allowed for
  this app, then try again"); or region unmatched ("Couldn't match your location
  to a state" / "Using nationwide gold-price nisab").

**Banner controls:** a **refresh/detect** icon (re-requests device location,
reverse-geocodes it to a state, and re-resolves nisab — shows a spinner while
running) and a **list** icon → opens the state list below.

**Nisab by State list (bottom sheet):**

- Title "Nisab by State" / "Live rates scraped from each state's zakat authority".
- One row per Malaysian state (all 14), each showing:
  - state name and its zakat authority's name (when a live source is configured for
    it),
  - if a rate has been fetched: the nisab amount and "Checked {date}",
  - if configured but not yet fetched successfully: "Unavailable", with a note
    that the app is falling back to PPZ-MAIWP's rate,
  - if no live source exists for that state yet: "Not scraped", with a note that
    none is configured.
- _Loading_ state: a spinner while rates load.

---

# 5. Reminders (screen, off the tab bar)

**Purpose:** track recurring or one-time bills (rent, insurance, subscriptions,
utilities, loans, credit cards, school fees, other) independent of the Liabilities
feature, with their own due-date notification schedule.

Reached from the notification-bell button in the Dashboard header.

**Header:** caption "Overview", title "Reminders". An **Add** button opens the
**Add Reminder** sheet (§5.1) with nothing pre-filled.

**Content, top to bottom:**

1. **Upcoming Commitments** card (hidden when there are no active reminders) —
   total RM across every Upcoming/Due Today/Overdue reminder, and the count of
   reminders it spans.
2. **Notification Timing** card — shows the current schedule ("Default — 7d
   before, 3d before, 1d before, due day at 9:00 AM" or a custom description) with
   an **Edit** control. Editing reveals:
   - a **Default / Custom** segmented choice,
   - _Custom only:_ a comma-separated "days before due" field (0 = due day) and an
     HH:MM 24-hour time field,
   - inline validation ("Enter one or more non-negative day counts…", "Hour must
     be between 0 and 23", "Minute must be between 0 and 59"),
   - Cancel / Save. This setting is global — it applies to every reminder's
     notification schedule, not per-reminder.
3. **Tabs:** Upcoming / Due Today / Overdue / Completed, each showing a count badge
   when non-empty.
4. **Reminder list**, filtered to the active tab, each item showing:
   - a category pill and a status badge (`Nd overdue` / `Due today` / `in Nd` /
     Paused / Completed),
   - name, recurrence + due date (`Monthly · Due 12 Oct 2026`),
   - amount,
   - tapping the row (not the action buttons) opens **Add Reminder** in edit mode
     (§5.1),
   - action row (hidden for completed items except Delete): **Mark Paid**,
     pause/resume toggle, **Delete** (→ **Confirm Delete** dialog, §10.2, "This
     can't be undone. Any scheduled notifications for it will be cancelled.").
5. _Empty state_ (per tab): an icon, "Nothing here" (or "No completed reminders
   yet" on the Completed tab), and — on Upcoming only — "Add your first payment
   reminder to get started".

### 5.1 Add Reminder (modal — bottom sheet)

**Purpose:** create or edit a reminder.

**Header:** "Add Reminder" / "Edit Reminder", subtitle "Track a recurring or
one-time payment". A close control.

**Fields:**

| Field                          | Input                                                                         | Required | Default   | Purpose & behavior                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ | -------- | --------- | -------------------------------------------------------------------------------------------- |
| **Name**                       | text                                                                          | **yes**  | —         | e.g. "Rent", "Car Insurance", "Netflix".                                                  |
| **Category**                   | Rent / Insurance / Subscription / Utility / Loan / Credit Card / School Fee / Other | yes      | Other     | Chip picker; shown as a pill on the list.                                                 |
| **Amount (RM)**                | numeric                                                                       | **yes**  | —         | The bill amount.                                                                          |
| **Recurrence**                 | One-time / Monthly / Yearly / Custom                                         | yes      | Monthly   | How the reminder repeats once marked paid.                                                |
| **Repeat every (days)**        | numeric — _Custom recurrence only_                                            | yes      | 30        | Interval in days between due dates.                                                       |
| **Due Date** (Add) / **Next Due Date** (Edit) | day/month/year fields                                          | **yes**  | today     | The date this cycle's notification schedule counts down to.                               |
| **Note**                       | text                                                                          | no       | —         | Free-form extra detail.                                                                   |

**Actions:** Cancel, and **Add Reminder** / **Save Changes** (disabled until Name,
Amount, and a valid date are all set).

**On error:** the **Error dialog** (§10.1).

---

# 6. Transactions (screen, off the tab bar)

**Purpose:** a flat, account-less log of financial events — income, expense,
investment buy/sell, dividend, interest, debt payment, zakat payment — each
optionally carrying photo/PDF receipts and an LHDN tax-relief tag.

Reached from the Dashboard's Quick Actions "Transactions" button.

**Header:** back control, title "Transactions". An **Add** button opens **Add
Transaction** (§6.1) with nothing pre-filled.

**States:**

- _Empty_ — "No transactions yet".
- _Populated_ — a flat list, most feature-complete transaction first (as returned
  by the API — no manual sort control).

**Transaction row** shows:

- a type pill (Income / Expense / Investment Buy / Investment Sell / Dividend /
  Interest / Debt Payment / Zakat Payment),
- a label (the description if set, else the type name),
- the date,
- an optional note,
- the amount,
- tapping the row (not Delete) opens **Add Transaction** in edit mode,
- a **Delete** action → **Confirm Delete** dialog (§10.2, "This can't be undone,
  and any attached receipts will be deleted too.").

### 6.1 Add Transaction (modal — bottom sheet)

**Purpose:** create or edit a transaction, attach receipts to it, and optionally
tag it for tax relief.

**Header:** "Add Transaction" / "Edit Transaction". A close control.

**Layout, top to bottom:**

1. **Receipts** (§6.1.1) — always shown first in the form (moved to the top per
   product decision, since it was previously easy to miss further down).
2. **Type** — chip picker: Income / Expense / Investment Buy / Investment Sell /
   Dividend / Interest / Debt Payment / Zakat Payment (default Expense).
3. **Amount (RM)** (required, > 0).
4. **Date** — day/month/year fields (required).
5. **Description** (optional) — used as the row label when set.
6. **Note** (optional).
7. **Tax Relief (optional)** (§6.1.2) — only shown when Type is Expense.
8. **Actions:** Cancel, and **Add Transaction** / **Save Changes** (disabled until
   Amount and Date are valid).

**On error:** the **Error dialog** (§10.1).

**Add vs. Edit behavior differences:**

- **Add:** the transaction doesn't exist yet until saved. If a receipt is attached
  before that point, a draft transaction is silently created in the background
  (using whatever amount/date/type is filled in so far — errors with a friendly
  message, "Enter an amount and date first, then attach a receipt," if those
  aren't valid yet) so the receipt has something to attach to; tapping "Add
  Transaction" afterward updates that same draft row rather than creating a
  second one. Dismissing the sheet (Cancel/X) after a receipt was attached but
  before finalizing deletes the draft transaction (and its receipts) so nothing
  orphaned is left behind.
- **Edit:** shows previously attached receipts (view/share/delete) but hides the
  Camera/Photo/File buttons — new attachments only happen through the Add flow.

#### 6.1.1 Receipts section

**Purpose:** attach and manage evidence photos/documents for a transaction.

**Content:**

- Section label "Receipts".
- _Add mode only:_ three buttons — **Camera** (photograph via device camera),
  **Photo** (multi-select from the photo library), **File** (multi-select
  document/PDF picker). Each requests the relevant OS permission on first use,
  with an alert if denied.
- An "Attaching…" spinner row while an upload is in flight.
- _Empty:_ "No receipts attached yet."
- **Receipt row**, per attachment: a file-type icon (image or document), file
  name, formatted size, tap-to-open, and a **Delete** icon (→ **Confirm Delete**
  dialog, §10.2, "This can't be undone.").
  - Opening an **image** shows it full-screen with pinch-to-zoom.
  - Opening a **non-image** (e.g. PDF) routes through the system share sheet,
    since there is no in-app viewer for it.

#### 6.1.2 Tax Relief picker

**Purpose:** optionally tag an expense with an LHDN relief category and
assessment year, feeding the Tax Relief screen (§7).

**Content:**

- Section label "Tax Relief (optional)".
- A chip row: **None** plus the first 4 relief categories, with a dashed **More
  (N)** chip that expands to show the rest. Auto-expands if editing a transaction
  already tagged with a category from the hidden set.
- When a category is selected, an **Assessment Year (YA)** numeric field appears,
  defaulting to the current calendar year the first time a category is picked.

Relief categories: Lifestyle (books, devices, internet, courses), Lifestyle —
Sports Equipment & Activities, Medical (Self/Spouse/Child), Parents' Medical &
Care, Education Fees (Self), Life Insurance & EPF, PRS & Deferred Annuity, SSPN
Net Deposit, Disabled Individual — Equipment, Breastfeeding Equipment, Child Care
Fees, EV Charging Facility.

---

# 7. Tax Relief (screen, off the tab bar)

**Purpose:** per-assessment-year LHDN relief tracking — total claimed per
category against its cap, with evidence export for e-Filing. Populated entirely
from Transactions tagged via the Tax Relief picker (§6.1.2).

Reached from the Dashboard's Quick Actions "Tax Relief" button.

**Header:** back control, title "Tax Relief". Below it, a year switcher: `< YA{year} >`
(defaults to the current calendar year).

**Content, top to bottom:**

1. **Total Claimed** card — the sum claimed across all categories this year, "of
   RM… across all categories" (sum of caps).
2. **Export Evidence (CSV)** button — generates a CSV (category totals, then
   transaction-level detail with receipt counts per row — the transaction list is
   fetched lazily only at export time, not held for the screen's whole lifetime)
   and hands it to the system share sheet. Shows "Preparing export..." while
   building.
3. **LHDN sync status banner** (one of, in priority order):
   - _Last check failed:_ "Couldn't check LHDN ({error}) — tap to retry".
   - _Pending diffs found:_ "LHDN may have updated N relief categor{y/ies} — tap
     to review" → opens the **LHDN Relief Check** dialog (§7.2).
   - _Unmatched categories from last check:_ "Couldn't verify N relief
     categor{y/ies} on LHDN's page — tap to review" → same dialog.
   - _Nothing to report:_ banner is hidden.
4. **Check LHDN for relief updates** button — manually triggers a scrape of
   hasil.gov.my's relief page; shows "Checking hasil.gov.my..." while running, or
   "Last checked LHDN {date} · Check now" once a check has completed. A
   scheduled check also runs silently once per screen-mount when due (roughly
   quarterly) — failures from it just populate the banner above rather than
   interrupting the screen.
5. **Category cards**, one per relief category with any cap/claim data: label, an
   "Over Cap" pill when claimed exceeds the cap, `claimed / cap` and `remaining`
   figures, and a progress bar (red when over cap). Tapping a card opens **Edit
   Cap** (§7.1).

### 7.1 Edit Cap (modal — centered dialog)

**Purpose:** manually adjust a category's cap for the selected assessment year,
since LHDN revises relief caps with each annual Budget.

**Content:** title "Edit Cap", explanatory text ("LHDN revises relief caps
yearly — adjust this if YA{year}'s published amount differs"), one numeric input
pre-filled with the current cap, Cancel / **Save** (disabled while amount is
empty/zero or saving).

### 7.2 LHDN Relief Check (modal — centered dialog)

**Purpose:** review and selectively apply relief-cap changes detected by scraping
hasil.gov.my, or acknowledge categories the scraper couldn't confidently match.

**Content:**

- Title "LHDN Relief Check" / "Scraped from hasil.gov.my — review each before
  applying. This changes YA{year}'s caps."
- **Pending diffs** (if any): a checkable list, each row showing the category name
  and `{current cap} → {scraped amount}`, pre-selected. Actions: **Dismiss All**
  (discards every diff without applying) or **Apply (N)** (applies only the
  checked rows; disabled when none are selected).
- **Unmatched categories** (if any, shown alongside or instead of diffs): a plain
  list of category names the scraper couldn't locate this time, with a note that
  LHDN's page wording may have changed for them and their caps were left
  untouched.
- If there are no pending diffs (only unmatched categories), the action row is
  just a single **Close** button instead.

---

# 8. Backup & Restore (screen, off the tab bar)

**Purpose:** connect the user's own Google Drive account and back up/restore the
local SQLite database to it. Entirely optional — the app works fully offline
without it, and no data ever goes through a Finance App-owned server.

Reached from the gear/settings button in the Dashboard header.

**Header:** back control, title "Backup & Restore".

**Content, top to bottom:**

1. **Google Drive card:**
   - _Not connected:_ explanatory text ("Connect your own Google account to back
     up your data to a private, hidden folder in your Drive. Your data is never
     sent to any Finance App server.") and a **Connect Google Drive** button.
   - _Connected:_ "Connected as {email}" and a **Disconnect** button.
2. **Backup Status card:**
   - "Last backup: {date/time}" or "Never".
   - If the last attempt failed: the error message, in red.
   - **Backup Now** button (disabled until connected; shows "Backing up...").
   - **Load Backup** button (disabled until connected) → opens **Restore Backup**
     (§8.1).
3. **Automatic Backup & Encryption card:**
   - **Automatic Backup** toggle (disabled until connected) — "Once a day, best
     effort, when connected".
   - **Encrypt Backups** toggle — "AES-256, key stays on this device".
   - **View / Import Recovery Key** link → opens **Encryption Recovery Key**
     (§8.2).
4. **Retention card:** shows "Keep {daily} daily · {weekly} weekly · {monthly}
   monthly backups" (defaults 30/12/12) with an **Edit** control that reveals
   three numeric fields (Daily/Weekly/Monthly) and Cancel/Save.

### 8.1 Restore Backup (modal — bottom sheet)

**Purpose:** browse and restore a previous backup from Google Drive.

**Content, by state:**

- _Loading:_ a spinner.
- _List:_ one row per backup found (newest reasoned by the app, not necessarily
  sorted client-side beyond what the API returns) — created date/time and file
  size, each tappable. _Empty:_ "No backups found" with a **Refresh** control.
- _Selected (confirmation step):_ a warning panel — "Restore this backup?",
  the backup's date and size, and "This replaces your current financial data
  with the selected backup. A safety copy of your current data is created
  on-device first." Any restore error shows inline. Actions: Cancel, and
  **Restore** (shows "Restoring...").
- _Done:_ a success icon, "Restore complete" / "Your data has been replaced with
  the selected backup.", and a **Done** button that closes the sheet and
  navigates back to the tab root (so every screen re-reads the restored data).

### 8.2 Encryption Recovery Key (modal — centered dialog)

**Purpose:** let the user view this device's current backup-encryption key (to
save somewhere safe) or import a previously-saved key — needed to restore an
encrypted backup on a new device or after reinstalling, since the key is never
uploaded anywhere on its own.

**Content:**

- Explanatory text about what the key is for and that it's local-only.
- **This Device's Key** — the current key in a monospace box, or "No encryption
  key yet — enable encryption first."; a **Copy to Clipboard** control when a key
  exists (label flips to "Copied!" briefly).
- **Restore a Key (new device / reinstall)** — a text field for pasting a
  64-character recovery key, inline error/success messaging, and an **Import
  Key** button (disabled while empty or saving).

---

# 9. Zakat & nisab notifications (no screen)

Local notifications derived from app data, none of which have a dedicated screen.

**Zakat due-date reminders** — for every category (all are always tracked) with a
known next due date, reminders fire at **09:00 local time** on **7, 5, 3, 1, and 0
days before** the due date.

- Advance reminder — "Zakat for {Category} due in N day(s)" / "RM… will be due on
  {date}."
- Due-day reminder — "Zakat for {Category} is due today" / "RM… is due today. Fulfill
  your obligation."
- Reminders are rebuilt whenever the tracker data changes (e.g. a payment moves the
  due date), cancelling stale ones.

**Nisab-updated notification** — fires when the resolved nisab figure (state,
PPZ-MAIWP fallback, or nationwide gold price) changes from what the user was last
notified about — from any sync pass, foreground or background. "Zakat Nisab
Updated" / "Your Zakat nisab is now RM…, based on {source}." The very first run
(no prior baseline) just records the baseline silently, so a fresh install never
announces a "change" for a figure the user has never seen.

**Payment reminder notifications** — per the Notification Timing schedule
configured on the Reminders screen (§5), default 7/3/1/0 days before due at 9:00
AM, or a user-set custom offsets/time.

All of the above share the "first use triggers the OS notification-permission
prompt" behavior, and each feature's scheduled notifications use their own
identifier prefix so refreshing one feature's schedule never cancels another's.

---

# 10. Shared modals

### 10.1 Error dialog

**Purpose:** surface an unexpected failure from any create / update / delete / pay
action.

**Content:** a title ("Something went wrong"), a short subtitle, a scrollable dump of
the raw error, a **Copy** action (copies the error text), and a **Close** action.
Auto-dismisses after a short delay.

### 10.2 Confirm Delete dialog

**Purpose:** confirm an irreversible delete.

**Content:** a title and description supplied by the caller ("Delete Asset" / "Delete
Liability" / "Delete this reminder?" / "Delete this transaction?" / "Delete this
receipt?", "Are you sure… This action cannot be undone."), a **Cancel** action, and
a **Delete** action (shows a "Deleting…" state while in flight).

### 10.3 Splash screen

**Purpose:** brand moment shown briefly on cold launch while the app loads.

**Content:** app name ("Zakat" / "Wealth Tracker"), a loading indicator and progress
bar, a one-line tagline ("Manage your wealth, calculate zakat, track liabilities"),
and a version string.

_(A designed splash component exists in the codebase but is not currently wired into
navigation; the platform's built-in splash is used instead. Worth including in the
mockup set.)_

---

## Quick index

| #    | Surface                     | Type              | Opens                       |
| ---- | ---------------------------- | ------------------ | ----------------------------- |
| 1    | Dashboard                   | Tab screen        | 4.2, navigation only         |
| 2    | Assets                      | Tab screen        | 2.1, 2.2, 2.3                |
| 2.1  | Add Asset                   | Bottom sheet      | 10.1                          |
| 2.2  | Update Balance              | Centered dialog   | 10.1                          |
| 2.3  | Asset Detail                | Screen            | inline edit, 10.1, 10.2      |
| 3    | Liabilities                 | Tab screen        | 3.1, 3.2                     |
| 3.1  | Add Debt / Commitment       | Bottom sheet      | 10.1                          |
| 3.2  | Liability Detail            | Screen            | inline edit, 10.1, 10.2      |
| 4    | Zakat Tracker               | Screen            | 4.1, 4.2                     |
| 4.1  | Edit Last Paid Date         | Centered dialog   | —                             |
| 4.2  | Nisab by State              | Bottom sheet       | —                             |
| 5    | Reminders                   | Screen            | 5.1                           |
| 5.1  | Add Reminder                | Bottom sheet      | 10.1                          |
| 6    | Transactions                | Screen            | 6.1                           |
| 6.1  | Add Transaction             | Bottom sheet      | 10.1                          |
| 7    | Tax Relief                  | Screen            | 7.1, 7.2                     |
| 7.1  | Edit Cap                    | Centered dialog   | —                             |
| 7.2  | LHDN Relief Check           | Centered dialog   | —                             |
| 8    | Backup & Restore            | Screen            | 8.1, 8.2                     |
| 8.1  | Restore Backup              | Bottom sheet      | —                             |
| 8.2  | Encryption Recovery Key     | Centered dialog   | —                             |
| 9    | Zakat & nisab notifications | OS notifications  | permission prompt            |
| 10.1 | Error dialog                 | Centered dialog   | —                             |
| 10.2 | Confirm Delete               | Centered dialog   | —                             |
| 10.3 | Splash                       | Full screen       | —                             |
