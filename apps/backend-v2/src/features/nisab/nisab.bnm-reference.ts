// Live nationwide gold-price nisab from Bank Negara Malaysia's Kijang Emas
// price — used only as a plausibility reference for the AI-fetched
// per-state figures (see dropImplausible in nisab.gemini-client.ts).
// Feature-local: only nisab's own guard logic needs this, so it's not in
// shared/. Not itself served to the app — apps/mobile removed the
// gold-price fallback entirely (see local/nisab-resolver.ts).

const GRAMS_REQUIRED = 85;
const GRAMS_PER_TROY_OUNCE = 31.1034768;
const BNM_ENDPOINT = "https://api.bnm.gov.my/public/kijang-emas";
const FETCH_TIMEOUT_MS = 8000;

interface BnmResponse {
  data: {
    one_oz: { buying: number; selling: number };
  };
}

/** Returns the current nationwide gold-price nisab in RM, or null if BNM is unreachable — dropImplausible treats null as "skip the plausibility check" rather than blocking a refresh on this one live-fetch failing. */
export async function fetchReferenceNisab(): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(BNM_ENDPOINT, {
      headers: { Accept: "application/vnd.BNM.API.v1+json" },
      signal: controller.signal,
    });
    if (!resp.ok) return null;

    const body = (await resp.json()) as BnmResponse;
    const { buying, selling } = body.data.one_oz;
    const avgPerOz = (buying + selling) / 2;
    const pricePerGram = avgPerOz / GRAMS_PER_TROY_OUNCE;
    return pricePerGram * GRAMS_REQUIRED;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
