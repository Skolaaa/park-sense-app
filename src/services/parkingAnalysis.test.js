import { ParkingAnalysisService, validateParkingResult } from './parkingAnalysis';

beforeEach(() => {
  // Mock optimizeImage — tests don't need a real canvas/image pipeline.
  jest.spyOn(ParkingAnalysisService, 'optimizeImage').mockResolvedValue('data:image/jpeg;base64,mock');
  // Mock getMockResponse — tests for analyzeImage routing logic should not
  // couple to getMockResponse's implementation or its 2-second artificial delay.
  jest.spyOn(ParkingAnalysisService, 'getMockResponse').mockResolvedValue({ isMockData: true });
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── analyzeImage ────────────────────────────────────────────────────────────

describe('ParkingAnalysisService.analyzeImage', () => {
  test('returns mock data when a network error occurs (TypeError)', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc');
    expect(result.isMockData).toBe(true);
  });

  test('returns mock data on 503 (API key not configured)', async () => {
    global.fetch.mockResolvedValue({ status: 503, ok: false });
    const result = await ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc');
    expect(result.isMockData).toBe(true);
  });

  // Verifies the AbortController is actually wired up — if the signal were
  // not passed to fetch, this test would fail (options.signal would be undefined).
  test('passes an AbortSignal to fetch', async () => {
    global.fetch.mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ canPark: true, confidence: 0.9, rawText: '' }),
    });
    await ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc');
    const [, options] = global.fetch.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  // Verifies the abort timer is registered with the correct 45-second duration.
  // Combined with the AbortSignal and AbortError catch tests, this gives full
  // coverage: the signal is wired up, the duration is correct, and the error
  // message is right.
  test('registers a 45-second abort timeout', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    global.fetch.mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ canPark: true, confidence: 0.9, rawText: '' }),
    });
    await ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc');
    const delays = setTimeoutSpy.mock.calls.map(([, delay]) => delay);
    expect(delays).toContain(45000);
  });

  // Separate unit test for the catch-path: when fetch rejects with AbortError
  // (regardless of cause), the error message is correct.
  test('throws "Analysis timed out" when fetch rejects with AbortError', async () => {
    global.fetch.mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow('Analysis timed out — please try again');
  });

  test('does not fall back to mock data on AbortError — throws instead', async () => {
    global.fetch.mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow();
    expect(ParkingAnalysisService.getMockResponse).not.toHaveBeenCalled();
  });

  test('throws a rate-limit error on 429 with retryAfter', async () => {
    global.fetch.mockResolvedValue({
      status: 429,
      ok: false,
      json: async () => ({ error: 'rate_limit', retryAfter: 42 }),
    });
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow('Too many requests');
  });

  test('includes the retryAfter seconds in the 429 error message', async () => {
    global.fetch.mockResolvedValue({
      status: 429,
      ok: false,
      json: async () => ({ error: 'rate_limit', retryAfter: 42 }),
    });
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow('42s');
  });

  test('throws an error on 429 even without retryAfter in body', async () => {
    global.fetch.mockResolvedValue({
      status: 429,
      ok: false,
      json: async () => ({}),
    });
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow('Too many requests');
  });

  test('throws with combined error and detail on non-ok response with both fields', async () => {
    global.fetch.mockResolvedValue({
      status: 502,
      ok: false,
      json: async () => ({ error: 'parse_error', detail: 'bad json' }),
    });
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow('parse_error: bad json');
  });

  test('throws with just the error field when detail is absent', async () => {
    global.fetch.mockResolvedValue({
      status: 502,
      ok: false,
      json: async () => ({ error: 'upstream_error' }),
    });
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow('upstream_error');
  });

  test('throws with status code when error body is empty', async () => {
    global.fetch.mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({}),
    });
    await expect(ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc'))
      .rejects.toThrow('Analysis failed (500)');
  });

  test('returns parsed JSON on a successful 200 response', async () => {
    const mockResult = { canPark: true, confidence: 0.9, rawText: '2P 9AM-6PM MON-FRI' };
    global.fetch.mockResolvedValue({
      status: 200, ok: true,
      json: async () => mockResult,
    });
    const result = await ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc');
    expect(result).toEqual(mockResult);
  });

  test('passes selectedSide in the request body', async () => {
    global.fetch.mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ canPark: true, confidence: 0.9, rawText: '' }),
    });
    await ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,abc', 'left');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.selectedSide).toBe('left');
  });

  test('sends the optimized image (not the original) in the request body', async () => {
    global.fetch.mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ canPark: true, confidence: 0.9, rawText: '' }),
    });
    await ParkingAnalysisService.analyzeImage('data:image/jpeg;base64,ORIGINAL');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    // optimizeImage mock returns 'data:image/jpeg;base64,mock', not the original
    expect(body.imageData).toBe('data:image/jpeg;base64,mock');
  });
});

// ─── validateParkingResult ───────────────────────────────────────────────────

describe('validateParkingResult', () => {
  test('returns true when all required fields are present', () => {
    expect(validateParkingResult({ canPark: true, confidence: 0.9, rawText: 'P1' })).toBe(true);
  });

  test('returns false when canPark is missing', () => {
    expect(validateParkingResult({ confidence: 0.9, rawText: 'P1' })).toBe(false);
  });

  test('returns false when confidence is missing', () => {
    expect(validateParkingResult({ canPark: true, rawText: 'P1' })).toBe(false);
  });

  test('returns false when rawText is missing', () => {
    expect(validateParkingResult({ canPark: true, confidence: 0.9 })).toBe(false);
  });

  test('returns false for an empty object', () => {
    expect(validateParkingResult({})).toBe(false);
  });

  // Field presence, not truthiness — canPark: false and confidence: 0 are valid.
  test('returns true when canPark is false and confidence is 0', () => {
    expect(validateParkingResult({ canPark: false, confidence: 0, rawText: '' })).toBe(true);
  });
});
