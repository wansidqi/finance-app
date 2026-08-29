/**
 * Tests the pure HTML parser against a fixture shaped like the real
 * hasil.gov.my/en/individu/pelepasan-cukai/ markup (verified against the live
 * page's YA2025 listing), plus the sync-state DB plumbing via the same
 * real-SQLite-via-node:sqlite mock used by the other local service tests.
 */
jest.mock("expo-sqlite", () => {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(":memory:");

  const facade = {
    execAsync: async (sql: string) => {
      db.exec(sql);
    },
    getAllAsync: async (sql: string, ...params: any[]) => {
      return db.prepare(sql).all(...params);
    },
    getFirstAsync: async (sql: string, ...params: any[]) => {
      return db.prepare(sql).get(...params) ?? null;
    },
    runAsync: async (sql: string, ...params: any[]) => {
      const info = db.prepare(sql).run(...params);
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: Number(info.changes) };
    },
  };

  return {
    openDatabaseAsync: async () => ({
      ...facade,
      withExclusiveTransactionAsync: async (task: (txn: typeof facade) => Promise<void>) => {
        await task(facade);
      },
    }),
  };
});

import { DEFAULT_TAX_RELIEF_CAPS } from "@/interface/tax-relief";
import {
  applySyncDiffs,
  dismissPendingDiffs,
  getSyncState,
  parseReliefAmounts,
  runAndRecordSyncCheck,
  shouldRunScheduledCheck,
} from "../lhdn-relief-sync-service";
import { getCapsForYear } from "../tax-relief-service";

// Trimmed stand-in for the real page's relief table — same wording/structure
// the scraper's anchors were built against, just without the surrounding
// chrome that isn't relevant to parsing.
const FIXTURE_HTML = `
<table>
<tr><td>Individual and dependent relatives</td><td>9,000</td></tr>
<tr><td>Purchase or subscription of books / journals / magazines / newspapers / other similar publications (Not banned reading materials)</td><td>2,500 (Restricted)</td></tr>
<tr><td>Purchase of sports equipment for any sports activity as defined under the Sports Development Act 1997</td><td>1,000 (Restricted)</td></tr>
<tr><td>Medical expenses on: 1. Serious diseases for self, spouse or child 2. Fertility treatment for self or spouse</td><td>10,000 (Restricted)</td></tr>
<tr><td>Expenses for parents and grandparents: 1. Medical treatment, dental treatment, special needs and carer expenses</td><td>8,000 (Restricted)</td></tr>
<tr><td>Education fees (Self): 1. Other than a degree at masters or doctorate level</td><td>7,000 (Restricted)</td></tr>
<tr><td>Life insurance and EPF: 1. Mandatory contributions to approved schemes or voluntary contributions to EPF</td><td>7,000 (Restricted)</td></tr>
<tr><td>Deferred Annuity and Private Retirement Scheme (PRS)</td><td>3,000 (Restricted)</td></tr>
<tr><td>Net deposit in Skim Simpanan Pendidikan Nasional (Net deposit is the total deposit in 2025 MINUS total withdrawal in 2025)</td><td>8,000 (Restricted)</td></tr>
<tr><td>Purchase of basic supporting equipment for disabled self, spouse, child or parent</td><td>6,000 (Restricted)</td></tr>
<tr><td>Purchase of breastfeeding equipment for own use for a child aged 2 years and below (Deduction allowed once in every TWO (2) years of assessment)</td><td>1,000 (Restricted)</td></tr>
<tr><td>Child care fees to a registered child care centre / kindergarten for a child aged 6 years and below</td><td>3,000 (Restricted)</td></tr>
<tr><td>Expenses on charging facilities for Electric Vehicle and domestic food waste composting machine (Not for business use)</td><td>2,500 (Restricted)</td></tr>
</table>
`;

describe("parseReliefAmounts", () => {
  test("extracts every category from page markup matching the current defaults", () => {
    const parsed = parseReliefAmounts(FIXTURE_HTML);
    expect(parsed).toEqual(DEFAULT_TAX_RELIEF_CAPS);
  });

  test("silently skips a category whose anchor text is missing, rather than guessing", () => {
    const withoutSspn = FIXTURE_HTML.replace(
      /<tr><td>Net deposit in Skim Simpanan Pendidikan Nasional.*?<\/tr>/s,
      "",
    );
    const parsed = parseReliefAmounts(withoutSspn);
    expect(parsed.sspn).toBeUndefined();
    expect(parsed.lifestyle).toBe(2500);
  });

  test("doesn't mistake an enumeration marker (no thousands separator) for the amount", () => {
    const parsed = parseReliefAmounts(FIXTURE_HTML);
    // The medical_self_spouse_child row's amount sits after two "1."/"2." markers —
    // it must land on 10,000, not on a stray single digit.
    expect(parsed.medical_self_spouse_child).toBe(10000);
  });
});

describe("lhdn sync state (real SQLite via node:sqlite)", () => {
  test("shouldRunScheduledCheck is true before any check has ever run", async () => {
    expect(await shouldRunScheduledCheck()).toBe(true);
  });

  test("apply writes the scraped amount as the new cap and clears it from pending", async () => {
    const year = 2031;
    await getCapsForYear(year); // seeds defaults so there's a baseline to diff against

    const db = await require("../db").getDb();
    await db.runAsync(
      `INSERT INTO lhdn_sync_state (id, last_checked_at, pending_diffs, last_error) VALUES (1, ?, ?, NULL)`,
      new Date().toISOString(),
      JSON.stringify([
        { category_key: "lifestyle", current_cap: 2500, scraped_amount: 3000 },
        { category_key: "sspn", current_cap: 8000, scraped_amount: 9000 },
      ]),
    );

    await applySyncDiffs(year, ["lifestyle"]);

    const caps = await getCapsForYear(year);
    expect(caps.find((c) => c.category_key === "lifestyle")?.cap_amount).toBe(3000);
    expect(caps.find((c) => c.category_key === "sspn")?.cap_amount).toBe(8000);

    const { pendingDiffs } = await getSyncState();
    expect(pendingDiffs).toHaveLength(1);
    expect(pendingDiffs[0].category_key).toBe("sspn");
  });

  test("dismiss clears all pending diffs without touching caps", async () => {
    await dismissPendingDiffs();
    const { pendingDiffs } = await getSyncState();
    expect(pendingDiffs).toHaveLength(0);
  });
});

describe("runAndRecordSyncCheck failure handling", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("a successful check with a missing anchor records it as unmatched, not a diff", async () => {
    const year = 2040;
    await getCapsForYear(year);
    const withoutSspn = FIXTURE_HTML.replace(
      /<tr><td>Net deposit in Skim Simpanan Pendidikan Nasional.*?<\/tr>/s,
      "",
    );
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => withoutSspn }) as any;

    const result = await runAndRecordSyncCheck(year);
    expect(result.unmatched).toContain("sspn");
    expect(result.diffs.find((d) => d.category_key === "sspn")).toBeUndefined();

    const state = await getSyncState();
    expect(state.unmatched).toContain("sspn");
    expect(state.lastError).toBeNull();
  });

  test("a failed check records the error without wiping the previous unmatched snapshot", async () => {
    const year = 2041;
    await getCapsForYear(year);

    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => FIXTURE_HTML }) as any;
    await runAndRecordSyncCheck(year); // baseline: everything matches, nothing unmatched

    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as any;
    await runAndRecordSyncCheck(year);

    const state = await getSyncState();
    expect(state.lastError).toBe("network down");
    // Not cleared or replaced by the failed attempt — still reflects the last check that actually completed.
    expect(state.unmatched).toHaveLength(0);
  });

  test("a non-ok HTTP response is treated as a failure, preserving prior pending diffs", async () => {
    const year = 2042;
    await getCapsForYear(year);

    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => FIXTURE_HTML }) as any;
    await runAndRecordSyncCheck(year);

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    await runAndRecordSyncCheck(year);

    const state = await getSyncState();
    expect(state.lastError).toMatch(/404/);
  });
});
