#!/usr/bin/env node
/* eslint-disable no-console */
// Renders the ParkSense mark to PNG without any image library, so the repo
// needs no native dependency to regenerate its icons. The mark is the same
// as public/favicon.svg: a rounded dark square with a white P. Output:
//   public/icon-192.png, public/icon-512.png   — standard PWA icons
//   public/icon-maskable-512.png               — extra padding for Android's mask
//   public/og-image.png                        — 1200×630 social preview
//
// Run: node scripts/make-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x15, 0x18, 0x1d];
const FG = [0xff, 0xff, 0xff];

// ─── The mark, in the favicon's 64-unit coordinate space ─────────────────────
// Stem plus a bowl: the favicon path, approximated with primitives that are
// cheap to sample. Coordinates come from the path in favicon.svg.
function insideP(x, y) {
  // stem
  if (x >= 22 && x < 29 && y >= 16 && y < 48) return true;
  // bowl outer: rect + right half-disc
  const outer =
    (x >= 22 && x < 35.5 && y >= 16 && y < 37.3) ||
    (x >= 35.5 && (x - 35.5) ** 2 / 11.5 ** 2 + (y - 26.65) ** 2 / 10.65 ** 2 <= 1);
  if (!outer) return false;
  // bowl inner hole
  const inner =
    (x >= 29 && x < 34.6 && y >= 22.3 && y < 31.4) ||
    (x >= 34.6 && (x - 34.6) ** 2 / 5 ** 2 + (y - 26.85) ** 2 / 4.55 ** 2 <= 1);
  return !inner;
}

function insideRoundedSquare(x, y, size, radius) {
  const rx = Math.max(0, Math.abs(x - size / 2) - (size / 2 - radius));
  const ry = Math.max(0, Math.abs(y - size / 2) - (size / 2 - radius));
  return rx * rx + ry * ry <= radius * radius;
}

// ─── Rasteriser with 4×4 supersampling ───────────────────────────────────────
function render({ width, height, sample }) {
  const px = Buffer.alloc(width * height * 4);
  const SS = 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
      }
      const n = SS * SS;
      const i = (y * width + x) * 4;
      const cov = a / n;
      px[i] = cov ? Math.round(r / (a / 255)) : 0;
      px[i + 1] = cov ? Math.round(g / (a / 255)) : 0;
      px[i + 2] = cov ? Math.round(b / (a / 255)) : 0;
      px[i + 3] = Math.round(cov);
    }
  }
  return px;
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Compositions ────────────────────────────────────────────────────────────
// `inset` is the fraction of the canvas left as padding on each side.
function icon(size, { inset = 0, rounded = true } = {}) {
  const box = size * (1 - inset * 2);
  const off = size * inset;
  return render({
    width: size, height: size,
    sample: (x, y) => {
      const u = ((x - off) / box) * 64;
      const v = ((y - off) / box) * 64;
      if (u < 0 || v < 0 || u >= 64 || v >= 64) return inset ? BG : null;
      if (rounded && !insideRoundedSquare(u, v, 64, 14)) return inset ? BG : null;
      return insideP(u, v) ? FG : BG;
    },
  });
}

function ogImage() {
  const W = 1200, H = 630, mark = 360;
  const ox = (W - mark) / 2, oy = (H - mark) / 2;
  return render({
    width: W, height: H,
    sample: (x, y) => {
      const u = ((x - ox) / mark) * 64;
      const v = ((y - oy) / mark) * 64;
      if (u >= 0 && v >= 0 && u < 64 && v < 64 && insideRoundedSquare(u, v, 64, 14)) {
        return insideP(u, v) ? FG : [0x2a, 0x2e, 0x36];
      }
      return BG;
    },
  });
}

const out = path.join(__dirname, '..', 'public');
const write = (name, w, h, rgba) => {
  fs.writeFileSync(path.join(out, name), encodePng(w, h, rgba));
  console.log(`wrote public/${name}`);
};

write('icon-192.png', 192, 192, icon(192));
write('icon-512.png', 512, 512, icon(512));
// Maskable icons are cropped to a circle/squircle by Android; keep the mark
// inside the inner 80% so nothing important is cut.
write('icon-maskable-512.png', 512, 512, icon(512, { inset: 0.1, rounded: false }));
write('og-image.png', 1200, 630, ogImage());
