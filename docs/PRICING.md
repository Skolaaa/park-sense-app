# ParkSense — Pricing Strategy

Produced with `/founder:pricing-strategy` from
[emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder),
against the app at commit `6da4c97`. Read
[LAUNCH-READINESS.md](./LAUNCH-READINESS.md) first — it sets the constraints
this document prices against. Market figures observed 19 September 2026.

---

## 0. The finding that reframes everything

**Photo-to-verdict parking sign reading is already commoditised in Australia.** The market check turns up a crowded field of shipping competitors, several of them live in the Australian App Store today:

| Product | Coverage | Price |
|:--|:--|:--|
| [ParkSnap](https://parksnap.ai/) | US, UK, IE, CA, **AU** | **Free, unlimited, no subscription** — advertised as the feature |
| [Parky.AI](https://parky.ai/) | US, CA, UK, **AU** | Free app; Unlimited Quarterly **$3.99**, Unlimited Yearly **$12.99** (listed in USD) |
| [SIGNlanguage](https://apps.apple.com/au/app/signlanguage-parking-decoder/id6757208125) | AU store | Free + in-app purchases. Sign reading **plus expiry reminders plus history on a map** |
| [Australian Parking Sign Reader](https://australiaparkingsigns.com.au/) | AU | Free web tool |
| [ParkEasy AI](https://apps.apple.com/us/app/parkeasy-ai/id6745525982), [ClearPark](https://apps.apple.com/us/app/clearpark-parking-sign-decoder/id6748265688), [Parking Sign Scanner AI](https://apps.apple.com/us/app/parking-sign-scanner-ai/id6478474076) | Multi | Free or free + IAP |

Two conclusions, and the second is uncomfortable.

**First: do not price the scan.** A subscription whose proposition is "we read the sign" is being undercut to zero today by a competitor that advertises the *absence* of a subscription. Any plan that charges monthly for scans is wrong before it launches.

**Second: the timer is not as differentiated as it looks.** SIGNlanguage already bundles sign reading with expiry reminders and history, in the Australian store, now. The honest read is that ParkSense's one genuinely unmatched capability is **directional side resolution** — the left/right arrow handling in `api/analyze.js`. Nothing else in the field markets it, and it is *the* Sydney failure mode, because the same sign means opposite things ten metres apart. The timer is table stakes that ParkSense happens to execute well. Price accordingly: the wedge is Sydney-specific correctness, and the paid layer is what happens after the verdict.

One number sets the ceiling on all of it. Parky.AI publicly reports **83% accuracy on single signs and 74% on multiple signs**. If that is the state of the art, roughly one verdict in five is wrong. A product wrong one time in five cannot be priced like infrastructure. It can be priced like a cheap insurance policy — which is the shape of everything below.

## 1. Pricing model analysis

| Model | Fit | Why |
|:--|:--:|:--|
| Flat subscription (monthly) | **2/5** | A direct competitor gives unlimited scans away free. A monthly bill for an app used four to six times a month churns hard: every renewal notice lands on a day the user parked nowhere difficult. |
| Usage-based / per-scan | **2/5** | The moment of use is standing in traffic in the rain. Any sense that a scan costs money makes the user skip it and guess, which destroys the habit the product depends on. |
| Per-seat | **1/5** | Consumer product, one driver, no seats. Meaningful only in the fleet tier. |
| Freemium | **4/5** | Correct shape. The scan is the free acquisition layer because the market has already set its price at zero. |
| Credits / tokens | **2/5** | Usage-based objections, plus a top-up flow at the worst possible moment. |
| **One-time purchase** | **5/5** | Best fit. Cost of goods is about a cent a scan, so one payment funds a typical user for years. No churn, and "pay once" is a real differentiator in a field of subscriptions. |

**Recommendation: freemium with a one-time unlock, and an annual offered mainly as a decoy.** Free unlimited scanning, because you cannot out-price free and the scan is no longer the product.

There is a real market anchor for the paid layer: [CellOPark](https://site.cellopark.com.au/tariffs/) charges **A$1.99/vehicle/month for unlimited SMS parking reminders**, and [EasyPark Go](https://www.easypark.com/en-au/what-it-costs) is **A$3.99/month**. Australian drivers already pay about **A$24/year for reminders alone**, from an incumbent, with no sign reading attached. That is the strongest evidence in this document that the post-verdict layer carries willingness to pay while the verdict itself does not.

## 2. Tier design

### Free — $0, unlimited scans

- Unlimited scans with directional left/right resolution
- Verdict, time limit, restriction days and hours, estimated fine
- One active timer with the 15-minute expiry warning
- Last 3 scans in history, with location

**Upgrade trigger:** the fourth scan in a week, or the first timer missed because the tab was backgrounded.

### ParkSense Plus — **A$19.99 once**, or A$9.99/year

The one-off is the headline. The annual exists to make it look obvious. The 2:1 ratio matches the lifetime-unlock convention of roughly two to three times the annual price.

- **Reminders that actually fire** — push via a service worker, not a `setTimeout` in a backgrounded tab. This is the paid feature, and the repo does not have it yet.
- **Two-stage warning** — 15 minutes and 5 minutes out
- **Unlimited searchable history** with the photo and address
- **Multi-vehicle timers** — two cars, two countdowns
- **Fine appeal pack** — photo, GPS coordinate, timestamp and the model's reading exported as one PDF for a council review request. Since 1 July 2025 NSW officers must attach a notice to the vehicle, so drivers now know within minutes and the evidence is still fresh.
- **Priority analysis** — no shared rate limit

**Upgrade trigger out:** managing parking for vehicles that are not yours.

### ParkSense Fleet — **A$4/vehicle/month**, annual, sales-led

Couriers, trades, mobile services, car share. The only segment with a budget line for fines.

- Everything in Plus, per driver
- Shared scan log with per-vehicle attribution
- Monthly exposure report: scans, verdicts, near-expiries
- API access with a real per-key quota
- Invoiced with GST, no app store cut

Priced at twice CellOPark's $1.99/vehicle reminder tier, which is defensible only because it adds sign reading, attribution and reporting. If a fleet pushes back, that $1.99 is the number they will push back with.

## 3. Competitive positioning

| Competitor | Their price | Where ParkSense sits | Why |
|:--|:--|:--|:--|
| ParkSnap | Free, unlimited | **At parity on scanning** | Match free. Do not fight on the commodity. |
| Parky.AI | ~$12.99/yr unlimited | **Above, and one-off instead** | $19.99 once against $12.99 every year. Positioned as "we don't bill you annually to read a sign." |
| SIGNlanguage | Free + IAP, AU store | **Above, on Sydney accuracy** | The closest competitor and the one to watch. Beat it on measured NSW accuracy and arrow handling, not on feature count. |
| CellOPark reminders | A$1.99/vehicle/mo | **Above, bundled** | They remind. They cannot read the sign that sets the time in the first place. |
| Park'nPay / EasyPark / PayStay | Free app; 0% to 11.5% on the transaction | **Adjacent, not competing** | They take payment, none read signs. Integration targets. |

## 4. Unit economics

One GPT-4o vision call per scan at `detail: 'high'`, on a 1024×576 image, capped at 800 output tokens.

| Line | Value |
|:--|--:|
| Image tokens (85 base + 170 × 6 tiles) | 1,105 |
| System prompt (measured at 2,497 characters) | ~625 |
| User text | ~35 |
| **Input per scan** | **~1,765** |
| Output per scan | ~300 |
| **Cost per scan at GPT-4o list pricing** | **~US$0.0074 ≈ A$0.011** |
| Typical user at 6 scans/month | **~A$0.07/month** |
| Same user, one year | **~A$0.80** |

| Tier | Price | Store cut (15%) | Annual COGS | Gross margin |
|:--|--:|--:|--:|--:|
| Free | $0 | — | ~$0.80 | **negative by design** |
| Plus, one-off | $19.99 | $3.00 | ~$0.80/yr | **~95% in year one** |
| Fleet | $48/vehicle/yr | $0, invoiced | ~$3/yr heavy use | **~94%** |

Both stores charge 15% rather than 30% at this scale: Apple's Small Business Program below US$1M in prior-year proceeds, which **requires enrolment**, and Google Play's automatic 15% on the first US$1M each year.

**Fixed costs:** Apple developer programme ~$149/yr, Vercel Pro ~$30/mo, domain ~$20/yr, monitoring on free tiers. About **A$550/year**.

**Break-even: 33 one-off Plus purchases, or 12 fleet vehicles.** That is the entire bar. Low enough to make this a viable side business, and far too low to be a venture case — worth knowing before anyone writes a deck.

**Target blended ARPU: A$1.35/user/year** at 8% conversion on the one-off.

The free tier is the real risk, not the paid margin. Ten thousand monthly active free users, at six scans each, cost about **A$8,000/year** in API spend against no revenue — roughly fifteen times the fixed cost base, from users who pay nothing. Against that, 8% converting at $16.99 net returns about $13,600, so the model holds. But it holds only if conversion actually lands near 8% and only if nobody is scripting the endpoint. That is precisely why blocker B2, an open and effectively unlimited endpoint, has to close before a launch that could get real traffic: an unmetered free tier is not a marketing cost here, it is the largest line in the budget.

Cost of goods is negligible against every price point here, so **pricing is a willingness-to-pay and competition question, not a cost-recovery one.** Do not let the API bill drive the price.

## 5. Pricing psychology

1. **Anchor high with Fleet.** Put "$4/vehicle/month" above the consumer tiers on the pricing page. Against $48/vehicle/year, $19.99 once reads as trivial. Without that anchor, $19.99 is compared against $0, which is the comparison you lose.
2. **Use the annual as the decoy.** $9.99/year sits beside $19.99 once. It is deliberately poor value past two years and most people see that in about two seconds. It does not exist to be bought; it exists to make the one-off feel clever, and it converts the minority who genuinely prefer a small recurring charge.
3. **Frame against the fine, never against other apps.** A NSW time-limit overstay is around $140 and a No Stopping offence around $330. The paywall line is *"$19.99 once. A time-limit fine is about $140."* That is a 7:1 frame, and against No Stopping it is 16:1. It is the only framing in which a product with roughly 80% accuracy is still obviously worth buying — you are selling the reduction of a $140 downside, not certainty. Use the app's own corrected figures here, which per blocker B7 are currently wrong.

## 6. Launch pricing vs. scale pricing

**First 90 days: charge nothing, and build no paywall.**

Not generosity. Section 0 shows the scan is worth $0 and the readiness review shows accuracy has never been measured. Charging for an unmeasured verdict is the move most likely to end this product in a consumer-law complaint rather than a churn report — and under ACL s64 no disclaimer will undo it. The 90 days buy the two things a price needs: a measured accuracy number, and evidence people come back.

**The gate that opens the paywall — all four, not any one:**

| Signal | Threshold |
|:--|:--|
| Measured accuracy on a labelled Sydney sign set | **≥ 90%** on single signs |
| Scan → timer-start rate | **≥ 35%** |
| Week-4 return rate | **≥ 25%** |
| Users who have scanned 3+ times | **≥ 300** |

Below any of these, the answer is not a lower price. It is more product.

**Grandfathering.** Everyone who scans in the first 90 days keeps Plus permanently, free. It costs about a dollar a year each, it turns the earliest users into the people who send you accuracy reports, and that is worth far more than the $20 you did not charge them. Announce it up front — "free forever for anyone here before launch" — because the promise is what earns the sign-ups.

**Price increase timeline.** One planned move: $19.99 → $24.99 once measured accuracy passes 93% and Plus has 500 buyers. Existing buyers never pay again, which is the point of a one-off, and saying so loudly is itself a conversion argument. Do not raise the price to cover a second city; that is a new market, not a better product.

---

## Sources and open questions

Prices and rules here were gathered on 19 September 2026. Two caveats worth carrying forward.

**Verify before quoting publicly.** Several figures came from search extraction rather than an opened page, because this environment's network policy blocked direct access to the App Store, Google Play and OpenAI's own pricing documentation. The competitors' in-app purchase prices in particular should be re-checked on a phone before they go into a deck. NSW fine amounts are indexed every 1 July and secondary sources disagree, notably on clearways — check the Transport for NSW [schedule](https://www.nsw.gov.au/sites/default/files/2021-09/demerits-parking.pdf) directly.

**The unresolved competitive question.** Parky.AI's $3.99 quarterly and $12.99 yearly are listed in USD; the Australian tiers were not verifiable here. If Australian pricing lands materially below those, the $19.99 one-off needs revisiting downward — that single number is the most load-bearing unknown in this document.

*Next: [GO-TO-MARKET.md](./GO-TO-MARKET.md) — how the release actually happens.*
