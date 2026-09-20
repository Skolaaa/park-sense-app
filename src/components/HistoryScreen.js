import React from 'react';
import { Check, X, ChevronRight, History as HistoryIcon, Trash2 } from 'lucide-react';
import { Screen, ScreenHeader, ScreenActions } from './Screen';
import { Button } from './ui/button';
import { Card } from './ui/card';

// Short enough to sit beside the title: "9:55 am" today, "Tue 9:55 am" this
// week, "14 Sept" beyond that.
const when = (ms) => {
  const d = new Date(ms);
  const age = Date.now() - ms;
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' }).replace(' ', '\u00a0');
  if (d.toDateString() === new Date().toDateString()) return time;
  if (age < 6 * 24 * 60 * 60 * 1000) return `${d.toLocaleDateString('en-AU', { weekday: 'short', timeZone: 'Australia/Sydney' })} ${time}`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
};

const streetOf = (result) => result.location?.address?.split(',').slice(0, 2).join(',').trim() || null;

export const HistoryRow = ({ entry, onOpen }) => {
  const { result } = entry;
  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
    >
      {entry.thumbnail ? (
        <img src={entry.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${result.canPark ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {result.canPark ? <Check className="h-5 w-5" aria-hidden="true" /> : <X className="h-5 w-5" aria-hidden="true" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-medium">
            {result.canPark ? (result.timeLimit ? `${result.timeLimit} parking` : 'Parking allowed') : 'No parking'}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{when(entry.savedAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${result.canPark ? 'bg-success' : 'bg-destructive'}`} aria-hidden="true" />
          <span className="truncate">{streetOf(result) || result.rawText || 'Unknown location'}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
};

const HistoryScreen = ({ entries, onOpen, onClear, onBack }) => (
  <Screen>
    <ScreenHeader onBack={onBack} title="Recent scans" description={entries.length ? 'Kept on this device. Tap one to see the full result.' : undefined} />
    {entries.length === 0 ? (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <HistoryIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </span>
        <h2 className="mt-6 text-xl font-semibold">Nothing scanned yet</h2>
        <p className="mt-2 max-w-[30ch] text-[15px] text-muted-foreground">Your last twenty signs will show up here.</p>
      </div>
    ) : (
      <Card className="mt-6 divide-y divide-border overflow-hidden">
        {entries.map((entry) => <HistoryRow key={entry.id} entry={entry} onOpen={onOpen} />)}
      </Card>
    )}
    <ScreenActions>
      {entries.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Clear history
        </Button>
      )}
      <Button variant="outline" onClick={onBack}>Back</Button>
    </ScreenActions>
  </Screen>
);

export default HistoryScreen;
