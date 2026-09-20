import { CommunityService, splitAddress } from './communityService';
import { Consent } from './consent';

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
});
afterEach(() => { delete global.fetch; });

const result = {
  canPark: true, kind: 'time_limited', timeLimitMinutes: 120, confidence: 0.9, rawText: '2P',
  location: { lat: -33.8837, lon: 151.2101, address: '12, Crown Street, Surry Hills, Sydney, NSW' },
};

describe('splitAddress', () => {
  test('drops the house number and keeps street and suburb', () => {
    expect(splitAddress('12, Crown Street, Surry Hills, Sydney, NSW')).toEqual({ street: 'Crown Street', suburb: 'Surry Hills' });
  });
  test('works without a number', () => {
    expect(splitAddress('Crown Street, Surry Hills')).toEqual({ street: 'Crown Street', suburb: 'Surry Hills' });
  });
  test('handles nothing', () => {
    expect(splitAddress(null)).toEqual({ street: null, suburb: null });
  });
});

describe('consent gating', () => {
  test('scan events are not sent without consent', async () => {
    expect(await CommunityService.recordScan(result)).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('scan events are sent with consent, street only, and never the address', async () => {
    Consent.set('granted');
    expect(await CommunityService.recordScan(result)).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/events');
    const body = JSON.parse(init.body);
    expect(body).toEqual(expect.objectContaining({ kind: 'scan', consent: true, street: 'Crown Street', suburb: 'Surry Hills', canPark: true, verdictKind: 'time_limited', timeLimitMinutes: 120 }));
    expect(body).not.toHaveProperty('address');
    expect(body).not.toHaveProperty('rawText');
    expect(init.headers['x-parksense-device']).toBeDefined();
  });

  test('scan events without a location are dropped even with consent', async () => {
    Consent.set('granted');
    expect(await CommunityService.recordScan({ ...result, location: null })).toBe(false);
  });

  test('a wrong-reading report goes without consent, and without location', async () => {
    expect(await CommunityService.reportWrongReading(result, 'It says 1P')).toBe(true);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.kind).toBe('feedback');
    expect(body.feedback).toBe('It says 1P');
    expect(body.rawText).toBe('2P');
    expect(body.lat).toBeUndefined();
  });

  test('a wrong-reading report carries location once consented', async () => {
    Consent.set('granted');
    await CommunityService.reportWrongReading(result, 'It says 1P');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.lat).toBe(-33.8837);
  });

  test('outcome and timer events carry the session context', async () => {
    Consent.set('granted');
    await CommunityService.recordTimerStart(result, 7200000);
    await CommunityService.recordTimerStop(result, 3600000);
    await CommunityService.recordOutcome(result, 'ticket');
    const kinds = global.fetch.mock.calls.map(([, init]) => JSON.parse(init.body).kind);
    expect(kinds).toEqual(['timer_start', 'timer_stop', 'outcome']);
    expect(JSON.parse(global.fetch.mock.calls[2][1].body).outcome).toBe('ticket');
  });

  test('a failed post never throws', async () => {
    Consent.set('granted');
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    expect(await CommunityService.recordScan(result)).toBe(false);
  });
});

describe('getStreetInsights', () => {
  test('returns the parsed payload', async () => {
    const out = await CommunityService.getStreetInsights({ lat: -33.88, lon: 151.21 });
    expect(out).toEqual({ status: 'ok' });
    expect(global.fetch.mock.calls[0][0]).toBe('/api/street?lat=-33.8800&lon=151.2100');
  });
  test('returns null without a location or on failure', async () => {
    expect(await CommunityService.getStreetInsights(null)).toBeNull();
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    expect(await CommunityService.getStreetInsights({ lat: 1, lon: 1 })).toBeNull();
  });
});
