import { Consent } from './consent';

beforeEach(() => localStorage.clear());

test('is unasked by default and not granted', () => {
  expect(Consent.get()).toBeNull();
  expect(Consent.isGranted()).toBe(false);
});

test('remembers either answer', () => {
  Consent.set('granted');
  expect(Consent.isGranted()).toBe(true);
  Consent.set('declined');
  expect(Consent.get()).toBe('declined');
  expect(Consent.isGranted()).toBe(false);
});

test('ignores junk in storage', () => {
  localStorage.setItem('parksense_community_consent', 'maybe');
  expect(Consent.get()).toBeNull();
});
