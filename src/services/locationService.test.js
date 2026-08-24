import { LocationService } from './locationService';

function mockGeolocation({ lat = -33.8688, lon = 151.2093, error = false } = {}) {
  Object.defineProperty(global.navigator, 'geolocation', {
    value: {
      getCurrentPosition: jest.fn((success, fail) => {
        if (error) {
          fail(new Error('Geolocation error'));
        } else {
          success({ coords: { latitude: lat, longitude: lon } });
        }
      }),
    },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  // Start each test with geolocation undefined so tests don't inherit
  // state from a previous test that called mockGeolocation.
  Object.defineProperty(global.navigator, 'geolocation', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  global.fetch = undefined;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LocationService.getCurrentAddress', () => {
  test('returns null when geolocation is not available on the device', async () => {
    // geolocation is already undefined from beforeEach
    const result = await LocationService.getCurrentAddress();
    expect(result).toBeNull();
  });

  test('returns null when the geolocation API reports an error', async () => {
    mockGeolocation({ error: true });
    const result = await LocationService.getCurrentAddress();
    expect(result).toBeNull();
  });

  test('returns coords and address when both geolocation and Nominatim succeed', async () => {
    mockGeolocation({ lat: -33.8688, lon: 151.2093 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: '1 George St, Sydney NSW 2000, Australia' }),
    });
    const result = await LocationService.getCurrentAddress();
    expect(result).toEqual({
      lat: -33.8688,
      lon: 151.2093,
      address: '1 George St, Sydney NSW 2000, Australia',
    });
  });

  test('returns coords with null address when Nominatim returns a non-ok response', async () => {
    mockGeolocation({ lat: -33.8688, lon: 151.2093 });
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const result = await LocationService.getCurrentAddress();
    expect(result).toEqual({ lat: -33.8688, lon: 151.2093, address: null });
  });

  test('returns coords with null address when the Nominatim fetch throws', async () => {
    mockGeolocation({ lat: -33.8688, lon: 151.2093 });
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const result = await LocationService.getCurrentAddress();
    expect(result).toEqual({ lat: -33.8688, lon: 151.2093, address: null });
  });

  test('returns coords with null address when display_name is absent from the response', async () => {
    mockGeolocation({ lat: -33.8688, lon: 151.2093 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}), // no display_name key
    });
    const result = await LocationService.getCurrentAddress();
    expect(result).toEqual({ lat: -33.8688, lon: 151.2093, address: null });
  });

  test('sends the exact lat/lon coordinates to Nominatim', async () => {
    mockGeolocation({ lat: -33.8688, lon: 151.2093 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: 'Sydney' }),
    });
    await LocationService.getCurrentAddress();
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('lat=-33.8688');
    expect(calledUrl).toContain('lon=151.2093');
  });

  test('does not call Nominatim when geolocation fails', async () => {
    mockGeolocation({ error: true });
    global.fetch = jest.fn();
    await LocationService.getCurrentAddress();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
