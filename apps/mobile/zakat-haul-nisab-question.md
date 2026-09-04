# Resolved: does a mid-cycle nisab dip reset the haul?

Previously an open fiqh question affecting `computeHaulStatus` in
`local/zakat-service.ts`. **Resolved: Option A ("start & end only").**
Confirmed against two independent sources consulted directly on this exact
scenario (a savings haul that dips below nisab mid-year, then recovers
before the next annual checkpoint) — both gave the same answer: the
checkpoint date is fixed and recurring, checked only once a year; a dip in
between doesn't matter and doesn't move the anchor.

## The two positions

|          | **Option A — "start & end only"** (majority view, e.g. Hanafi; also the _original_ code's behavior, before it was changed to Option B) | **Option B — "continuous holding"** (was the implementation until this fix) |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Rule** | Nisab only needs to be held at the _start_ of the haul and _again at the end_ (the annual checkpoint). Dips in between don't matter, as long as wealth never hits zero. | Nisab must be held on _every single day_ of the haul. Any dip, even for a moment, breaks it. |

## Worked example

Timeline: Savings reach nisab on **1 Muharram 1450H**. Mid-year, on **1 Jumada
1450H**, a big withdrawal drops savings below nisab. They recover back above
nisab on **1 Sya'ban 1450H** and stay there. One full year from the original
start would land on **1 Muharram 1451H**.

|                                                     | **Option A — start & end only** (now implemented)                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **1 Muharram 1450H** — nisab first reached          | Haul starts (`haul_start_date` set).                                                                                          |
| **1 Jumada 1450H** — dips below nisab               | Ignored entirely — no write to the tracker, haul keeps counting toward 1 Muharram 1451H.                                     |
| **1 Sya'ban 1450H** — back above nisab              | Nothing changes — haul was never interrupted, anchor is still 1 Muharram.                                                     |
| **1 Muharram 1451H** (checkpoint)                   | Nisab is evaluated. If held → zakat is due (`OVERDUE`). If not held → that year is skipped, but the anchor stays fixed and the next checkpoint is 1 Muharram 1452H, not a new cycle from wherever balance later recovered. |

## Current implementation

`local/zakat-service.ts`:

- `computeHaulStatus`: once a cycle has a `haulStart`, nisab is evaluated
  only at annual checkpoints (`haulStart + N hijri years`). A dip between
  checkpoints never resets or clears anything. If a checkpoint is reached
  and nisab isn't currently held, that year is skipped and the function
  rolls forward to the next annual checkpoint on the *same* anchor date —
  since there's no stored history of nisab per past checkpoint, the current
  `nisabReached` is used as a stand-in for whichever checkpoint is nearest
  to `now`.
- `getAllCategories` no longer wipes `last_paid_date`/`haul_start_date` on a
  mid-cycle dip — the only DB write is starting a brand-new cycle when none
  existed yet. The old `resetHaulAndPayment` helper was removed as
  unused.
- The anchor date (`haul_start_date`) only moves when the user actually
  records a payment (`upsertTracker`, unchanged by this fix) — never
  automatically.
- Covered by `local/__tests__/zakat-service.test.ts` ("checkpoint reached
  without nisab held...", "mid-cycle dip below nisab is ignored...") and
  `local/__tests__/integration.test.ts` ("a mid-cycle dip below nisab does
  not reset the haul cycle").

## Out of scope (not implemented)

One source also noted that if a mid-cycle increase comes from a **windfall**
(bonus, inheritance) rather than organic savings growth, that portion should
be zakat'd immediately as *zakat pendapatan* (income zakat), separate from
the annual savings checkpoint. The app has no concept of income vs. savings
zakat today — everything goes through the same asset-category haul. This
would be a separate, larger feature (classifying *why* a balance changed),
not part of this fix.
