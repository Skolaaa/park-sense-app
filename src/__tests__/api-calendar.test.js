import {
  getCalendarContext,
  calendarContextSync,
  parseHolidayRecords,
  sydneyParts,
  _resetCalendarCache,
} from '../../api/_lib/calendar';

// A Sydney-local instant. Sydney is UTC+10 (AEST) or UTC+11 (AEDT).
const sydney = (iso) => new Date(iso);

beforeEach(() => _resetCalendarCache());

describe('sydneyParts', () => {
  test('converts a UTC instant to the Sydney calendar day and weekday', () => {
    // 2026-10-04T15:30Z is 2026-10-05 02:30 AEDT (Labour Day Monday).
    const p = sydneyParts(sydney('2026-10-04T15:30:00Z'));
    expect(p.dateKey).toBe('2026-10-05');
    expect(p.weekday).toBe('Mon');
    expect(p.minutes).toBe(2 * 60 + 30);
  });

  test('midnight does not come back as hour 24', () => {
    // 2026-06-07T14:00Z is 2026-06-08 00:00 AEST.
    const p = sydneyParts(sydney('2026-06-07T14:00:00Z'));
    expect(p.dateKey).toBe('2026-06-08');
    expect(p.minutes).toBe(0);
  });
});

describe('public holidays (fallback table)', () => {
  test('Labour Day 2026 is a public holiday', () => {
    const c = calendarContextSync(sydney('2026-10-05T00:00:00+11:00'));
    expect(c.isPublicHoliday).toBe(true);
    expect(c.holidayName).toBe('Labour Day');
    expect(c.source).toBe('fallback');
  });

  test('an ordinary Tuesday is not', () => {
    const c = calendarContextSync(sydney('2026-09-15T10:00:00+10:00'));
    expect(c.isPublicHoliday).toBe(false);
    expect(c.holidayName).toBeNull();
  });

  test('the August Bank Holiday is not treated as a public holiday', () => {
    const c = calendarContextSync(sydney('2026-08-03T10:00:00+10:00'));
    expect(c.isPublicHoliday).toBe(false);
  });
});

describe('school days', () => {
  test('a weekday inside term is a school day', () => {
    const c = calendarContextSync(sydney('2026-09-15T10:00:00+10:00')); // Tue, term 3
    expect(c.isSchoolDay).toBe(true);
  });

  test('a weekday in the school holidays is not', () => {
    const c = calendarContextSync(sydney('2026-10-01T10:00:00+10:00')); // Thu, between terms 3 and 4
    expect(c.isSchoolDay).toBe(false);
  });

  test('a weekend inside term is not', () => {
    const c = calendarContextSync(sydney('2026-09-12T10:00:00+10:00')); // Sat
    expect(c.isSchoolDay).toBe(false);
  });

  test('a public holiday inside term is not', () => {
    const c = calendarContextSync(sydney('2026-06-08T10:00:00+10:00')); // King's Birthday, term 2
    expect(c.isSchoolDay).toBe(false);
    expect(c.isPublicHoliday).toBe(true);
  });
});

describe('live dataset', () => {
  test('uses the fetched holiday list when the fetch succeeds', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          records: [
            { Date: '2026-09-16', 'Holiday Name': 'Test Holiday', Jurisdiction: 'nsw' },
            { Date: '2026-08-03', 'Holiday Name': 'Bank Holiday', Jurisdiction: 'nsw' },
            { Date: '2026-09-17', 'Holiday Name': 'Someone Else Day', Jurisdiction: 'vic' },
          ],
        },
      }),
    });
    const c = await getCalendarContext(sydney('2026-09-16T10:00:00+10:00'), fetchImpl);
    expect(c.isPublicHoliday).toBe(true);
    expect(c.holidayName).toBe('Test Holiday');
    expect(c.source).toBe('data.nsw.gov.au');

    const other = calendarContextSync(sydney('2026-09-17T10:00:00+10:00'));
    expect(other.isPublicHoliday).toBe(false);
    const bank = calendarContextSync(sydney('2026-08-03T10:00:00+10:00'));
    expect(bank.isPublicHoliday).toBe(false);
  });

  test('keeps the fallback when the fetch fails', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const c = await getCalendarContext(sydney('2026-10-05T10:00:00+11:00'), fetchImpl);
    expect(c.isPublicHoliday).toBe(true);
    expect(c.source).toBe('fallback');
  });

  test('does not refetch within the cache window', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { records: [] } }) });
    await getCalendarContext(new Date(), fetchImpl);
    await getCalendarContext(new Date(), fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('parseHolidayRecords', () => {
  test('accepts the date formats the dataset has used', () => {
    const out = parseHolidayRecords([
      { Date: '20261225', 'Holiday Name': 'Christmas Day', Jurisdiction: 'NSW' },
      { date: '26/12/2026', holiday: 'Boxing Day', jurisdiction: 'nsw' },
      { Date: '2026-12-28T00:00:00', Holiday: 'Additional Day', Jurisdiction: 'nsw' },
    ]);
    expect(out).toEqual({
      '2026-12-25': 'Christmas Day',
      '2026-12-26': 'Boxing Day',
      '2026-12-28': 'Additional Day',
    });
  });

  test('returns null for a malformed payload', () => {
    expect(parseHolidayRecords(undefined)).toBeNull();
  });
});
