// The client half of the community layer: posts opt-in parking events and
// reads street insights back. Every call is fire-and-forget and swallows
// failure, because none of this may ever stand between the user and the
// verdict.

import { Identity } from './identity';
import { Consent } from './consent';

// Nominatim's display_name is "12, Crown Street, Surry Hills, Sydney, ...".
// The street and suburb are what the aggregate keys on; the house number is
// dropped on purpose.
export function splitAddress(address) {
  if (!address || typeof address !== 'string') return { street: null, suburb: null };
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  const streetIdx = parts.findIndex((p) => !/^\d+[A-Za-z]?(-\d+)?$/.test(p));
  const street = streetIdx >= 0 ? parts[streetIdx] : null;
  const suburb = streetIdx >= 0 && parts[streetIdx + 1] ? parts[streetIdx + 1] : null;
  return { street, suburb };
}

async function post(payload) {
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...Identity.headers() },
      body: JSON.stringify({ ...payload, consent: true }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function locationFields(location) {
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)) return null;
  const { street, suburb } = splitAddress(location.address);
  return { lat: location.lat, lon: location.lon, street, suburb };
}

export const CommunityService = {
  // Scan / timer events need consent and a location; without either they
  // are dropped silently.
  recordScan(result) {
    if (!Consent.isGranted()) return Promise.resolve(false);
    const loc = locationFields(result?.location);
    if (!loc) return Promise.resolve(false);
    return post({
      kind: 'scan',
      ...loc,
      canPark: result.canPark,
      verdictKind: result.kind ?? null,
      timeLimitMinutes: result.timeLimitMinutes ?? null,
      confidence: result.confidence,
    });
  },

  recordTimerStart(result, durationMs) {
    if (!Consent.isGranted()) return Promise.resolve(false);
    const loc = locationFields(result?.location);
    if (!loc) return Promise.resolve(false);
    return post({ kind: 'timer_start', ...loc, verdictKind: result.kind ?? null, timeLimitMinutes: result.timeLimitMinutes ?? null, durationMs });
  },

  recordTimerStop(result, durationMs) {
    if (!Consent.isGranted()) return Promise.resolve(false);
    const loc = locationFields(result?.location);
    if (!loc) return Promise.resolve(false);
    return post({ kind: 'timer_stop', ...loc, durationMs });
  },

  recordOutcome(context, outcome) {
    if (!Consent.isGranted()) return Promise.resolve(false);
    const loc = locationFields(context?.location);
    if (!loc) return Promise.resolve(false);
    return post({ kind: 'outcome', ...loc, outcome, verdictKind: context.kind ?? null, timeLimitMinutes: context.timeLimitMinutes ?? null });
  },

  // A wrong-reading report is worth having with or without community
  // consent, because it is about the reading, not the place. Location is
  // attached only if the user has opted in.
  reportWrongReading(result, feedback) {
    const loc = Consent.isGranted() ? locationFields(result?.location) : null;
    return post({
      kind: 'feedback',
      ...(loc || {}),
      feedback,
      rawText: result?.rawText ?? null,
      canPark: result?.canPark ?? null,
      verdictKind: result?.kind ?? null,
      confidence: result?.confidence ?? null,
    });
  },

  async getStreetInsights(location) {
    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)) return null;
    try {
      const res = await fetch(`/api/street?lat=${location.lat.toFixed(4)}&lon=${location.lon.toFixed(4)}`, { headers: Identity.headers() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};
