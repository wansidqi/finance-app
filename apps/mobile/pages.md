# Zakat / Wealth Tracker — Screen & Modal Reference

A functional description of every screen, tab, detail page, and popup/modal in the
mobile app (`apps/mobile/app` + `apps/mobile/components`). It covers each surface's
purpose, its sections, the data shown, every field, the loading / empty / error
states, and every interaction — so it can be used as the basis for a new mockup
design. It intentionally does **not** describe the current visual styling.

---

## App overview

A personal finance tracker for a Muslim user in Malaysia (currency: Malaysian
Ringgit, "RM"). It has three domains:

- **Assets** — everything the user owns, bucketed into Cash, Gold, Crypto, Stock.
- **Liabilities** — debts and recurring commitments.
- **Zakat** — tracks, per asset category, whether the holding has reached _nisab_
  (the threshold), where it is in the _haul_ (one lunar-year holding period), how
  much zakat is due (2.5%), and when it is next due — and schedules reminders.

A **Dashboard** rolls all three together.

## Navigation structure

- **Bottom tab bar** with four destinations, always visible:
  1. **Dashboard**
  2. **Assets**
  3. **Liabilities**
  4. **Zakat**
- Two **detail screens** pushed on top of the tabs, each with a back control:
  - **Asset Detail** (`asset/[id]`)
  - **Liability Detail** (`liability/[id]`)
- A brief **splash screen** on cold launch.
- **Modals** (bottom sheets and centered dialogs) launched from within screens, all
  listed below.

Every screen header follows the same pattern: a small caption line above a large
screen title (e.g. caption "Overview" / title "My Assets").

---

# 1. Dashboard

**Purpose:** a read-only, at-a-glance summary of net worth, asset mix, and zakat
obligations. No data is created or edited here — only shortcuts into the other tabs.

**Header:** caption "Overview", title "My Wealth".

**States:**

- _Loading_ — a spinner while assets, liabilities, and zakat data all load.
- No dedicated empty state; sections simply show zeros.

**Content, top to bottom:**

1. **Net Worth** — one prominent figure: `total assets − total liabilities`. May be
   negative.
2. **Quick stats** — three figures side by side:
   - **Total Assets** — sum of every asset's value, across all categories, regardless
     of whether it is included in zakat.
   - **Total Debt** — sum of every liability's outstanding balance.
   - **Debt Ratio** — `total liabilities / total assets`, as a percentage.
3. **Asset Distribution** — a row per category, in fixed order **Cash & Savings,
   Gold, Crypto, Stock**. Each row shows the category, its share of total assets as a
   percentage, and its RM amount. Categories with no assets still appear, at 0.
4. **Zakat Due** — a row per category showing whether nisab is reached (yes/no
   indicator) and the zakat amount for that category (shown as 0 when nisab is not
   reached). Ends with a **Total Payable** line summing the categories that have
   reached nisab.
5. **Nisab Status** — a row per category showing:
   - a status of **Reached** or **Pending**,
   - the current value against the nisab threshold (`current / nisab`),
   - progress toward nisab as a percentage and a progress bar (capped at 100%).
6. **Quick Actions** — three buttons: **Assets**, **Liabilities**, **Zakat**, each
   navigating to the corresponding tab.

**Modals:** none.

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
| ------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asset Category**                                                        | one of Cash / Gold / Crypto / Stock | yes                                                               | Cash    | Buckets the asset everywhere (Dashboard distribution, Assets sections, Zakat categories). Choosing **Gold** reveals the Weight field and the live-price toggle, and hides the generic Quantity/Unit pair.                                                                                                                                                                                             |
| **Asset Name**                                                            | text                                | **yes**                                                           | —       | Free label ("Apple Stock", "Emergency fund"). Used as the row/card title.                                                                                                                                                                                                                                                                                                                             |
| **Platform / Account**                                                    | text                                | no (may be pre-filled)                                            | —       | Where the asset is held ("Maybank", "Touch 'n Go", "Luno"). Assets sharing the **same category + platform** are merged into one **platform group**, and zakat withdrawals are broken out per platform. Leave blank for a standalone asset.                                                                                                                                                            |
| **Weight (grams)** — _Gold only; this is the `quantity` field relabelled_ | numeric                             | only if Use Live Gold Price is on                                 | —       | Gram weight of the gold. Combined with the live price to derive value.                                                                                                                                                                                                                                                                                                                                |
| **Use Live Gold Price** — _Gold only_                                     | toggle                              | no                                                                | off     | Disabled until a weight is entered. When on: the manual value field is hidden, the unit is forced to "gram", and the value is recomputed daily as `weight × Bank Negara Malaysia gold price`. When off, the value is entered by hand.                                                                                                                                                                 |
| **Current Value (RM)** — _(`price`)_                                      | numeric                             | yes, **unless** Platform Total or Use Live Gold Price provides it | —       | The asset's present value — the figure that feeds net worth, distribution, and zakat. Shown as a read-only note ("auto-computed…") when it is derived rather than entered.                                                                                                                                                                                                                            |
| **Quantity** — _non-Gold, optional_                                       | numeric                             | no                                                                | —       | Informational context only ("15" shares, "0.5" BTC). Displayed with the unit above the name. Does **not** affect value.                                                                                                                                                                                                                                                                               |
| **Unit** — _non-Gold, optional_                                           | text                                | no                                                                | —       | Label paired with Quantity ("shares", "BTC", "lots"). Display only.                                                                                                                                                                                                                                                                                                                                   |
| **Cost Basis (RM)**                                                       | numeric                             | no                                                                | —       | Total amount paid in. Drives the **profit %** on the row/card: `(current value − cost basis) / cost basis`. Empty = no profit shown. In a multi-entry platform group the profit is aggregated once on the group, not per entry.                                                                                                                                                                       |
| **Goal Amount (RM)**                                                      | numeric                             | no                                                                | —       | A savings target. Enables the **Goal Progress** display on Asset Detail (`current value / goal`). No effect on zakat or net worth.                                                                                                                                                                                                                                                                    |
| **Note**                                                                  | multiline text                      | no                                                                | —       | Free note ("Holding for Ali, repay by Sept"). Shown truncated on the row, in full on the detail page.                                                                                                                                                                                                                                                                                                 |
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

**On error:** the **Error dialog** (§6.1) is shown.

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

**On error:** the **Error dialog** (§6.1).

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
* **On error:** the **Error dialog** (§6.1).

**Delete** → **Confirm Delete** dialog (§6.2), titled "Delete Asset".

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
- a summary line: `RM… / month • N months` remaining,
- the outstanding total balance,
- a short indicator of months remaining, or "Due",
- tapping the card opens **Liability Detail** (§3.2).
- **Inline "Make Payment"** (only when months remaining > 0):
  - an amount input, pre-filled with the monthly payment,
  - a **Reset** control (restores the monthly-payment amount),
  - a **Pay Now** button.
  - Paying subtracts the amount from the balance; when the balance reaches 0 the
    liability becomes inactive.
  - **On error:** the **Error dialog** (§6.1).

### 3.1 Add Debt / Commitment (modal — bottom sheet)

**Purpose:** create a new liability. Scrollable bottom sheet.

**Header:** "Add Debt / Commitment" / "Manage your financial obligations". A close
control.

**Fields:**

| Field                    | Input              | Required                                          | Default | Purpose & behavior                                                                                                                         |
| ------------------------ | ------------------ | ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Name**                 | text               | **yes**                                           | —       | Free label ("Car Loan", "Credit Card").                                                                                                    |
| **Category**             | Debt or Commitment | yes                                               | Debt    | **Debt** = a balance that is paid down to zero over a defined term. **Commitment** = an open-ended recurring obligation with no fixed end. |
| **Total Balance (RM)**   | numeric            | **yes for Debt** (field is hidden for Commitment) | —       | The amount currently owed. Payments reduce it.                                                                                             |
| **Monthly Payment (RM)** | numeric            | no                                                | —       | The regular monthly amount. Used to pre-fill the payment input and to estimate the months remaining.                                       |

An explanatory line adapts to the chosen category.

**Actions:** Cancel, and **Add Obligation** (disabled until Name is set and, for
Debt, a Total Balance is entered).

**On error:** the **Error dialog** (§6.1).

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
- **Total Balance** and **Monthly Payment** side by side,
- a **Payment Commitment** panel (when months remaining is known): the number of
  months left, and an approximate number of years,
- a **Make Payment** block: an amount input pre-filled with the monthly payment, a
  **Reset** control, and a **Pay Now** button (same payment behavior as the list —
  balance hits 0 → liability becomes inactive).

**Edit mode** fields:

| Field                    | Input              | Notes      |
| ------------------------ | ------------------ | ---------- |
| **Category**             | Debt or Commitment | as in §3.1 |
| **Name**                 | text               |            |
| **Total Balance (RM)**   | numeric            |            |
| **Monthly Payment (RM)** | numeric            |            |

Actions: **Cancel** (exits edit mode) and **Save**. **On error:** the **Error
dialog** (§6.1).

**Delete** → **Confirm Delete** dialog (§6.2), titled "Delete Liability".

---

# 4. Zakat tab

**Purpose:** track, per asset category, the zakat obligation — nisab status, the haul
cycle, the amount due, and the next due date — and manage the record of when zakat
was last paid.

**Header:** caption "Islamic Finance", title "Zakat Tracker". The header also carries
a small set of **developer test controls** — send a test notification, run the full
7/5/3/1/0-day reminder sequence, and trigger the background sync task — each showing
a sending / done / no-permission state. _(These are debug utilities; a redesign would
likely hide or remove them.)_

**States:**

- _Loading_ — a spinner.
- _Error_ — "Couldn't load your zakat categories."
- _Loaded_ — see below.

**Content:**

1. **Total Zakat Due** — one figure: the sum of `zakat_due` across the categories
   that are being tracked **and** are currently Due or Overdue. Caption: "Calculated
   at 2.5% of eligible assets".
2. **One card per asset category** (Cash, Gold, Crypto, Stock):
   - **Collapsed:**
     - category name,
     - the category's current value,
     - the nisab threshold,
     - a **haul status** — **Pending**, **Due**, or **Overdue** (shown only when the
       category is tracked),
     - a **tracking toggle** — **Tracking** or **Not tracked**; tapping it switches.
       Untracked cards are de-emphasized and cannot expand.
     - an expand/collapse control (tracked cards only).
   - **Expanded** (tracked cards only):
     - **Zakat Payable** — the amount due for this category.
     - **Nisab** — the threshold amount.
     - **Nisab Reached** — Yes / No.
     - **Last Paid Date** — the recorded date (with its Hijri equivalent when
       available) or "Never"; has an **edit** control → **Edit Last Paid Date**
       dialog (§4.1).
     - **Next Due Date** — the computed date (with Hijri) or "Awaiting nisab".
     - When Due or Overdue: a **Pay Zakat Now** button → also opens **Edit Last Paid
       Date** (§4.1), to record the payment (which resets the haul cycle).

### 4.1 Edit Last Paid Date (modal — centered dialog)

**Purpose:** record the date zakat was actually paid for a category. Opened from the
Last Paid Date edit control or the Pay Zakat Now button.

**Content:**

- Title: "{Category} — Last Paid Date".
- Explanatory text: record when zakat was actually paid, even if a while ago; this
  resets the haul cycle from that date.
- Three numeric inputs: **Day**, **Month**, **Year**, pre-filled with the existing
  paid date or today.
- Inline validation messages: "Enter a valid date" / "That date doesn't exist" /
  "Date can't be in the future".
- Actions: Cancel, and **Save**.

On save: the paid date is stored, the category is set to tracked/active, and the
due-date reminders are rescheduled.

---

# 5. Zakat reminders (notifications — no screen)

Local notifications derived from the tracker data. For each **tracked** category with
a known next due date, reminders fire at **09:00 local time** on **7, 5, 3, 1, and 0
days before** the due date.

- Advance reminder — "Zakat for {Category} due in N day(s)" / "RM… will be due on
  {date}."
- Due-day reminder — "Zakat for {Category} is due today" / "RM… is due today. Fulfill
  your obligation."
- Reminders are rebuilt whenever the tracker data changes (e.g. a payment moves the
  due date), cancelling stale ones.
- First use triggers the OS **notification-permission prompt**.

---

# 6. Shared modals

### 6.1 Error dialog

**Purpose:** surface an unexpected failure from any create / update / delete / pay
action.

**Content:** a title ("Something went wrong"), a short subtitle, a scrollable dump of
the raw error, a **Copy** action (copies the error text), and a **Close** action.
Auto-dismisses after a short delay.

### 6.2 Confirm Delete dialog

**Purpose:** confirm an irreversible delete.

**Content:** a title and description supplied by the caller ("Delete Asset" / "Delete
Liability", "Are you sure… This action cannot be undone."), a **Cancel** action, and
a **Delete** action (shows a "Deleting…" state while in flight).

### 6.3 Splash screen

**Purpose:** brand moment shown briefly on cold launch while the app loads.

**Content:** app name ("Zakat" / "Wealth Tracker"), a loading indicator and progress
bar, a one-line tagline ("Manage your wealth, calculate zakat, track liabilities"),
and a version string.

_(A designed splash component exists in the codebase but is not currently wired into
navigation; the platform's built-in splash is used instead. Worth including in the
mockup set.)_

---

## Quick index

| #   | Surface               | Type             | Opens                 |
| --- | --------------------- | ---------------- | --------------------- |
| 1   | Dashboard             | Tab screen       | navigation only       |
| 2   | Assets                | Tab screen       | 2.1, 2.2, 2.3         |
| 2.1 | Add Asset             | Bottom sheet     | 6.1                   |
| 2.2 | Update Balance        | Centered dialog  | 6.1                   |
| 2.3 | Asset Detail          | Screen           | inline edit, 6.1, 6.2 |
| 3   | Liabilities           | Tab screen       | 3.1, 3.2              |
| 3.1 | Add Debt / Commitment | Bottom sheet     | 6.1                   |
| 3.2 | Liability Detail      | Screen           | inline edit, 6.1, 6.2 |
| 4   | Zakat Tracker         | Tab screen       | 4.1                   |
| 4.1 | Edit Last Paid Date   | Centered dialog  | —                     |
| 5   | Zakat reminders       | OS notifications | permission prompt     |
| 6.1 | Error dialog          | Centered dialog  | —                     |
| 6.2 | Confirm Delete        | Centered dialog  | —                     |
| 6.3 | Splash                | Full screen      | —                     |
