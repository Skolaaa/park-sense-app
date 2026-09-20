// Tests for api/analyze.js serverless handler.
// Each test that exercises rate limiting uses jest.isolateModules so the
// module-level rate-limit stores start fresh.

function makeReq(overrides = {}) {
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': '1.2.3.4', 'x-parksense-device': 'device-abcdef12' },
    body: { imageData: 'data:image/jpeg;base64,abc', selectedSide: null },
    socket: { remoteAddress: '1.2.3.4' },
    ...overrides,
  };
}

function makeRes() {
  return {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(key, val) { this._headers[key] = val; },
  };
}

function load() {
  let mod;
  jest.isolateModules(() => {
    mod = require('../../api/analyze');
  });
  return mod;
}

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.SCAN_DAILY_QUOTA;
  jest.restoreAllMocks();
  delete global.fetch;
});

// ─── HTTP method guard ────────────────────────────────────────────────────────

test('returns 405 for non-POST requests', async () => {
  const { default: handler } = load();
  const res = makeRes();
  await handler(makeReq({ method: 'GET' }), res);
  expect(res._status).toBe(405);
  expect(res._body.error).toBe('Method not allowed');
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('rate limiting', () => {
  test('allows requests under the limit', async () => {
    const { default: handler } = load();
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(503); // no key, but not 429
  });

  test('returns 429 after exceeding 10 requests per minute from same IP', async () => {
    const { default: handler } = load();
    const ip = '9.9.9.9';
    for (let i = 0; i < 10; i++) {
      const res = makeRes();
      await handler(makeReq({ headers: { 'x-forwarded-for': ip } }), res);
      expect(res._status).not.toBe(429);
    }
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-forwarded-for': ip } }), res);
    expect(res._status).toBe(429);
    expect(res._body.error).toBe('rate_limit');
    expect(res._body.retryAfter).toBeGreaterThan(0);
    expect(res._headers['Retry-After']).toBeDefined();
  });

  test('different IPs do not share rate limit counters', async () => {
    const { default: handler } = load();
    for (let i = 0; i < 10; i++) {
      await handler(makeReq({ headers: { 'x-forwarded-for': '10.0.0.1' } }), makeRes());
    }
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-forwarded-for': '10.0.0.2' } }), res);
    expect(res._status).not.toBe(429);
  });
});

// ─── Daily device quota ───────────────────────────────────────────────────────

describe('device quota', () => {
  test('returns 429 quota once a device exceeds its daily allowance', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.SCAN_DAILY_QUOTA = '2';
    const { default: handler } = load();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const headers = (ip) => ({ 'x-forwarded-for': ip, 'x-parksense-device': 'device-quota-1' });
    // Two allowed (they fail later at OpenAI, which is fine), the third is blocked before the model call.
    await handler(makeReq({ headers: headers('1.1.1.1') }), makeRes());
    await handler(makeReq({ headers: headers('1.1.1.2') }), makeRes());
    const calls = global.fetch.mock.calls.length;
    const res = makeRes();
    await handler(makeReq({ headers: headers('1.1.1.3') }), res);
    expect(res._status).toBe(429);
    expect(res._body.error).toBe('quota');
    expect(res._body.limit).toBe(2);
    // The blocked request never reached OpenAI.
    const openAiCalls = global.fetch.mock.calls.filter(([url]) => String(url).includes('openai.com')).length;
    expect(openAiCalls).toBeLessThanOrEqual(calls);
  });

  test('a request with no device id is not quota-limited', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.SCAN_DAILY_QUOTA = '1';
    const { default: handler } = load();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    for (let i = 0; i < 3; i++) {
      const res = makeRes();
      await handler(makeReq({ headers: { 'x-forwarded-for': `2.2.2.${i}` } }), res);
      expect(res._status).not.toBe(429);
    }
  });
});

// ─── API key guard ────────────────────────────────────────────────────────────

test('returns 503 when OPENAI_API_KEY is not set', async () => {
  const { default: handler } = load();
  const res = makeRes();
  await handler(makeReq(), res);
  expect(res._status).toBe(503);
  expect(res._body.error).toBe('no_key');
});

// ─── Request body validation ──────────────────────────────────────────────────

test('returns 400 when imageData is missing', async () => {
  process.env.OPENAI_API_KEY = 'sk-test';
  const { default: handler } = load();
  const res = makeRes();
  await handler(makeReq({ body: { selectedSide: null } }), res);
  expect(res._status).toBe(400);
  expect(res._body.error).toBe('imageData is required');
});

// ─── OpenAI call ─────────────────────────────────────────────────────────────

describe('OpenAI integration', () => {
  let handler;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
    ({ default: handler } = load());
  });

  function mockOpenAI(status, body) {
    global.fetch = jest.fn().mockImplementation(async (url) => {
      if (String(url).includes('openai.com')) {
        return { ok: status >= 200 && status < 300, status, json: async () => body };
      }
      // The NSW calendar fetch: fail it so tests use the bundled table.
      return { ok: false, status: 500, json: async () => ({}), text: async () => '' };
    });
  }

  const validPlate = {
    text: '2P 8AM-6PM MON-FRI', kind: 'time_limited', timeLimitMinutes: 120,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '08:00', endTime: '18:00',
    publicHolidayClause: 'silent', schoolDaysOnly: false, arrow: null,
    paymentRequired: false, permitExcepted: false, vehicleTypes: [],
  };

  test('returns 502 when OpenAI responds with an error', async () => {
    mockOpenAI(429, { error: { message: 'Rate limit exceeded' } });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(502);
    expect(res._body.error).toBe('Rate limit exceeded');
  });

  test('returns 502 when the model response cannot be parsed as JSON', async () => {
    mockOpenAI(200, { choices: [{ message: { content: 'Sorry, I cannot help with that.' } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(502);
    expect(res._body.error).toBe('parse_error');
  });

  test('returns 502 when a plate-less response is missing required fields', async () => {
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify({ canPark: true }) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(502);
    expect(res._body.error).toMatch(/Missing field/);
  });

  test('sends a transcription prompt that forbids the model deciding the verdict', async () => {
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify({ plates: [validPlate], rawText: '2P', confidence: 0.9 }) } }] });
    await handler(makeReq({ body: { imageData: 'data:image/jpeg;base64,abc', selectedSide: 'left' } }), makeRes());
    const [, init] = global.fetch.mock.calls.find(([url]) => String(url).includes('openai.com'));
    const payload = JSON.parse(init.body);
    expect(payload.response_format).toEqual({ type: 'json_object' });
    expect(payload.messages[0].content).toMatch(/Do NOT decide whether the driver may park/);
    expect(payload.messages[0].content).toMatch(/LEFT side/);
    expect(payload.messages[0].content).toMatch(/No Parking: ~\$140/);
    expect(payload.messages[0].content).not.toMatch(/\$344/);
  });

  test('turns plates into a verdict, with timeline, fine and calendar attached', async () => {
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify({
      noSignFound: false, rawText: '2P 8AM-6PM MON-FRI', confidence: 0.92, observations: ['Slight glare on the top plate'], plates: [validPlate],
    }) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    const b = res._body;
    expect(typeof b.canPark).toBe('boolean');
    expect(['time_limited', 'unrestricted']).toContain(b.kind);
    expect(b.plates).toHaveLength(1);
    expect(b.plates[0].kind).toBe('time_limited');
    expect(Array.isArray(b.timeline)).toBe(true);
    expect(b.timeline.length).toBeGreaterThan(0);
    expect(b.calendar).toEqual(expect.objectContaining({ dateKey: expect.any(String), isPublicHoliday: expect.any(Boolean), isSchoolDay: expect.any(Boolean) }));
    expect(b.specialConditions).toContain('Slight glare on the top plate');
    // Described from the plate whether or not it is in force right now.
    expect(b.days).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    expect(b.hours).toBe('8:00 AM - 6:00 PM');
    expect(b.model).toBe('gpt-4o');
    expect(b.rulesVersion).toBeDefined();
    expect(b.timestamp).toBeDefined();
    if (b.kind === 'time_limited') {
      expect(b.timeLimit).toBe('2 hours');
      expect(b.timeLimitMinutes).toBe(120);
      expect(b.estimatedFine).toBe('~$140');
      expect(b.fine.kind).toBe('time_limited');
    }
  });

  test('a No Stopping plate in force returns canPark=false with the No Stopping fine', async () => {
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify({
      rawText: 'NO STOPPING', confidence: 0.95,
      plates: [{ ...validPlate, text: 'NO STOPPING', kind: 'no_stopping', timeLimitMinutes: null, days: [], startTime: null, endTime: null }],
    }) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.canPark).toBe(false);
    expect(res._body.kind).toBe('no_stopping');
    expect(res._body.estimatedFine).toBe('~$330');
    expect(res._body.timeline).toHaveLength(1);
  });

  test('an unclassified plate caps confidence so the client asks the user to check', async () => {
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify({
      rawText: '2P / AREA 12', confidence: 0.95,
      plates: [validPlate, { ...validPlate, text: 'AREA 12', kind: 'other' }],
    }) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._body.uncertain).toBe(true);
    expect(res._body.confidence).toBeLessThanOrEqual(0.6);
    expect(res._body.specialConditions.join(' ')).toMatch(/AREA 12/);
  });

  test('noSignFound short-circuits with confidence 0 and no plates', async () => {
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify({ noSignFound: true, rawText: '', confidence: 0, plates: [] }) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.noSignFound).toBe(true);
    expect(res._body.confidence).toBe(0);
    expect(res._body.plates).toEqual([]);
  });

  test('still accepts the legacy verdict shape and labels it', async () => {
    const legacy = {
      noSignFound: false, canPark: true, timeLimit: '2 hours', days: ['Monday'], hours: '9:00 AM - 6:00 PM',
      paymentRequired: false, vehicleTypes: [], specialConditions: [], confidence: 0.9, rawText: '2P', applicableSide: 'both', estimatedFine: null,
    };
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify(legacy) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.canPark).toBe(true);
    expect(res._body.legacy).toBe(true);
    expect(res._body.calendar).toBeDefined();
  });

  test('clamps an out-of-range confidence to 0.5', async () => {
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify({ rawText: '2P', confidence: 99, plates: [validPlate] }) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._body.confidence).toBe(0.5);
  });

  test('strips markdown code fences from the model response before parsing', async () => {
    const fenced = '```json\n' + JSON.stringify({ rawText: '1P', confidence: 0.8, plates: [{ ...validPlate, text: '1P', timeLimitMinutes: 60 }] }) + '\n```';
    mockOpenAI(200, { choices: [{ message: { content: fenced } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.rawText).toBe('1P');
  });
});

describe('formatMinutes', () => {
  test('produces strings the client parser understands', () => {
    const { formatMinutes } = load();
    expect(formatMinutes(120)).toBe('2 hours');
    expect(formatMinutes(60)).toBe('1 hour');
    expect(formatMinutes(30)).toBe('30 minutes');
    expect(formatMinutes(90)).toBe('1 hour 30 minutes');
    expect(formatMinutes(null)).toBeNull();
  });
});
