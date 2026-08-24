// Tests for api/analyze.js serverless handler.
// Each test that exercises rate limiting uses jest.isolateModules so the
// module-level rateLimitStore starts fresh.

function makeReq(overrides = {}) {
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': '1.2.3.4' },
    body: { imageData: 'data:image/jpeg;base64,abc', selectedSide: null },
    socket: { remoteAddress: '1.2.3.4' },
    ...overrides,
  };
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(key, val) { this._headers[key] = val; },
  };
  return res;
}

// ─── HTTP method guard ────────────────────────────────────────────────────────

test('returns 405 for non-POST requests', async () => {
  let handler;
  jest.isolateModules(() => {
    ({ default: handler } = require('../../api/analyze'));
  });
  const res = makeRes();
  await handler(makeReq({ method: 'GET' }), res);
  expect(res._status).toBe(405);
  expect(res._body.error).toBe('Method not allowed');
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('rate limiting', () => {
  test('allows requests under the limit', async () => {
    let handler;
    jest.isolateModules(() => {
      ({ default: handler } = require('../../api/analyze'));
    });

    // No API key configured, so we expect 503 — but NOT 429, proving rate limit passed.
    delete process.env.OPENAI_API_KEY;
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(503);
  });

  test('returns 429 after exceeding 10 requests per minute from same IP', async () => {
    let handler;
    jest.isolateModules(() => {
      ({ default: handler } = require('../../api/analyze'));
    });

    delete process.env.OPENAI_API_KEY;
    const ip = '9.9.9.9';

    // First 10 should be allowed (will hit 503 due to missing key, not 429).
    for (let i = 0; i < 10; i++) {
      const res = makeRes();
      await handler(makeReq({ headers: { 'x-forwarded-for': ip } }), res);
      expect(res._status).not.toBe(429);
    }

    // 11th request from the same IP should be rate limited.
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-forwarded-for': ip } }), res);
    expect(res._status).toBe(429);
    expect(res._body.error).toBe('rate_limit');
    expect(res._body.retryAfter).toBeGreaterThan(0);
    expect(res._headers['Retry-After']).toBeDefined();
  });

  test('different IPs do not share rate limit counters', async () => {
    let handler;
    jest.isolateModules(() => {
      ({ default: handler } = require('../../api/analyze'));
    });

    delete process.env.OPENAI_API_KEY;

    // Exhaust limit for IP A.
    for (let i = 0; i < 10; i++) {
      await handler(makeReq({ headers: { 'x-forwarded-for': '10.0.0.1' } }), makeRes());
    }

    // IP B should still be allowed.
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-forwarded-for': '10.0.0.2' } }), res);
    expect(res._status).not.toBe(429);
  });
});

// ─── API key guard ────────────────────────────────────────────────────────────

test('returns 503 when OPENAI_API_KEY is not set', async () => {
  let handler;
  jest.isolateModules(() => {
    ({ default: handler } = require('../../api/analyze'));
  });
  delete process.env.OPENAI_API_KEY;
  const res = makeRes();
  await handler(makeReq(), res);
  expect(res._status).toBe(503);
  expect(res._body.error).toBe('no_key');
});

// ─── Request body validation ──────────────────────────────────────────────────

test('returns 400 when imageData is missing', async () => {
  let handler;
  jest.isolateModules(() => {
    ({ default: handler } = require('../../api/analyze'));
  });
  process.env.OPENAI_API_KEY = 'sk-test';
  const res = makeRes();
  await handler(makeReq({ body: { selectedSide: null } }), res);
  expect(res._status).toBe(400);
  expect(res._body.error).toBe('imageData is required');
  delete process.env.OPENAI_API_KEY;
});

// ─── OpenAI call ─────────────────────────────────────────────────────────────

describe('OpenAI integration', () => {
  let handler;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
    jest.isolateModules(() => {
      ({ default: handler } = require('../../api/analyze'));
    });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    jest.restoreAllMocks();
  });

  function mockOpenAI(status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  }

  test('returns 502 when OpenAI responds with an error', async () => {
    mockOpenAI(429, { error: { message: 'Rate limit exceeded' } });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(502);
    expect(res._body.error).toBe('Rate limit exceeded');
  });

  test('returns 502 when the model response cannot be parsed as JSON', async () => {
    mockOpenAI(200, {
      choices: [{ message: { content: 'Sorry, I cannot help with that.' } }],
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(502);
    expect(res._body.error).toBe('parse_error');
  });

  test('returns 502 when the parsed JSON is missing required fields', async () => {
    const incompleteResult = JSON.stringify({ canPark: true }); // missing confidence and rawText
    mockOpenAI(200, {
      choices: [{ message: { content: incompleteResult } }],
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(502);
    expect(res._body.error).toMatch(/Missing field/);
  });

  test('returns 200 with validated result for a well-formed model response', async () => {
    const validResult = {
      noSignFound: false,
      canPark: true,
      timeLimit: '2 hours',
      days: ['Monday'],
      hours: '9:00 AM - 6:00 PM',
      paymentRequired: false,
      vehicleTypes: ['Passenger vehicles'],
      specialConditions: [],
      confidence: 0.9,
      rawText: '2P 9AM-6PM MON',
      applicableSide: 'both',
      estimatedFine: null,
    };
    mockOpenAI(200, {
      choices: [{ message: { content: JSON.stringify(validResult) } }],
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.canPark).toBe(true);
    expect(res._body.model).toBe('gpt-4o');
    expect(res._body.timestamp).toBeDefined();
  });

  test('clamps confidence to 0.5 when the model returns an out-of-range value', async () => {
    const result = {
      canPark: false, confidence: 99, rawText: 'No Stopping',
      noSignFound: false, timeLimit: null, days: [], hours: null,
      paymentRequired: false, vehicleTypes: [], specialConditions: [],
      applicableSide: null, estimatedFine: '~$344',
    };
    mockOpenAI(200, { choices: [{ message: { content: JSON.stringify(result) } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.confidence).toBe(0.5);
  });

  test('strips markdown code fences from the model response before parsing', async () => {
    const valid = {
      canPark: true, confidence: 0.8, rawText: '1P',
      noSignFound: false, timeLimit: '1 hour', days: [], hours: null,
      paymentRequired: false, vehicleTypes: [], specialConditions: [],
      applicableSide: 'both', estimatedFine: null,
    };
    const fenced = '```json\n' + JSON.stringify(valid) + '\n```';
    mockOpenAI(200, { choices: [{ message: { content: fenced } }] });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.rawText).toBe('1P');
  });
});
