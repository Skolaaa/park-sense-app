import { validateEvent } from '../../api/events';
import { summarise, MIN_SAMPLE, MIN_SAMPLE_FOR_HOURLY } from '../../api/street';
import { hashDeviceId, coarsenCoord, isAustralianCoord } from '../../api/_lib/request';

function makeRes() {
  return {
    _status: 200, _body: null, _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
}

const NOW = new Date('2026-09-15T10:00:00+10:00');
const base = { kind: 'scan', consent: true, lat: -33.8837, lon: 151.2101, street: 'Crown St', suburb: 'Surry Hills', canPark: true, verdictKind: 'time_limited', timeLimitMinutes: 120, confidence: 0.9 };

describe('validateEvent', () => {
  test('accepts a consenting scan and coarsens the location', () => {
    const { row, error } = validateEvent(base, { deviceId: 'device-abcdef12', now: NOW });
    expect(error).toBeUndefined();
    expect(row.lat).toBe(-33.884);
    expect(row.lon).toBe(151.21);
    expect(row.device_hash).toHaveLength(32);
    expect(row.device_hash).not.toContain('device-abcdef12');
    expect(row.local_hour).toBe(10);
    expect(row.local_weekday).toBe(2);
    expect(row.is_school_day).toBe(true);
    expect(row.is_public_holiday).toBe(false);
  });

  test('refuses without consent', () => {
    expect(validateEvent({ ...base, consent: false }, { deviceId: 'device-abcdef12' }).error).toBe('consent_required');
  });

  test('refuses without a device id', () => {
    expect(validateEvent(base, { deviceId: null }).error).toBe('device_required');
  });

  test('refuses an unknown kind', () => {
    expect(validateEvent({ ...base, kind: 'selfie' }, { deviceId: 'device-abcdef12' }).error).toBe('invalid_kind');
  });

  test('refuses a location outside Australia', () => {
    expect(validateEvent({ ...base, lat: 51.5, lon: -0.12 }, { deviceId: 'device-abcdef12' }).error).toBe('invalid_location');
  });

  test('scans need a location, feedback does not', () => {
    expect(validateEvent({ kind: 'scan', consent: true }, { deviceId: 'device-abcdef12' }).error).toBe('location_required');
    const fb = validateEvent({ kind: 'feedback', consent: true, feedback: 'Read 2P as 4P', rawText: '2P' }, { deviceId: 'device-abcdef12' });
    expect(fb.error).toBeUndefined();
    expect(fb.row.feedback).toBe('Read 2P as 4P');
  });

  test('outcomes need a valid outcome', () => {
    expect(validateEvent({ ...base, kind: 'outcome' }, { deviceId: 'device-abcdef12' }).error).toBe('outcome_required');
    expect(validateEvent({ ...base, kind: 'outcome', outcome: 'ticket' }, { deviceId: 'device-abcdef12' }).row.outcome).toBe('ticket');
  });

  test('drops junk in optional fields instead of storing it', () => {
    const { row } = validateEvent({ ...base, verdictKind: 'hacked', timeLimitMinutes: -5, confidence: 7, street: 'x'.repeat(500) }, { deviceId: 'device-abcdef12' });
    expect(row.verdict_kind).toBeNull();
    expect(row.time_limit_minutes).toBeNull();
    expect(row.confidence).toBeNull();
    expect(row.street).toHaveLength(120);
  });
});

describe('request helpers', () => {
  test('hashDeviceId is stable and salted', () => {
    const a = hashDeviceId('device-abcdef12');
    expect(a).toBe(hashDeviceId('device-abcdef12'));
    expect(a).not.toBe(hashDeviceId('device-abcdef13'));
    expect(hashDeviceId(null)).toBeNull();
  });
  test('coarsenCoord keeps three decimals', () => {
    expect(coarsenCoord(-33.88371)).toBe(-33.884);
  });
  test('isAustralianCoord bounds', () => {
    expect(isAustralianCoord(-33.9, 151.2)).toBe(true);
    expect(isAustralianCoord(40.7, -74)).toBe(false);
    expect(isAustralianCoord(NaN, 151)).toBe(false);
  });
});

describe('events handler', () => {
  test('acknowledges without storing when no database is configured', async () => {
    let handler;
    jest.isolateModules(() => { ({ default: handler } = require('../../api/events')); });
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '5.5.5.5', 'x-parksense-device': 'device-abcdef12' }, body: base }, res);
    expect(res._status).toBe(202);
    expect(res._body).toEqual({ stored: false, reason: 'not_configured' });
  });

  test('rejects a bad body with 400', async () => {
    let handler;
    jest.isolateModules(() => { ({ default: handler } = require('../../api/events')); });
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '5.5.5.6' }, body: { kind: 'scan' } }, res);
    expect(res._status).toBe(400);
  });

  test('stores the row when configured', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201, text: async () => '' });
    let handler;
    jest.isolateModules(() => { ({ default: handler } = require('../../api/events')); });
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '5.5.5.7', 'x-parksense-device': 'device-abcdef12' }, body: base }, res);
    expect(res._status).toBe(202);
    expect(res._body.stored).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/parking_events');
    expect(init.headers.Authorization).toBe('Bearer service-role');
    const sent = JSON.parse(init.body)[0];
    expect(sent.lat).toBe(-33.884);
    expect(sent).not.toHaveProperty('deviceId');
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete global.fetch;
  });
});

describe('street summarise', () => {
  const row = (over) => ({ kind: 'scan', created_at: '2026-09-15T00:00:00Z', street: 'Crown St', suburb: 'Surry Hills', can_park: true, time_limit_minutes: 120, duration_ms: null, outcome: null, local_hour: 10, ...over });

  test('reports insufficient data below the minimum sample', () => {
    const out = summarise([row(), row(), row()]);
    expect(out.status).toBe('insufficient_data');
    expect(out.sampleSize).toBe(3);
    expect(out.minimum).toBe(MIN_SAMPLE);
  });

  test('aggregates limits, restriction share, park rate and outcomes', () => {
    const rows = [
      row(), row(), row({ time_limit_minutes: 60 }), row({ can_park: false, time_limit_minutes: null }), row({ local_hour: 18 }),
      row({ kind: 'timer_start', local_hour: 10 }), row({ kind: 'timer_start', local_hour: 18 }), row({ kind: 'timer_start', local_hour: 18 }),
      row({ kind: 'timer_stop', duration_ms: 3_600_000 }), row({ kind: 'timer_stop', duration_ms: 1_800_000 }), row({ kind: 'timer_stop', duration_ms: 5_400_000 }),
      row({ kind: 'outcome', outcome: 'no_ticket' }), row({ kind: 'outcome', outcome: 'ticket' }), row({ kind: 'outcome', outcome: 'unsure' }),
    ];
    const out = summarise(rows, { now: Date.parse('2026-09-16T00:00:00Z') });
    expect(out.status).toBe('ok');
    expect(out.sampleSize).toBe(5);
    expect(out.street).toBe('Crown St');
    expect(out.typicalLimitMinutes).toBe(120);
    expect(out.restrictedShare).toBeCloseTo(0.2);
    expect(out.parkRate).toBeCloseTo(0.6);
    expect(out.medianStayMs).toBe(3_600_000);
    expect(out.ticketRate).toBeCloseTo(0.5);
    expect(out.outcomesReported).toBe(3);
    expect(out.busiestHours).toEqual([18, 10]);
    expect(out.availability.status).toBe('insufficient_data');
    expect(out.availability.minimum).toBe(MIN_SAMPLE_FOR_HOURLY);
  });

  test('exposes the hourly profile as a labelled proxy once the sample is large', () => {
    const rows = Array.from({ length: MIN_SAMPLE_FOR_HOURLY }, (_, i) => row({ local_hour: i % 24 }));
    const out = summarise(rows);
    expect(out.availability.status).toBe('proxy');
    expect(out.availability.byHour).toHaveLength(24);
    expect(out.availability.note).toMatch(/not how many spaces are free/);
  });
});
