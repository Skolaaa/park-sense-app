# ParkSense — Landing Page Copy

Produced with `/founder:landing-page` from
[emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder).
This is the landing page [GO-TO-MARKET.md](./GO-TO-MARKET.md) §2 calls for.
Every product claim below matches what the code does; the accuracy figures
are placeholders that may only be filled from `scripts/eval-signs.js`, and
the page does not go live until they are. Australian English throughout.

---

## 1. Hero

**Headline:** The only parking app in Sydney that knows what day it is.

**Subheadline:** Photograph the sign. ParkSense reads every plate, checks
today against NSW public holidays and school days, and tells you when to
leave.

**Primary CTA (email field + button):**
`your@email.com` → **Lock in Plus, free forever**
*Free forever for anyone here before launch. No card, no account.*

**Secondary link:** Or scan a sign first — no sign-up needed.

**Social proof line (replace brackets from the harness before publishing):**
Measured on [N] labelled Sydney signs: right [X]% of the time, wrong [Y]%.
Method and failures published.
*Interim, until the study runs:* Built in Sydney. Cites NSW Road Rules
reg 318 on every public holiday verdict.

**Visual:** a real Surry Hills pole with four plates and two arrows, the
verdict card and 12-hour strip overlaid. No stock photo.

## 2. Problem

**Headline:** "Four plates, two arrows, and I still don't know if I can park."

- **Which plate wins?** A clearway above a loading zone above a 2P. I read
  the top one, hoped, and paid $330 for it.
- **Which way does the arrow point?** The sign was ten metres up the kerb.
  It applied to me anyway. $140.
- **Does it even apply today?** I moved the car at 7:40am on Labour Day. The
  Mon–Fri sign was off by law that day. Nobody tells you.

## 3. Solution

**Headline:** The sign is not the rule. ParkSense checks the rest.

**It knows what day it is.**
Under NSW Road Rules reg 318, a sign listing particular days does not apply
on a public holiday unless it says so. ParkSense checks the NSW public
holiday calendar and school term dates before it answers, and cites the rule
when it changes the verdict. *Roughly 11 public holidays and about 165
non-school days a year, and every other app reads them as a Tuesday.*

**It knows which side you're on.**
Sydney arrows point at the stretch of kerb each rule covers. You tell
ParkSense left or right, and it applies only the plates that point at you.
*The same pole means opposite things ten metres apart. No other app asks.*

**It shows the next 12 hours, not a yes or no.**
One strip: park now, leave by 4pm, or you can't park until 6pm. The time
limit becomes a timer with a 15-minute warning, and the fine for getting it
wrong is shown next to the verdict, dated to the NSW schedule. *A time-limit
overstay is about $140. No Stopping is about $330.*

## 4. How it works

1. **Photograph the pole.** Whole sign in frame. The photo is resized on
   your phone and read once.
2. **Tap your side.** Left or right of the sign — that resolves the arrows.
3. **Get the verdict and the timeline.** The model transcribes each plate;
   code decides what applies right now, using today's calendar and the
   precedence rules. Under a minute from footpath to answer.
4. **Start the timer.** When it ends, one question: did you get a fine? Your
   answer is how the reader gets measured.

## 5. Social proof

**Stage: early.** The proof is the accuracy study, not testimonials — a
measured number with a published method beats five quotes, and no rival has
one. Lead with the study; add testimonials from grandfathered users once
they exist. Sample testimonials to replace, never to publish as written:

> "Enmore Road, 3:55pm. It read the clearway plate above the 2P and told me
> I had five minutes, not two hours. That's the $330 one."
> — *Priya R., Marrickville*

> "It told me the School Days sign outside the job didn't apply because it
> was the school holidays, and showed me the term dates. I'd been moving the
> van for nothing." — *Dave K., plumber, Engadine*

## 6. Pricing preview

| | Free | Plus |
|:--|:--|:--|
| Price | $0, unlimited scans | **A$19.99 once** (or A$9.99/year) |
| What you get | Every verdict, arrows, calendar, timeline, one timer | Reminders that fire with the tab closed, two-stage warning, unlimited history, multi-vehicle timers, fine appeal pack |
| Availability | Now | After the first 90 days — **and never for anyone here before then** |

*Is it worth it?* $19.99 once. A time-limit fine is about $140. No Stopping
is about $330.

## 7. FAQ

**How accurate is it?**
On [N] labelled Sydney signs it was right [X]% of the time and wrong [Y]%,
mostly on [top failure class]. It can misread a sign, so every verdict says
so and asks you to check the pole before you walk away. Below 65%
confidence it says "check this one yourself" rather than guess, and
"Report a wrong reading" is on every result.

**Where does my photo go?**
To OpenAI, through our server, to read the sign. ParkSense does not store
it. Your location stays on your phone unless you opt in to community data,
which is stored at about 110 metres' precision under a salted hash — no
photo, no address, no exact coordinate.

**Will the timer actually remind me?**
Yes, if you add ParkSense to your home screen and allow notifications: the
15-minute warning and the expiry are sent as push notifications from our
server, so they arrive with the app closed and the phone in your pocket. In
a plain browser tab the warning still fires while the tab is open, with an
in-app fallback.

**Does it work outside Sydney, or for paid parking?**
No. The calendar, the fine schedule and the arrow rules are NSW-specific and
tested on Sydney signs. If a sign says payment is required, ParkSense tells
you so; it does not take payment.

**What's the catch with "free forever"?**
There isn't one. The scan is free for everyone, always. Plus is A$19.99
once, from day 91; scan before then and it's yours for good. We ask for an
email so we can tell you when Plus lands, and nothing else.

## 8. Final CTA

**Headline:** Here before launch? Plus is yours for good.

**Email field → Lock in Plus, free forever**

*No card. No account. No app store. One email when Plus ships, and you can
unsubscribe with one tap.*

## 9. SEO metadata

**Title tag (58 characters):**
`ParkSense – Sydney Parking Sign Reader That Knows the Date`

**Meta description (158 characters):**
`Photograph a Sydney parking sign and get a plain answer: can you park, until when, and what a mistake costs. Checks NSW public holidays and school days. Free.`

**Target keywords:**
1. `parking sign reader Sydney`
2. `can I park here Sydney`
3. `no stopping vs no parking NSW`

---

### Notes for whoever builds it

- Do not publish an accuracy number that did not come from
  `scripts/eval-signs.js`. "99%" is a rival's claim and an ACL s18 problem.
- The same offer is in the app (home screen after the first scan, and in
  Settings) and posts to `/api/subscribe`. Track both as `email_captured`
  with `source: landing` here (see [METRICS.md](./METRICS.md) §4).
- Fine amounts are indexed each 1 July; `api/_lib/fines.js` carries the
  as-at date. Re-check the two figures above whenever it flags stale.
