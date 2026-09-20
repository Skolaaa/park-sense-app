# ParkSense — Go-To-Market Plan

Produced with `/founder:go-to-market` from
[emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder),
second edition. Written against the app as it now ships: verdicts decided in
code from the NSW calendar, a 12-hour timeline, push reminders that reach a
closed tab, an installable web app, history, an in-app early-access list,
sharing, and an opt-in community layer. Companion documents:
[PRICING.md](./PRICING.md), [COMPETITIVE-EDGE.md](./COMPETITIVE-EDGE.md),
[PERSONAS.md](./PERSONAS.md), [METRICS.md](./METRICS.md),
[LANDING-PAGE.md](./LANDING-PAGE.md). Dates assume today is 20 September 2026.

---

## 0. The bet, stated plainly

The field of AI sign readers is real but shallow: global wrappers around a
vision model, competing on nothing. The bet here is that **a product that is
right on the days they are wrong, put in front of Sydney drivers at the
moment they need it, beats them on marketing and placement rather than on
features.** This plan is built around that bet. The product side of it is
done; what follows is the placement.

Three things make the bet credible rather than hopeful:

1. **A claim no one else can make.** "The only parking app in Sydney that
   knows what day it is" is true, verifiable, and cites a regulation. It is
   also the kind of line a radio host repeats.
2. **A calendar of free launch moments.** Every NSW public holiday is a day
   when every "Mon–Fri" sign in the state is void and every competitor says
   otherwise. There are two before Christmas and three in the fortnight
   after. Each is a post that writes itself.
3. **A loop that grows the corpus.** Share, the worst-sign contest, and the
   "did you get a fine?" question all feed the accuracy dataset that no
   rival has. Marketing here is not separate from product quality; it is how
   the product gets better.

## 1. Launch readiness

| Requirement | State |
|:--|:--|
| Core loop, verdict engine, timeline, calendar rules | Shipped |
| Installable web app, offline shell, push reminders | Shipped (needs VAPID keys, database, a once-a-minute trigger; see README) |
| Analytics, error intake, quota, privacy, terms, disclaimer | Shipped (needs the environment variables set) |
| Email capture for the grandfather offer | Shipped, in-app and via `/api/subscribe` |
| **Measured accuracy** | **Not done.** The harness exists; the 200 labelled signs do not. |
| Fine schedule verified against the primary source | Two lines still unverified (clearway, bus zone) |
| Landing page live | Copy written; page not built |

**The one blocker is the accuracy number.** Nothing in section 4 goes out
until `scripts/eval-signs.js` has run over at least 200 signs and the number
is known, because the number *is* the launch message. The plan below
schedules that first.

**Biggest risk:** one credible story of a driver fined because ParkSense said
yes. Mitigations shipped: the disclaimer on every verdict, abstention below
65% confidence, "report a wrong reading", and the outcome question. The
remaining mitigation is procedural: no paid reach until the accuracy gate in
PRICING.md §6 is passed.

## 2. Distribution: web app first, and why

The user asked whether a web app is the better form. For this product, at
this stage, yes, and the app now ships that way.

| | Installable web app (now) | Native via App Store / Play |
|:--|:--|:--|
| Time from footpath to first result | One tap on a link; no install | Store page, install, open |
| Ship a prompt or rule fix | Minutes | Days (review) |
| Revenue cut | 0% | 15% (30% above US$1M) |
| Camera, GPS, notifications | All supported; push on Android in the browser, on iOS once added to the home screen | Same |
| Discoverability | Search, links, QR codes, sharing | Store search for "parking sign" |
| Trust signal | Weaker for some users | Stronger |
| Cost to maintain | One codebase | One codebase plus two store listings and signing |

**Decision.** Ship and market the web app for the first 90 days. The
friction that matters at launch is *first result*, and a link beats a store
page every time. The one iOS caveat is real: push reminders need the app
added to the home screen, so the app explains that at the exact moment it
matters (Settings, and the install card after the first scan). Wrap with
Capacitor and list in both stores **after** the four gates in PRICING.md §6
pass. At that point the store listing is a channel, not a runtime, and the
paid tier exists to justify the cut.

## 3. Who it is for, in one line each

From [PERSONAS.md](./PERSONAS.md): **Priya**, the inner-west renter who moves
the car on school days and public holidays whether or not it matters, is the
launch target because she is already on r/sydney and Reels and she scans
three times a week. **Dave**, the sole-trader plumber with $1,500 a year in
fines, is the Fleet buyer and is reached by outbound, not posts. **Megan**,
the occasional CBD driver, arrives through search on her own once the
articles rank.

## 4. Pre-launch: 21 September to 16 October

Launch is **Saturday 17 October, 8am AEST.** Four weeks out; the two
holidays before it are the rehearsal.

### Week 1 (21–27 Sep): the number

- Set every environment variable, run both migrations, generate VAPID keys,
  configure the once-a-minute trigger. Confirm a push reminder arrives on an
  installed iPhone and an Android with the app closed.
- **Saturday 26 Sep: photograph 200 signs.** CBD, Surry Hills, Newtown,
  Marrickville, Bondi, and two school zones. Record the correct reading for
  each on the spot. This is the $150 line in the budget if someone else
  walks it. Label in `eval/cases/`, run the harness, fix the largest failure
  class, run it again. **Publish nothing until this is done.**
- Build the landing page from [LANDING-PAGE.md](./LANDING-PAGE.md) with the
  measured number in the hero. Same domain as the app, path `/about`, with
  the app at the root so a shared link always lands on "scan a sign".

### Week 2 (28 Sep–4 Oct): the first free launch moment

- **Friday 2 Oct, 7am:** post "On Monday every Mon–Fri parking sign in NSW
  is switched off. Here's the rule, and here's how to tell which signs
  aren't." to r/sydney, with the reg 318 text and three photos. No link to
  the app in the post; the app is in the profile and in comment replies to
  anyone who asks. Same content as a 20-second Reel and a TikTok, posted
  Friday 5pm.
- **Monday 5 Oct, Labour Day:** the app's public-holiday callout is live.
  Screenshot it on a real Surry Hills sign at 8am and post the screenshot:
  "Scanned this at 8am. It knows." Ask for other people's holiday signs.
- Seed the worst-sign contest: post the five most absurd poles from the
  photography day and ask for worse. Every reply is a labelled example.

### Week 3 (5–11 Oct): assets and outreach

- Pitch local media, embargoed to launch morning: Time Out Sydney, the Daily
  Telegraph city desk, news.com.au, ABC Radio Sydney Drive, 2GB. Subject
  line: *"Sydney's parking signs are so confusing someone built an AI that
  cites the road rules back at them."* Attach the accuracy number and the
  Labour Day screenshots.
- Outreach to the pages that already rank for "do parking signs apply on
  public holidays": NRMA's advice article, Drive, CarsGuide, the OzBargain
  thread. One email each: the tool exists, it is free, it cites the rule,
  here is the link. A link from a page that already ranks is worth more than
  a month of posting.
- Film the 15-second vertical demo: walk up, photograph, verdict, timer. No
  narration. Cut three variants.
- Write the five SEO articles in section 6 and publish them the same week
  so they start ageing before launch.

### Week 4 (12–16 Oct): placement

Product placement, in the literal sense: putting the product where the
problem happens.

- **Cafés and bars on the worst streets.** Crown Street, King Street, Enmore
  Road, Oxford Street, Glebe Point Road. A6 card at the counter: a photo of
  the sign outside, "Can you park out the front? Scan it.", a QR code to the
  app. Twenty venues, cards printed for under $60. The venue benefits: fewer
  customers leaving early to move the car.
- **Where visitors park in unfamiliar streets.** Ask RPA, St Vincent's and
  Prince of Wales hospitals, and the Enmore Theatre, to add one line and a
  link to their "getting here" pages. Same for USyd and UNSW student unions.
- **Car share.** GoGet and Uber Carshare drivers park on unfamiliar streets
  by definition and the operator wears the fine. Pitch a dashboard card in
  50 inner-Sydney vehicles as a pilot. This is also the first Fleet lead.
- **Driving schools.** Learner drivers are taught to read signs and mostly
  cannot. Offer the app to three inner-west schools as a lesson aid.
- Submit the app to r/sydney's wiki and the pinned resources of the three
  largest inner-west Facebook groups. Ask; do not spam.
- Confirm the launch-day posts are drafted, the media embargo is agreed, the
  email sequence in section 7 is loaded, and the error dashboard is open.

**Waitlist: no.** The URL is the product. Capture the email *after* the
first scan, which the app now does, with the grandfather offer.

## 5. Launch day: Saturday 17 October

| Time (AEST) | Action |
|:--|:--|
| 06:00 | Media embargo lifts. Reply to any journalist within the hour. |
| 08:00 | r/sydney: *"I got sick of misreading parking signs in the CBD so I built something that reads them and cites the road rules. Here's how accurate it actually is."* Lead with the number **and the failure rate**. Answer every comment for six hours; the comments are the launch. |
| 08:30 | Email 5 in the sequence goes to the early-access list: "It's live. Send it to one person who got fined this year." |
| 10:00 | Suburb Facebook groups, Inner West and Eastern Suburbs: the same post, shorter, with the Labour Day screenshot. |
| 12:00 | LinkedIn: one post aimed at fleet managers and tradies, framed around the $1,500-a-year number, tagging no one. |
| 17:00 | TikTok and Reels: three variants of the demo, one per hour. |
| All day | Watch `scan_failed`, cost per active user, and the error intake. A prompt regression on launch day is fixed the same afternoon. |

**Not on launch day.** Product Hunt (wrong audience, and a poor result is
public forever). Hacker News (post the *study* as a Show HN four to six
weeks later, titled around the measurement). Paid ads of any kind.

## 6. The first 90 days: 17 October to 15 January

### Channel priority

| # | Channel | CAC | Time to result | First action |
|:--|:--|:--|:--|:--|
| 1 | Short-form video | ~$0 | Days | Post one absurd sign a day for 30 days. The format is the sign for three seconds, then the answer. |
| 2 | Placement (cards, venue pages, car share) | ~$3/venue | 2–4 weeks | Twenty venues by launch; forty by day 30. Track by a `?src=` parameter per placement. |
| 3 | Earned media | $0 | Spiky | One pitch a week to a new outlet until three have run it. |
| 4 | Reddit and Facebook groups | $0 | Days | Answer parking questions daily; link only when asked. |
| 5 | Links from pages that already rank | $0 | 2–6 weeks | One outreach email a day to any page ranking for a target query. |
| 6 | Search | $0 | 3–6 months | Five articles live by launch, one a fortnight after. |
| 7 | Fleet outbound | ~$40/vehicle | 4–8 weeks | Twenty inner-Sydney trades and courier businesses listed by day 14; ten emailed by day 21. |
| 8 | Paid (Reddit geo-targeted to Sydney, Meta inner-west 25–45) | ~$1–3/install | Days | **Only after the accuracy gate passes.** $5/day each, kill anything above $3. |

### The free launch moments on the calendar

Each is a post, a Reel, and an email, prepared a week ahead.

| Date | Moment | Angle |
|:--|:--|:--|
| Mon 5 Oct | Labour Day | "Every Mon–Fri sign is off today. Here's the rule." (pre-launch rehearsal) |
| Fri 18 Dec | Last school day of 2026 | "From Monday, every School Days sign is off until 2 February." |
| Fri 25 Dec, Sat 26 Dec, Mon 28 Dec | Christmas, Boxing Day, additional day | Three holiday verdicts in four days; the Boxing Day sales are the busiest parking day of the year |
| Fri 1 Jan | New Year's Day | Same |
| Tue 26 Jan | Australia Day | Same, plus "school goes back Tuesday 2 Feb" |

### Content that targets real search intent

1. **"What do 1P, 2P and 4P mean on a NSW parking sign?"**
2. **"No Stopping vs No Parking in NSW — and why one costs more than twice the other"**
3. **"Do parking signs apply on public holidays in NSW? Yes, no, and the regulation that decides"** — the article the launch claim rests on
4. **"Which way is the arrow pointing? Directional parking signs in Sydney, explained"**
5. **"NSW parking fines 2026: every amount in one table"**
6. **"How to appeal a NSW parking fine (and the 7-day rule most drivers don't know)"**

Each is repurposed as a 20-second video and as the answer whenever the
question comes up on Reddit.

### Community, partnerships, and the growth loop

- **Engage in** r/sydney, r/AusLegal, and the inner-west and eastern-suburbs
  Facebook groups. Daily, ten minutes, answers first.
- **Partnership 1, car share.** The dashboard-card pilot from week 4 becomes
  a Fleet conversation at day 60 with the pilot's own scan data.
- **Partnership 2, payment handoff.** When a sign says payment is required,
  offer a tap-through to Park'nPay (no fee to the driver, government-run).
  Complementary: they take payment, ParkSense reads the sign.
- **The loop.** Every result has a Share button. Every share carries the
  street and the verdict. The **"Sydney's worst parking sign" weekly
  contest** takes submissions from those shares, publishes ParkSense's
  reading beside the correct one, and every entry becomes a labelled case.
  Run it from week one; it is the only tactic that grows reach and accuracy
  at the same time.

### Email sequence

The early-access list is captured in-app after the first scan and on the
landing page. Five emails, under 150 words each, one link each.

| # | When | Subject | Body in one line | CTA |
|:--|:--|:--|:--|:--|
| 1 | Immediately | You're locked in | Confirms the grandfather offer, what Plus will include, and that the scan is free regardless | Add ParkSense to your home screen |
| 2 | Day 3 | The day your parking sign is switched off | Reg 318 in plain English, with the next public holiday date | Read the rule |
| 3 | Day 7 | Which way does the arrow point? | The side-of-the-sign problem, one photo, one answer | Scan a sign near you |
| 4 | Day 10 | Reminders that reach your pocket | Install to home screen; allow notifications; the warning arrives with the app closed | Turn on reminders |
| 5 | Launch morning | It's live. Send it to one person who got fined this year | The accuracy number, the failure rate, and the share link | Share ParkSense |
| 6 | Day 91 | Plus is here, and it's yours already | Plus opens for everyone else at $19.99; their account stays free | Open ParkSense |

## 7. The five metrics

Defined in full in [METRICS.md](./METRICS.md). Reviewed every Monday.

| Metric | Day 30 | Day 60 | Day 90 | If below target |
|:--|:--:|:--:|:--:|:--|
| Measured accuracy (single sign) | 85% | 90% | 93% | Stop posting. Fix the largest failure class. |
| Scan → timer rate | 25% | 32% | 40% | Watch five people scan in person. |
| Week-4 return rate | 15% | 22% | 28% | Stop adding channels. Interview five returners. |
| Repeat scanners (3+) | 150 | 400 | 800 | If retention holds, push the contest harder. |
| Cost per active user | <$0.12 | <$0.10 | <$0.08 | Check the quota table for a scripted device first. |

## 8. Budget

**Fixed, roughly $60/month:** Vercel Pro (needed for the once-a-minute
cron; or $0 with Supabase pg_cron), OpenAI at early volume, the domain.
PostHog, Supabase and the error intake are on free tiers.

**Placement, one-off:** about $60 for venue cards and $150 for the sign
photography day if someone else walks it. **$210 total** buys the launch
message and the first physical channel.

**Paid reach: $0 until the accuracy gate passes.** Then $5/day on Reddit
geo-targeted to Sydney and $5/day on Meta targeting the inner west, 25–45,
for two weeks, and kill anything above $3 per install. **Under $300/month**
at full tilt.

**The one investment under $200:** the photography day. It is the accuracy
number, the launch message, the regression set, and the answer to the
biggest risk, for $150.

## 9. What would make this stop

- Accuracy below 85% at day 30 after two fix cycles: the product is not
  ready and no amount of placement should be bought for it.
- A verified fined-because-of-a-wrong-verdict story: pause marketing, publish
  the case and the fix, add the failure class to the harness.
- Week-4 return under 10% at day 60 with reach on target: the app is a
  novelty. Interview before spending.
- Cost per active user above $0.20 for two weeks: someone is scripting the
  endpoint; tighten the quota before anything else.

None of these is a reason to lower the price. The price is not the problem
in any of them.
