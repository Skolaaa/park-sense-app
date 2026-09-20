import {
  decide,
  normalisePlate,
  normaliseDays,
  parseClock,
  evaluateAt,
  buildTimeline,
} from '../../api/_lib/verdict';
import { _resetCalendarCache } from '../../api/_lib/calendar';

beforeEach(() => _resetCalendarCache());

// Sydney instants. AEST is +10; AEDT (from the first Sunday in October) is +11.
const TUE_10AM = new Date('2026-09-15T10:00:00+10:00');        // term 3, ordinary weekday
const SAT_10AM = new Date('2026-09-12T10:00:00+10:00');
const LABOUR_DAY_10AM = new Date('2026-10-05T10:00:00+11:00'); // Monday, public holiday
const SCHOOL_HOLS_THU = new Date('2026-10-01T10:00:00+10:00'); // weekday, between terms
const TUE_7PM = new Date('2026-09-15T19:00:00+10:00');

const plate = (over = {}) => ({
  text: '2P 8am-6pm Mon-Fri',
  kind: 'time_limited',
  timeLimitMinutes: 120,
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  startTime: '08:00',
  endTime: '18:00',
  publicHolidayClause: 'silent',
  schoolDaysOnly: false,
  arrow: null,
  paymentRequired: false,
  permitExcepted: false,
  vehicleTypes: [],
  ...over,
});

describe('parsers', () => {
  test('normaliseDays accepts long and short names and dedupes', () => {
    expect(normaliseDays(['Monday', 'tue', 'WED', 'Wed', 'nonsense'])).toEqual(['Mon', 'Tue', 'Wed']);
    expect(normaliseDays(undefined)).toEqual([]);
  });

  test('parseClock handles 24h and 12h forms', () => {
    expect(parseClock('08:00')).toBe(480);
    expect(parseClock('6pm')).toBe(18 * 60);
    expect(parseClock('12am')).toBe(0);
    expect(parseClock('12:30 PM')).toBe(12 * 60 + 30);
    expect(parseClock('garbage')).toBeNull();
    expect(parseClock(null)).toBeNull();
  });

  test('normalisePlate coerces junk to safe defaults', () => {
    const p = normalisePlate({ kind: 'made_up', timeLimitMinutes: '90', days: 'Mon', startTime: 'x', arrow: 'up' });
    expect(p.kind).toBe('other');
    expect(p.timeLimitMinutes).toBe(90);
    expect(p.days).toEqual([]);
    expect(p.startMinutes).toBeNull();
    expect(p.arrow).toBeNull();
    expect(p.publicHolidayClause).toBe('silent');
    expect(normalisePlate(null)).toBeNull();
  });

  test('a meter plate implies payment', () => {
    expect(normalisePlate({ kind: 'meter' }).paymentRequired).toBe(true);
  });
});

describe('time-limited weekday sign', () => {
  test('applies on a weekday inside its hours', () => {
    const v = decide([plate()], { now: TUE_10AM });
    expect(v.canPark).toBe(true);
    expect(v.kind).toBe('time_limited');
    expect(v.timeLimitMinutes).toBe(120);
    expect(v.fine.kind).toBe('time_limited');
    expect(v.mustLeaveByMs).toBe(TUE_10AM.getTime() + 120 * 60_000);
  });

  test('is unrestricted outside its hours', () => {
    const v = decide([plate()], { now: TUE_7PM });
    expect(v.canPark).toBe(true);
    expect(v.kind).toBe('unrestricted');
    expect(v.timeLimitMinutes).toBeNull();
    expect(v.fine).toBeNull();
  });

  test('is unrestricted on the weekend', () => {
    const v = decide([plate()], { now: SAT_10AM });
    expect(v.kind).toBe('unrestricted');
  });
});

describe('Road Rules reg 318 — public holidays', () => {
  test('a Mon-Fri sign does not apply on a public holiday Monday', () => {
    const v = decide([plate()], { now: LABOUR_DAY_10AM });
    expect(v.calendar.isPublicHoliday).toBe(true);
    expect(v.kind).toBe('unrestricted');
    expect(v.timeLimitMinutes).toBeNull();
    expect(v.notes.join(' ')).toMatch(/reg 318/);
    expect(v.notes.join(' ')).toMatch(/Labour Day/);
  });

  test('a Mon-Fri No Stopping sign is also void on a public holiday', () => {
    const v = decide([plate({ kind: 'no_stopping', timeLimitMinutes: null, startTime: '06:00', endTime: '10:00' })], { now: LABOUR_DAY_10AM });
    expect(v.canPark).toBe(true);
    expect(v.kind).toBe('unrestricted');
  });

  test('a Mon-Fri sign that says it applies on public holidays still applies', () => {
    const v = decide([plate({ publicHolidayClause: 'applies' })], { now: LABOUR_DAY_10AM });
    expect(v.kind).toBe('time_limited');
    expect(v.timeLimitMinutes).toBe(120);
  });

  test('a sign with no days listed still applies on a public holiday', () => {
    const v = decide([plate({ days: [], text: '2P 8am-6pm' })], { now: LABOUR_DAY_10AM });
    expect(v.kind).toBe('time_limited');
  });

  test('a sign with no days but "public holidays excepted" does not', () => {
    const v = decide([plate({ days: [], publicHolidayClause: 'excepted' })], { now: LABOUR_DAY_10AM });
    expect(v.kind).toBe('unrestricted');
    expect(v.notes.join(' ')).toMatch(/excepted/);
  });
});

describe('school days', () => {
  const schoolPlate = plate({
    text: 'No Parking 8-9.30am 2.30-4pm School Days',
    kind: 'no_parking', timeLimitMinutes: null, days: [], startTime: '08:00', endTime: '09:30', schoolDaysOnly: true,
  });

  test('applies on a school day inside its window', () => {
    const v = decide([schoolPlate], { now: new Date('2026-09-15T08:30:00+10:00') });
    expect(v.canPark).toBe(false);
    expect(v.kind).toBe('no_parking');
    expect(v.fine.amount).toBe(140);
  });

  test('does not apply in the school holidays', () => {
    const v = decide([schoolPlate], { now: new Date('2026-10-01T08:30:00+10:00') });
    expect(v.canPark).toBe(true);
    expect(v.notes.join(' ')).toMatch(/school holidays/);
  });

  test('does not apply on a weekend', () => {
    const v = decide([schoolPlate], { now: new Date('2026-09-12T08:30:00+10:00') });
    expect(v.canPark).toBe(true);
    expect(v.notes.join(' ')).toMatch(/weekend/);
  });
});

describe('precedence between plates', () => {
  test('No Stopping beats a time-limited plate in the same window', () => {
    const v = decide([
      plate(),
      plate({ text: 'No Stopping 8-10am Mon-Fri', kind: 'no_stopping', timeLimitMinutes: null, startTime: '08:00', endTime: '10:00' }),
    ], { now: new Date('2026-09-15T09:00:00+10:00') });
    expect(v.canPark).toBe(false);
    expect(v.kind).toBe('no_stopping');
    expect(v.fine.amount).toBe(330);
  });

  test('after the No Stopping window the time limit takes over', () => {
    const v = decide([
      plate(),
      plate({ text: 'No Stopping 8-10am Mon-Fri', kind: 'no_stopping', timeLimitMinutes: null, startTime: '08:00', endTime: '10:00' }),
    ], { now: new Date('2026-09-15T10:30:00+10:00') });
    expect(v.canPark).toBe(true);
    expect(v.kind).toBe('time_limited');
  });

  test('clearway beats everything except No Stopping', () => {
    const v = decide([
      plate({ kind: 'clearway', timeLimitMinutes: null }),
      plate({ kind: 'loading_zone', timeLimitMinutes: null }),
    ], { now: TUE_10AM });
    expect(v.kind).toBe('clearway');
  });

  test('the shortest limit wins when several time-limited plates are active', () => {
    const v = decide([plate({ timeLimitMinutes: 240 }), plate({ timeLimitMinutes: 60 })], { now: TUE_10AM });
    expect(v.timeLimitMinutes).toBe(60);
  });

  test('an unclassified plate never decides but always warns', () => {
    const v = decide([plate(), plate({ kind: 'other', text: 'AREA 12' })], { now: TUE_10AM });
    expect(v.kind).toBe('time_limited');
    expect(v.uncertain).toBe(true);
    expect(v.notes.join(' ')).toMatch(/AREA 12/);
  });
});

describe('arrows and side', () => {
  const left = plate({ arrow: 'left', kind: 'no_stopping', timeLimitMinutes: null, text: '← No Stopping' });
  const right = plate({ arrow: 'right', text: '2P →' });

  test('only the plate pointing at the chosen side counts', () => {
    expect(decide([left, right], { selectedSide: 'left', now: TUE_10AM }).kind).toBe('no_stopping');
    expect(decide([left, right], { selectedSide: 'right', now: TUE_10AM }).kind).toBe('time_limited');
  });

  test('with no side chosen, the strictest plate wins and the answer is flagged ambiguous', () => {
    const v = decide([left, right], { selectedSide: null, now: TUE_10AM });
    expect(v.kind).toBe('no_stopping');
    expect(v.sideAmbiguous).toBe(true);
    expect(v.notes.join(' ')).toMatch(/which side/);
  });

  test('a double-headed arrow applies to both sides', () => {
    const v = decide([plate({ arrow: 'both' })], { selectedSide: 'left', now: TUE_10AM });
    expect(v.kind).toBe('time_limited');
  });
});

describe('overnight windows', () => {
  const overnight = plate({ kind: 'no_stopping', timeLimitMinutes: null, days: [], startTime: '22:00', endTime: '06:00' });
  test('is active after the start and before the end across midnight', () => {
    expect(evaluateAt([normalisePlate(overnight)], null, new Date('2026-09-15T23:00:00+10:00')).canPark).toBe(false);
    expect(evaluateAt([normalisePlate(overnight)], null, new Date('2026-09-16T05:00:00+10:00')).canPark).toBe(false);
    expect(evaluateAt([normalisePlate(overnight)], null, new Date('2026-09-16T07:00:00+10:00')).canPark).toBe(true);
  });
});

describe('timeline and next change', () => {
  test('a No Stopping window later today shows as a change and caps mustLeaveBy', () => {
    const plates = [
      plate({ days: [], timeLimitMinutes: null, kind: 'unrestricted', startTime: null, endTime: null, text: '' }),
      plate({ text: 'No Stopping 4-6pm', kind: 'no_stopping', timeLimitMinutes: null, days: [], startTime: '16:00', endTime: '18:00' }),
    ];
    const now = new Date('2026-09-15T14:00:00+10:00');
    const v = decide(plates, { now });
    expect(v.canPark).toBe(true);
    expect(v.nextChange).not.toBeNull();
    expect(v.nextChange.canPark).toBe(false);
    expect(new Date(v.nextChange.atMs).toISOString()).toBe(new Date('2026-09-15T16:00:00+10:00').toISOString());
    expect(v.mustLeaveByMs).toBe(v.nextChange.atMs);
    expect(v.timeline.length).toBeGreaterThanOrEqual(3);
    expect(v.timeline[0].canPark).toBe(true);
    expect(v.timeline[1].canPark).toBe(false);
    expect(v.timeline[2].canPark).toBe(true);
  });

  test('the posted limit caps mustLeaveBy when it comes first', () => {
    const now = new Date('2026-09-15T10:00:00+10:00');
    const v = decide([plate({ timeLimitMinutes: 60 })], { now });
    expect(v.mustLeaveByMs).toBe(now.getTime() + 60 * 60_000);
  });

  test('a sign with no changes in the window has one band and no next change', () => {
    const v = decide([plate({ days: [], startTime: null, endTime: null })], { now: TUE_10AM });
    expect(v.timeline).toHaveLength(1);
    expect(v.nextChange).toBeNull();
  });

  test('timeline spans exactly twelve hours', () => {
    const tl = buildTimeline([normalisePlate(plate())], null, TUE_10AM);
    expect(tl[0].startMs).toBe(TUE_10AM.getTime());
    expect(tl[tl.length - 1].endMs).toBe(TUE_10AM.getTime() + 12 * 60 * 60 * 1000);
  });

  test('the timeline crosses midnight into a public holiday correctly', () => {
    // Sunday 4 Oct 2026 at 8pm (AEDT) → Labour Day starts in four hours.
    const now = new Date('2026-10-04T20:00:00+11:00');
    const v = decide([plate({ startTime: null, endTime: null })], { now });
    // Sunday: unrestricted (Mon-Fri). Monday public holiday: still unrestricted under reg 318.
    expect(v.timeline.every((b) => b.canPark && b.kind === 'unrestricted')).toBe(true);
  });
});

describe('empty input', () => {
  test('no plates means unrestricted with an empty timeline', () => {
    const v = decide([], { now: TUE_10AM });
    expect(v.canPark).toBe(true);
    expect(v.kind).toBe('unrestricted');
    expect(v.timeline).toEqual([]);
    expect(v.nextChange).toBeNull();
  });
});
