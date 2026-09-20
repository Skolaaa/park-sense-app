import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { CommunityService } from '../services/communityService';

const hourLabel = (h) => {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString('en-AU', { hour: 'numeric' }).replace(' ', '');
};

const pct = (n) => `${Math.round(n * 100)}%`;
const limit = (m) => (m ? (m % 60 === 0 ? `${m / 60}P` : `${m} min`) : null);

// What other drivers found on this street. Loads after the verdict, never
// blocks it, and says "not enough data" honestly rather than inventing a
// pattern from a handful of scans.
const StreetInsights = ({ location, enabled }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !location) return undefined;
    CommunityService.getStreetInsights(location).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => { cancelled = true; };
  }, [location, enabled]);

  if (!enabled || !data) return null;

  const title = data.street ? `On ${data.street}` : 'On this street';

  if (data.status !== 'ok') {
    const n = data.sampleSize ?? 0;
    return (
      <Card className="mt-4">
        <CardContent className="flex items-start gap-3 p-5">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-snug text-muted-foreground">
            {n === 0
              ? 'No community scans here yet. Yours is the first.'
              : `${n} community scan${n === 1 ? '' : 's'} here so far. Insights appear at ${data.minimum}.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  const facts = [
    data.typicalLimitMinutes && `usually ${limit(data.typicalLimitMinutes)}`,
    data.restrictedShare != null && `${pct(data.restrictedShare)} of scans hit a restriction`,
    data.busiestHours?.length > 0 && `people park here most around ${data.busiestHours.slice(0, 2).map(hourLabel).join(' and ')}`,
    data.ticketRate != null && data.outcomesReported >= 5 && `${pct(data.ticketRate)} of ${data.outcomesReported} reported parks got a fine`,
  ].filter(Boolean);

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{data.sampleSize} scans</span>
      </div>
      <CardContent className="pt-2">
        <ul className="grid gap-1.5 text-sm leading-snug text-muted-foreground">
          {facts.map((f) => (
            <li key={f} className="flex gap-2"><span aria-hidden="true">•</span>{f}</li>
          ))}
        </ul>
        {data.availability?.status === 'proxy' && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">When people park here</p>
            <div className="mt-1.5 flex h-10 items-end gap-px" role="img" aria-label="Parking activity by hour of day">
              {data.availability.byHour.map((h) => {
                const max = Math.max(1, ...data.availability.byHour.map((x) => x.parked + x.scans));
                const height = ((h.parked + h.scans) / max) * 100;
                return <div key={h.hour} style={{ height: `${Math.max(4, height)}%` }} className="flex-1 rounded-sm bg-foreground/20" title={`${hourLabel(h.hour)}: ${h.parked} parked, ${h.scans} scans`} />;
              })}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
            </div>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{data.availability.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreetInsights;
