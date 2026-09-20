import { parseDsn, buildSentryEvent } from '../../api/report-error';

function makeRes() {
  return {
    _status: 200, _body: null, _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
}

test('parseDsn extracts key, host and project', () => {
  expect(parseDsn('https://abc123@o1.ingest.sentry.io/456')).toEqual({ key: 'abc123', host: 'o1.ingest.sentry.io', projectId: '456', protocol: 'https:' });
  expect(parseDsn('not a dsn')).toBeNull();
  expect(parseDsn('https://o1.ingest.sentry.io/456')).toBeNull();
});

test('buildSentryEvent carries the message, stack and device hash', () => {
  const ev = buildSentryEvent({ name: 'TypeError', message: 'boom', stack: 'at x', url: 'https://p/', userAgent: 'ua', view: 'results' }, { release: '0.6.0', deviceHash: 'h' });
  expect(ev.exception.values[0]).toEqual(expect.objectContaining({ type: 'TypeError', value: 'boom' }));
  expect(ev.extra.stack).toBe('at x');
  expect(ev.tags.view).toBe('results');
  expect(ev.user.id).toBe('h');
  expect(ev.release).toBe('0.6.0');
});

test('handler logs and acknowledges without a DSN', async () => {
  let handler;
  jest.isolateModules(() => { ({ default: handler } = require('../../api/report-error')); });
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = makeRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '7.7.7.7' }, body: { message: 'boom', stack: 's' } }, res);
  expect(res._status).toBe(202);
  expect(res._body).toEqual({ received: true, forwarded: false });
  expect(spy).toHaveBeenCalled();
  expect(spy.mock.calls[0][1]).toMatch(/boom/);
  spy.mockRestore();
});

test('handler forwards to Sentry when a DSN is set', async () => {
  process.env.SENTRY_DSN = 'https://key@o1.ingest.sentry.io/99';
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
  let handler;
  jest.isolateModules(() => { ({ default: handler } = require('../../api/report-error')); });
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = makeRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '7.7.7.8' }, body: { message: 'boom' } }, res);
  expect(res._body.forwarded).toBe(true);
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toBe('https://o1.ingest.sentry.io/api/99/store/');
  expect(init.headers['X-Sentry-Auth']).toMatch(/sentry_key=key/);
  spy.mockRestore();
  delete process.env.SENTRY_DSN;
  delete global.fetch;
});

test('rejects non-POST', async () => {
  let handler;
  jest.isolateModules(() => { ({ default: handler } = require('../../api/report-error')); });
  const res = makeRes();
  await handler({ method: 'GET', headers: {} }, res);
  expect(res._status).toBe(405);
});
