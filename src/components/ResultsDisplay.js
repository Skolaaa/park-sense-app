import React, { useState } from 'react';
import { Timer, RotateCcw, MapPin, Camera } from 'lucide-react';
import { parseTimeLimit } from '../utils/timeParser';
import TimerOverlay from './TimerOverlay';

// Sydney is the whole product context — the verdict is only true for a moment
// in time, so every screen states the moment it was decided.
const sydneyStamp = () =>
  new Date().toLocaleString('en-AU', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Australia/Sydney',
  });

// One screen chrome for every result state, so the verdict always lands in the
// same place on the glass.
const Screen = ({ children, padded = true, timerRunning }) => (
  <div className={`flex min-h-screen flex-col bg-ground ${timerRunning ? 'pb-24' : ''}`}>
    <div className={`mx-auto flex w-full max-w-md flex-1 flex-col ${padded ? 'px-5' : ''}`}>
      {children}
    </div>
  </div>
);

const SpecRow = ({ label, value }) => (
  <div className="spec-row">
    <span className="spec-label">{label}</span>
    <span className="spec-value text-right">{value}</span>
  </div>
);

const ResultsDisplay = ({
  analysisResult,
  onAnalyzeAnother,
  showMockWarning = false,
  onStartTimer,
  onStopTimer,
  onViewTimer,
  timerRunning,
  timerFormattedTime,
  timerWarningPhase,
}) => {
  // A weak read hides the detail behind an explicit choice rather than burying
  // a warning banner above a confident-looking result.
  const [overrideLowConfidence, setOverrideLowConfidence] = useState(false);

  if (!analysisResult) return null;

  const {
    noSignFound,
    canPark,
    timeLimit,
    days,
    hours,
    paymentRequired,
    vehicleTypes,
    specialConditions,
    confidence,
    rawText,
    applicableSide,
    estimatedFine,
    location,
    isMockData,
  } = analysisResult;

  const parsedDurationMs = parseTimeLimit(timeLimit);
  const canShowTimer = canPark && timeLimit && parsedDurationMs;
  const isLowConfidence = confidence > 0 && confidence < 0.65;
  const showMock = showMockWarning || isMockData;

  const sideLabel =
    applicableSide === 'left' ? 'LEFT of sign'
    : applicableSide === 'right' ? 'RIGHT of sign'
    : applicableSide === 'both' ? 'BOTH sides'
    : null;

  const overlay = timerRunning ? (
    <TimerOverlay
      formattedTime={timerFormattedTime}
      isWarningPhase={timerWarningPhase}
      onViewTimer={onViewTimer}
      onStop={onStopTimer}
    />
  ) : null;

  const mockNotice = showMock ? (
    <p className="kicker mt-4 text-caution">Demo data — no API key configured</p>
  ) : null;

  // ─── No sign in the frame ──────────────────────────────────────────────────
  if (noSignFound) {
    return (
      <Screen timerRunning={timerRunning}>
        <div className="flex flex-1 flex-col justify-center py-12">
          <Camera className="h-8 w-8 text-faint" aria-hidden="true" />
          <h1 className="mt-5 font-display text-verdict-sm uppercase">
            No sign in{' '}
            <br />
            that photo
          </h1>
          <p className="mt-4 max-w-[32ch] text-[13px] leading-relaxed text-dim">
            Get the whole plate in the frame with the text readable end to end,
            then try again.
          </p>
          {mockNotice}
        </div>
        <div className="pb-safe pb-6">
          <button onClick={onAnalyzeAnother} className="btn-signal h-[52px]">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Scan another sign
          </button>
        </div>
        {overlay}
      </Screen>
    );
  }

  // ─── Weak read — uncertainty is the whole screen ───────────────────────────
  if (isLowConfidence && !overrideLowConfidence) {
    return (
      <Screen timerRunning={timerRunning}>
        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="border-l-4 border-caution pl-4">
            <p className="kicker">Partial read · {sydneyStamp()}</p>
            <h1 className="mt-2 font-display text-verdict-sm uppercase text-caution">
              Check this{' '}
              <br />
              one yourself
            </h1>
          </div>
          <p className="mt-5 max-w-[32ch] text-[13px] leading-relaxed text-dim">
            Only part of the plate was legible, so the answer below could be
            wrong in exactly the way that costs you a fine.
          </p>

          {rawText && (
            <div className="mt-6 border border-rule bg-panel p-4">
              <p className="kicker mb-2">What we could read</p>
              <p className="font-mono text-[13px] text-ink">“{rawText}”</p>
              <div className="my-3 h-px bg-rule" />
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-dim">Confidence</span>
                <span className="font-mono text-caution">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>
          )}
          {mockNotice}
        </div>

        <div className="pb-safe grid gap-2.5 pb-6">
          <button onClick={onAnalyzeAnother} className="btn-signal h-[52px]">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Retake the photo
          </button>
          <button
            onClick={() => setOverrideLowConfidence(true)}
            className="btn-quiet h-[44px] text-[13px] text-dim"
          >
            Show what we read anyway
          </button>
        </div>
        {overlay}
      </Screen>
    );
  }

  // ─── Full verdict ──────────────────────────────────────────────────────────
  const bandTone = canPark
    ? 'bg-permit text-permit-ink'
    : 'bg-deny text-deny-ink';
  const bandKicker = canPark ? 'text-permit-ink/70' : 'text-deny-ink/70';

  const expiresAt = parsedDurationMs
    ? new Date(Date.now() + parsedDurationMs).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      })
    : null;

  const summary = canPark
    ? [
        timeLimit || 'No limit posted',
        expiresAt && `until ${expiresAt}`,
        paymentRequired ? 'Payment required' : 'No payment',
      ]
        .filter(Boolean)
        .join(' · ')
    : [rawText ? rawText.split(/[\n,]/)[0].trim() : 'Restricted', estimatedFine && `fine ${estimatedFine}`]
        .filter(Boolean)
        .join(' · ');

  return (
    <Screen padded={false} timerRunning={timerRunning}>
      {/* The verdict is the only loud thing on the screen, sized to be read at
          arm's length on a bright street. */}
      <header className={`${bandTone} px-5 pb-6 pt-8`}>
        <p className={`kicker ${bandKicker}`}>Verdict · {sydneyStamp()}</p>
        <h1 className="mt-2 font-display text-verdict uppercase">
          {canPark ? (
            <>
              You can{' '}
              <br />
              park here
            </>
          ) : (
            <>
              Do not{' '}
              <br />
              park here
            </>
          )}
        </h1>
        <p className={`mt-3 font-mono text-xs uppercase ${bandKicker}`}>{summary}</p>
      </header>

      <div className="flex flex-1 flex-col px-5 pt-5">
        {!canPark && (
          <p className="mb-4 text-[13px] leading-relaxed text-ink">
            {specialConditions?.length
              ? specialConditions[0]
              : 'Parking restrictions are in force here at the moment.'}
          </p>
        )}

        <div className="grid">
          {timeLimit && <SpecRow label="Limit" value={timeLimit} />}
          {hours && <SpecRow label="Hours" value={hours} />}
          {days?.length > 0 && (
            <SpecRow
              label="Days"
              value={days.length > 3 ? `${days[0].slice(0, 3)}–${days[days.length - 1].slice(0, 3)}` : days.map((d) => d.slice(0, 3)).join(', ')}
            />
          )}
          {sideLabel && <SpecRow label="Applies to" value={sideLabel} />}
          {paymentRequired && <SpecRow label="Payment" value="Required" />}
          {vehicleTypes?.length > 0 && (
            <SpecRow label="Vehicles" value={vehicleTypes.join(', ')} />
          )}
          {!canPark && estimatedFine && (
            <SpecRow label="If caught" value={<span className="text-deny">{estimatedFine}</span>} />
          )}
          <SpecRow
            label="Read at"
            value={
              <span className={confidence >= 0.85 ? 'text-ink' : 'text-caution'}>
                {Math.round(confidence * 100)}% confident
              </span>
            }
          />
        </div>

        {specialConditions?.length > 1 && (
          <ul className="mt-4 grid gap-1.5">
            {specialConditions.slice(canPark ? 0 : 1).map((condition, i) => (
              <li key={i} className="text-[13px] leading-snug text-dim">
                — {condition}
              </li>
            ))}
          </ul>
        )}

        {mockNotice}

        <div className="mt-auto pt-10">
          {rawText && (
            <p className="font-mono text-[10px] uppercase leading-relaxed text-faint">
              “{rawText}”
            </p>
          )}
          {location?.address && (
            <p className="mt-2 flex items-start gap-2 text-xs leading-snug text-faint">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {location.address}
            </p>
          )}
        </div>

        <div className="pb-safe grid gap-2.5 pb-6 pt-5">

          {canShowTimer && !timerRunning && (
            <button
              onClick={() => onStartTimer(parsedDurationMs)}
              className="btn-signal h-[52px]"
            >
              <Timer className="h-4 w-4" aria-hidden="true" />
              Start timer · {timeLimit}
            </button>
          )}

          {timerRunning && (
            <button
              onClick={onViewTimer}
              className={`btn-signal h-[52px] ${timerWarningPhase ? 'bg-caution text-caution-ink' : ''}`}
            >
              <Timer
                className={`h-4 w-4 ${timerWarningPhase ? 'animate-pulse-slow' : ''}`}
                aria-hidden="true"
              />
              {timerFormattedTime} left — view timer
            </button>
          )}

          <button
            onClick={onAnalyzeAnother}
            className={timerRunning || canShowTimer ? 'btn-quiet h-[46px]' : 'btn-signal h-[52px]'}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Scan another sign
          </button>
        </div>
      </div>
      {overlay}
    </Screen>
  );
};

export default ResultsDisplay;
