// NSW calendar: public holidays and school days for Australia/Sydney.
//
// Why this exists: a parking sign is not a complete statement of the rule.
// NSW Road Rules 2014 reg 318 says a sign that names particular days of the
// week has no effect on a public holiday unless the sign says otherwise, and
// "School Days" restrictions only operate on notified school days. Neither
// fact is visible in a photograph, so the model must never be asked to guess
// them. This module answers those two questions deterministically.
//
// Source of truth is the NSW Government "School and public holidays" dataset
// (data.nsw.gov.au), fetched and cached per instance. If the fetch fails the
// bundled table below is used and the result says so via `source`.
//
// The August Bank Holiday is deliberately absent: it is a bank holiday under
// the Banks and Bank Holidays Act, not a general public holiday, so reg 318
// does not apply to it.

export const TIMEZONE = 'Australia/Sydney';

// Static fallback. Verify against https://www.nsw.gov.au/about-nsw/public-holidays
// each year when the dataset is refreshed.
const FALLBACK_PUBLIC_HOLIDAYS = {
  '2025-01-01': "New Year's Day",
  '2025-01-27': 'Australia Day (observed)',
  '2025-04-18': 'Good Friday',
  '2025-04-19': 'Easter Saturday',
  '2025-04-20': 'Easter Sunday',
  '2025-04-21': 'Easter Monday',
  '2025-04-25': 'Anzac Day',
  '2025-06-09': "King's Birthday",
  '2025-10-06': 'Labour Day',
  '2025-12-25': 'Christmas Day',
  '2025-12-26': 'Boxing Day',
  '2026-01-01': "New Year's Day",
  '2026-01-26': 'Australia Day',
  '2026-04-03': 'Good Friday',
  '2026-04-04': 'Easter Saturday',
  '2026-04-05': 'Easter Sunday',
  '2026-04-06': 'Easter Monday',
  '2026-04-25': 'Anzac Day',
  '2026-04-27': 'Anzac Day (additional day)',
  '2026-06-08': "King's Birthday",
  '2026-10-05': 'Labour Day',
  '2026-12-25': 'Christmas Day',
  '2026-12-26': 'Boxing Day',
  '2026-12-28': 'Boxing Day (additional day)',
  '2027-01-01': "New Year's Day",
  '2027-01-26': 'Australia Day',
  '2027-03-26': 'Good Friday',
  '2027-03-27': 'Easter Saturday',
  '2027-03-28': 'Easter Sunday',
  '2027-03-29': 'Easter Monday',
  '2027-04-25': 'Anzac Day',
  '2027-04-26': 'Anzac Day (additional day)',
  '2027-06-14': "King's Birthday",
  '2027-10-04': 'Labour Day',
  '2027-12-25': 'Christmas Day',
  '2027-12-26': 'Boxing Day',
  '2027-12-27': 'Christmas Day (additional day)',
  '2027-12-28': 'Boxing Day (additional day)',
};

// NSW public school terms, Eastern Division (covers Sydney). Inclusive dates.
// School development days fall inside these ranges and count as school days
// for school-zone purposes, which is the behaviour we want.
const FALLBACK_SCHOOL_TERMS = [
  { start: '2025-02-04', end: '2025-04-11' },
  { start: '2025-04-30', end: '2025-07-04' },
  { start: '2025-07-22', end: '2025-09-26' },
  { start: '2025-10-14', end: '2025-12-19' },
  { start: '2026-02-02', end: '2026-04-02' },
  { start: '2026-04-22', end: '2026-07-03' },
  { start: '2026-07-21', end: '2026-09-25' },
  { start: '2026-10-13', end: '2026-12-17' },
  { start: '2027-01-28', end: '2027-04-09' },
  { start: '2027-04-26', end: '2027-07-02' },
  { start: '2027-07-19', end: '2027-09-24' },
  { start: '2027-10-11', end: '2027-12-20' },
];

// The NSW dataset is a CKAN datastore; these resource ids are the public
// holidays and school terms resources of dataset "2-school-and-public-holidays".
const DATASET_API = 'https://data.nsw.gov.au/data/api/action/datastore_search';
const PUBLIC_HOLIDAY_RESOURCE = 'fab9f1c5-b24f-4e06-a8ac-42f6642dd097';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache = { loadedAt: 0, holidays: null, terms: null, source: 'fallback' };

// ─── Date helpers (all in Sydney local time) ─────────────────────────────────

const partsFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
  weekday: 'short',
});

// Returns { dateKey: 'YYYY-MM-DD', weekday: 'Mon', minutes: minutes since midnight }
export function sydneyParts(date = new Date()) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday.slice(0, 3),
    minutes: Number(hour) * 60 + Number(parts.minute),
  };
}

function inRange(dateKey, { start, end }) {
  return dateKey >= start && dateKey <= end;
}

// ─── Live dataset ────────────────────────────────────────────────────────────

// Best effort. Any failure leaves the fallback in place; a working fetch is
// cached for a day per warm instance.
async function refresh(fetchImpl) {
  if (Date.now() - cache.loadedAt < CACHE_TTL_MS) return;
  cache.loadedAt = Date.now();
  if (typeof fetchImpl !== 'function') return;
  try {
    const url = `${DATASET_API}?resource_id=${PUBLIC_HOLIDAY_RESOURCE}&limit=500`;
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const json = await res.json();
    const parsed = parseHolidayRecords(json?.result?.records);
    if (parsed && Object.keys(parsed).length > 0) {
      cache.holidays = parsed;
      cache.source = 'data.nsw.gov.au';
    }
  } catch {
    // Keep the fallback. The response reports `source: 'fallback'` so a
    // silent failure is still visible to whoever reads the payload.
  }
}

// The dataset's column names have drifted between releases, so accept the
// common shapes rather than one exact header. Exported for tests.
export function parseHolidayRecords(records) {
  if (!Array.isArray(records)) return null;
  const out = {};
  for (const rec of records) {
    const rawDate = rec.Date ?? rec.date ?? rec['Holiday Date'] ?? rec.holiday_date;
    const name = rec['Holiday Name'] ?? rec.Holiday ?? rec.holiday ?? rec.Name ?? rec.name ?? 'Public holiday';
    const jurisdiction = String(rec.Jurisdiction ?? rec.jurisdiction ?? 'nsw').toLowerCase();
    if (!rawDate || !/nsw/.test(jurisdiction)) continue;
    const key = normaliseDate(String(rawDate));
    if (!key) continue;
    // The dataset lists the Bank Holiday; it is not a public holiday for reg 318.
    if (/bank holiday/i.test(name)) continue;
    out[key] = name;
  }
  return out;
}

function normaliseDate(s) {
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Resolves the calendar facts for one instant. `fetchImpl` is injectable so
// tests never touch the network; production passes global fetch.
export async function getCalendarContext(date = new Date(), fetchImpl = globalThis.fetch) {
  await refresh(fetchImpl);
  return calendarContextSync(date);
}

// Synchronous variant using whatever is cached (or the fallback). The verdict
// engine's timeline steps through many instants and must not await each one.
export function calendarContextSync(date = new Date()) {
  const holidays = cache.holidays ?? FALLBACK_PUBLIC_HOLIDAYS;
  const terms = cache.terms ?? FALLBACK_SCHOOL_TERMS;
  const { dateKey, weekday } = sydneyParts(date);
  const holidayName = holidays[dateKey] ?? null;
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const inTerm = terms.some((t) => inRange(dateKey, t));
  return {
    dateKey,
    weekday,
    isPublicHoliday: holidayName !== null,
    holidayName,
    isSchoolDay: inTerm && !isWeekend && holidayName === null,
    source: cache.holidays ? cache.source : 'fallback',
  };
}

// Test hook.
export function _resetCalendarCache() {
  cache = { loadedAt: 0, holidays: null, terms: null, source: 'fallback' };
}
