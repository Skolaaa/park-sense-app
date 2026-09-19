# ParkSense — Release & Go-To-Market Plan

Produced with `/founder:go-to-market` from
[emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder).
Assumes [LAUNCH-READINESS.md](./LAUNCH-READINESS.md) and
[PRICING.md](./PRICING.md).

---

## 1. Launch readiness check

**Is the MVP sufficient to launch?** As a free product, yes — the core loop works end to end. As a *product*, no, and the gap is five items, not forty:

| Must ship before launch | Why it is non-negotiable |
|:--|:--|
| Analytics (B3) | Launching without instrumentation means the launch teaches you nothing. This is the cheapest item and the one most often skipped. |
| Auth + a real quota on `/api/analyze` (B1, B2) | A successful launch day on an open endpoint is an unbounded OpenAI bill. Success is the failure mode. |
| Privacy policy, terms, in-app disclaimer (B4) | The app sends a photograph and a GPS coordinate to a third party with no disclosure. Not optional, and not only for the app stores — under ACL s64 the disclaimer alone does not limit liability, so the in-flow "check the sign yourself" prompt matters more than the terms page. |
| Correct fine amounts (B7) | The app currently quotes ~$344 for a No Parking offence that is about $140. Launching with a wrong number in the most quotable field in the product is an avoidable own goal. |
| Error monitoring (B5) | A prompt regression on launch day is otherwise invisible until Reddit tells you. |

Everything else — the service worker, the PNG icons, the README fix, the Open Graph image — is a week of work and should be done, but would not stop a launch.

**TAM sanity check.** NSW had about [5.9 million registered vehicles](https://www.abs.gov.au/statistics/industry/tourism-and-transport/motor-vehicle-census-australia/latest-release) at the 2021 ABS census, and Sydney councils issue infringements in the hundreds of thousands per year. The addressable group is narrower than "everyone who drives": it is people who regularly park on unfamiliar inner-Sydney streets. Call it **200,000–400,000 people**. Enough to support the break-even in PRICING.md many times over. Not enough to be a venture business on Sydney alone.

**The biggest risk that could kill the launch.** Not competition, not distribution. It is **one credible story of someone fined because ParkSense said yes.** That story ends the product, and it is likeliest in week one when volume is highest and accuracy is least understood. Everything below is arranged so accuracy is measured *before* reach is bought.

**Release vehicle: ship the web app first, wrap for the stores later.** No review queue, no 15% cut, instant fixes on a product whose prompt will change weekly in the first month. Install to home screen via the PWA manifest. Move to the App Store and Play Store only once the four gates in PRICING.md §6 are passed — at that point you are shipping a product you can describe accurately in a store listing, which is also when a store listing starts working as a channel.

## 2. Pre-launch (4 weeks out)

**Where the audience already is:**

- [r/sydney](https://reddit.com/r/sydney) — the single highest-value venue. Parking sign confusion is a recurring genre there. Read the self-promotion rules before posting; the successful format is a person who built a thing, not a launch.
- [r/AusLegal](https://reddit.com/r/AusLegal) — where people go *after* the fine. Different, angrier, higher-intent audience.
- [r/CarsAustralia](https://reddit.com/r/CarsAustralia), [r/newsouthwales](https://reddit.com/r/newsouthwales)
- Suburb Facebook groups — Inner West, Surry Hills, Newtown, Bondi. Parking is the permanent top-three topic in every one of them.
- TikTok and Instagram Reels under `#sydney` and `#sydneyparking`. Confusing-sign content already performs there without anyone building an app.

**Content to post before launch (build credibility, sell nothing):**

1. **"I photographed 200 Sydney parking signs and got an AI to read them. It was right 8 times out of 10."** Blog post plus the raw data. This is the credibility asset and it doubles as the accuracy measurement B6 requires.
2. **A short video decoding one genuinely awful CBD sign** — the kind with four plates and two arrows. No app mention. Post to TikTok, Reels, and r/sydney.
3. **"No Stopping vs No Parking: a $190 difference"** — around $330 versus around $140, the single most-searched confusion in NSW. Verify the current amounts against the Transport for NSW schedule before publishing; they are indexed every 1 July.
4. **A weekly "can you read this sign?" poll** on Instagram Stories and Twitter. Cheap, repeatable, and it collects labelled examples.
5. **One LinkedIn post aimed at fleet managers** — "what parking fines actually cost a courier fleet per vehicle per year". This seeds the Fleet tier months before you sell it.

**Waitlist: no.** A waitlist for a free web app adds a step between a person and the thing. Ship the URL. Collect emails *after* the first scan, in exchange for the grandfathered Plus offer — that converts far better than a pre-launch form because the person has already seen it work.

**Assets to prepare:**

- **Landing page** (see the `/founder:landing-page` skill for full copy): hero with a real Sydney sign photo and the verdict overlaid; a live "try it now" scan that works without signup; the measured accuracy number stated plainly *with* its error rate; the directional-arrow explainer as the differentiator section; the grandfather offer; privacy in plain English — where the photo goes and how long it is kept.
- **Demo video: 15 seconds, vertical, no narration.** Walk up to a sign, photograph it, verdict appears, timer starts. The product's entire value is legible without a word of explanation, so do not add words.
- **Social proof before customers:** the accuracy study is the proof. "Independently measured against 200 labelled Sydney signs" outperforms five testimonials, and unlike testimonials you can produce it yourself this month.

## 3. Launch day

Three platforms. The two obvious ones are deliberately excluded and the reasons matter.

### Reddit — r/sydney, Saturday morning AEST *(primary)*

Sydney-specific product, Sydney-specific audience, and Saturday morning is when people are about to go and park somewhere annoying. Title format: **"I got sick of misreading parking signs in the CBD so I built something that reads them for me — here's how accurate it actually is."** Lead with the accuracy number *including the failures*. Reddit forgives a flawed product and punishes an oversold one. Answer every comment for six hours; the comments are the launch, not the post.

### TikTok / Instagram Reels — same day, 5–7pm AEST *(primary)*

The highest-fit channel and the one most founders skip. Format: point the camera at a genuinely absurd sign, let the viewer try to read it for three seconds, then show the app's answer. This is native content on those platforms rather than an ad, the addressable audience is geographically exactly right, and cost per install is effectively zero. Post three variants on day one.

### Local media — pitched two weeks before, embargoed to launch day *(primary)*

"Sydney parking signs are now so confusing there is an AI to read them" is a story that writes itself. Pitch Time Out Sydney, the Daily Telegraph's city desk, news.com.au, ABC Radio Sydney's drive slot and 2GB. One pickup is worth more than any other channel here, and radio in particular reaches the exact person sitting in a car.

### Skip Product Hunt and Hacker News on launch day

**Product Hunt** ranks a global, mostly American, mostly-builder audience. A Sydney-only parking app cannot win there, and a poor showing is a public result you cannot delete. **Hacker News** has the wrong audience for the product but the right audience for the study — so post the accuracy write-up as a **Show HN** four to six weeks later, titled around the measurement rather than the app: *"Show HN: I measured how well GPT-4o reads Australian parking signs."* That earns HN's respect and drives the engineers who will send you good bug reports.

## 4. Post-launch: the first 90 days

### Channel priority

| # | Channel | CAC | Time to result | First action this week |
|:--|:--|:--|:--|:--|
| 1 | Short-form video (TikTok / Reels) | ~$0 | Days | Film five signs on one walk through the CBD. Post one a day. |
| 2 | Earned local media | $0 | 2–4 weeks, spiky | Write one pitch email, send to five outlets, embargo to launch. |
| 3 | Reddit + suburb Facebook groups | $0 | Days | Answer parking questions for two weeks *before* ever linking the app. |
| 4 | SEO | $0 | 3–6 months | Publish the NSW sign glossary this week so it starts ageing. |
| 5 | Fleet outbound (LinkedIn, direct) | ~$40/vehicle | 4–8 weeks | List 20 Sydney courier and trades businesses. Email ten. |

### Content that targets real search intent

1. **"What do 1P, 2P and 4P mean on a NSW parking sign?"** — highest-volume beginner query in the category.
2. **"No Stopping vs No Parking in NSW — and why one costs more than twice the other"** — high intent, high emotion.
3. **"Which way is the arrow pointing? Directional parking signs in Sydney, explained"** — your differentiator, as an article.
4. **"NSW parking fines 2026: every amount, in one table"** — pure link bait, gets cited, ranks for years.
5. **"How to appeal a NSW parking fine (and what evidence actually works)"** — catches people after the fine and sells the Plus appeal pack without an ad. Hook it to the 1 July 2025 reform: officers must now attach a notice to the vehicle, and where an exception applies the fine must arrive within 7 days or be withdrawn. Most drivers do not know this.

Distribution for each: post the full text to the relevant subreddit as a comment answer when the question comes up naturally, cut the core point into a 20-second video, and cite it from the landing page.

### Communities and partnerships

- **Engage in:** [r/sydney](https://reddit.com/r/sydney), [r/AusLegal](https://reddit.com/r/AusLegal), and the suburb Facebook groups for the Inner West and Eastern Suburbs.
- **Partnership 1 — car share.** GoGet and Uber Carshare drivers park on unfamiliar streets by definition, and the operator eats the fines. That is the warmest fleet conversation available.
- **Partnership 2 — payment handoff.** When a sign says payment is required, offer a tap-through to Park'nPay or EasyPark. They own the transaction and have no interest in reading signs; you read signs and have no interest in taking payment. Genuinely complementary, and it makes ParkSense the first app opened rather than the second. Park'nPay is the better first call: it is the NSW government app and charges drivers no service fee, so recommending it costs your user nothing.

### One growth hack, specific to this product

**"Sydney's worst parking sign" — a weekly public contest.** People submit a photo, ParkSense publishes its reading alongside the correct answer, and the most incomprehensible sign of the week wins. It is native content for every channel above, it is funny enough to spread on its own, councils and journalists notice it — and every submission is a labelled example for the accuracy set. It is the only tactic here that grows distribution and fixes blocker B6 at the same time. Run it from week one.

## 5. The five metrics

Five, tracked every Monday. Not fifty.

| Metric | Definition | Day 30 | Day 60 | Day 90 | Tool | If below target |
|:--|:--|:--:|:--:|:--:|:--|:--|
| **Measured accuracy** | % of labelled signs where the verdict matches ground truth | 85% | 90% | 93% | Manual spreadsheet + contest submissions | Stop all marketing. Fix the prompt. Nothing else matters at this number. |
| **Scan → timer rate** | % of `canPark: true` results where a timer is started | 25% | 32% | 40% | PostHog funnel | The verdict is not being trusted, or the button is not being found. Watch ten session recordings before changing anything. |
| **Week-4 return rate** | % of week-1 users who scan again in week 4 | 15% | 22% | 28% | PostHog cohorts | This is a one-off novelty, not a habit. Interview five returners and find what they have in common. |
| **Repeat scanners** | Users with 3+ scans, all time | 150 | 400 | 800 | PostHog | Reach is fine, retention is not. Stop adding channels and fix the second visit. |
| **Cost per active user** | Monthly OpenAI spend ÷ monthly active users | <$0.12 | <$0.10 | <$0.08 | OpenAI dashboard ÷ PostHog | Somebody is scripting the endpoint, or one user is scanning hundreds of times. Check the quota before you check the prompt. |

**Ignore:** total page views, app "downloads", Reddit upvotes, and total scans. The first three are launch-day noise that will never repeat, and total scans rises when a single bot finds your endpoint. Every one of them can go up on a week the product got worse.

## 6. Budget: $0–500/month

**Fixed and unavoidable (~$60/month):** Vercel Pro ~$30, OpenAI ~$15 at early volume, domain ~$2, Apple developer programme ~$12 amortised. Enrol in Apple's Small Business Program before the first paid release — it is the difference between a 15% and a 30% cut and it does not apply retroactively. PostHog, Sentry and Plausible all have free tiers that comfortably cover the first 90 days — take them and do not upgrade until a limit is actually hit.

**Spend nothing on ads for 90 days.** Not frugality: with accuracy unmeasured, paid acquisition buys the one thing that kills this product, which is volume arriving faster than you can find out whether the verdicts are right.

**The one investment under $200: pay someone $150 to photograph and ground-truth 200 Sydney parking signs.** A student with a phone and a Saturday, walking the CBD, Surry Hills, Newtown and Bondi, capturing each sign with its correct interpretation recorded alongside.

That $150 is the highest-leverage money in this entire plan, and it is worth being explicit about why. It closes blocker B6, which is the difference between a product you can sell and one you cannot. It produces the launch's single best asset — a real accuracy number. It creates a regression set, so every future prompt change can be verified instead of hoped at. And it converts the biggest risk in section 1, the person fined because the app said yes, from an unknown into a measured, disclosed, bounded rate.

Everything else in this document is a channel. That $150 is the product.
