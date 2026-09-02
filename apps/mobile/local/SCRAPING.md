# Nisab scraping guidance — per-state sources

Reference for anyone building a real per-state scraper for zakat nisab, and
the source list behind `nisab-static-fallback.ts`'s hand-collected values.
This app currently reads all 14 states' nisab from the backend's
`GET /api/zakat/nisab-states` (see `nisab-state-sync-service.ts`'s header
comment), with `nisab-static-fallback.ts` filling in locally, on-device, any
state the backend doesn't have a figure for. Neither this app nor the
backend scrapes independently today — this doc is a starting point for
whoever eventually builds a real scraper, not a description of current
behavior.

## What to look for on each site

Most state zakat authorities don't have a dedicated "Nisab" page. The figure
usually turns up on one of:

- A **zakat pendapatan (income zakat) calculator page** — the nisab RM value
  is often a constant baked into the calculator's JS, or shown next to the
  input field before you submit anything.
- A **"kadar/jadual zakat" (rates/schedule) page** — sometimes listed as a
  table alongside zakat fitrah and other zakat types.
- The **homepage** — some authorities post the current month's nisab as a
  banner/announcement.
- An **AJAX/JSON endpoint behind a JS-rendered table** — check the Network
  tab before assuming a page is unscrapable. Selangor's own nisab page looks
  empty in raw HTML but is backed by a WordPress `admin-ajax.php?action=load_nisab_data`
  endpoint — the same pattern may apply to other WordPress-based authority
  sites in this list.

When a site only publishes an **income-zakat** nisab (not zakat harta /
general wealth nisab), note that distinction explicitly — the two figures
are legally different bases and shouldn't be silently conflated.

## Per-state notes

| State | Source | Where to look |
|---|---|---|
| Selangor | https://www.zakatselangor.com.my/ | AJAX endpoint `admin-ajax.php?action=load_nisab_data` |
| WP/KL/Putrajaya/Labuan | https://zakat2u.com.my/ (PPZ-MAIWP) | Homepage / nisab announcement |
| Johor | https://www.maij.gov.my/ | Homepage or zakat pendapatan calculator |
| Kedah | https://www.lznk.com.my/ | Homepage or kadar zakat page |
| Kelantan | https://zakat.e-maik.my/v8/kalkulator/zakat_pendapatan.php | Zakat pendapatan calculator — verify this is the harta nisab, not an income-only figure |
| Melaka | https://www.izakat.com/nisab_dashboard.php | Dedicated nisab dashboard page |
| Negeri Sembilan | https://portal.mains.gov.my/ | Homepage or zakat pendapatan section |
| Pahang | https://zakatpahang.my/arkib-nisab/ | Dedicated nisab archive page |
| Perak | https://zapar.com.my/index.php/nisab | Dedicated nisab page |
| Perlis | *(not yet located)* | No confirmed page found — check MAIPs' zakat pendapatan calculator and homepage; the value in `nisab-static-fallback.ts` is an unsourced placeholder (`sourceUrl: null`, `isScraped: false`), treat as low-confidence until a real source is found |
| Pulau Pinang | https://zakat.mainpp.gov.my | Homepage or kadar zakat page |
| Sabah | https://appszakat.sabah.gov.my/zakat/kalkulatorPendapatan.php | Zakat pendapatan calculator — verify harta vs. income basis |
| Sarawak | *(not yet located)* | No confirmed page found — check Tabung Baitulmal Sarawak's site for a kadar/jadual zakat or calculator page; the value in `nisab-static-fallback.ts` is an unsourced placeholder |
| Terengganu | https://ezakat.maidam.gov.my/online/ | Online zakat portal — check calculator or announcement |

## Values currently hardcoded (collected 2026-08-31)

These live in `nisab-static-fallback.ts` and are used only when the backend
doesn't have a figure yet for a given state (see `getAllStateNisabRates` in
`nisab-state-sync-service.ts`). They are a manual snapshot, not a live feed —
replace a state's entry with a real scraper's output as one gets built.

| State | Nisab (RM) | Source |
|---|---:|---|
| Perlis | 45,825.48 | *(no source — placeholder)* |
| Perak | 46,954.31 | https://zapar.com.my/index.php/nisab |
| Pahang | 40,092.42 | https://zakatpahang.my/arkib-nisab/ |
| Negeri Sembilan | 33,880.36 | https://portal.mains.gov.my/ |
| Melaka | 40,092.42 | https://www.izakat.com/nisab_dashboard.php |
| Kelantan | 37,401.00 | https://zakat.e-maik.my/v8/kalkulator/zakat_pendapatan.php |
| Kedah | 32,871.27 | https://www.lznk.com.my/ |
| Johor | 45,825.48 | https://www.maij.gov.my/ |
| WP/KL/Putrajaya/Labuan | 33,996.00 | https://zakat2u.com.my/ |
| Selangor | 38,748.00 | https://www.zakatselangor.com.my/ |
| Pulau Pinang | 33,890.00 | https://zakat.mainpp.gov.my |
| Sabah | 36,979.00 | https://appszakat.sabah.gov.my/zakat/kalkulatorPendapatan.php |
| Sarawak | 38,398.00 | *(no source — placeholder)* |
| Terengganu | 47,685.52 | https://ezakat.maidam.gov.my/online/ |

Perlis and Johor happen to share the same figure (45,825.48) in this
snapshot — that's coincidental to when these were collected, not a sign one
was copied from the other; re-verify both independently when building real
scrapers for them.
