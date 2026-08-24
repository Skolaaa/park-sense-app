#!/usr/bin/env node
/* eslint-disable no-console */
// Fails the build if a secret reached the client bundle, or if source code
// references a REACT_APP_* variable whose name implies a secret.
//
// This exists because of a real incident: from Jul 2025 to Apr 2026 the app
// read process.env.REACT_APP_OPENAI_API_KEY in src/. Create React App inlines
// any REACT_APP_* value that is *referenced* in code, so the OpenAI key was
// compiled into the public production bundle for roughly nine months.
//
// Nothing about that was visible in git — the key was never committed. Only
// the deployed artefact carried it, which is exactly what this script checks.

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const SRC_DIR = path.join(__dirname, '..', 'src');
const API_DIR = path.join(__dirname, '..', 'api');

// Values that are public by design. Mapbox `pk.` tokens are publishable and are
// meant to ship to the browser; they are restricted by URL, not by secrecy.
const ALLOWED_CLIENT_VARS = new Set(['REACT_APP_MAPBOX_ACCESS_TOKEN']);

const SECRET_PATTERNS = [
  { name: 'OpenAI key', re: /\bsk-(proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'Mapbox secret token', re: /\bsk\.eyJ[A-Za-z0-9._-]{20,}/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Slack token', re: /\bxox[abprs]-[0-9A-Za-z-]{10,}/ },
  { name: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const failures = [];

// 1. Scan built assets for anything that looks like a live credential.
const assets = walk(BUILD_DIR).filter((f) => /\.(js|css|map|html|json|txt)$/.test(f));
if (assets.length === 0) {
  console.error('No build output found. Run `npm run build` before this check.');
  process.exit(2);
}
for (const file of assets) {
  const content = fs.readFileSync(file, 'utf8');
  for (const { name, re } of SECRET_PATTERNS) {
    const hit = content.match(re);
    if (hit) {
      // Report the finding, never the value.
      failures.push(
        `${name} found in ${path.relative(process.cwd(), file)} ` +
          `(matched ${hit[0].slice(0, 6)}… — value withheld)`
      );
    }
  }
}

// 2. Catch the root cause earlier: a secret-shaped REACT_APP_* var referenced
//    in client source will be inlined at build time.
const clientRefs = new Map();
for (const file of [...walk(SRC_DIR), ...walk(API_DIR)]) {
  if (!/\.(js|jsx|ts|tsx)$/.test(file) || /\.test\./.test(file)) continue;
  const isClient = file.startsWith(SRC_DIR);
  if (!isClient) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const m of content.matchAll(/process\.env\.(REACT_APP_[A-Z0-9_]+)/g)) {
    const varName = m[1];
    if (ALLOWED_CLIENT_VARS.has(varName)) continue;
    if (/(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/.test(varName)) {
      clientRefs.set(varName, path.relative(process.cwd(), file));
    }
  }
}
for (const [varName, file] of clientRefs) {
  failures.push(
    `${file} reads ${varName} in client code. Create React App inlines ` +
      `REACT_APP_* values into the public bundle — move it server-side ` +
      `(api/) and drop the REACT_APP_ prefix, or add it to ALLOWED_CLIENT_VARS ` +
      `if it is genuinely public.`
  );
}

if (failures.length > 0) {
  console.error('\nSecret scan FAILED:\n');
  for (const f of failures) console.error(`  • ${f}`);
  console.error('\nDo not deploy. Rotate anything that was exposed.\n');
  process.exit(1);
}

console.log(`Secret scan passed — ${assets.length} build assets, no credentials found.`);
