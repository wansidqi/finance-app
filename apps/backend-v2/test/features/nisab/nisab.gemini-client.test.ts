import { describe, expect, test } from "vitest";
import {
  buildReformatPrompt,
  buildSearchPrompt,
  dropImplausible,
  looksGenericallyFlat,
  parseGeminiText,
} from "../../../src/features/nisab/nisab.gemini-client.js";
import type { StateNisab } from "../../../src/features/nisab/nisab.model.js";
import { STATE_KEYS } from "../../../src/features/nisab/nisab.states.js";

describe("parseGeminiText", () => {
  test("valid structured-output JSON parses into states", () => {
    const text = JSON.stringify({
      states: [
        { state: "selangor", nisabRM: 38748 },
        { state: "johor", nisabRM: 37000 },
      ],
    });
    const states = parseGeminiText(text, "2026-08");
    expect(states).toHaveLength(2);
    expect(states[0]).toMatchObject({ state: "selangor", nisabRM: 38748, asOf: "2026-08" });
  });

  test("invalid JSON throws", () => {
    expect(() => parseGeminiText("not json", "2026-08")).toThrow();
  });

  test("empty states array throws", () => {
    expect(() => parseGeminiText(JSON.stringify({ states: [] }), "2026-08")).toThrow();
  });

  test("entries with missing state or non-positive nisabRM are filtered out", () => {
    const text = JSON.stringify({
      states: [
        { state: "selangor", nisabRM: 38748 },
        { state: "", nisabRM: 1000 },
        { state: "johor", nisabRM: 0 },
      ],
    });
    const states = parseGeminiText(text, "2026-08");
    expect(states).toHaveLength(1);
    expect(states[0]?.state).toBe("selangor");
  });

  test("all entries filtered out throws instead of returning an empty result", () => {
    const text = JSON.stringify({ states: [{ state: "", nisabRM: 0 }] });
    expect(() => parseGeminiText(text, "2026-08")).toThrow();
  });

  test("sourceUrl is preserved when present, empty when absent", () => {
    const text = JSON.stringify({
      states: [
        { state: "selangor", nisabRM: 38748, sourceUrl: "https://www.zakatselangor.com.my/" },
        { state: "johor", nisabRM: 45825.48 },
      ],
    });
    const states = parseGeminiText(text, "2026-08");
    expect(states[0]?.sourceUrl).toBe("https://www.zakatselangor.com.my/");
    expect(states[1]?.sourceUrl).toBe("");
  });
});

function stateNisab(state: string, nisabRM: number): StateNisab {
  return { state, zakatAgency: "", nisabRM, goldUrufWornGrams: null, sourceUrl: "", asOf: "2026-08" };
}

describe("dropImplausible", () => {
  test("keeps figures within 0.5x-3x of the reference, drops the rest", () => {
    const reference = 30000;
    const states = [
      stateNisab("selangor", 38748), // 1.29x, keep
      stateNisab("sabah", 12000), // 0.4x, drop
      stateNisab("johor", 95000), // 3.17x, drop
      stateNisab("kedah", 32871.27), // 1.10x, keep
    ];
    const kept = dropImplausible(states, reference);
    expect(kept.map((s) => s.state)).toEqual(["selangor", "kedah"]);
  });

  test("is a no-op without a reference", () => {
    const states = [stateNisab("selangor", 38748)];
    expect(dropImplausible(states, null)).toEqual(states);
  });
});

describe("looksGenericallyFlat", () => {
  test("detects a tight cluster (reproduced bad run, ratio ~1.30)", () => {
    const tight = [
      stateNisab("a", 22669.53),
      stateNisab("b", 24198),
      stateNisab("c", 25995.67),
      stateNisab("d", 26369.91),
      stateNisab("e", 27696),
      stateNisab("f", 29376.08),
    ];
    expect(looksGenericallyFlat(tight)).toBe(true);
  });

  test("accepts a realistic spread (verified good run, ratio ~1.76)", () => {
    const spread = [
      stateNisab("a", 25995.67),
      stateNisab("b", 32871.27),
      stateNisab("c", 37401),
      stateNisab("d", 40092.42),
      stateNisab("e", 42175),
      stateNisab("f", 45825.48),
    ];
    expect(looksGenericallyFlat(spread)).toBe(false);
  });

  test("ignores small batches", () => {
    const small = [stateNisab("a", 30000), stateNisab("b", 30001)];
    expect(looksGenericallyFlat(small)).toBe(false);
  });
});

describe("buildSearchPrompt", () => {
  test("asks for all 14 states, the right zakat type, and a source URL preferring the official site", () => {
    const prompt = buildSearchPrompt().toLowerCase();
    for (const want of ["14 states", "malaysia", "zakat harta", "zakat fitrah", "zakat pendapatan", "url", "official", "legitimate source"]) {
      expect(prompt).toContain(want);
    }
  });
});

describe("buildReformatPrompt", () => {
  test("covers every state key and includes the grounded text plus a source URL request", () => {
    const prompt = buildReformatPrompt("some grounded notes");
    for (const key of STATE_KEYS) {
      expect(prompt).toContain(key);
    }
    expect(prompt).toContain("some grounded notes");
    expect(prompt.toLowerCase()).toContain("source url");
  });
});
