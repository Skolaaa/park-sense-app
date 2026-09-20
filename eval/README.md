# Sign accuracy evaluation

`scripts/eval-signs.js` measures how well ParkSense reads real signs. It is
the only source of an accuracy number for this product; nothing in the app
should claim an accuracy that did not come from here.

## Adding a case

1. Photograph a sign the way a user would: phone camera, standing on the
   footpath, whole sign in frame. Save it as `eval/cases/<name>.jpg`.
2. Write `eval/cases/<name>.json` next to it, recording what the sign says
   and what the correct verdict is at a few instants that exercise its rules
   (a weekday inside the hours, outside the hours, the weekend, a public
   holiday, a school holiday if it is a school-days sign):

```json
{
  "image": "crown-st-2p.jpg",
  "selectedSide": "left",
  "expect": {
    "rawTextIncludes": ["2P", "8AM-6PM", "MON-FRI"],
    "plates": 2,
    "at": [
      { "when": "2026-09-15T10:00:00+10:00", "canPark": true, "timeLimitMinutes": 120 },
      { "when": "2026-09-15T19:00:00+10:00", "canPark": true, "timeLimitMinutes": null },
      { "when": "2026-10-05T10:00:00+11:00", "canPark": true, "timeLimitMinutes": null }
    ]
  }
}
```

Ground-truth the expected verdicts by reading the sign and the NSW Road
Rules, not by running the app. The point is to catch the app being wrong.

## Running it

```bash
vercel dev                                             # in one terminal
node scripts/eval-signs.js --base http://localhost:3000   # in another
```

Each case costs one model call. Instants beyond "now" are evaluated by
re-running the verdict engine locally on the plates the model returned, which
is the same code path the server uses.

## Targets

From `docs/PRICING.md`: no paywall until single-sign verdict accuracy is at
or above 90% on at least 200 labelled Sydney signs. Photos of signs are not
committed to this repository; keep them in `eval/cases/` locally or in a
private bucket and commit only the JSON.
