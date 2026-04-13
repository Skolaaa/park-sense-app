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

Then run `vercel dev` (not `npm start`) to get the `/api/analyze` proxy working locally. `npm start` works but has no proxy, so all analyses fall back to mock data.

On Vercel, add `OPENAI_API_KEY` as a **server-side** environment variable (no `REACT_APP_` prefix — that prefix causes react-scripts to bundle the value into the frontend build). Remove any `REACT_APP_OPENAI_API_KEY` entries from all Vercel environments.

Demo mode is active whenever the proxy returns `503` (key not configured) or a network error — `analysisResult.isMockData` is `true` in that case.

## Architecture

Single-page React app with no router — view state is managed entirely in `App` via the `VIEW_STATES` enum.

**View state flow:**
```
HOME → CAMERA → PREVIEW → SIDE_SELECTION → ANALYZING → RESULTS ⇄ TIMER
```

**Data flow:**
1. `CameraCapture` streams video via `getUserMedia`, captures a frame to a hidden `<canvas>`, returns a base64 JPEG.
2. `SideSelection` asks the user which side of the sign they're on (`'left' | 'right' | null`). This is passed to the proxy to resolve directional arrow rules on Sydney signs.
3. `ParkingAnalysisService.analyzeImage(imageData, selectedSide)`:
   - Resizes image to max 1024px via canvas (`optimizeImage`)
   - POSTs `{ imageData, selectedSide }` to `/api/analyze` (Vercel serverless proxy)
   - The proxy holds `OPENAI_API_KEY`, constructs the full system prompt (Sydney rules, directional context, NSW fines), calls GPT-4o, validates and returns the JSON result
   - Falls back to `getMockResponse()` on 503 (no key) or network error
4. After analysis, `LocationService.getCurrentAddress()` fetches GPS coords and reverse-geocodes via Nominatim (fire-and-forget, attached to result on success).
5. `ResultsDisplay` renders the result. If `noSignFound=true` a dedicated retake screen is shown. If `canPark=true` and `timeLimit` is parseable, a "Start Timer" button appears.

**Timer system:**
- `useTimer` hook (lives in `App`, survives view transitions) manages a `setInterval` countdown.
- `TimerService` persists `{ startTime, durationMs }` to localStorage — `remainingMs` is always recomputed as `(startTime + durationMs) - Date.now()`, which handles page refreshes and drift.
- `NotificationService` schedules a `setTimeout` for the 15-minute warning and fires `new Notification(...)`. Backgrounded tab limitation is documented in the file.
- When the timer is running: `TimerOverlay` (sticky footer) shows on `ResultsDisplay`; navigating to `TIMER` shows the full-screen `ParkingTimer` with an SVG ring.

**Key files:**
- `api/analyze.js` — serverless proxy; holds `OPENAI_API_KEY` server-side, full system prompt, schema validation
- `src/app.js` — all view orchestration, state, and handler wiring
- `src/services/parkingAnalysis.js` — calls `/api/analyze`; mock fallback
- `src/hooks/useTimer.js` — countdown interval, auto-resume on mount
- `src/services/timerService.js` — localStorage persistence
- `src/services/notificationService.js` — Web Notifications API + setTimeout scheduling
- `src/services/locationService.js` — Geolocation + Nominatim reverse geocode
- `src/utils/timeParser.js` — `"2 hours"` / `"30 min"` → milliseconds
- `src/utils/constants.js` — `VIEW_STATES`, `TIMER_CONFIG`, `CAMERA_CONFIG`, `APP_CONFIG`

**Styling:** Tailwind CSS via CDN (`public/index.html`). No CSS modules. Custom animation `.animate-pulse-slow` defined in `src/app.css`.

## Analysis Result Shape

```js
{
  noSignFound: boolean,           // true when no parking sign is visible — shows retake screen
  canPark: boolean,
  timeLimit: string | null,       // e.g. "2 hours"
  days: string[],
  hours: string | null,
  paymentRequired: boolean,
  vehicleTypes: string[],
  specialConditions: string[],
  confidence: number,             // 0–1; retake hint shown < 0.65, noSignFound screen at 0
  rawText: string,
  applicableSide: 'left' | 'right' | 'both' | null,
  estimatedFine: string | null,   // e.g. "~$133", shown when canPark=false
  location?: { lat, lon, address },
  timestamp: string,
  model: string,
  isMockData?: boolean,           // present when mock fallback was used
}
```

## Deployment

Configured for Vercel (`vercel.json`). Uses `rewrites` with a negative lookahead so `/api/*` paths always reach the serverless function and are never caught by the SPA fallback:

```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

Set `OPENAI_API_KEY` as a server-side environment variable in Vercel project settings. Do **not** use the `REACT_APP_` prefix — that would bundle the value into the frontend JS and expose it in the browser.

## Known Limitations

- Browser notifications via `setTimeout` do not fire reliably when the tab is backgrounded on mobile. Full background notifications would require a service worker + Push API.
