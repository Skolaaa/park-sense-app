# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
vercel dev   # Local dev with API proxy — real AI analysis works (recommended)
npm start    # Frontend only — no API proxy, falls back to mock data

npm run build                    # Production build (output: build/)
npm test                         # Run tests (interactive watch mode)
npm test -- --watchAll=false     # Run tests once (CI mode)
CI=true npm run build            # Build as Vercel does — treats ESLint warnings as errors
```

## Environment Setup

The OpenAI API key lives **server-side only** in the Vercel serverless function. It is never bundled into the frontend JS.

Add `OPENAI_API_KEY` to `.env.local` (already gitignored by the Vercel CLI):

```
OPENAI_API_KEY=sk-your-key-here
```

Optional server-side variables (see README for the full list): `SUPABASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY` enable the database (daily scan quota and
community events; run `supabase/migrations/0001_init.sql`), `DEVICE_HASH_SALT`
salts stored device hashes, `SCAN_DAILY_QUOTA` (default 40) caps scans per
device per Sydney day, `SENTRY_DSN` forwards client errors. The only
client-side variables are `REACT_APP_POSTHOG_PUBLIC_TOKEN` and
`REACT_APP_POSTHOG_HOST`; the token is publishable and is allowlisted in
`scripts/check-bundle-secrets.js`. Every optional integration degrades to a
no-op when its variable is unset.

Then run `vercel dev` (not `npm start`) to get the `/api/analyze` proxy working locally. `npm start` works but has no proxy, so all analyses fall back to mock data.

On Vercel, add `OPENAI_API_KEY` as a **server-side** environment variable (no `REACT_APP_` prefix — that prefix causes react-scripts to bundle the value into the frontend build). Remove any `REACT_APP_OPENAI_API_KEY` entries from all Vercel environments.

Demo mode is active whenever the proxy returns `503` (key not configured) or a network error — `analysisResult.isMockData` is `true` in that case.

## Versioning & Changelog

Semantic versioning, tracked in `package.json` and `CHANGELOG.md`. Pre-1.0, the
minor version carries user-facing change and the patch version carries fixes.

**Every change that a user would notice gets a `CHANGELOG.md` entry** under
`## [Unreleased]`, in the same commit as the change — not retroactively at
release time. Use the Keep a Changelog headings: `Added`, `Changed`,
`Deprecated`, `Removed`, `Fixed`, `Security`. Describe the effect on the user,
not the diff. Purely internal refactors with no observable effect can be skipped.

To cut a release, move the `[Unreleased]` entries under a new version heading
with today's date, add the compare link at the bottom, then:

```bash
npm run release:patch   # or release:minor / release:major
git push --follow-tags
```

`npm version` runs the test suite first (`preversion`), then bumps
`package.json`, commits, and tags `vX.Y.Z`.

## Architecture

Single-page React app with no router — view state is managed entirely in `App` via the `VIEW_STATES` enum.

**View state flow:**
```
HOME → CAMERA → PREVIEW → SIDE_SELECTION → ANALYZING → RESULTS ⇄ TIMER
HOME → HISTORY → RESULTS (historical: no timer, "checked at" the stored time)
HOME → SETTINGS → PRIVACY | TERMS
```
Navigation away from HOME remembers `returnView`, so Back from a legal page
returns to wherever it was opened from.

**Data flow:**
1. `CameraCapture` streams video via `getUserMedia`, captures a frame to a hidden `<canvas>`, returns a base64 JPEG.
2. `SideSelection` asks the user which side of the sign they're on (`'left' | 'right' | null`). This is passed to the proxy to resolve directional arrow rules on Sydney signs.
3. `ParkingAnalysisService.analyzeImage(imageData, selectedSide)`:
   - Resizes image to max 1024px via canvas (`optimizeImage`)
   - POSTs `{ imageData, selectedSide }` to `/api/analyze` with the device id in `x-parksense-device`
   - Falls back to `getMockResponse()` on 503 (no key) or network error; a 429 with `error: 'quota'` surfaces the daily-limit message
4. `/api/analyze` (Vercel serverless proxy) splits the job in two, and the split is the whole design:
   - **The model reads.** The system prompt asks GPT-4o only to transcribe each plate on the pole into structured data (`kind`, `days`, `startTime`/`endTime`, `publicHolidayClause`, `schoolDaysOnly`, `arrow`, …). It is told not to decide whether parking is allowed and not to reason about the date.
   - **Code decides.** `api/_lib/verdict.js` takes the plates, the selected side, the instant and the NSW calendar (`api/_lib/calendar.js`: public holidays and school days, live from data.nsw.gov.au with a bundled fallback) and applies Road Rules reg 318, the school-days rule, arrow filtering and plate precedence. It also builds a 12-hour timeline and `mustLeaveByMs`. Fine amounts come from `api/_lib/fines.js`, dated and sourced.
   - Rate limiting is two-layer: per-IP per-minute in memory, plus a per-device daily quota in the database (memory fallback). The quota is checked before the model call.
5. After analysis, `LocationService.getCurrentAddress()` fetches GPS coords and reverse-geocodes via Nominatim (fire-and-forget, attached to result on success). If the user has opted in to community data, `CommunityService.recordScan` posts an anonymised, street-level event to `/api/events` once the location arrives.
6. `ResultsDisplay` renders the result: verdict card, public-holiday / school-day callout, timeline strip, leave-by time, sign details, street insights from `/api/street` (opt-in), the disclaimer, and "Report a wrong reading". If `noSignFound=true` a retake screen is shown; below 0.65 confidence (or when the engine flags `uncertain`) a "check this one yourself" screen is shown first.
7. Timer start/stop and expiry emit community events and record a pending outcome; on the next visit to Home the app asks "did you get a fine?" (`OutcomePrompt`) and posts the answer.

**Installable app and push:**
- `public/sw.js` precaches the built shell from `asset-manifest.json`, serves navigations network-first with the cached shell as fallback, never touches `/api/*`, and handles `push` and `notificationclick`. Registered by `src/serviceWorkerRegistration.js` in production only; a new version dispatches `parksense:update` and Home shows a reload prompt.
- `src/services/installService.js` captures `beforeinstallprompt`; `InstallCard` offers install (or iOS instructions) after the first scan and in Settings.
- Push: the client (`src/services/pushService.js`) reads `/api/push/config`, subscribes through the service worker, stores the subscription via `/api/push/subscribe`, and on timer start posts the end time to `/api/push/schedule`, which queues a warning and an expiry row in `reminders`. `/api/cron/send-reminders` (bearer `CRON_SECRET`, called once a minute) sends what is due with `web-push`. The in-tab `setTimeout` warning stays armed as the fallback; the notification `tag` de-duplicates.

**Timer system:**
- `useTimer` hook (lives in `App`, survives view transitions) manages a `setInterval` countdown and takes an `onExpire` callback.
- `TimerService` persists `{ startTime, durationMs }` to localStorage — `remainingMs` is always recomputed as `(startTime + durationMs) - Date.now()`, which handles page refreshes and drift.
- `NotificationService` schedules a `setTimeout` for the 15-minute warning and fires `new Notification(...)`. Backgrounded tab limitation is documented in the file.
- When the timer is running: `TimerOverlay` (sticky footer) shows on `ResultsDisplay`; navigating to `TIMER` shows the full-screen `ParkingTimer` with an SVG ring.

**Key files:**
- `api/analyze.js` — serverless proxy; transcription prompt, response shaping, quota check
- `api/_lib/verdict.js` — the verdict engine (pure; heavily tested in `src/__tests__/api-verdict.test.js`)
- `api/_lib/calendar.js` — NSW public holidays and school days, Sydney-local date helpers
- `api/_lib/fines.js` — NSW fine schedule with `FINES_AS_AT` / `FINES_REVIEW_BY`
- `api/_lib/rateLimit.js`, `api/_lib/db.js`, `api/_lib/request.js` — quota, PostgREST client, request helpers
- `api/events.js` — opt-in community events (validated, coarsened, hashed); `api/street.js` — aggregate street insights; `api/report-error.js` — client error intake, optional Sentry forward
- `supabase/migrations/0001_init.sql` — schema
- `src/app.js` — all view orchestration, state, and handler wiring
- `src/services/parkingAnalysis.js` — calls `/api/analyze`; mock fallback
- `src/services/communityService.js`, `consent.js`, `identity.js`, `outcomeService.js`, `analytics.js`, `errorReporting.js` — client side of the above
- `src/components/LegalScreen.js` — privacy and terms text; keep it true to what the code does
- `src/components/SettingsScreen.js`, `HistoryScreen.js`, `InstallCard.js`, `EarlyAccessCard.js` — the app-shell screens and cards
- `src/services/historyService.js` (recent scans, thumbnails), `shareService.js`, `earlyAccessService.js` (`/api/subscribe`), `pushService.js`, `installService.js`
- `api/push/*.js`, `api/cron/send-reminders.js`, `api/_lib/push.js` — Web Push; `api/subscribe.js` — early-access list
- `scripts/eval-signs.js` + `eval/README.md` — accuracy harness over labelled signs
- `src/hooks/useTimer.js` — countdown interval, auto-resume on mount
- `src/services/timerService.js` — localStorage persistence
- `src/services/notificationService.js` — Web Notifications API + setTimeout scheduling
- `src/services/locationService.js` — Geolocation + Nominatim reverse geocode
- `src/utils/timeParser.js` — `"2 hours"` / `"30 min"` → milliseconds
- `src/utils/constants.js` — `VIEW_STATES`, `TIMER_CONFIG`, `CAMERA_CONFIG`, `APP_CONFIG`

**Styling:** Tailwind CSS compiled at build time (react-scripts detects `tailwind.config.js`). Colours are CSS variables declared in `src/app.css` — light on `:root`, dark under `prefers-color-scheme: dark` — and exposed as Tailwind colours (`bg-background`, `text-muted-foreground`, `bg-success`, …). Green and red are reserved for the verdict; the primary button is neutral ink.

UI primitives live in `src/components/ui/` and follow the shadcn/ui pattern (`cva` variants + `cn()` from `src/lib/utils.js`): `Button`, `Card`, `Badge`, `Alert`, `Progress`. `src/components/Screen.js` is the shared page shell (`Screen`, `ScreenHeader`, `ScreenActions`) — every screen is one phone-width column with actions pinned to the bottom. Safe-area insets are applied once in `Screen`; fixed overlays add `pt-safe`/`pb-safe` themselves.

## Analysis Result Shape

```js
{
  noSignFound: boolean,           // true when no parking sign is visible — shows retake screen
  canPark: boolean,
  kind: string,                   // winning plate kind: 'time_limited' | 'no_stopping' | 'unrestricted' | …
  timeLimit: string | null,       // e.g. "2 hours" — parseable by src/utils/timeParser.js
  timeLimitMinutes: number | null,
  days: string[],                 // of the described plate (winner, or most restrictive if nothing is in force)
  hours: string | null,
  paymentRequired: boolean,
  vehicleTypes: string[],
  specialConditions: string[],    // engine notes (reg 318, school days, arrows) + model observations
  confidence: number,             // 0–1; retake hint shown < 0.65, noSignFound screen at 0; capped at 0.6 when `uncertain`
  rawText: string,
  applicableSide: 'left' | 'right' | 'both' | null,
  estimatedFine: string | null,   // e.g. "~$140"; the overstay fine when canPark, the offence fine when not
  fine: { kind, amount, display, label, confidence, asAt, stale, source } | null,
  plates: Plate[],                // normalised plates the verdict was built from
  timeline: Band[],               // { startMs, endMs, canPark, kind, timeLimitMinutes } over the next 12 h
  nextChange: { atMs, canPark, kind, timeLimitMinutes } | null,
  mustLeaveByMs: number | null,   // earlier of now+limit and the next prohibited band
  calendar: { dateKey, weekday, isPublicHoliday, holidayName, isSchoolDay, source },
  sideAmbiguous: boolean,         // arrows both ways and no side chosen
  uncertain: boolean,             // an unclassified plate was present
  location?: { lat, lon, address },
  timestamp: string,
  model: string,
  rulesVersion: string,
  isMockData?: boolean,           // present when mock fallback was used
  legacy?: true,                  // model answered with a verdict but no plates
}
```

Everything is decided from `plates` by `api/_lib/verdict.js`. When you change
a rule, change the engine and its tests, not the prompt.

## Deployment

Configured for Vercel (`vercel.json`). Uses `rewrites` with a negative lookahead so `/api/*` paths always reach the serverless function and are never caught by the SPA fallback:

```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

Set `OPENAI_API_KEY` as a server-side environment variable in Vercel project settings. Do **not** use the `REACT_APP_` prefix — that would bundle the value into the frontend JS and expose it in the browser.

## Community data

Off by default. `Consent` (localStorage) gates every event; the card asks once
after the first scan and the footer toggles it. Events carry no photo, no
address and no exact coordinate: the client sends the street and suburb from
the reverse geocode plus raw coordinates, and `api/events.js` coarsens them
to three decimals (~110 m) and stores the device as a salted hash. Keep
`LegalScreen.js` in step with any change here.

## Known Limitations

- Push reminders require `VAPID_*`, the database, and a once-a-minute call to `/api/cron/send-reminders`; on iOS they also require the app to be on the home screen. The in-tab `setTimeout` warning is the fallback and only fires while the tab is open.
- The bundled calendar fallback covers 2025–2027; the live dataset is fetched per warm instance and cached for a day. Extend the fallback table each year.
- Fine amounts are indexed every 1 July. `FINES_REVIEW_BY` in `api/_lib/fines.js` flags them stale after that date; verify against the Transport for NSW schedule and bump both dates.
