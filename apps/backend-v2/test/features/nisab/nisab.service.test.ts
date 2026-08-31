import { describe, expect, test } from "vitest";
import { getAllStates } from "../../../src/features/nisab/nisab.service.js";
import { setCachedStates, type StateNisab } from "../../../src/features/nisab/nisab.model.js";

function makeFakeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

function stateNisab(overrides: Partial<StateNisab> & Pick<StateNisab, "state" | "nisabRM">): StateNisab {
  return { zakatAgency: "", goldUrufWornGrams: null, sourceUrl: "", asOf: "2026-08", ...overrides };
}

describe("getAllStates", () => {
  test("isScraped is true when a source URL is present, false when it isn't", async () => {
    const kv = makeFakeKv();
    await setCachedStates(kv, [
      stateNisab({ state: "selangor", nisabRM: 38748, sourceUrl: "https://www.zakatselangor.com.my/" }),
      stateNisab({ state: "kelantan", nisabRM: 37401, sourceUrl: "" }),
    ]);

    const result = await getAllStates(kv);
    const byState = new Map(result.map((s) => [s.state, s]));
    expect(byState.get("selangor")?.isScraped).toBe(true);
    expect(byState.get("kelantan")?.isScraped).toBe(false);
  });

  test("falls back to the canonical state label when no zakat agency was recorded", async () => {
    const kv = makeFakeKv();
    await setCachedStates(kv, [stateNisab({ state: "sabah", nisabRM: 36979, zakatAgency: "" })]);

    const result = await getAllStates(kv);
    expect(result[0]?.zakatAgency).toBe("Sabah");
  });

  test("keeps a real agency name when one was recorded", async () => {
    const kv = makeFakeKv();
    await setCachedStates(kv, [stateNisab({ state: "sabah", nisabRM: 36979, zakatAgency: "Bahagian Zakat dan Fitrah (MUIS)" })]);

    const result = await getAllStates(kv);
    expect(result[0]?.zakatAgency).toBe("Bahagian Zakat dan Fitrah (MUIS)");
  });

  test("returns an empty list when nothing is cached", async () => {
    const kv = makeFakeKv();
    expect(await getAllStates(kv)).toEqual([]);
  });
});
