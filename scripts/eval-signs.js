#!/usr/bin/env node
/* eslint-disable no-console */
// Accuracy harness. Runs every labelled case in eval/cases/ through a live
// /api/analyze endpoint and reports how often the verdict matched.
//
// This is the measurement the product's accuracy claim rests on. Without a
// number from this script there is no accuracy claim, only a hope.
//
// Usage:
//   node scripts/eval-signs.js --base https://parksense.example.com
//   node scripts/eval-signs.js --base http://localhost:3000 --at 2026-10-05T10:00:00+11:00
//
// A case is a JSON file next to its photo:
//   eval/cases/crown-st-2p.json
//   {
//     "image": "crown-st-2p.jpg",
//     "selectedSide": "left",            // or "right" or null
//     "expect": {
//       "rawTextIncludes": ["2P", "MON-FRI"],
//       "plates": 2,                     // optional: number of plates expected
//       "at": [                          // verdicts at specific instants
//         { "when": "2026-09-15T10:00:00+10:00", "canPark": true,  "timeLimitMinutes": 120 },
//         { "when": "2026-10-05T10:00:00+11:00", "canPark": true,  "timeLimitMinutes": null }
//       ]
//     }
//   }
//
// The endpoint evaluates "now"; to check other instants the harness re-runs
// the verdict engine locally on the plates the model returned, which is
// exactly what the server does. So each case costs one model call however
// many instants it checks.

const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : [])).filter(Boolean));
const BASE = (args.base || 'http://localhost:3000').replace(/\/$/, '');
const CASES_DIR = path.join(__dirname, '..', 'eval', 'cases');

async function main() {
  const { decide } = await import('../api/_lib/verdict.js');
  const files = fs.existsSync(CASES_DIR) ? fs.readdirSync(CASES_DIR).filter((f) => f.endsWith('.json')) : [];
  if (files.length === 0) {
    console.error(`No cases in eval/cases/. Add labelled signs first — see eval/README.md.`);
    process.exit(2);
  }

  let plateCases = 0, plateHits = 0, textCases = 0, textHits = 0, verdictCases = 0, verdictHits = 0;
  const failures = [];

  for (const file of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), 'utf8'));
    const imagePath = path.join(CASES_DIR, spec.image);
    const mime = /\.png$/i.test(spec.image) ? 'image/png' : 'image/jpeg';
    const imageData = `data:${mime};base64,${fs.readFileSync(imagePath).toString('base64')}`;

    const res = await fetch(`${BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-parksense-device': 'eval-harness-01' },
      body: JSON.stringify({ imageData, selectedSide: spec.selectedSide ?? null }),
    });
    if (!res.ok) {
      failures.push(`${file}: HTTP ${res.status} ${await res.text()}`);
      continue;
    }
    const result = await res.json();
    const exp = spec.expect || {};

    if (Array.isArray(exp.rawTextIncludes)) {
      textCases++;
      const missing = exp.rawTextIncludes.filter((t) => !String(result.rawText).toUpperCase().includes(t.toUpperCase()));
      if (missing.length === 0) textHits++; else failures.push(`${file}: rawText missing ${missing.join(', ')} — got "${result.rawText}"`);
    }
    if (Number.isInteger(exp.plates)) {
      plateCases++;
      if ((result.plates || []).length === exp.plates) plateHits++;
      else failures.push(`${file}: expected ${exp.plates} plates, got ${(result.plates || []).length}`);
    }
    for (const at of exp.at || []) {
      verdictCases++;
      const v = decide(result.plates || [], { selectedSide: spec.selectedSide ?? null, now: new Date(at.when) });
      const okPark = at.canPark === undefined || v.canPark === at.canPark;
      const okLimit = at.timeLimitMinutes === undefined || v.timeLimitMinutes === at.timeLimitMinutes;
      if (okPark && okLimit) verdictHits++;
      else failures.push(`${file} @ ${at.when}: expected canPark=${at.canPark} limit=${at.timeLimitMinutes}, got canPark=${v.canPark} limit=${v.timeLimitMinutes} (${v.kind})`);
    }
  }

  const pct = (h, n) => (n ? `${((h / n) * 100).toFixed(1)}% (${h}/${n})` : 'n/a');
  console.log(`\nParkSense accuracy — ${files.length} cases against ${BASE}\n`);
  console.log(`  Transcription   ${pct(textHits, textCases)}`);
  console.log(`  Plate count     ${pct(plateHits, plateCases)}`);
  console.log(`  Verdict         ${pct(verdictHits, verdictCases)}`);
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log(`  • ${f}`);
  }
  console.log('');
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
