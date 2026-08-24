import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { TIMER_CONFIG } from '../utils/constants';

const clockAt = (ms) =>
  new Date(ms).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Australia/Sydney',
  });

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

  // Absolute times answer "when do I need to be back" better than a countdown
  // alone, which is useless the moment the phone goes in a pocket.
  const now = Date.now();
  const startedAt = now - (totalMs - remainingMs);
  const expiresAt = now + Math.max(remainingMs, 0);
  const warnAt = expiresAt - TIMER_CONFIG.WARNING_THRESHOLD_MS;

  const tone = isExpired ? 'deny' : isWarningPhase ? 'caution' : 'signal';
  const toneText = { deny: 'text-deny', caution: 'text-caution', signal: 'text-signal' }[tone];
  const toneBg = { deny: 'bg-deny', caution: 'bg-caution', signal: 'bg-signal' }[tone];

  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <header className="pt-safe pt-5">
          <button
            onClick={onBack}
            className="-ml-1 flex items-center gap-1 py-2 text-dim transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="text-[13px]">Back to result</span>
          </button>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="kicker">
            {analysisResult?.location?.address
              ? `Parked · ${analysisResult.location.address}`
              : 'Parked'}
          </p>

          {isExpired ? (
            <h1 className="mt-4 font-display text-verdict uppercase text-deny">
              Time is{' '}
              <br />
              up
            </h1>
          ) : (
            <p
              className={`mt-4 font-mono text-[56px] font-medium leading-none tracking-tight ${
                isWarningPhase ? `${toneText} animate-pulse-slow` : 'text-ink'
              }`}
            >
              {formattedTime}
            </p>
          )}

          <p className="mt-3 font-mono text-[11px] uppercase text-dim">
            {isExpired
              ? `Expired ${clockAt(expiresAt)} — move the car`
              : `Expires ${clockAt(expiresAt)} · warn at ${clockAt(warnAt)}`}
          </p>

          {/* Elapsed rail. A bar reads faster than a ring at a glance and gives
              the two clock times somewhere honest to sit. */}
          <div className="mt-8 h-[3px] w-full bg-rule" role="presentation">
            <div
              className={`h-full ${toneBg} transition-[width] duration-1000 ease-linear`}
              style={{ width: `${Math.max(0, Math.min(100, percentRemaining))}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
            <span>{clockAt(startedAt)}</span>
            <span>{Math.round(Math.max(0, percentRemaining))}%</span>
            <span>{clockAt(expiresAt)}</span>
          </div>

          {isWarningPhase && !isExpired && (
            <p className="mt-6 border-l-4 border-caution pl-4 text-[13px] leading-relaxed text-ink">
              Fifteen minutes left. Start heading back to the car.
            </p>
          )}

          {isExpired && (
            <p className="mt-6 border-l-4 border-deny pl-4 text-[13px] leading-relaxed text-ink">
              Your parking has expired. Move the vehicle now to avoid a fine.
            </p>
          )}

          {analysisResult && (
            <div className="mt-8 grid gap-0">
              {analysisResult.rawText && (
                <div className="spec-row">
                  <span className="spec-label">Sign</span>
                  <span className="spec-value text-right">“{analysisResult.rawText}”</span>
                </div>
              )}
              {analysisResult.applicableSide && analysisResult.applicableSide !== 'both' && (
                <div className="spec-row">
                  <span className="spec-label">Applies to</span>
                  <span className="spec-value">
                    {analysisResult.applicableSide.toUpperCase()} of sign
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pb-safe pb-6">
          <button onClick={onStop} className="btn-quiet h-[46px] text-[13px]">
            End timer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParkingTimer;
