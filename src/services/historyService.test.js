import { HistoryService, HISTORY_LIMIT } from './historyService';

beforeEach(() => localStorage.clear());

const result = (over = {}) => ({ canPark: true, kind: 'time_limited', timeLimit: '2 hours', rawText: '2P', confidence: 0.9, timestamp: '2026-09-15T00:00:00Z', ...over });

test('adds newest first and caps the list', () => {
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) HistoryService.add(result({ rawText: `sign ${i}` }));
  const list = HistoryService.list();
  expect(list).toHaveLength(HISTORY_LIMIT);
  expect(list[0].result.rawText).toBe(`sign ${HISTORY_LIMIT + 4}`);
});

test('does not keep no-sign or demo results', () => {
  expect(HistoryService.add(result({ noSignFound: true }))).toBeNull();
  expect(HistoryService.add(result({ isMockData: true }))).toBeNull();
  expect(HistoryService.list()).toHaveLength(0);
});

test('attaches a location that arrives later', () => {
  const entry = HistoryService.add(result());
  HistoryService.attachLocation(entry.id, { lat: -33.88, lon: 151.21, address: 'Crown St' });
  expect(HistoryService.get(entry.id).result.location.address).toBe('Crown St');
});

test('remove and clear', () => {
  const a = HistoryService.add(result());
  HistoryService.add(result());
  HistoryService.remove(a.id);
  expect(HistoryService.list()).toHaveLength(1);
  HistoryService.clear();
  expect(HistoryService.list()).toEqual([]);
});

test('survives corrupt storage', () => {
  localStorage.setItem('parksense_history', '{not json');
  expect(HistoryService.list()).toEqual([]);
});
