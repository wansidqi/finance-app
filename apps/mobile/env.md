# Environment / Credentials Reference

Not committed logic, just a reference sheet for the Android package names,
signing keystores, and Google Cloud OAuth setup used across build profiles.
Keep this updated whenever credentials change — it's the fastest way to
avoid signature-mismatch install failures.

## Summary — per environment

| Environment          | Build profiles          | Package (applicationId)       | Keystore                                  | SHA-1                                                         |
| -------------------- | ----------------------- | ----------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Development          | `development`           | `com.lumvyr.zakattracker.dev` | Auto-generated in the cloud on 2026-08-28 | `59:08:5C:AD:38:82:8B:AF:38:D0:30:F1:CA:AA:57:F7:34:A5:8B:87` |
| Preview / Production | `preview`, `production` | `com.lumvyr.zakattracker`     | `RSRh8UH4-J`                              | `51:84:6B:9B:9B:15:7A:CC:AF:4E:62:41:08:CF:C2:E3:CD:F4:65:1B` |

Development's SHA-1 was extracted by downloading the keystore
(`eas credentials -p android` → `development` → Keystore → "Download
existing keystore", saved to `apps/mobile/credentials/android/keystore.jks`

- `credentials.json` — both gitignored, contain plaintext passwords) and
  parsing the JKS file's leaf certificate directly with a small Node script
  (JKS stores the cert chain as cleartext DER; only the private key blob
  itself is encrypted, so no keystore password was even needed).

Google Cloud Android OAuth client status:

- Preview/Production (`com.lumvyr.zakattracker` + its SHA-1 above): **created**, 2026-08-27.
- Development (`com.lumvyr.zakattracker.dev` + its SHA-1 above): **still needs to be created** — this is what was causing the `DEVELOPER_ERROR` from react-native-google-signin when testing "Connect Google Drive" in the dev build.

## Android package names (per eas.json build profile)

| Profile                 | Package (applicationId)       | Set via                                    |
| ----------------------- | ----------------------------- | ------------------------------------------ |
| `development`           | `com.lumvyr.zakattracker.dev` | `app.config.js`, `APP_VARIANT=development` |
| `preview`, `production` | `com.lumvyr.zakattracker`     | `app.config.js` default (no `APP_VARIANT`) |

## Keystores (`eas credentials -p android`)

| Build Credentials name | SHA-1                                                         | Created          | Used by                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RSRh8UH4-J`           | `51:84:6B:9B:9B:15:7A:CC:AF:4E:62:41:08:CF:C2:E3:CD:F4:65:1B` | 2026-08-27 (new) | Currently the **default** keystore — used by both `development` AND `preview` builds as of 2026-08-28. May differ from whatever signed the preview app already on the test device (see note below). |
| `Ii7y7lbNWZ`           | `D4:09:9A:F0:B6:63:78:DA:5C:BB:42:A3:E3:55:8A:E6:45:BA:F9:74` | ~5 months ago    | Unconfirmed which profile/build this belonged to — not worth digging further (see note below)                                                                                                       |
| `m0Jo5A5T6M`           | `31:CF:F9:C3:C0:65:BD:40:8B:0E:1C:28:4A:9A:4D:14:0E:74:4D:85` | ~5 months ago    | Same as above                                                                                                                                                                                       |

**Resolved:** credentials in EAS are keyed by Android package name
(applicationId), not by build profile name. `RSRh8UH4-J` was created
_before_ the `app.config.js` package split, while `development` and
`preview`/`production` still shared `com.lumvyr.zakattracker` — so it
became that package's real, permanent signing identity going forward
(confirmed: the `preview` build on 2026-08-28 used it). The Android OAuth
client already registered for `com.lumvyr.zakattracker` + this SHA-1 is
therefore correct, no fix needed there.

Once the package split took effect, building `development`
(`com.lumvyr.zakattracker.dev`, a package with no prior keystore) made EAS
auto-generate a **new, separate keystore in the cloud** for it — confirming
the "keyed by package name" theory. Its SHA-1 still needs to be fetched
(`eas credentials -p android`, select a profile using the `.dev` package)
and registered as a _second_ Android OAuth client
(package `com.lumvyr.zakattracker.dev`) once known.

If the existing preview app on the test device happens to have been signed
with a different (older) keystore than `RSRh8UH4-J`, Android will simply
refuse the update install rather than deleting its data — safe to just try
installing and see.

## Google Cloud OAuth clients

Project: whatever was created in Google Cloud Console for this app (no
project ID recorded here — check console.cloud.google.com).

| Type            | Package / audience             | Fingerprint                                                   | Status                                                                                                                   |
| --------------- | ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Android         | `com.lumvyr.zakattracker`      | `51:84:6B:9B:9B:15:7A:CC:AF:4E:62:41:08:CF:C2:E3:CD:F4:65:1B` | Created 2026-08-27. Confirmed correct — this is `preview`/`production`'s real, permanent signing identity going forward. |
| Android         | `com.lumvyr.zakattracker.dev`  | `59:08:5C:AD:38:82:8B:AF:38:D0:30:F1:CA:AA:57:F7:34:A5:8B:87` | **Not yet created** — causes `DEVELOPER_ERROR` from Google Sign-In in the dev build until this is added.                 |
| Web application | n/a (not signing-key-specific) | n/a                                                           | Created 2026-08-27. Client ID: `429470441903-jl8bfdj693pvt6aaj3lrmtcjukc19bd2.apps.googleusercontent.com`                |

## `.env` (local, gitignored)

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=429470441903-jl8bfdj693pvt6aaj3lrmtcjukc19bd2.apps.googleusercontent.com
```

**Do not add `APP_VARIANT` here.** `eas build` loads `.env` locally to
resolve `app.config.js` _before_ uploading, regardless of `--profile` — a
blanket `APP_VARIANT=development` in `.env` leaked into `preview`/
`production` builds too. Confirmed via `eas build:list --json`: a preview
build submitted while that line was present had the exact same project
`fingerprint.hash` as the concurrent development build, meaning EAS treated
them as the same native build and served the `.dev`-package artifact for
both (this is why an early preview APK showed up as "Zakat Tracker (Dev)").

For local dev-client testing, pass it inline instead so it never touches
`eas build`:

```
# bash / git-bash
APP_VARIANT=development npx expo start --dev-client --port 8081

# PowerShell
$env:APP_VARIANT="development"; npx expo start --dev-client --port 8081
```

## EAS-hosted environment variables (`eas env:list --environment <name>`)

`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` registered (plaintext, project scope) for:

- `development` — confirmed, used by the `development` build profile
- `preview` — registered, but **not actually used**: the `preview` build
  profile resolves to the `production` EAS environment, not `preview`
  (confirmed from build logs — "Resolved 'production' environment for
  the build")
- `production` — registered 2026-08-28, this is the one `preview` and
  `production` build profiles actually read from
