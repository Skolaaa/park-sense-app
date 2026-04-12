# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Start dev server (http://localhost:3000)
npm run build    # Production build (output: build/)
npm test         # Run tests (interactive watch mode)
npm test -- --watchAll=false  # Run tests once (CI mode)
```

## Environment Setup

Create a `.env` file in the project root to enable real AI analysis:

```
REACT_APP_OPENAI_API_KEY=sk-your-key-here
```

Without this key, the app runs in **Demo Mode** using mock data (`ParkingAnalysisService.getMockResponse()`).

## Architecture

Single-page React app with no router — view state is managed entirely in `App` via the `VIEW_STATES` enum.

**View state flow:**
```
HOME → CAMERA → PREVIEW → SIDE_SELECTION → ANALYZING → RESULTS ⇄ TIMER
```

**Data flow:**
1. `CameraCapture` streams video via `getUserMedia`, captures a frame to a hidden `<canvas>`, returns a base64 JPEG.
2. `SideSelection` asks the user which side of the sign they're on (`'left' | 'right' | null`). This is passed to the AI prompt to resolve directional arrow rules on Sydney signs.
3. `ParkingAnalysisService.analyzeImage(imageData, selectedSide)`:
   - Resizes image to max 1024px via canvas
   - POSTs to `https://api.openai.com/v1/chat/completions` (`gpt-4o`, `detail: "high"`)
   - System prompt includes: current Sydney time, directional context (when side is selected), Sydney-specific rule knowledge, NSW fine amounts
   - Returns structured JSON; key fields: `canPark`, `timeLimit`, `applicableSide`, `estimatedFine`, `confidence`, `rawText`
4. After analysis, `LocationService.getCurrentAddress()` fetches GPS coords and reverse-geocodes via Nominatim (fire-and-forget, attached to result on success).
5. `ResultsDisplay` renders the result. If `canPark=true` and `timeLimit` is parseable, a "Start Timer" button appears.

**Timer system:**
- `useTimer` hook (lives in `App`, survives view transitions) manages a `setInterval` countdown.
- `TimerService` persists `{ startTime, durationMs }` to localStorage — `remainingMs` is always recomputed as `(startTime + durationMs) - Date.now()`, which handles page refreshes and drift.
- `NotificationService` schedules a `setTimeout` for the 15-minute warning and fires `new Notification(...)`. Backgrounded tab limitation is documented in the file.
- When the timer is running: `TimerOverlay` (sticky footer) shows on `ResultsDisplay`; navigating to `TIMER` shows the full-screen `ParkingTimer` with an SVG ring.

**Key files:**
- `src/app.js` — all view orchestration, state, and handler wiring
- `src/services/parkingAnalysis.js` — OpenAI prompt + schema; mock fallback
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
  canPark: boolean,
  timeLimit: string | null,       // e.g. "2 hours"
  days: string[],
  hours: string | null,
  paymentRequired: boolean,
  vehicleTypes: string[],
  specialConditions: string[],
  confidence: number,             // 0–1; UI warns when < 0.6
  rawText: string,
  applicableSide: 'left' | 'right' | 'both' | null,
  estimatedFine: string | null,   // e.g. "~$133", shown when canPark=false
  location?: { lat, lon, address },
  timestamp: string,
  model: string,
}
```

## Deployment

Configured for Vercel (`vercel.json`). All routes fall through to `index.html` (SPA). Set `REACT_APP_OPENAI_API_KEY` as an environment variable in Vercel project settings — do not bake it into the build.

## Known Limitations

- Browser notifications via `setTimeout` do not fire reliably when the tab is backgrounded on mobile. Full background notifications would require a service worker + Push API.
- The OpenAI API key is used client-side — suitable for personal/demo use, not production at scale.
