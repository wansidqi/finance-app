import { beforeEach, describe, expect, test } from "vitest";
import {
  getAllCachedStates,
  isRefreshDueThisMonth,
  markRefreshedThisMonth,
  setCachedStates,
  type StateNisab,
} from "../../../src/features/nisab/nisab.model.js";

/** Minimal in-memory stand-in for KVNamespace — only the get/put shape this code actually uses. */
function makeFakeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

function stateNisab(state: string, nisabRM: number, sourceUrl = ""): StateNisab {
  return { state, zakatAgency: "Test Agency", nisabRM, goldUrufWornGrams: null, sourceUrl, asOf: "2026-08" };
}

describe("getAllCachedStates / setCachedStates", () => {
  let kv: KVNamespace;
  beforeEach(() => {
    kv = makeFakeKv();
  });

  test("round-trips states written via setCachedStates", async () => {
    await setCachedStates(kv, [stateNisab("selangor", 38748, "https://www.zakatselangor.com.my/"), stateNisab("johor", 45825.48)]);

    const all = await getAllCachedStates(kv);
    expect(all).toHaveLength(2);
    const byState = new Map(all.map((s) => [s.state, s]));
    expect(byState.get("selangor")?.nisabRM).toBe(38748);
    expect(byState.get("johor")?.sourceUrl).toBe("");
  });

  test("returns an empty list when nothing has ever been cached", async () => {
    expect(await getAllCachedStates(kv)).toEqual([]);
  });

  test("ignores an entry for a state key not in the canonical 14", async () => {
    await setCachedStates(kv, [stateNisab("not_a_real_state", 38748)]);
    expect(await getAllCachedStates(kv)).toEqual([]);
  });
});

describe("isRefreshDueThisMonth / markRefreshedThisMonth", () => {
  test("due when nothing has ever been marked refreshed", async () => {
    const kv = makeFakeKv();
    expect(await isRefreshDueThisMonth(kv)).toBe(true);
  });

  test("not due immediately after marking refreshed", async () => {
    const kv = makeFakeKv();
    await markRefreshedThisMonth(kv);
    expect(await isRefreshDueThisMonth(kv)).toBe(false);
  });
});
