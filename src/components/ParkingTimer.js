import React from 'react';
import { MapPin } from 'lucide-react';
import { TIMER_CONFIG } from '../utils/constants';
import { Screen, ScreenHeader, ScreenActions } from './Screen';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { Card } from './ui/card';

const clockAt = (ms) =>
  new Date(ms).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  });

const RING_RADIUS = 104;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const TONE = {
  success: { text: 'text-success', stroke: 'stroke-success' },
  warning: { text: 'text-warning', stroke: 'stroke-warning' },
  destructive: { text: 'text-destructive', stroke: 'stroke-destructive' },
};

const ParkingTimer = ({
  remainingMs,
  totalMs,
  formattedTime,
  percentRemaining,
  isWarningPhase,
  onStop,
  onBack,
  analysisResult,
}) => {
  const isExpired = remainingMs <= 0 && totalMs > 0;
  const tone = TONE[isExpired ? 'destructive' : isWarningPhase ? 'warning' : 'success'];
  const fraction = Math.max(0, Math.min(100, percentRemaining)) / 100;

  // Absolute times answer "when do I need to be back" better than a countdown
  // alone, which is useless the moment the phone goes in a pocket.
  const now = Date.now();
  const startedAt = now - (totalMs - remainingMs);
  const expiresAt = now + Math.max(remainingMs, 0);
  const warnAt = expiresAt - TIMER_CONFIG.WARNING_THRESHOLD_MS;

  return (
    <Screen>
      <ScreenHeader onBack={onBack} backLabel="Result" title="Parking timer" />

      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <div className="relative h-60 w-60">
          <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="120" cy="120" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
            <circle
              cx="120"
              cy="120"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - fraction)}
              className={`${tone.stroke} transition-[stroke-dashoffset] duration-1000 ease-linear`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isExpired ? (
              <p className={`text-3xl font-semibold tracking-tight ${tone.text}`}>Time's up</p>
            ) : (
              <p
                className={`tabular text-[44px] font-semibold leading-none tracking-tight ${
                  isWarningPhase ? `${tone.text} animate-pulse-slow` : ''
                }`}
              >
                {formattedTime}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {isExpired ? `expired ${clockAt(expiresAt)}` : 'remaining'}
            </p>
          </div>
        </div>

        {isWarningPhase && !isExpired && (
          <Alert variant="warning" title="Fifteen minutes left" className="mt-8 w-full">
            Start heading back to the car.
          </Alert>
        )}
        {isExpired && (
          <Alert variant="destructive" title="Your parking has expired" className="mt-8 w-full">
            Move the vehicle now to avoid a fine.
          </Alert>
        )}

        <Card className="mt-8 w-full divide-y divide-border">
          {[
            ['Started', clockAt(startedAt)],
            ['Reminder', clockAt(warnAt)],
            ['Expires', clockAt(expiresAt)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between px-5 py-3 text-[15px]">
              <span className="text-muted-foreground">{label}</span>
              <span className="tabular font-medium">{value}</span>
            </div>
          ))}
        </Card>

        {analysisResult?.location?.address && (
          <p className="mt-4 flex items-start gap-1.5 px-1 text-sm leading-snug text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {analysisResult.location.address}
          </p>
        )}
      </div>

      <ScreenActions>
        <Button variant="outline" onClick={onStop} className="text-destructive">
          End timer
        </Button>
      </ScreenActions>
    </Screen>
  );
};

export default ParkingTimer;
