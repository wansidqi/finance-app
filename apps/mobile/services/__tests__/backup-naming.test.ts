import {
  formatBackupFilename,
  parseBackupFilename,
  selectStaleBackups,
} from "../backup-naming";

describe("formatBackupFilename / parseBackupFilename", () => {
  test("round-trips an unencrypted backup", () => {
    const date = new Date(Date.UTC(2026, 7, 27, 2, 0, 0));
    const filename = formatBackupFilename(date, false);
    expect(filename).toBe("FinanceApp-Backup-2026-08-27-020000.sqlite");
    expect(parseBackupFilename(filename)).toEqual({ createdAt: date, encrypted: false, isDev: false });
  });

  test("round-trips an encrypted backup", () => {
    const date = new Date(Date.UTC(2026, 0, 3, 14, 5, 9));
    const filename = formatBackupFilename(date, true);
    expect(filename).toBe("FinanceApp-Backup-2026-01-03-140509.enc");
    expect(parseBackupFilename(filename)).toEqual({ createdAt: date, encrypted: true, isDev: false });
  });

  test("round-trips a development-build backup with the DEV- tag", () => {
    const date = new Date(Date.UTC(2026, 7, 27, 2, 0, 0));
    const filename = formatBackupFilename(date, false, true);
    expect(filename).toBe("FinanceApp-Backup-DEV-2026-08-27-020000.sqlite");
    expect(parseBackupFilename(filename)).toEqual({ createdAt: date, encrypted: false, isDev: true });
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

describe("selectStaleBackups", () => {
  test("keeps everything when there's zero or one backup", () => {
    expect(selectStaleBackups([])).toEqual([]);
    expect(selectStaleBackups([{ id: "a", createdAt: daysAgo(0) }])).toEqual([]);
  });

  test("marks every backup except the newest as stale", () => {
    const backups = [
      { id: "newer", createdAt: daysAgo(0) },
      { id: "older", createdAt: daysAgo(1) },
      { id: "ancient", createdAt: daysAgo(1000) },
    ];
    expect(selectStaleBackups(backups).sort()).toEqual(["ancient", "older"]);
  });

  test("doesn't depend on input order", () => {
    const backups = [
      { id: "older", createdAt: daysAgo(1) },
      { id: "newer", createdAt: daysAgo(0) },
    ];
    expect(selectStaleBackups(backups)).toEqual(["older"]);
  });
});
