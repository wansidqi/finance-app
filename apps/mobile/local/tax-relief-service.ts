import {
  DEFAULT_TAX_RELIEF_CAPS,
  TAX_RELIEF_CATEGORIES,
  TAX_RELIEF_CATEGORY_LABELS,
  TaxReliefCapInterface,
  TaxReliefCategoryKey,
  TaxReliefCategorySummary,
} from "@/interface/tax-relief";
import { getDb } from "./db";

interface CapRow {
  assessment_year: number;
  category_key: string;
  cap_amount: number;
}

/**
 * Ensures every known category has a cap row for `year`, seeding the
 * DEFAULT_TAX_RELIEF_CAPS constant on first access. After this runs once
 * for a year, the DB row is the editable source of truth — re-running is a
 * no-op (INSERT OR IGNORE) so an already-edited cap is never overwritten.
 */
async function seedDefaultCaps(year: number): Promise<void> {
  const db = await getDb();
  for (const key of TAX_RELIEF_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO tax_relief_caps (assessment_year, category_key, cap_amount) VALUES (?, ?, ?)`,
      year,
      key,
      DEFAULT_TAX_RELIEF_CAPS[key],
    );
  }
}

export async function getCapsForYear(year: number): Promise<TaxReliefCapInterface[]> {
  await seedDefaultCaps(year);

  const db = await getDb();
  const rows = await db.getAllAsync<CapRow>(
    "SELECT assessment_year, category_key, cap_amount FROM tax_relief_caps WHERE assessment_year = ?",
    year,
  );
  return rows.map((r) => ({
    assessment_year: r.assessment_year,
    category_key: r.category_key as TaxReliefCategoryKey,
    cap_amount: r.cap_amount,
  }));
}

export async function updateCap(
  year: number,
  categoryKey: TaxReliefCategoryKey,
  capAmount: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO tax_relief_caps (assessment_year, category_key, cap_amount, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(assessment_year, category_key) DO UPDATE SET
       cap_amount = excluded.cap_amount,
       updated_at = CURRENT_TIMESTAMP`,
    year,
    categoryKey,
    capAmount,
  );
}

interface ClaimedRow {
  tax_relief_category: string;
  claimed: number;
}

export async function getReliefSummary(year: number): Promise<TaxReliefCategorySummary[]> {
  const caps = await getCapsForYear(year);
  const capByCategory = new Map(caps.map((c) => [c.category_key, c.cap_amount]));

  const db = await getDb();
  const claimedRows = await db.getAllAsync<ClaimedRow>(
    `SELECT tax_relief_category, SUM(amount) as claimed
     FROM transactions
     WHERE assessment_year = ? AND tax_relief_category IS NOT NULL
     GROUP BY tax_relief_category`,
    year,
  );
  const claimedByCategory = new Map(claimedRows.map((r) => [r.tax_relief_category, r.claimed]));

  return TAX_RELIEF_CATEGORIES.map((key) => {
    const claimed = claimedByCategory.get(key) ?? 0;
    const cap = capByCategory.get(key) ?? DEFAULT_TAX_RELIEF_CAPS[key];
    return {
      category_key: key,
      label: TAX_RELIEF_CATEGORY_LABELS[key],
      claimed,
      cap,
      remaining: Math.max(cap - claimed, 0),
      over_cap: claimed > cap,
    };
  });
}

interface ReliefTransactionRow {
  id: number;
  occurred_at: string;
  description: string | null;
  note: string | null;
  amount: number;
  tax_relief_category: string;
  receipt_count: number;
}

export interface ReliefTransactionDetail {
  id: number;
  occurred_at: string;
  description: string | null;
  note: string | null;
  amount: number;
  category_key: TaxReliefCategoryKey;
  category_label: string;
  receipt_count: number;
}

/** All relief-tagged transactions for a year, for the evidence export report — grouped by category, newest first within each. */
export async function getReliefTransactions(year: number): Promise<ReliefTransactionDetail[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReliefTransactionRow>(
    `SELECT
       t.id, t.occurred_at, t.description, t.note, t.amount, t.tax_relief_category,
       (SELECT COUNT(*) FROM receipt_attachments r WHERE r.transaction_id = t.id) AS receipt_count
     FROM transactions t
     WHERE t.assessment_year = ? AND t.tax_relief_category IS NOT NULL
     ORDER BY t.tax_relief_category, t.occurred_at DESC`,
    year,
  );
  return rows.map((r) => ({
    id: r.id,
    occurred_at: r.occurred_at,
    description: r.description,
    note: r.note,
    amount: r.amount,
    category_key: r.tax_relief_category as TaxReliefCategoryKey,
    category_label: TAX_RELIEF_CATEGORY_LABELS[r.tax_relief_category as TaxReliefCategoryKey],
    receipt_count: r.receipt_count,
  }));
}
