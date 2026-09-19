# ParkSense — How to Actually Beat the Competitors

Produced with `/founder:competitor-matrix` and `/founder:mvp-scope` from
[emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder).
Follows [PRICING.md](./PRICING.md), which established that the scan itself is
worth nothing. This document answers the question that one left open: *so what
do you build instead?*

---

## 1. The structural read

Every competitor in this category — and ParkSense today — is the same product: a photograph goes to a vision model, a verdict comes back. The prompt differs. Nothing else does.

That has one enormous implication. **There is no moat anywhere in this market, including yours.** Any of these apps could be rebuilt in a weekend. A better prompt is copied in an afternoon by whoever reads your output. So the winning move cannot be "read the sign better". It has to be something a prompt cannot contain.

Here is the opening. **All of them answer from the photo alone, and the photo does not contain the rule.**

A Sydney parking sign is not a complete statement of the law. Whether it applies today depends on facts that are nowhere in the image:

> **NSW Road Rules 2014, Regulation 318** — *"If information on a traffic control device that is at a place indicates that it applies on a particular day of the week, the device does not have effect on a day that is a public holiday for the place unless information on the device states otherwise."*
>
> Its own example: *"If a loading zone sign indicates that it applies on Monday to Friday between 9 am and 4 pm and information on or with the sign does not indicate that it applies on public holidays, the sign does not have effect on any public holiday falling on a Monday to Friday."*

So on roughly eleven days a year, **every "Mon-Fri" sign in New South Wales is void**, and every app in this category confidently tells the driver it is not. Meanwhile a bare "2P" with no days listed *does* apply on public holidays, so the distinction is not even consistent across signs.

It gets larger. Sydney is full of `No Parking 8-9:30am 2:30-4pm School Days`. School days exclude weekends, public holidays and school holidays, but *include* pupil-free development days. That is about 200 days a year, which means **on roughly 165 days a year a school-days sign does not apply** — and no competitor knows which kind of day today is. NSW also has special event parking areas under Reg 205A.1, invisible in any photo.

This is the whole strategy: **stop competing on reading the sign, and start competing on being right.**

The best part is that the missing data is free and official. NSW publishes a combined [School and public holidays dataset](https://data.nsw.gov.au/data/dataset/2-school-and-public-holidays) with a queryable API, covering public holidays, local public holidays, and school term dates, historic and future. One integration, cached, resolves both rules deterministically — no model involved, no hallucination surface.

## 2. Feature comparison

| | ParkSnap | Parky.AI | SIGNlanguage | ParkSense today | ParkSense proposed |
|:--|:--:|:--:|:--:|:--:|:--:|
| Reads a sign from a photo | Yes | Yes | Yes | Yes | Yes |
| Australian rules | Yes | Yes | Yes | Yes | Yes |
| Directional arrow / side resolution | No | No | No | **Yes** | **Yes** |
| Expiry timer | Partial | Yes | Yes | **Yes** | Yes |
| Push reminder that survives backgrounding | Unknown | Yes | Yes | **No** | Yes |
| **Public holiday rule (Reg 318)** | No | No | No | **No** | **Yes** |
| **School-day resolution** | No | No | No | **No** | **Yes** |
| **Sign-cluster handling** | Unknown | Partial (74%) | Unknown | Partial | **Yes** |
| **Forward timeline, not just "now"** | No | No | No | No | **Yes** |
| **Published, measured accuracy** | Claims 99% | **Self-reports 83% / 74%** | No | No | **Yes** |
| Outcome feedback loop | No | Report a bad read | No | No | **Yes** |
| Fine appeal evidence pack | No | No | No | No | **Yes** |
| Price | Free | ~$12.99/yr | Free + IAP | Free | Free + one-off |

Two cells matter more than the rest. The three rows in bold in the middle are things **no competitor does at all**. And the accuracy row is the category's open secret: one rival honestly self-reports 83% and 74%, another advertises 99%, and nobody publishes a method.

## 3. The three gaps worth taking

### Gap 1 — The sign is not the rule *(build this first)*

**What's missing:** every app answers from pixels. None consults the calendar the law actually refers to.

**Why it matters:** it is the difference between a right answer and a wrong one on well over a hundred days a year, and the wrong answers run in both directions. Telling someone they cannot park on a public holiday loses them a space. Telling them a school-days restriction is inactive when it is active costs them about $140.

**Difficulty: low.** One government API, cached daily, plus two deterministic rules applied after the model returns. The model extracts what the sign *says*; code decides whether today counts. Keeping this out of the prompt is the point — a date lookup should never be a language model's job.

**Time to advantage: 6–12 months.** Not because it is hard, but because every competitor is multi-country and would have to do this per jurisdiction, against a different open data source each time, for a market none of them is deep in.

### Gap 2 — Nobody knows whether any of this works

**What's missing:** not one app in the category closes the loop on its own output.

**Why it matters:** it is simultaneously the marketing asset, the product roadmap and the legal defence. In a field where claims run from 74% to 99% with no method attached, *"here is our accuracy, here is how we measured it, here is where we fail"* is a position nobody can copy by shipping a feature. Under Australian Consumer Law it is also the safer posture, since an unverifiable "99% accurate" is exactly the representation that attracts a misleading-conduct problem.

**How:** two hours after a timer ends, one question — *"did you get a ticket?"* One tap. That answer, joined to the photo, the GPS point and the verdict, is a ground-truth corpus that grows with every user and belongs only to you.

**Difficulty: low to medium.** Trivial to ask; the work is in storing and actually reviewing it.

### Gap 3 — The cluster is the common case and the field is weakest there

**What's missing:** Parky.AI's own numbers fall from 83% on a single sign to **74% on multiple signs**. The Sydney reality is a pole with four stacked plates and two arrows.

**Why it matters:** it is where users are most confused, most likely to be fined, and where the competition is measurably worst. Combined with directional side resolution, which nobody else markets, this is the one place ParkSense can claim to be better at the core task rather than around it.

**Difficulty: medium.** Plate-by-plate extraction, then explicit precedence reasoning — clearway overrides, No Stopping beats everything, permit exceptions sit under the base limit — rather than asking one prompt for a single verdict. Precedence is rule logic and belongs in code, not in prose instructions.

## 4. Three features that win the demo

These do not compound like the gaps above, but they are unoccupied and they make the product obviously better in ten seconds.

1. **The forward timeline.** One photo produces a coloured band across the next twelve hours instead of a yes or no. *"Park now, move by 4pm"* and *"you cannot park until 6pm"* are the answers people actually need, and the current product cannot express either. Visually striking, genuinely useful, nobody has it.
2. **Abstention with an instruction.** ParkSense already retakes below 0.65 confidence. Go further and say *why*: "there is a second plate above this one — step back and include it." That converts the confidence score from a disclaimer into an action, and it is the honest posture the ACL position rewards.
3. **The appeal pack.** At the moment someone is fined, they hold the photo, the coordinate, the timestamp and your reading — contemporaneous evidence, which is exactly what a council review wants. Add a check against the 1 July 2025 reform: officers must attach a notice to the vehicle, and where an exception applies the fine must arrive within 7 days or be withdrawn. Most drivers have no idea. This is also the highest willingness-to-pay moment in the entire product.

## 5. The one long game

**A GPS-keyed map of signs already read.** Once a pole has been scanned with a location attached, the next driver at that pole needs no scan at all. That is the only compounding network effect available here: the product gets better as it is used, by people who are not you, in a way a competitor cannot replicate without the same users.

Do not build it yet. Build it when scan volume makes coverage meaningful, and note the honest caveat — signs change, so every cached reading needs an age and a confirm prompt. But it is the reason to attach location to every scan from day one, which the app already does.

## 6. What not to build

| Tempting | Why skip it |
|:--|:--|
| More countries | The competitors' actual mistake. They are shallow in five markets. Being unmatched in Sydney beats being ordinary in five, and the whole strategy above is depth. |
| Taking parking payments | Park'nPay is government-run and charges drivers nothing. You cannot win on price against free, and you would take on a payments compliance burden for it. Hand off instead. |
| Finding an available space | A sensor and scale problem, not an AI problem. You will not win it, and it is a different company. |
| A community feed or gamification | Nobody wants a social network about parking. The contest in the go-to-market plan is marketing, not a product surface. |
| A better prompt as the strategy | Copyable in an afternoon. It is table stakes, not an edge. |

## 7. Threat assessment

| Competitor | Threat | Why |
|:--|:--:|:--|
| **SIGNlanguage** | **High** | Closest feature overlap, already in the Australian store with reading, reminders and map history. The most likely to reach Gap 1 first, because it is the one already behaving like an Australian product. |
| **ParkSnap** | **Medium-high** | Free, unlimited, multi-country, and advertises 99% accuracy. Dangerous on distribution and price, weak on substance — an unverifiable accuracy claim is precisely what a published measurement beats. |
| **Parky.AI** | **Medium** | The most credible operator in the field: publishes real accuracy numbers, has funding and press. Honest, which makes it a better competitor and a worse target for attack. |

## 8. Recommendations

**Position to own:** *the only parking app in Sydney that knows what day it is.* Narrow, verifiable, legally grounded, and useless to a competitor who is not willing to go deep in one city.

**Ship first: the public holiday and school-day rule.** Roughly two days of work against a free government API. It changes the answer on well over a hundred days a year, it cites black-letter law rather than a claim, and it cannot be copied by prompt-editing. It also fixes a bug ParkSense has right now — `api/analyze.js` does not mention public holidays, school days or special event areas anywhere.

**Then, in order:** the outcome question after every timer, cluster handling with precedence in code, the forward timeline, the appeal pack.

**Watch:** SIGNlanguage. It is the one already behaving like an Australian product rather than a global wrapper, and it is the only one likely to notice the same opening.

---

*The honest summary: the current idea is a wrapper, and wrappers do not win. What wins is the boring, jurisdiction-specific work of knowing that today is a public holiday, that the sign therefore does not apply, and being able to cite the regulation that says so. It is unglamorous, it is cheap, and not one competitor is doing it.*
