# ParkSense — Launch Readiness Review

Reviewed at `v0.5.0` plus the unreleased changes on `main` (commit `6da4c97`).
This is the input to [PRICING.md](./PRICING.md) and [GO-TO-MARKET.md](./GO-TO-MARKET.md).

---

## 1. What actually exists today

| Area | State |
|:--|:--|
| Core loop | Working. Camera → preview → side selection → GPT-4o analysis → verdict → timer. |
| Sign interpretation | One prompt in `api/analyze.js` encoding No Stopping, No Parking, clearways, loading zones, permit zones, arrow direction, and NSW fine amounts. |
| Directional arrows | Handled. `selectedSide` is injected into the system prompt. This is the real differentiator — it is the part of a Sydney sign people get wrong. |
| Timer | Solid. `TimerService` recomputes remaining time from `startTime + durationMs`, so refresh and drift are handled correctly. |
| Notifications | 15-minute warning via `setTimeout` + Web Notifications. Does not survive a backgrounded mobile tab. Documented, not fixed. |
| Location | Fire-and-forget GPS + Nominatim reverse geocode, attached to the result on success. |
| Degraded mode | Falls back to mock data on `503` or network failure, labelled "Demo mode" in the UI. |
| Quality gates | Test suite, CI on every PR, and a `postbuild` scan that fails the build if a credential reaches the client bundle. |
| Design | Full component system (`Button`, `Card`, `Badge`, `Alert`, `Progress`), light/dark, safe-area handling, visible focus, keyboard and screen-reader fixes. |

The product is a working, well-built demo. It is **not** a product that can take money, and that gap is structural, not cosmetic.

## 2. Blockers to charging for this

These are ordered by what would stop a paid launch outright.

### B1 — There is no user. There is no account, no session, no identity.
Nothing in `src/` or `api/` identifies who is making a request. Without identity there is no way to meter a free tier, no way to gate a paid tier, and no way to restore a purchase on a second device. Every pricing model below assumes this is built first. It is the single largest piece of work between here and revenue.

### B2 — The API endpoint is open to the world and spends real money.
`api/analyze.js` accepts any POST with an `imageData` field and forwards it to OpenAI on the project's key. The only defence is a 10-requests-per-minute-per-IP limiter held in a module-level `Map`. On Vercel that state lives inside one warm serverless instance, so it resets on cold start and is not shared across concurrent instances. The effective limit is therefore "10 per minute per IP **per instance**", which under load is not a limit. A scripted caller costs the owner money at roughly a cent a call with no ceiling and no alert.

### B3 — No analytics of any kind.
A grep for `analytics|posthog|sentry|plausible|mixpanel|gtag|telemetry` across `src`, `api`, and `public` returns nothing. There is no way to answer: how many scans happened, what share returned `noSignFound`, what share had confidence below 0.65, how many people who scanned went on to start a timer. Those four numbers decide both the price and whether the product works at all, and none of them are currently observable.

### B4 — No privacy policy, no terms, no in-app disclaimer — and a disclaimer alone will not save you.
The app takes a **photograph** and a **GPS coordinate** and sends both to a third-party API. There is no disclosure of that anywhere in the repo. Both app stores reject on this alone, and it is the first thing a privacy-conscious user looks for.

The harder half is Australian Consumer Law. Supplying this app to consumers is a supply of services, so [s60](https://www.austlii.edu.au/au/legis/cth/consol_act/caca2010265/sch2.html) guarantees it is rendered with due care and skill, and s61 that it is fit for the purpose made known. **[s64](https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees) makes void any term that tries to exclude those guarantees**, and s64A — which allows limiting liability — applies only to things not ordinarily acquired for personal or household use. A consumer parking app is squarely personal use, so s64A offers nothing.

For comparison, [Parky.AI's terms](https://parky.ai/terms-of-use/) disclaim "all express, implied, and statutory warranties" and exclude liability for "parking fines, penalties, towing fees". That is US boilerplate; the statutory-warranty exclusion in it would be void here. **Competitor terms are a template for tone, not for compliance.**

What actually reduces exposure is product behaviour, not paperwork: framing the output as assistance rather than a determination, telling the user in-flow to check the sign, and surfacing confidence honestly. The existing retake hint below 0.65 confidence and the `noSignFound` screen are the right instinct and are worth keeping for legal reasons as well as UX ones. Conversely, an accuracy claim in marketing — a rival advertises "99% accuracy" — is the kind of representation that invites a misleading-conduct problem under s18 independently of all of the above. Put the final wording to an Australian lawyer; this is a flag, not advice.

### B5 — No error monitoring.
`AppErrorBoundary` shows the user a recovery screen, and `api/analyze.js` returns a `502` with a reason. Neither is reported anywhere. A prompt regression that starts returning `parse_error` on 30% of scans would be invisible until someone complained.

### B6 — Accuracy is unmeasured.
`confidence` is the model's self-report, not a measured accuracy. There is no labelled set of Sydney signs and no regression test for the prompt, so any prompt edit or model change is an unverified change to the core product. Charging for a verdict whose accuracy has never been measured is the commercial risk here, not a technical one.

### B7 — The fine amounts the app quotes are wrong.
`api/analyze.js` feeds the model a fine schedule of `~$344` for No Stopping, No Parking, clearway and loading zone alike, and `~$133` for a time limit or expired meter. Current NSW figures do not look like that. No Stopping is around **$330**, but **No Parking is around $140**, loading zone around **$235**, and a time-limit overstay around **$140**. So the app currently overstates a No Parking fine by roughly 2.5× and understates a time-limit fine, and it flattens four distinct offences to one number.

`estimatedFine` is shown to the user in the interface, so this is a user-visible factual error in the one number most likely to be repeated to someone else. NSW indexes these amounts every 1 July, so the fix is not just new constants — it is a dated source, an annual reminder, and the year shown next to the figure. Verify against the Transport for NSW [parking offence schedule](https://www.nsw.gov.au/sites/default/files/2021-09/demerits-parking.pdf) before changing the code; secondary sources disagree with each other, particularly on clearways.

## 3. Cheaper gaps, still worth naming

- **README contradicts the architecture.** It still documents `REACT_APP_OPENAI_API_KEY` and says "the OpenAI API key is used client-side". The key moved server-side into `api/analyze.js`. Anyone forking or reviewing the repo gets the wrong and less secure instruction. Fix before any public launch that points at the repository.
- **Not installable as a real PWA.** There is no service worker, and `manifest.json` ships a single SVG icon. Android install prompts want 192px and 512px maskable PNGs. A service worker would also be the route to notifications that survive a backgrounded tab, which is the one known limitation with a direct revenue consequence.
- **Sydney is hardcoded.** The timezone `Australia/Sydney`, the NSW fine schedule, and the council rules all live in one string literal in `api/analyze.js`. Melbourne is the obvious second market and today that is a code change, not a configuration change.
- **Social preview is the favicon.** `og:image` points at `favicon.svg`. Most platforms will not render an SVG Open Graph image, so every shared link will be blank. This matters on launch day specifically.
- **No way to contact anyone.** No support email, no feedback path. Early users who hit a wrong verdict have nowhere to send it, which is exactly the feedback needed to fix B6.

## 4. The unit of cost

Every scan is one GPT-4o vision call with `detail: 'high'`, capped at `max_tokens: 800`, on an image resized to a 1024px maximum edge at JPEG quality 0.8.

| Component | Estimate |
|:--|:--|
| Image tokens, 1024×576 at high detail | ~1,105 (85 base + 170 × 6 tiles) |
| System prompt (measured: 2,497 characters) | ~625 |
| User text | ~35 |
| **Total input** | **~1,765** |
| Typical output | ~250–350 |

That fixed shape is what makes per-scan pricing tractable — cost per scan barely varies between users. The dollar figure and the margin it implies are worked in [PRICING.md](./PRICING.md).

## 5. One cost finding worth acting on

The reflex when this bill grows is "switch to `gpt-4o-mini`". **For this workload that reflex is wrong.** GPT-4o-mini bills image tokens at roughly 33× the GPT-4o count, so on an image-dominated call like this one it lands at about the same price and on low-detail calls it is more expensive. The genuinely cheaper option is **`gpt-4.1-mini`**, whose image multiplier is 1.62×, putting a scan near a fifth of the current cost. That is a benchmark to run against a labelled sign set, not a swap to make blind — but it is the right experiment, and it is not the obvious one.

## 6. Verdict

Ship-quality as an experience. Pre-product as a business.

The sequence that matters: **measure it (B3, B6) → correct it (B7) → protect it (B1, B2) → make it lawful to sell (B4) → then charge.** Pricing set before B3 is a guess, and pricing charged before B6 is a liability. The plans in the two companion documents assume that order.
