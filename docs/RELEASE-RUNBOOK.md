# ParkSense — Release Runbook

The step-by-step path from this branch to a public launch. Each step has an
owner, a command or a place to click, and a check that proves it is done.
Dates follow [GO-TO-MARKET.md](./GO-TO-MARKET.md): rehearsal on Labour Day,
Monday 5 October 2026; launch Saturday 17 October 2026.

Nothing in phase 5 or later happens until the accuracy gate in phase 3 is
met. That is the only hard rule in this document.

---

## Phase 0 — Merge and version (day 1)

1. **Open and merge the pull request** from
   `claude/pricing-product-release-m6e9aw` into `main`. CI runs the test
   suite, the production build and the secret scan on the PR.
2. **Cut the release.** In `CHANGELOG.md`, move everything under
   `## [Unreleased]` beneath `## [0.6.0] — 2026-09-21` and add the compare
   link at the bottom. Then:
   ```bash
   npm run release:minor        # runs the tests, bumps package.json, commits, tags v0.6.0
   git push --follow-tags
   ```
   *Check:* the home screen footer and Settings show `v0.6.0`.

## Phase 1 — Infrastructure (days 1–2)

3. **Database.** Create a Supabase project (free tier). In the SQL editor run,
   in order, `supabase/migrations/0001_init.sql` and
   `supabase/migrations/0002_push_and_subscribers.sql`. Copy the project URL
   and the **service role** key (never the anon key).
   *Check:* tables `scan_quota`, `parking_events`, `push_subscriptions`,
   `reminders`, `subscribers` exist with RLS enabled.
4. **Push keys.**
   ```bash
   npx web-push generate-vapid-keys
   ```
5. **Secrets.** Generate two random strings for `DEVICE_HASH_SALT` and
   `CRON_SECRET` (`openssl rand -hex 32` each).
6. **Vercel environment variables**, Production and Preview, all server-side
   except the two `REACT_APP_` ones:

   | Variable | Required | Source |
   |:--|:--:|:--|
   | `OPENAI_API_KEY` | yes | OpenAI dashboard |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | yes | step 3 |
   | `DEVICE_HASH_SALT`, `CRON_SECRET` | yes | step 5 |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` your support address) | yes | step 4 |
   | `SCAN_DAILY_QUOTA` | no (default 40) | |
   | `SENTRY_DSN` | recommended | Sentry project |
   | `REACT_APP_POSTHOG_PUBLIC_TOKEN`, `REACT_APP_POSTHOG_HOST` | recommended | PostHog project |

   Remove any `REACT_APP_OPENAI_API_KEY` that still exists anywhere.
7. **The once-a-minute reminder trigger.** One of:
   - *Vercel Pro:* add to `vercel.json`
     `"crons": [{ "path": "/api/cron/send-reminders", "schedule": "* * * * *" }]`
     and redeploy. Vercel sends `CRON_SECRET` as the bearer token.
   - *Free:* enable `pg_cron` and `pg_net` in Supabase and run the
     `cron.schedule(...)` block at the bottom of migration 0002 with your
     domain and secret filled in.
   *Check:* `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/send-reminders`
   returns `{"due":0,"sent":0}`; without the header it returns 401.
8. **Domain and deploy.** Merging to `main` deploys. Attach the custom domain
   with HTTPS (the camera, the service worker and push all require it).

## Phase 2 — Verify in production (day 2)

9. **Endpoint smoke test.**
   ```bash
   curl https://<domain>/api/push/config          # {"enabled":true,"publicKey":"..."}
   curl "https://<domain>/api/street?lat=-33.88&lon=151.21"   # status insufficient_data, not not_configured
   ```
   Scan one real sign from a phone and read the JSON in the network tab:
   `plates` is non-empty, `calendar.source` is `data.nsw.gov.au`. If it
   says `fallback`, the dataset resource id in `api/_lib/calendar.js` needs
   correcting; the app still works from the bundled table meanwhile.
10. **Install and push, on two real phones.** Android Chrome and iPhone
    Safari. Add to home screen, open, allow notifications, start a timer on
    a 1P sign, lock the phone. *Check:* the warning arrives with the phone
    locked at 45 minutes and the expiry at 60; Settings shows reminders
    "On"; the Supabase `reminders` rows get `sent_at`.
11. **Observability.** Trigger one deliberate client error (Settings → Clear,
    then reload with the network off) and confirm it reaches Sentry and the
    Vercel function log. Confirm `scan_completed` appears in PostHog.
12. **Quota.** Scan past `SCAN_DAILY_QUOTA` from one phone and confirm the
    "daily scan limit" message; confirm the count is in `scan_quota`.

## Phase 3 — The accuracy gate (days 3–9)

13. **Photograph 200 signs** on Saturday 26 September: CBD, Surry Hills,
    Newtown, Marrickville, Bondi, two school zones. Record the correct
    reading on the spot. Label each as `eval/cases/<name>.json` per
    `eval/README.md`; photos stay out of git.
14. **Run the harness against production.**
    ```bash
    node scripts/eval-signs.js --base https://<domain>
    ```
    Record transcription, plate-count and verdict accuracy in the Monday
    sheet from [METRICS.md](./METRICS.md).
15. **Fix the largest failure class**, in `api/analyze.js` (the prompt) or
    `api/_lib/verdict.js` (the rules), with a test for it, and rerun.
    *Gate:* single-sign verdict accuracy **≥ 85%** to proceed to phase 5;
    **≥ 90%** before any paywall (PRICING.md §6).
16. **Verify the fine schedule.** Open the Transport for NSW parking offence
    schedule and confirm the clearway and bus-zone lines in
    `api/_lib/fines.js`, then set their `confidence` to `high` and bump
    `FINES_AS_AT`.

## Phase 4 — Landing page, legal, email (days 8–12)

17. **Landing page** from [LANDING-PAGE.md](./LANDING-PAGE.md) with the
    measured number in the hero, as a static `public/about.html` (Vercel
    serves static files before the SPA rewrite). Its email form posts to
    `/api/subscribe` with `source: "landing"`.
18. **Legal read.** Have an Australian lawyer read
    `src/components/LegalScreen.js` (Privacy and Terms) with the ACL s60/s64
    position in [LAUNCH-READINESS.md](./LAUNCH-READINESS.md) B4 in hand.
19. **Email.** Pick a sender (Resend, Buttondown or similar). Export
    `subscribers` from Supabase weekly and load the six-email sequence from
    GO-TO-MARKET.md §6. Set the `VAPID_SUBJECT` address up as the support
    inbox.
20. **Store the QA baseline.** Keep the Chromium screenshot set from this
    branch as the visual reference for the next release.

## Phase 5 — Rehearsal (28 September – 5 October)

21. **Friday 2 October, 7am:** the reg 318 post to r/sydney and the Reel.
22. **Monday 5 October, 8am, Labour Day:** scan a real Mon–Fri sign in
    production. *Check:* the "Public holiday — Labour Day" callout shows and
    cites reg 318. Screenshot it; this is the launch asset.
23. **First Monday review** using the METRICS.md template. From here it is
    weekly.

## Phase 6 — Launch (17 October)

24. Run the launch-day table in GO-TO-MARKET.md §5. Keep three tabs open all
    day: Sentry, PostHog (`scan_failed` and cost per active user), and the
    Reddit thread.
25. A prompt regression on launch day is fixed the same afternoon: change,
    `npm run test:ci`, push to `main`. Vercel's previous deployment is one
    click to roll back to; database migrations are additive, so a rollback
    never needs a schema change.

## Phase 7 — After launch

26. **Day 30, 60, 90 reviews** against the targets in METRICS.md.
27. **Day 90 decision, three parts.** If the four gates in PRICING.md §6 are
    met: build the paywall (payments are not built; Stripe for the web,
    then store billing once wrapped), open Plus at A$19.99 with every
    early-access email grandfathered, and wrap with Capacitor for the App
    Store and Play Store. If not met, the answer is more product, not a
    lower price.

## Rollback and safety

- **App:** Vercel → Deployments → Promote the previous one. Instant.
- **Database:** every migration only adds; never edit one that has run.
  Rotate `SUPABASE_SERVICE_ROLE_KEY` if it is ever exposed.
- **Push:** deleting a row from `push_subscriptions` silences a device;
  clearing `reminders` cancels everything pending.
- **Cost:** `SCAN_DAILY_QUOTA` can be lowered without a deploy. The per-IP
  limit is in `api/analyze.js` if the quota is not enough.
