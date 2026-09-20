import { fineFor, finesPromptBlock, FINE_SCHEDULE, FINES_REVIEW_BY } from '../../api/_lib/fines';

test('every kind has a positive amount and a label', () => {
  for (const [kind, entry] of Object.entries(FINE_SCHEDULE)) {
    expect(entry.amount).toBeGreaterThan(0);
    expect(entry.label).toBeTruthy();
    expect(fineFor(kind).display).toBe(`~$${entry.amount}`);
  }
});

test('No Parking is not quoted at the No Stopping amount', () => {
  expect(fineFor('no_parking').amount).toBeLessThan(fineFor('no_stopping').amount);
});

test('unknown kinds return null', () => {
  expect(fineFor('unrestricted')).toBeNull();
});

test('marks the figure stale after the review date', () => {
  const before = new Date(`${FINES_REVIEW_BY}T00:00:00Z`);
  const after = new Date(`${FINES_REVIEW_BY}T00:00:00Z`);
  after.setUTCDate(after.getUTCDate() + 1);
  expect(fineFor('no_parking', before).stale).toBe(false);
  expect(fineFor('no_parking', after).stale).toBe(true);
});

test('the prompt block lists each offence once', () => {
  const block = finesPromptBlock();
  expect(block.split('\n')).toHaveLength(Object.keys(FINE_SCHEDULE).length);
  expect(block).toMatch(/No Parking: ~\$140/);
});
