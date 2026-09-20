# ParkSense — Smart Parking Sign Analysis

AI-powered parking sign interpreter for Sydney. Photograph a parking sign and
get a straight answer: can you park here right now, for how long, what it
costs if you get it wrong — and a timer so you never overstay.

## What makes it different

Every photo-to-verdict parking app answers from the pixels. ParkSense answers
from the pixels **and the calendar**:

- **Public holidays.** NSW Road Rules 2014 reg 318 says a sign that lists
  particular days does not apply on a public holiday unless it says so. On a
  public holiday ParkSense tells you a "Mon–Fri" sign is off, and cites the rule.
- **School days.** "School Days" restrictions only operate on notified school
  days. ParkSense knows the NSW term dates.
- **Which side of the sign you are on.** Arrows on Sydney signs point at the
  stretch of kerb each rule covers. ParkSense applies only the plates that
  point at you.
- **Stacked plates.** The model transcribes each plate; the verdict engine
  applies precedence in code (No Stopping beats a clearway beats a time limit).
- **The next twelve hours**, as one strip: park now, leave by 4pm.
- **Community data (opt-in).** Anonymous, street-level, and pooled: what
  parking is like on this street, and when people actually park here.

## Getting started

```bash
git clone <repo-url>
cd park-sense-app
npm install
```

### Environment

All secrets live **server-side** in the Vercel serverless functions. Nothing
with a `REACT_APP_` prefix is a secret; the build fails if it looks like one.

Create `.env.local` (gitignored):

```
# Required for real analysis. Without it the app runs in demo mode.
OPENAI_API_KEY=sk-...

# Optional — persistence for the daily scan quota and community data.
# Without these, quotas fall back to per-instance memory and community
# events are acknowledged but not stored.
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
DEVICE_HASH_SALT=<any long random string>

# Optional — tuning and monitoring.
SCAN_DAILY_QUOTA=40
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>

# Optional, client-side and publishable — product analytics via PostHog.
REACT_APP_POSTHOG_PUBLIC_TOKEN=phc_...
REACT_APP_POSTHOG_HOST=https://us.i.posthog.com
```

### Database (optional)

Create a Supabase project and run `supabase/migrations/0001_init.sql` in the
SQL editor. It creates the quota table, the community events table, and the
atomic quota function. Row-level security is on with no policies, so the
anon key can read nothing; only the service-role key used by the functions
can touch the tables.

### Running

```bash
vercel dev   # recommended — serves /api/* so real analysis works
npm start    # frontend only; every analysis falls back to demo data
```

```bash
npm test                         # tests, watch mode
npm run test:ci                  # tests, once
CI=true npm run build            # production build; ESLint warnings fail it
node scripts/make-icons.js       # regenerate the PNG icons from the mark
node scripts/eval-signs.js --base http://localhost:3000   # accuracy harness
```

## How it works

1. **Take a photo** of the sign. It is resized on the phone to 1024px.
2. **Pick your side** of the sign, left or right.
3. **The model transcribes** each plate into structured data. It is told not
   to decide anything.
4. **The verdict engine decides** what applies right now using the NSW
   calendar, the arrow rules and plate precedence, and builds a 12-hour timeline.
5. **Start a timer** if there is a limit. The 15-minute warning fires as a
   browser notification, with an in-app fallback.
6. **Afterwards** the app asks one question: did you get a fine? That answer,
   from consenting users, is the only ground truth the product collects about
   its own accuracy.

## Privacy

The photo goes to OpenAI via our proxy and is not stored. Location is used
on-device unless you opt in to community data, which stores events at
~110 m precision under a salted device hash. The full statement is in the app
under Privacy, and in `src/components/LegalScreen.js`.

## Deployment

Configured for [Vercel](https://vercel.com). Set the server-side environment
variables above in the project settings. `vercel.json` rewrites every
non-`/api/` path to the SPA.

## Tech stack

- React 18, Tailwind CSS compiled at build time, shadcn/ui-style primitives
- Vercel serverless functions (`api/`), no framework
- OpenAI GPT-4o vision, structured JSON output
- Supabase Postgres via PostgREST (plain fetch, no SDK)
- NSW Government open data for public holidays and school terms
- Web Notifications, Geolocation + OpenStreetMap Nominatim

## Documentation

- `docs/LAUNCH-READINESS.md` — the review of what stood between the app and
  a paid launch, and what has been fixed since
- `docs/PRICING.md` — pricing strategy
- `docs/GO-TO-MARKET.md` — release plan
- `docs/COMPETITIVE-EDGE.md` — why the calendar is the moat
- `eval/README.md` — how to measure accuracy

## Known limitations

- Browser notifications scheduled with `setTimeout` do not fire reliably when
  the tab is backgrounded on mobile. Push notifications need a service worker
  and a push service; that is the planned paid feature.
- Fine amounts are indexed by NSW every 1 July. `api/_lib/fines.js` carries
  the date it was last checked and flags itself stale after the review date.
- Sydney only. The timezone, calendar and fine schedule are NSW-specific.
