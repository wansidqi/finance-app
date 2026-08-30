# Zakat Tracker

A local-first personal finance and zakat app for Malaysian users. Everything —
transactions, assets, liabilities, receipts, zakat calculations, reminders —
lives in an on-device SQLite database. There is no backend server; Google
Drive is used only as an optional, user-controlled backup destination, never
as the source of truth.

## What It Does

**Money, day to day**
- Records income/expense transactions (no accounts/balances — a flat,
  account-less ledger)
- Tracks assets (cash, savings, gold, investments, etc.) and liabilities
  (debt with a balance to pay off, or open-ended commitments like
  subscriptions), each grouped by platform for a clearer picture per
  institution/wallet
- Dashboard shows net worth, debt ratio, and monthly commitment at a glance

**Zakat**
- Per-state nisab detection for Malaysia (GPS-based, live-scraped from
  official state zakat authority sources with a PPZ fallback), so the
  zakat threshold reflects where the user actually lives
- Tracks zakat haul (Hijri calendar year) per asset category and surfaces
  when zakat becomes due
- Due-date notifications synced to the device's local notification system

**Receipts & tax relief**
- Attach a photo or PDF receipt to any expense transaction (stored as a
  BLOB in SQLite, so it's captured by backups automatically)
- LHDN (Malaysian tax authority) relief-category tagging per transaction,
  with per-assessment-year caps, claimed/remaining tracking, and a CSV
  export for filing evidence
- Optional live sync against LHDN's published relief amounts, surfaced as
  reviewable diffs rather than applied silently

**Document Vault**
- A secure place for identity and insurance documents (IC/MyKad, passport,
  driving license, insurance policies, warranties) that would otherwise get
  lost in photo galleries or email attachments
- Optional expiry dates with an urgency badge, and optional folder grouping
  so related documents (e.g. an IC's front/back scans, or every document
  tied to one project) stay together
- In-app preview for images and PDFs; anything else opens through the
  system share sheet

**Payment reminders**
- General-purpose recurring reminders (bills, subscriptions, anything with
  a due date) with configurable notification lead times

**Backup & restore**
- Optional Google Drive backup with AES-256 local encryption (the
  encryption key never leaves the device, with an explicit recovery-key
  export/import flow), GFS-style retention (daily/weekly/monthly), and a
  local safety snapshot taken before any restore

## Architecture

- **Local-first, not local-only.** SQLite (`expo-sqlite`) is the single
  source of truth for every feature. The app works fully offline; Google
  Drive backup is an optional layer on top, not a dependency.
- **No backend.** An earlier version of this app used a Go backend API —
  it was fully replaced by on-device SQLite. Nothing here talks to a
  server except the LHDN relief-amount check and the optional Google
  Drive backup, both of which are explicit, user-initiated actions.

## Tech Stack

- [Expo](https://expo.dev) / React Native, [Expo Router](https://docs.expo.dev/router/introduction/)
  for file-based navigation
- `expo-sqlite` for local persistence, `expo-notifications` for reminders,
  `expo-file-system` for receipt/document BLOB handling
- [TanStack Query](https://tanstack.com/query) for local data fetching/caching
- TypeScript throughout
- Tailwind-style utility classes via `uniwind`
- `react-native-pdf` for in-app PDF preview

## Development

```bash
npx expo start
```

Then open in Expo Go, or a custom development build (this project uses
native modules — camera, file system, SQLite, notifications, PDF
rendering — that Expo Go alone doesn't cover for every feature).
