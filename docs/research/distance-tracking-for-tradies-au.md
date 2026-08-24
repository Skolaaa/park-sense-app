# Distance / vehicle-expense tracking for Australian tradies — market research

**Date:** August 2026
**Status:** Research only. No product decision made, no code written.
**Question:** Is there an opening for a km / fuel tracking app aimed at Australian tradies for tax purposes?

---

## 1. Verdict up front

**Generic "mileage tracker for sole traders" is a closed category.** Driversnote, GOFAR, TripLog, CarSavvy, DriveLog, Hnry's built-in mileage, and the ATO's own free myDeductions all serve it. Entering there means competing on price and battery-efficiency against incumbents with years of tuning — a bad fight.

**But the tradie-specific slice is genuinely underserved**, and the reason is that tradies fall *outside* the tax rules that every mileage app is built around:

1. **The typical tradie vehicle is not a "car" for ATO purposes.** A dual-cab ute with ≥1 tonne carrying capacity (HiLux, Ranger, D-MAX, Triton, Navara in common work configs) is excluded from the cents-per-km method and the statutory logbook method. Every mainstream mileage app's core output — "X km × 91c = your deduction" — is *the wrong answer* for a large share of tradies.
2. **What those tradies actually need is business-use percentage applied to actual running costs** (fuel, servicing, tyres, rego, insurance, interest, depreciation), with no $4,550 cap and no car-limit cap. That's a different product: it needs expense capture and receipt handling, not just GPS traces.
3. **Employing tradies with utes have an FBT problem no consumer app touches.** PCG 2018/3's safe harbour requires demonstrating private use stayed under 1,000 km/year total, no single return private trip over 200 km, and home-to-work diversions under 2 km. Proving that is a tracking problem with hard numeric thresholds — and fleet telematics vendors charge $13–$60/vehicle/month for systems that don't report against those thresholds either.
4. **Home-to-site travel is the highest-value, highest-risk claim tradies make**, and it turns on the bulky-tools and itinerant-work exceptions. No app currently helps a tradie *establish* that a trip qualifies at the moment it happens.

The opening is not "another mileage tracker." It's **the vehicle-expense compliance layer for utes and work vehicles**, sitting between consumer mileage apps (too simple, wrong tax model) and fleet telematics (too expensive, aimed at fleets of 20+, no tax output).

Confidence: moderate. The tax-rule gaps are verified and real. What is *not* verified is willingness to pay — see §8.

For the positioning that follows from this — why the product is a *defensibility* tool rather than a measurement tool, and why that changes the buyer and the price — see §6a.

---

## 2. The tax rules are the product spec

This section matters more than the competitive analysis, because the rules define what a correct product must do. **All of this needs sign-off from a registered tax agent before it ships in any form users rely on.**

### 2.1 Cents per kilometre method (cars only)

| Income year | Rate | Cap | Max deduction |
|---|---|---|---|
| 2025–26 | 88c/km | 5,000 km per car | $4,400 |
| 2026–27 | 91c/km (89c base + 2c one-off fuel-shock uplift) | 5,000 km per car | $4,550 |

Future years index off the 89c base, not the 91c. The rate is all-inclusive — no separate claim for fuel, servicing, or depreciation on top.

### 2.2 Logbook method (cars only)

- Minimum **12 continuous weeks**, representative of the year's travel.
- Valid **5 years**, unless circumstances change materially (new job, moved house, changed work pattern).
- Requires: start/end odometer per trip, date, destination, purpose, distance; plus odometer readings at the start and end of each income year claimed.
- Written evidence for all expenses except fuel/oil (which may be estimated from odometer readings).
- Records retained **5 years** from lodgement.
- Electronic logbooks are accepted.

### 2.3 The ute exclusion — the key insight

A vehicle designed to carry **≥1 tonne** or **≥9 passengers** is not a "car" under the ATO definition. Consequences:

- Cents-per-km and the statutory logbook method **do not apply**.
- Claim **actual running costs apportioned by business-use percentage** instead.
- The **car depreciation limit ($69,674) does not apply** — significant for a $80k+ dual cab.
- There is no $4,550 ceiling. A tradie doing 30,000 business km in a ute has a materially larger, more complex, and more scrutinised claim than any cents-per-km user.

⚠️ **Verification needed:** sources in the wild are inconsistent about whether a formal logbook is *required* versus merely the sensible way to substantiate business-use percentage for a non-car vehicle. The practical answer (keep logbook-style records regardless) is the same, but the product must not state the legal position wrongly. Get this confirmed.

### 2.4 FBT — PCG 2018/3 safe harbour (employers)

For an eligible commercial vehicle provided to an employee, private use is treated as "minor, infrequent and irregular" if **all** of:

- Total private travel ≤ **1,000 km** per FBT year
- No single return private journey > **200 km**
- Home-to-work diversions ≤ **2 km**

The employer must be able to **demonstrate how it controls and monitors** private use. The ATO has been actively scrutinising dual-cab ute exemption claims. This is the single most automatable, highest-stakes gap found in this research — it is three numeric thresholds against a GPS trace, and nobody is selling it as a product to small trade businesses.

### 2.5 Home-to-site travel

Normally private and non-deductible. Deductible under the **bulky tools** exception when the equipment is essential, genuinely bulky (rough guidance ~20–25 kg, awkward, impractical to transport otherwise), *and* there is no secure storage at the site. Also deductible under the **itinerant work** doctrine (TR 95/34) where work is genuinely shifting-place-of-work.

Both exceptions are fact-dependent and are exactly where tradie claims get denied. An app that captures the qualifying facts contemporaneously — what was carried, whether site storage existed — is doing something no competitor does.

---

## 3. Market size

| Metric | Figure | Source date |
|---|---|---|
| Actively trading Australian businesses | 2,729,648 | 30 Jun 2025 |
| — sole proprietors | ~30% | 2025 |
| — non-employing / self-employed | ~64% | 2025 |
| Active construction businesses | ~452,820 | Jun 2025 |
| — with fewer than 20 employees | >98% | 2025 |
| Construction industry employment | ~1.3 million | 2023–24 |
| Construction share of GDP | 7.0% | 2023–24 |

Note that construction ≠ all tradies. Mobile trades also sit in Other Services (auto), Administrative & Support (cleaning, landscaping), and Electricity/Gas/Water. Add those and the vehicle-dependent small-business population is meaningfully larger than 452k.

**Demand-side signal:** 3.6 million people claimed ~$10.3 billion in work-related car expenses in 2023–24 (~$12bn cited for the following year). This is a large, recurring, money-motivated behaviour — not a hypothetical need.

**Serviceable target:** realistically 300k–500k vehicle-dependent trade businesses. At $12/month that's a $43M–$72M ARR ceiling at 100% penetration — so a 2–5% share is a $1–3.5M ARR business. Viable as a focused product; not venture-scale on its own.

---

## 4. Why the ATO is a tailwind

- ~**500,000 taxpayers** were sent nudge messages to review car expense claims.
- **584,000–595,000** individual returns were adjusted through data matching and analytics before assessment.
- **One in five** cents-per-km claims lands exactly on the 5,000 km cap, and the ATO reports many claimants can't substantiate how they got there.
- ATO is publicly expanding AI/analytics use on work-related expenses.

Enforcement pressure converts a "nice to have" into a "don't want an audit" purchase. That's the strongest commercial argument for this category, and it's getting stronger, not weaker.

---

## 5. Competitive landscape

### 5.1 Consumer / sole-trader mileage apps

| Product | Model | Price (AU) | Weakness for tradies |
|---|---|---|---|
| **Driversnote** | Phone GPS + optional iBeacon | Free ≤15 trips/mo; ~$11–17/mo paid; iBeacon $40–60 | Car-centric tax model; no ute/actual-cost path; no expense capture |
| **GOFAR** | OBD-II dongle | from ~$8/mo, adapter often free | Hardware dependency; positioned as car insights, not tax compliance |
| **ATO myDeductions** | Free, official | Free | **Manual entry only** — no auto tracking. Local storage only, no cloud sync, manual backup, no accounting integration, closed logbooks can't be reopened, single user per device |
| **Hnry (Mileage by Hnry)** | Bundled | 1% + GST of income, capped $1,500/yr | Only useful if you're already a Hnry customer; motion tracking misses trips |
| **Rounded + Trax** | Integration | Varies | Same generic car model |
| **TripLog / MileageWise / CarSavvy / DriveLog** | Phone GPS | Varies | US-origin or thin AU tax localisation |

### 5.2 Tradie job-management software

Tradify, ServiceM8, Fergus, AroFlo, Simpro all dominate quoting/scheduling/invoicing for AU trades. **None surfaced a native ATO-compliant vehicle logbook feature in this research.** They have the customer relationship and the job data (which is exactly the "purpose of trip" evidence a logbook needs) but haven't built the tax layer.

This cuts both ways: it's the clearest gap found, *and* it's the clearest acquisition/kill risk. ServiceM8 or Tradify could ship a competent logbook feature in a quarter.

### 5.3 Fleet telematics

$13–$60+ per vehicle/month plus $50–$500 hardware. EROAD advertises "from $22/month"; Teletrac Navman publishes no pricing and gates everything behind a quote form. Built for fleet managers, sold via sales calls, priced for 20+ vehicle operations. A 3-ute plumbing business is not their customer, and their output is fleet dashboards, not ATO deduction schedules or FBT threshold reports.

### 5.4 Where everyone fails on execution

Consistent user complaints across the whole category, worth treating as a product requirements list:

- **Battery drain** from continuous GPS + Bluetooth
- **Missed trips** — motion detection false-starts, Android battery optimisation killing background processes, Bluetooth failing to connect
- **Trip fragmentation** — one job split into five "trips" because the driver stopped at lights or at a supplier
- **Manual cleanup burden**, which is the exact thing users paid to avoid

For tradies this is worse than average: 8–15 stops a day, suppliers, multiple sites, frequent short hops. **Trip fragmentation is arguably a bigger practical problem for this audience than tax-model correctness.** Any product here lives or dies on trip-stitching quality.

---

## 6. The openings, ranked

**1. FBT safe-harbour monitoring for ute fleets (2–20 vehicles).** Highest differentiation, clearest willingness to pay, no direct competitor. Three hard thresholds (1,000 km / 200 km / 2 km) tracked automatically, with an audit-ready annual report and alerts before a driver breaches. Employers carry real FBT exposure; the ATO is actively looking at dual cabs. Sold to the business owner, priced per vehicle, defensible.

**2. Correct tax modelling for non-car vehicles.** Ask for the vehicle's carrying capacity at setup and route the user to the right method — cents-per-km, logbook, or actual-costs-with-business-use-%. Competitors get this wrong or ignore it. Cheap to build, immediately demonstrable, and a credible marketing wedge ("your mileage app is calculating your ute deduction wrong").

**3. Contemporaneous evidence for home-to-site travel.** Prompt at trip end: tools carried, site storage available, itinerant pattern. Turns the highest-risk tradie claim into a substantiated one. Nobody does this.

**4. Fuel and running-cost capture tied to the vehicle.** Actual-cost claims need receipts, not just km. This is where the existing ParkSense codebase is directly reusable — see §9.

**5. Job-management integration.** Pulling job addresses and customer names from ServiceM8/Tradify auto-fills trip purpose, the field users hate entering. Also the fastest path to distribution — and the fastest path to being made redundant if the platform builds it themselves.

---

## 6a. The defining difference / USP

### The reframe

Every mileage app on the market is built on the assumption that **distance is the unknown**. Enter
kilometres, apply a rate, produce a deduction. Measurement is the entire product.

For a tradie, distance is the *least* uncertain thing about the day. The unknown is
**classification** — which legs are claimable, and whether it can be proven. An identical 42 km
driving day is a $0 claim or a fully deductible one depending on facts the odometer knows nothing
about:

- Were the bulky tools aboard, and was there secure storage at the site?
- Is this the same site every day for six months — quietly converting it into a regular place of
  work and killing the home-to-site deduction?
- If it is a company ute, did that supermarket detour just consume part of a 1,000 km private-use
  budget worth five figures?

**USP in one line:**

> Everyone else measures the drive. This one classifies it and defends it.

The unit of the product is not the kilometre. It is the trip's legal character.

### Why this is structural, not a feature

Three things change downstream, and they are what make this a business rather than something an
incumbent bolts on in a sprint.

**1. The output artefact changes.** Not a number to key into myTax — an evidence file: trip,
purpose, tools carried, site-storage answer, odometer, matched fuel receipts, FBT threshold
position. Something an accountant signs off and an auditor accepts. Competitors produce a figure;
this produces a defence.

**2. The buyer changes.** For the FBT case the customer is not a driver chasing a $4,550 deduction.
It is an employer carrying five-figure annual exposure per vehicle who, under PCG 2018/3, must
demonstrate they *actively monitor* private use — and today has no way to do that short of
$13–60/vehicle/month fleet telematics that does not report against the thresholds anyway.

**3. The pricing anchor changes with it.** See the asymmetry below.

### The value asymmetry (the core commercial argument)

| | Cents-per-km user | Tradie with a ute |
|---|---|---|
| What is at stake | $4,550 deduction (capped) | $15–25k actual-cost claim, uncapped |
| Plus, if employing | — | FBT exposure per vehicle per year |
| Can they self-assert it? | Largely yes | No — requires substantiation |
| Realistic willingness to pay | Low | Materially higher |

**FBT exposure, worked example.** A $70,000 ute that fails the PCG 2018/3 safe harbour, under the
statutory formula:

```
$70,000 base value x 20%      = $14,000  taxable value
$14,000 x 2.0802 (Type 1)     = $29,123  grossed-up value
$29,123 x 47% (FBT rate)      = $13,688  FBT payable, per vehicle, per year
```

A real client case found in research showed a $9,981 FBT liability on a single dual cab.

Nobody pays $200/year to protect a $4,550 deduction they can effectively self-assert. A business
will pay $200/vehicle/year to stop a ~$13,700 liability from landing. That is a 5–10x pricing
unlock, and it comes entirely from the reframe — not from any additional feature.

*(Note: a dual cab under 1 tonne is a "car" and attracts FBT via the statutory formula; a dual cab
at or over 1 tonne is not a car but still gives rise to a residual benefit unless the exempt-use
conditions are met. Both routes lead to FBT when private use is not minor, infrequent and
irregular.)*

### The demo that sells it

One screen: **a fuel gauge for the FBT exemption.**

> "340 of 1,000 private km used. 2 trips flagged for review. One return journey at 180 km — 20 km
> from breaching."

Live, per vehicle, alerting *before* a breach rather than reporting one after. That number exists
nowhere else on the market, represents five figures of liability, and a business owner will open it
weekly. Contrast with the incumbent core screen — a running kilometre total, capped at $4,550 of
value, that nobody looks at between July and June.

### What could kill this strategy

The USP only holds if the product is **willing to take a position** on classification. The moment
every trip is hedged with "consult your accountant," it is a measurement app with extra forms —
strictly worse than Driversnote, not better.

Taking positions requires:

- A registered tax agent standing behind the rule set
- Probably professional indemnity insurance
- A real answer to "we classified this as deductible and the ATO disagreed"

That cost must be priced in from day one, not discovered in year two. It is also the moat: it is why
ServiceM8, Tradify, Fergus and AroFlo — who already hold the job data and could technically build
this tomorrow — most likely will not. Job management software has no appetite for tax-position
liability.

**Corollary for §2.3:** getting the non-car tax treatment right is *table stakes done correctly*,
not a USP. It is cheap for a competitor to copy once someone proves the demand. The defensible
position is the evidence layer and the employer-side FBT monitoring, not the calculation.

---

## 7. Risks

| Risk | Severity | Note |
|---|---|---|
| Job-management incumbent ships this natively | **High** | ServiceM8/Tradify own the customer and the job data |
| Driversnote adds a ute/actual-cost mode | Medium | Cheap for them to do once someone proves the demand |
| Getting the tax treatment wrong | **High** | Reputational and possibly liability exposure. Needs a registered tax agent, disclaimers, and no advice framing |
| Trip-fragmentation UX failure | **High** | This is what kills mileage apps in practice, and tradie driving is the hardest case |
| Free ATO app is "good enough" for the low end | Medium | Only for light users — it has no auto tracking at all |
| ATO changes methods or rates | Low | Rates change annually; that's config, not architecture |
| Market not venture-scale | Medium | ~$1–3.5M ARR realistic. Fine as a focused business, not a fund-returner |

---

## 8. What is not yet validated

The tax gaps are real and verified. **Willingness to pay is not.** Before writing product code, the following need answering:

1. Do tradies with utes actually *know* the cents-per-km method doesn't apply to them — or is the deduction their accountant's problem entirely? (If the accountant owns it, the buyer may be the accountant, not the tradie.)
2. How many small trade businesses are genuinely exposed on FBT versus quietly ignoring it?
3. What does a tradie currently pay their accountant for vehicle-expense work, and does an app reduce that bill or just add a subscription?
4. Would ServiceM8/Tradify partner or compete?
5. Does the $69,674 car-limit exemption on utes actually drive behaviour, or is it invisible to the end user?

**Suggested validation:** 15–20 interviews — 10 sole-trader tradies, 5 employing tradies with 2+ utes, 5 accountants with trade-heavy books. The accountant interviews are the most informative per hour, because they see the failure modes across hundreds of clients.

---

## 9. Relevance to this codebase

This repo (ParkSense) is a parking-sign analyser, and there is more overlap than is obvious:

- **Vision pipeline** (`api/analyze.js` + `src/services/parkingAnalysis.js`) — a server-side GPT-4o proxy with schema validation and mock fallback. Repointing it at fuel receipts and odometer photos for actual-cost capture is a small change to the prompt and result schema, not a rewrite.
- **Camera capture** (`CameraCapture`, canvas resize to 1024px) — reusable as-is for receipts.
- **Geolocation + reverse geocoding** (`src/services/locationService.js`, Nominatim) — already produces addresses from coordinates, which is exactly what trip start/end records need.
- **localStorage persistence with recompute-from-timestamps** (`timerService.js`) — the right pattern for trips that survive app backgrounding.

**Audience overlap is also real:** tradies park in metered/restricted zones constantly. "Where can I park this ute, and log the trip that got me here" is a coherent single product, and the parking pain is a sharper daily hook than the once-a-year tax pain.

The gap is background GPS tracking, which a React SPA cannot do — this needs a native or React Native app. That's the main architectural cost of pursuing it.

---

## 10. Recommendation

Don't build a mileage tracker. If pursued, build **the ute compliance app**: correct non-car tax treatment, FBT safe-harbour monitoring, contemporaneous home-to-site evidence, and receipt capture for actual costs — with trip-stitching quality as the primary engineering bet.

Run the 15–20 validation interviews first, weighted toward accountants. The tax-rule gaps documented here are strong enough to justify that spend; they are not strong enough on their own to justify building.

---

## Sources

**ATO (primary):**
- [Logbook method](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/work-related-deductions/cars-transport-and-travel/motor-vehicle-and-car-expenses/expenses-for-a-car-you-own-or-lease/logbook-method)
- [Expenses for a car you own or lease](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/work-related-deductions/cars-transport-and-travel/motor-vehicle-and-car-expenses/expenses-for-a-car-you-own-or-lease)
- [D1 Work-related car expenses 2026](https://www.ato.gov.au/forms-and-instructions/individual-tax-return-2026-instructions/deduction-questions-d1-d10-individual-tax-return-2026/d1-work-related-car-expenses-2026)
- [Cents per Kilometre Deduction Rate determination](https://softwaredevelopers.ato.gov.au/CentsperKilometreDeductionRateforCarExpenses)
- [PCG 2018/3 — private use of exempt car and residual benefits](https://www.ato.gov.au/law/view/document?DocID=COG%2FPCG20183%2FNAT%2FATO%2F00001)
- [TR 95/34 — itinerant work](https://www.ato.gov.au/law/view/document?DocID=TXR%2FTR9534%2FNAT%2FATO%2F00001)
- [Tradies – be certain about what you can claim](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tradies-be-certain-about-what-you-can-claim)
- [myDeductions](https://www.ato.gov.au/online-services/online-services-for-individuals-and-sole-traders/ato-app/using-mydeductions/mydeductions)

**Statistics:**
- [ABS — Counts of Australian Businesses, July 2022 – June 2026](https://www.abs.gov.au/statistics/economy/business-indicators/counts-australian-businesses-including-entries-and-exits/latest-release)
- [ABS — The nuts and bolts of the Australian Construction industry](https://www.abs.gov.au/articles/nuts-and-bolts-australian-construction-industry)
- [ASBFEO — Spotlight on Sole Traders](https://www.asbfeo.gov.au/small-business-data-portal/spotlight-sole-traders)
- [Jobs and Skills Australia — Construction](https://www.jobsandskills.gov.au/data/occupation-and-industry-profiles/industries/construction)
- [Builders Institute — Small Construction Businesses 2025 Insights](https://bi.edu.au/news/small-construction-businesses-the-backbone-of-australias-building-industry-2025-insights/)

**ATO enforcement:**
- [ABC News — ATO warns millions claiming work-related deductions (May 2025)](https://www.abc.net.au/news/2025-05-27/warning-from-ato-to-millions-claiming-work-deductions-tax-time/105324236)
- [Accountants Daily — ATO flashes warning over $7.2bn car expenses claims](https://www.accountantsdaily.com.au/tax-compliance/13198-ato-flashes-warning-over-7-2b-car-expenses-claims)
- [YourLifeChoices — 500,000 taxpayers flagged over car expense claims](https://www.yourlifechoices.com.au/finance/ato-tightens-scrutiny-as-500000-taxpayers-flagged-over-car-expense-claims/)

**Ute / FBT treatment:**
- [ABBS Tax — Vehicle tax deductions for tradies: 6 essential ute claims](https://www.abbstax.com.au/blog/ute-vehicle-tax-deductions-tradies/)
- [BDO — ATO crack down on dual cab utes](https://www.bdo.com.au/en-au/insights/automotive/ato-crack-down-on-dual-cab-utes)
- [RSM Australia — FBT myth surrounding FBT 'exempt' cars](https://www.rsm.global/australia/insights/tax-insights/fbt-myth-surrounding-fbt-exempt-cars)
- [PwC — ATO practical compliance guideline on exempt car benefits](https://www.pwc.com.au/tax/taxtalk/assets/alerts/ato-practical-compliance-guideline-private-use-of-exempt-car-and-residual-benefits.pdf)
- [Allworths — FBT implications for vehicles over 1 tonne](https://allworths.com.au/2021/03/26/vehicles-fringe-benefits-tax/)
- [Cotchy — Dual cab ute FBT exemptions and rules](https://cotchy.com.au/articles/dual-cab-ute-fbt-exemption-rules/)
- [ATO — Why your dual cab utes may attract FBT](https://www.ato.gov.au/businesses-and-organisations/small-business-newsroom/why-your-dual-cab-utes-may-attract-fbt)
- [ATO — Exempt use of eligible vehicles](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/fringe-benefits-tax/types-of-fringe-benefits/fbt-on-cars-other-vehicles-parking-and-tolls/exempt-use-of-eligible-vehicles)
- [ATO — Current FBT rate and gross-up rates](https://www.ato.gov.au/api/public/content/0-4fb0f16e-89f1-4068-aec9-c8acb1befc04)
- [BG Private — Dual-cab utes under scrutiny by ATO](https://bgprivate.com.au/insights/articles/dual-cab-utes-fringe-benefits-tax/)
- [Bentleys — FBT rules for company cars or work vehicles](https://www.bentleys.com.au/insights/fringe-benefit-tax-fbt-rules-for-company-cars-or-work-vehicles-in-australia/)

**Competitors:**
- [Driversnote pricing](https://www.driversnote.com.au/pricing)
- [Driversnote vs GOFAR](https://www.driversnote.com.au/blog/driversnote-vs-gofar-which-app-to-choose)
- [GOFAR — Best logbook apps in Australia](https://www.gofar.co/blog/best-logbook-apps/)
- [Rounded — Best mileage tracking apps for sole traders 2026](https://rounded.com.au/blog/best-mileage-tracking-apps-for-sole-traders)
- [Hnry — Tax for sole traders](https://hnry.com.au/)
- [TaxTank — ATO app vs TaxTank](https://taxtank.com.au/2024/08/28/ato-app/)
- [Timeero — Driversnote review 2026](https://timeero.com/reviews/driversnote-review)
- [Capterra AU — TripLog reviews](https://www.capterra.com.au/software/151364/triplog-magictrip)
- [AroFlo — Best apps for tradies](https://aroflo.com/blog/best-apps-for-tradies)
- [Best Tradie Software — Best job management software for Australian tradies 2026](https://besttradiesoftware.com/the-best-job-management-software-for-australian-tradies-2026/)
- [ManageVehicle — GPS fleet tracking cost in Australia 2026](https://managevehicle.com/gps-fleet-tracking-cost-in-australia-2026-breakdown/)
- [Protekt GPS — How much does fleet tracking cost in Australia](https://www.protektgps.com/guides/fleet-tracking-cost-australia/)

---

*This document is market research, not tax advice. Every rule summarised here must be confirmed with a registered tax agent before being relied on or built into a product.*
