# ParkSense — Metrics Dashboard

Produced with `/founder:metrics-dashboard` from
[emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder).
The five metrics and targets are those set in
[GO-TO-MARKET.md](./GO-TO-MARKET.md) §5; they feed the paywall gate in
[PRICING.md](./PRICING.md) §6. Event names are from
`src/services/analytics.js`.

---

## 1. Stage assessment

| Stage | Primary focus | Key metrics |
|:--|:--|:--|
| Pre-launch | Validation | Waitlist signups, interview conversion |
| **Post-launch (0–100 users)** | **Engagement** | **Activation, D1/D7 retention, core action completion** |
| Growth (100–1,000 users) | Retention + revenue | MRR, churn, CAC, feature adoption |
| Scale (1,000+) | Efficiency | LTV/CAC, net revenue retention, payback |

ParkSense is **post-launch, 0–100 users, heading into growth**, with no
revenue metric for 90 days because there is no paywall for 90 days. Its
place is taken by the metric that decides whether a paywall is *allowed*:
measured accuracy. The core action is "scan, then start a timer"; a scan
proves curiosity, a timer proves the verdict was trusted.

## 2. The five metrics that matter

Targets are day 30 / 60 / 90 from launch.

### 2.1 Measured accuracy
- **Definition:** % of labelled Sydney signs in `eval/cases/` where the
  verdict matches ground truth at every instant in the case's `expect.at`,
  from `node scripts/eval-signs.js`. Single-sign and multi-plate reported
  separately.
- **Current value:** unmeasured. The harness exists; zero of the 200 signs
  are photographed. Until it runs the number is "unknown", never the
  model's `confidence`.
- **Targets:** 85% → 90% → 93%.
- **Why:** it is the paywall gate (≥ 90% single-sign) and the only claim the
  landing page may make.
- **Below target:** stop all posting. Sort failures by plate `kind`, fix the
  transcription prompt or `verdict.js` for the largest bucket, re-run. Do
  not ship a prompt change that lowers this number.

### 2.2 Scan → timer rate
- **Definition:** `timer_started` ÷ `scan_completed` where `can_park = true`,
  `mock = false` and `no_sign = false`, same device, same day.
- **Current value:** 0 until `REACT_APP_POSTHOG_PUBLIC_TOKEN` is set in
  Vercel. Compute as a PostHog funnel on those two events.
- **Targets:** 25% → 32% → 40%.
- **Why:** it says whether the verdict is believed. It also feeds the
  outcome prompt: no timer, no "did you get a fine?" answer.
- **Below target:** split by `confidence` band and `side_ambiguous`. If
  low-confidence scans dominate, the check-yourself screen is doing its job
  and the fix is photo guidance; if high-confidence scans also skip the
  timer, the button is not being found. There is no session recording, so
  watch five people scan in person before touching anything.

### 2.3 Week-4 return rate
- **Definition:** % of devices with a `scan_completed` in their first week
  that have another `scan_completed` in days 22–28.
- **Current value:** unobservable before day 28. PostHog retention table on
  `scan_completed`.
- **Targets:** 15% → 22% → 28%.
- **Why:** habit versus Reddit-day novelty. Priya in
  [PERSONAS.md](./PERSONAS.md) is this metric.
- **Below target:** stop adding channels. Email five returners from the
  early-access list (captured in-app and on the landing page) and find what
  their streets have in common; if it is school zones or stacked plates,
  lead with that.

### 2.4 Repeat scanners
- **Definition:** distinct devices with 3+ `scan_completed` (`mock = false`)
  all time. Cross-check against the Supabase `scan_quota` table, which
  counts server-side and cannot be faked by a blocked tracker.
- **Current value:** 0.
- **Targets:** 150 → 400 → 800. The paywall gate needs ≥ 300.
- **Why:** it is the size of the grandfathered base, and of the
  accuracy-report corps.
- **Below target:** if 2.3 is on target, reach is the problem — run the
  "worst sign of the week" contest harder. If 2.3 is also below, fix the
  second visit first.

### 2.5 Cost per active user
- **Definition:** monthly OpenAI spend ÷ distinct devices with a
  `scan_completed` (`mock = false`) that month. Expected ~A$0.011 per scan.
- **Current value:** ~A$0.07 per user at six scans a month, per PRICING.md.
- **Targets:** < $0.12 → < $0.10 → < $0.08.
- **Why:** the free tier is the largest line in the budget; this is the only
  metric that catches a scripted endpoint before the invoice does.
- **Above target:** look at `scan_quota` for devices at the 40-a-day cap
  before looking at the prompt. Then compare `scan_started` to
  `scan_completed` — a gap is paid calls that errored; `scan_failed` names why.

## 3. Metrics to ignore

| Metric | Why it feels important | Why it misleads | Track instead |
|:--|:--|:--|:--|
| Total scans | Looks like usage | One bot at the 40-a-day cap outscans 20 real users | Repeat scanners (2.4) |
| Page views, launch-day traffic | Reddit and radio spike it | Never repeats; silent on the second visit | Week-4 return (2.3) |
| Reddit upvotes, TikTok views | Feels like validation | Views of an absurd sign are entertainment, not intent | Scans per post, then 2.3 |
| Model `confidence` | Looks like accuracy | It is the model's self-report; it can be 0.9 and wrong | Measured accuracy (2.1) |
| "No fine" share of `outcome_reported` | Reads as real-world accuracy | People who overstayed uncaught also answer "no fine" | `ticket` answers as leads for the labelled set, not a rate |

## 4. Tracking setup

| Need | Tool | Cost | Setup time |
|:--|:--|:--|:--|
| Product analytics | PostHog free tier (1M events/month) | $0 | 30 min — set `REACT_APP_POSTHOG_PUBLIC_TOKEN` and `REACT_APP_POSTHOG_HOST`; events already wired |
| Accuracy ground truth | `scripts/eval-signs.js` over `eval/cases/`, plus the $150 photography day from GO-TO-MARKET.md §6 | $150 once | One Saturday |
| Revenue tracking | None for 90 days. A column in the spreadsheet when Plus opens | $0 | 0 |
| User feedback | In-app `OutcomePrompt` ("No fine / Got a fine / Not sure") and `WrongReadingForm`, stored via `/api/events` in Supabase | $0 (Supabase free tier) | Already built |
| Server-side truth | Supabase `scan_quota` and events tables | $0 | Run `supabase/migrations/0001_init.sql` |
| Cost | OpenAI usage dashboard, monthly | $0 | 0 |
| Dashboarding | One Google Sheet, one row per Monday, the template below | $0 | 20 min |

**Events to track.** The twelve below are live in `src/services/analytics.js`
and carry no photo, address or coordinate.

| Event | Fires when | Tells you |
|:--|:--|:--|
| `scan_started` | Side chosen, request sent (`side`) | Demand; gap to `scan_completed` is failures |
| `scan_completed` | Result rendered (`can_park`, `kind`, `confidence`, `no_sign`, `mock`, `public_holiday`, `side_ambiguous`) | 2.2–2.5, plus the share of retakes, demo-mode scans, holiday cases and unresolved arrows |
| `scan_failed` | Proxy or network error (`message`) | Regressions; a jump here is a prompt or quota problem |
| `timer_started` | Timer begins (`duration_min`, `notifications`) | Trust in the verdict; share with notifications denied |
| `timer_stopped` | User stops the timer (`elapsed_min`) | How close to the limit people cut it |
| `outcome_reported` | Answer to "Did that park go alright?" (`outcome`) | Leads for the labelled set; response rate to the prompt |
| `feedback_sent` | Wrong-reading report sent (`can_park`, `kind`) | Which plate kinds are misread most |
| `consent_changed` | Community toggle (`value`) | Opt-in rate, which caps the street-insights data |
| `result_shared` | Share button (`outcome: shared | copied | unavailable`) | The viral loop's first number |
| `email_captured` | Early-access email saved (`source: home | settings | landing`) | The one conversion before the paywall exists |
| `app_installed` | Browser `appinstalled` event | Install rate; installed users get push reminders |
| `reminder_scheduled` | Timer started (`channel: push | notification | in_app`) | How many reminders can actually reach a closed tab |

## 5. Weekly review template

```
Week of: ___
Active devices (scan_completed, mock=false): ___ (vs last week: ___)
Measured accuracy, single-sign: ___% on ___ cases (vs target: ___%)
Scan → timer rate: ___% (vs target: ___%)
Week-4 return rate: ___% (vs target: ___%)
Repeat scanners, all time: ___ (vs target: ___)
Cost per active user: A$___ (vs target: <A$___)

Wrong-reading reports this week: ___   Outcomes: no fine ___ / fine ___ / unsure ___
Scan failures (scan_failed ÷ scan_started): ___%

What worked: ___
What didn't: ___
One thing to try this week: ___
```

Four saved PostHog insights, the last harness run and one OpenAI number:
under 15 minutes.

## 6. Investor-ready metrics

There is no plan to raise: PRICING.md §4 puts break-even at 33 Plus
purchases and calls Sydney alone "far too low to be a venture case". If a
second city changes that, the questions will be:

| Metric | What "good" looks like | Honest framing if not there yet |
|:--|:--|:--|
| Week-4 retention | ≥ 25% for a utility used a few times a month | Report it with scans per returner; small and frequent beats wide and thin |
| Measured accuracy with method | ≥ 90% published, with the failure classes | Rivals claim 74–99% with no method; a measured 87% with listed failures is the stronger number |
| Cost per active user | < A$0.10/month against A$1.35 blended ARPU | Show the quota that makes it a ceiling, not an estimate |
| Free → Plus conversion | 8% on the one-off, post-paywall | Before the paywall: grandfathered base size and landing-page email-capture rate |
