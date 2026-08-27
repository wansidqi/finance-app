import {
  computeRetention,
  formatBackupFilename,
  parseBackupFilename,
} from "../backup-naming";

describe("formatBackupFilename / parseBackupFilename", () => {
  test("round-trips an unencrypted backup", () => {
    const date = new Date(Date.UTC(2026, 7, 27, 2, 0, 0));
    const filename = formatBackupFilename(date, false);
    expect(filename).toBe("FinanceApp-Backup-2026-08-27-020000.sqlite");
    expect(parseBackupFilename(filename)).toEqual({ createdAt: date, encrypted: false });
  });

  test("round-trips an encrypted backup", () => {
    const date = new Date(Date.UTC(2026, 0, 3, 14, 5, 9));
    const filename = formatBackupFilename(date, true);
    expect(filename).toBe("FinanceApp-Backup-2026-01-03-140509.enc");
    expect(parseBackupFilename(filename)).toEqual({ createdAt: date, encrypted: true });
  });

  test("rejects filenames that don't match the pattern", () => {
    expect(parseBackupFilename("random-file.sqlite")).toBeNull();
    expect(parseBackupFilename("FinanceApp-Backup-2026-08-27.sqlite")).toBeNull();
  });
});

function daysAgo(n: number): Date {
  const d = new Date(Date.UTC(2026, 7, 27, 2, 0, 0));
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

describe("computeRetention", () => {
  test("keeps everything when under every window", () => {
    const backups = [
      { id: "a", createdAt: daysAgo(0) },
      { id: "b", createdAt: daysAgo(1) },
    ];
    const { keep, remove } = computeRetention(backups, { daily: 30, weekly: 12, monthly: 12 });
    expect(keep.sort()).toEqual(["a", "b"]);
    expect(remove).toEqual([]);
  });

  test("keeps only one per day within the daily window, dropping same-day duplicates", () => {
    const sameDayOlder = new Date(daysAgo(0));
    sameDayOlder.setUTCHours(1, 0, 0, 0);
    const backups = [
      { id: "newer", createdAt: daysAgo(0) },
      { id: "older-same-day", createdAt: sameDayOlder },
    ];
    const { keep, remove } = computeRetention(backups, { daily: 30, weekly: 12, monthly: 12 });
    expect(keep).toEqual(["newer"]);
    expect(remove).toEqual(["older-same-day"]);
  });

  test("falls back to weekly bucket once the daily window is exhausted", () => {
    const backups = [
      { id: "day0", createdAt: daysAgo(0) },
      { id: "day1", createdAt: daysAgo(1) },
      // 10 days ago falls outside a 2-day daily window but should be kept as
      // that week's representative.
      { id: "day10", createdAt: daysAgo(10) },
    ];
    const { keep, remove } = computeRetention(backups, { daily: 2, weekly: 12, monthly: 12 });
    expect(keep.sort()).toEqual(["day0", "day1", "day10"]);
    expect(remove).toEqual([]);
  });

  test("drops backups outside every window", () => {
    const backups = [
      { id: "recent", createdAt: daysAgo(0) },
      { id: "ancient", createdAt: daysAgo(1000) },
    ];
    const { keep, remove } = computeRetention(backups, { daily: 1, weekly: 0, monthly: 0 });
    expect(keep).toEqual(["recent"]);
    expect(remove).toEqual(["ancient"]);
  });
});
