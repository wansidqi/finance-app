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
    openDatabaseAsync: async () => facade,
  };
});

import {
  StateAuthorityConfig,
  getAllStateNisabRates,
  getStateNisab,
  parseNisabAmount,
  pickCurrentSelangorEntry,
  syncOneState,
} from "../nisab-state-sync-service";

describe("parseNisabAmount (pure)", () => {
  test("finds an RM amount following the anchor phrase", () => {
    const html = "<p>Kadar nisab zakat pendapatan tahun 2026 ialah RM38,748.00 setahun.</p>";
    expect(parseNisabAmount(html, "kadar nisab zakat pendapatan tahun 2026")).toBeCloseTo(38748, 2);
  });

  test("is case-insensitive on both anchor and surrounding HTML", () => {
    const html = "<DIV>Nisab Semasa: <b>RM 33,996</b></DIV>";
    expect(parseNisabAmount(html, "nisab semasa")).toBe(33996);
  });

  test("returns null when the anchor isn't found", () => {
    const html = "<p>Some unrelated page content.</p>";
    expect(parseNisabAmount(html, "kadar nisab semasa")).toBeNull();
  });

  test("returns null when no RM amount follows the anchor within the search window", () => {
    const html = `<p>kadar nisab semasa ${"x ".repeat(300)} RM40,000</p>`;
    expect(parseNisabAmount(html, "kadar nisab semasa")).toBeNull();
  });
});

describe("pickCurrentSelangorEntry (pure)", () => {
  const entries = [
    { tahun: "2026 (Julai - Disember)", jumlah: "RM 38,748.00" },
    { tahun: "2026 (Jan - Jun)", jumlah: "RM 42,047.00" },
    { tahun: "2025 (Julai - Disember)", jumlah: "RM 35,449.00" },
    { tahun: "2025 (Jan - Jun)", jumlah: "RM 29,961.00" },
  ];

  test("picks the Jul-Dec entry for a date in the second half of the year", () => {
    const result = pickCurrentSelangorEntry(entries, new Date("2026-08-29T00:00:00Z"));
    expect(result?.jumlah).toBe("RM 38,748.00");
  });

  test("picks the Jan-Jun entry for a date in the first half of the year", () => {
    const result = pickCurrentSelangorEntry(entries, new Date("2026-03-15T00:00:00Z"));
    expect(result?.jumlah).toBe("RM 42,047.00");
  });

  test("returns null when no entry matches the current year", () => {
    const result = pickCurrentSelangorEntry(entries, new Date("2030-01-01T00:00:00Z"));
    expect(result).toBeNull();
  });
});

describe("syncOneState with a fetchOverride (real SQLite via node:sqlite)", () => {
  test("uses fetchOverride instead of the generic HTML scrape when present", async () => {
    await syncOneState({
      state: "selangor",
      authorityName: "Lembaga Zakat Selangor (LZS)",
      url: "https://example.com/selangor",
      anchorText: "",
      fetchOverride: async () => 38748,
    });

    const rate = await getStateNisab("selangor");
    expect(rate?.nisabRM).toBe(38748);
    expect(rate?.lastError).toBeNull();
  });

  test("a fetchOverride that throws is recorded as a failure like any other source", async () => {
    await syncOneState({
      state: "kelantan",
      authorityName: "Test",
      url: "https://example.com/kelantan",
      anchorText: "",
      fetchOverride: async () => {
        throw new Error("boom");
      },
    });

    const rate = await getStateNisab("kelantan");
    expect(rate).toBeNull();
  });
});

describe("syncOneState + getStateNisab (real SQLite via node:sqlite)", () => {
  const config: StateAuthorityConfig = {
    state: "selangor",
    authorityName: "Lembaga Zakat Selangor",
    url: "https://example.com/nisab-selangor",
    anchorText: "kadar nisab zakat harta",
  };

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("a successful fetch+parse is persisted and readable via getStateNisab", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => "<p>Kadar Nisab Zakat Harta: RM38,748.00</p>",
    }) as any;

    await syncOneState(config);

    const rate = await getStateNisab("selangor");
    expect(rate).not.toBeNull();
    expect(rate!.nisabRM).toBe(38748);
    expect(rate!.sourceUrl).toBe(config.url);
    expect(rate!.lastError).toBeNull();
  });

  test("a failed fetch is recorded as an error without clobbering the previously cached rate", async () => {
    // Seed a prior successful rate first.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => "<p>Kadar Nisab Zakat Harta: RM38,748.00</p>",
    }) as any;
    await syncOneState(config);

    // Now simulate the site being down.
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as any;
    await syncOneState(config);

    const rate = await getStateNisab("selangor");
    expect(rate).not.toBeNull();
    expect(rate!.nisabRM).toBe(38748); // untouched
    expect(rate!.lastError).toContain("503");
  });

  test("getAllStateNisabRates omits jurisdictions that have never successfully synced", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;
    await syncOneState({ ...config, state: "kedah", url: "https://example.com/kedah" });

    const rates = await getAllStateNisabRates();
    expect(rates.some((r) => r.state === "kedah")).toBe(false);
  });
});
