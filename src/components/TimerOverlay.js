import React from 'react';
import { Timer } from 'lucide-react';
import { Button } from './ui/button';

// Floats above the results content while a timer runs. ResultsDisplay reserves
// the space with pb-24.
const TimerOverlay = ({ formattedTime, isWarningPhase, onViewTimer, onStop }) => (
  <div className="pb-safe fixed inset-x-0 bottom-0 z-50 px-5">
    <div className="mx-auto mb-4 flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 pl-4 shadow-float">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isWarningPhase ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'
        }`}
      >
        <Timer className={`h-4 w-4 ${isWarningPhase ? 'animate-pulse-slow' : ''}`} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{isWarningPhase ? 'Ends soon' : 'Timer'}</p>
        {/* Tabular figures — the countdown must not shuffle as digits change. */}
        <p className={`tabular text-base font-semibold leading-tight ${isWarningPhase ? 'text-warning' : ''}`}>
          {formattedTime}
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onViewTimer}>
        View
      </Button>
      <Button size="sm" variant="ghost" onClick={onStop} aria-label="Stop timer">
        Stop
      </Button>
    </div>
  </div>
);

export default TimerOverlay;
