import { parseTimeLimit } from './timeParser';

describe('parseTimeLimit', () => {
  // Valid inputs
  test('parses "2 hours"', () => expect(parseTimeLimit('2 hours')).toBe(7200000));
  test('parses "1 hour"', () => expect(parseTimeLimit('1 hour')).toBe(3600000));
  test('parses "30 minutes"', () => expect(parseTimeLimit('30 minutes')).toBe(1800000));
  test('parses "30 min"', () => expect(parseTimeLimit('30 min')).toBe(1800000));
  test('parses "1 hour 30 minutes"', () => expect(parseTimeLimit('1 hour 30 minutes')).toBe(5400000));
  test('parses "90 min"', () => expect(parseTimeLimit('90 min')).toBe(5400000));
  test('parses "15 minutes"', () => expect(parseTimeLimit('15 minutes')).toBe(900000));
  test('is case-insensitive', () => expect(parseTimeLimit('2 HOURS')).toBe(7200000));
  test('handles extra whitespace between number and unit', () => expect(parseTimeLimit('2  hours')).toBe(7200000));

  // Edge cases that should return null
  test('returns null for null', () => expect(parseTimeLimit(null)).toBeNull());
  test('returns null for undefined', () => expect(parseTimeLimit(undefined)).toBeNull());
  test('returns null for empty string', () => expect(parseTimeLimit('')).toBeNull());
  test('returns null for non-string number', () => expect(parseTimeLimit(120)).toBeNull());
  test('returns null for "0 hours"', () => expect(parseTimeLimit('0 hours')).toBeNull());
  test('returns null for "0 minutes"', () => expect(parseTimeLimit('0 minutes')).toBeNull());
  test('returns null for unrecognised string like "P1"', () => expect(parseTimeLimit('P1')).toBeNull());
  test('returns null for "No Stopping"', () => expect(parseTimeLimit('No Stopping')).toBeNull());
});
