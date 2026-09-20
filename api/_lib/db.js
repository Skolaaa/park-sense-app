// Persistence, via Supabase's PostgREST endpoint over plain fetch.
//
// No SDK: the serverless functions already have fetch, the surface we need
// is three verbs, and one fewer dependency is one fewer thing to audit.
// The service-role key is used server-side only and never leaves api/.
//
// When SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset every call resolves
// to `null` and `isConfigured()` is false, so each feature degrades on its
// own: quotas fall back to memory, events are acknowledged but not stored,
// street insights say there is no data yet.

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

export function isConfigured() {
  return config() !== null;
}

async function call(path, { method = 'GET', body, prefer, fetchImpl = globalThis.fetch } = {}) {
  const cfg = config();
  if (!cfg) return null;
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetchImpl(`${cfg.url}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`db ${method} ${path.split('?')[0]} failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  if (res.status === 204) return [];
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export async function insert(table, rows, opts) {
  return call(table, { method: 'POST', body: rows, prefer: 'return=minimal', ...opts });
}

// `query` is a PostgREST query string, e.g. 'lat=gte.-33.9&order=created_at.desc&limit=500'.
export async function select(table, query, opts) {
  return call(`${table}?${query}`, opts);
}

export async function rpc(fn, args, opts) {
  return call(`rpc/${fn}`, { method: 'POST', body: args, ...opts });
}
