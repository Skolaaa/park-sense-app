// Two layers, because they answer different questions.
//
// 1. Per-IP, per-minute, in memory. Fast, first line, catches a tight loop.
//    It lives inside one warm instance, so it is a speed bump, not a wall.
//
// 2. Per-device, per-day, in the database. This is the real ceiling on what
//    one install can cost. It survives cold starts and is shared across
//    instances. Without a database it falls back to memory and says so.

import { rpc, isConfigured } from './db.js';
import { sydneyParts } from './calendar.js';

const WINDOW_MS = 60_000;
const stores = new Map(); // name → Map(key → { count, windowStart })

function store(name) {
  if (!stores.has(name)) stores.set(name, { map: new Map(), lastSweep: Date.now() });
  return stores.get(name);
}

function sweep(s, now) {
  if (now - s.lastSweep < WINDOW_MS) return;
  s.lastSweep = now;
  for (const [key, entry] of s.map) {
    if (now - entry.windowStart > WINDOW_MS) s.map.delete(key);
  }
}

export function checkIpLimit(ip, { name = 'default', limit = 10, now = Date.now() } = {}) {
  const s = store(name);
  sweep(s, now);
  const entry = s.map.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    s.map.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

export const DEFAULT_DAILY_QUOTA = 40;

// Increments and checks the device's count for today (Sydney day). Returns
// { allowed, used, limit, shared } where `shared` says whether the count is
// backed by the database or only by this instance's memory.
export async function checkDeviceQuota(deviceId, { limit = Number(process.env.SCAN_DAILY_QUOTA) || DEFAULT_DAILY_QUOTA, now = new Date() } = {}) {
  if (!deviceId) return { allowed: true, used: 0, limit, shared: false, anonymous: true };
  const day = sydneyParts(now).dateKey;

  if (isConfigured()) {
    try {
      const used = await rpc('increment_scan_quota', { p_device: deviceId, p_day: day });
      const count = typeof used === 'number' ? used : Number(used?.[0]?.increment_scan_quota ?? used?.[0] ?? NaN);
      if (Number.isFinite(count)) {
        return { allowed: count <= limit, used: count, limit, shared: true };
      }
    } catch (err) {
      console.error('[ParkSense] quota rpc failed, falling back to memory:', err.message);
    }
  }

  const s = store('quota');
  const key = `${deviceId}:${day}`;
  const entry = s.map.get(key) || { count: 0, windowStart: now.getTime() };
  entry.count++;
  s.map.set(key, entry);
  return { allowed: entry.count <= limit, used: entry.count, limit, shared: false };
}

export function _resetRateLimits() {
  stores.clear();
}
