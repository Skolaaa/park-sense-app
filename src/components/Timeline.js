import React from 'react';

// Twelve hours from now as one strip: green where you can park, red where
// you cannot, with the posted limit written into any band wide enough to
// hold it. Answers "park now, move by 4pm" at a glance.
const clock = (ms) =>
  new Date(ms).toLocaleTimeString('en-AU', { hour: 'numeric', timeZone: 'Australia/Sydney' }).replace(' ', '');

const limitLabel = (band) => {
  if (!band.canPark) return 'No';
  if (!band.timeLimitMinutes) return 'Free';
  const h = band.timeLimitMinutes / 60;
  return Number.isInteger(h) ? `${h}P` : `${band.timeLimitMinutes}m`;
};

const Timeline = ({ bands }) => {
  if (!bands || bands.length < 2) return null;
  const start = bands[0].startMs;
  const end = bands[bands.length - 1].endMs;
  const span = end - start;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => start + f * span);

  return (
    <div className="px-5 pb-4 pt-1">
      <div className="flex h-7 w-full overflow-hidden rounded-lg" role="img" aria-label="Parking over the next twelve hours">
        {bands.map((b) => {
          const width = ((b.endMs - b.startMs) / span) * 100;
          return (
            <div
              key={b.startMs}
              style={{ width: `${width}%` }}
              className={`flex items-center justify-center text-[11px] font-semibold ${
                b.canPark ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
              }`}
              title={`${clock(b.startMs)}–${clock(b.endMs)}: ${b.canPark ? 'can park' : 'no parking'}`}
            >
              {width > 12 ? limitLabel(b) : ''}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        {ticks.map((t, i) => (
          <span key={t}>{i === 0 ? 'now' : clock(t)}</span>
        ))}
      </div>
    </div>
  );
};

export default Timeline;
