import React from 'react';

// Sits directly under the results content, so it reads as a bar bolted to the
// bottom edge — full bleed, a single rule on top, no card lift of its own.
// ResultsDisplay reserves the space with pb-24 while a timer runs.
const TimerOverlay = ({ formattedTime, isWarningPhase, onViewTimer, onStop }) => (
  <div
    className={`pb-safe fixed inset-x-0 bottom-0 z-50 border-t bg-panel ${
      isWarningPhase ? 'border-caution' : 'border-rule'
    }`}
  >
    <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4 px-5 py-3">
      <div>
        <p className={`kicker ${isWarningPhase ? 'text-caution' : ''}`}>
          {isWarningPhase ? 'Expiring soon' : 'Timer running'}
        </p>
        {/* Tabular figures — the countdown must not shuffle as digits change. */}
        <p
          className={`mt-1 font-mono text-lg leading-none tracking-tight ${
            isWarningPhase ? 'text-caution animate-pulse-slow' : 'text-signal'
          }`}
        >
          {formattedTime}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button onClick={onViewTimer} className="btn-quiet h-11 w-auto px-4 text-[13px]">
          View
        </button>
        <button
          onClick={onStop}
          aria-label="Stop timer"
          className="btn-quiet h-11 w-auto px-4 text-[13px] text-dim"
        >
          Stop
        </button>
      </div>
    </div>
  </div>
);

export default TimerOverlay;
