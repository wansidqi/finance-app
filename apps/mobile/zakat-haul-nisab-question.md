# Open question: does a mid-cycle nisab dip reset the haul?

Unresolved fiqh question affecting `computeHaulStatus` in `local/zakat-service.ts`.
Needs a decision before this can be considered final — currently implemented as
**Option B (continuous holding)** below, per explicit instruction, but that's a
stricter minority position and may not be what should actually ship.

## The two positions

|          | **Option A — "start & end only"** (majority view, e.g. Hanafi; this was the _original_ code's behavior)                                         | **Option B — "continuous holding"** (current implementation)                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Rule** | Nisab only needs to be held at the _start_ of the haul and _again at the end_. Dips in between don't matter, as long as wealth never hits zero. | Nisab must be held on _every single day_ of the haul. Any dip, even for a moment, breaks it. |

## Worked example

Timeline: Savings reach nisab on **1 Muharram 1450H**. Mid-year, on **1 Jumada
1450H**, a big withdrawal drops savings below nisab. They recover back above
nisab on **1 Sya'ban 1450H** and stay there. One full year from the original
start would land on **1 Muharram 1451H**.

|                                                     | **Option A — start & end only**                                                | **Option B — continuous holding**                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **1 Muharram 1450H** — nisab first reached          | Haul starts.                                                                   | Haul starts.                                                                                                         |
| **1 Jumada 1450H** — dips below nisab               | Ignored. Haul keeps counting toward 1 Muharram 1451H.                          | Haul is wiped. `haul_start_date` and `last_paid_date` reset to null. Status goes back to PENDING / "Awaiting nisab." |
| **1 Sya'ban 1450H** — back above nisab              | Nothing changes — haul was never interrupted.                                  | **New** haul starts counting from _this_ date, not the original one.                                                 |
| **1 Muharram 1451H** (one year from original start) | Nisab is checked. It's held → **zakat is due today**, as originally scheduled. | Nothing happens here — the original cycle no longer exists.                                                          |
| **When does zakat actually become due?**            | **1 Muharram 1451H** — on schedule, unaffected by the dip.                     | **1 Sya'ban 1451H** — a full year _after the dip recovered_, several months later than the original schedule.        |

## Why this matters

Option A is the more commonly followed position in most zakat calculators and
fatwas. Option B is a stricter minority position. For anyone whose balance
fluctuates around the nisab line, the two options can produce due dates months
apart — this isn't a cosmetic difference, it changes when zakat is actually owed.

## Current state in code

`local/zakat-service.ts`:

- `computeHaulStatus` returns an immediate reset (`{ status: "PENDING", nextDue: null, newHaulStart: null }`) the instant `nisabReached` is `false`, regardless of where in the cycle it happens (Option B).
- `getAllCategories` persists that reset via `resetHaulAndPayment`, which clears **both** `haul_start_date` and `last_paid_date` in the DB.
- Covered by `local/__tests__/zakat-service.test.ts` ("mid-cycle dip below nisab resets the haul immediately") and `local/__tests__/integration.test.ts` ("last_paid_date and haul_start_date are wiped once nisab is no longer held").

## To resolve

Confirm which position to follow (check against a trusted fatwa source or the
specific mazhab this app should follow), then either:

- **Keep Option B** as-is, or
- **Revert to Option A**: in `computeHaulStatus`, only check `nisabReached` at
  the start (when `haulStart` is `null`) and at cycle completion
  (`daysUntilDue <= 0`) — not on every call — so a mid-cycle dip no longer
  clears `newHaulStart`. Also remove/adjust `resetHaulAndPayment`'s mid-cycle
  trigger in `getAllCategories` accordingly.
