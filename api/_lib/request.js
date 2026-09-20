// Small helpers for reading a request safely. Shared by every endpoint.

import { createHash } from 'node:crypto';

export function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

// The device id is an opaque token the client makes up and keeps in
// localStorage. It identifies an install, not a person. Anything that does
// not look like one is treated as absent rather than trusted.
const DEVICE_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function getDeviceId(req) {
  const fromHeader = req.headers['x-parksense-device'];
  const fromBody = req.body && typeof req.body === 'object' ? req.body.deviceId : undefined;
  const raw = typeof fromHeader === 'string' ? fromHeader : fromBody;
  return typeof raw === 'string' && DEVICE_RE.test(raw) ? raw : null;
}

// Stored data never carries the raw device id. The salt lives server-side, so
// a database dump cannot be joined back to a device without it.
export function hashDeviceId(deviceId) {
  if (!deviceId) return null;
  const salt = process.env.DEVICE_HASH_SALT || 'parksense-unsalted';
  return createHash('sha256').update(`${salt}:${deviceId}`).digest('hex').slice(0, 32);
}

export function json(res, status, body, headers = {}) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  return res.status(status).json(body);
}

// Australia, generously. Anything outside is treated as bad input rather
// than stored: the app is Sydney-only and a coordinate in the Atlantic is
// a bug or a probe, not data.
export function isAustralianCoord(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat <= -9 && lat >= -45 && lon >= 110 && lon <= 155;
}

// Three decimal places is roughly 110 m — enough to say "this street", not
// enough to say "this driveway". Every stored location goes through this.
export function coarsenCoord(n) {
  return Math.round(n * 1000) / 1000;
}
