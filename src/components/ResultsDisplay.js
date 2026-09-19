import React, { useState } from 'react';
import { Timer, RotateCcw, MapPin, Camera, Check, X, AlertTriangle, ImageOff } from 'lucide-react';
import { parseTimeLimit } from '../utils/timeParser';
import TimerOverlay from './TimerOverlay';
import { Screen, ScreenActions } from './Screen';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import { Card, CardContent } from './ui/card';

// The verdict is only true for a moment in time, so it states the moment it
// was decided.
const sydneyTime = (ms = Date.now()) =>
  new Date(ms).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  });

const shortDays = (days) => {
  const abbr = days.map((d) => d.slice(0, 3));
  return abbr.length > 3 ? `${abbr[0]}–${abbr[abbr.length - 1]}` : abbr.join(', ');
};

const SIDE_LABEL = { left: 'Left of the sign', right: 'Right of the sign', both: 'Both sides' };

const DetailRow = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 px-5 py-3 text-[15px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{children}</span>
  </div>
);

// A centred icon-and-message screen for the states with no verdict to show.
const EmptyState = ({ icon: Icon, tone, title, children }) => (
  <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
    <span className={`flex h-14 w-14 items-center justify-center rounded-full ${tone}`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
    <h1 className="mt-6 text-2xl font-semibold tracking-tight [text-wrap:balance]">{title}</h1>
    <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-muted-foreground">{children}</p>
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
  const confidencePct = Math.round(confidence * 100);

  const overlay = timerRunning ? (
    <TimerOverlay
      formattedTime={timerFormattedTime}
      isWarningPhase={timerWarningPhase}
      onViewTimer={onViewTimer}
      onStop={onStopTimer}
    />
  ) : null;

  const mockNotice = (showMockWarning || isMockData) ? (
    <Alert variant="warning" title="Demo mode">
      No API key is configured, so this is sample data.
    </Alert>
  ) : null;

  // ─── No sign in the frame ──────────────────────────────────────────────────
  if (noSignFound) {
    return (
      <Screen className={timerRunning ? 'pb-24' : ''}>
        <EmptyState icon={ImageOff} tone="bg-muted text-muted-foreground" title="No sign in that photo">
          Get the whole sign in the frame with the text readable end to end, then try again.
        </EmptyState>
        <ScreenActions>
          {mockNotice}
          <Button size="lg" onClick={onAnalyzeAnother}>
            <Camera className="h-4 w-4" aria-hidden="true" />
            Scan another sign
          </Button>
        </ScreenActions>
        {overlay}
      </Screen>
    );
  }

  // ─── Weak read — uncertainty is the whole screen ───────────────────────────
  if (isLowConfidence && !overrideLowConfidence) {
    return (
      <Screen className={timerRunning ? 'pb-24' : ''}>
        <EmptyState icon={AlertTriangle} tone="bg-warning/10 text-warning" title="Check this one yourself">
          Only part of the sign was legible, so the answer could be wrong in exactly the way
          that costs you a fine.
        </EmptyState>

        {rawText && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">What we could read</p>
                <Badge variant="warning">{confidencePct}% confident</Badge>
              </div>
              <p className="mt-2 text-[15px] leading-snug text-muted-foreground">“{rawText}”</p>
            </CardContent>
          </Card>
        )}

        <ScreenActions>
          {mockNotice}
          <Button size="lg" onClick={onAnalyzeAnother}>
            <Camera className="h-4 w-4" aria-hidden="true" />
            Retake the photo
          </Button>
          <Button variant="ghost" onClick={() => setOverrideLowConfidence(true)}>
            Show the result anyway
          </Button>
        </ScreenActions>
        {overlay}
      </Screen>
    );
  }

  // ─── Full verdict ──────────────────────────────────────────────────────────
  const expiresAt = parsedDurationMs ? sydneyTime(Date.now() + parsedDurationMs) : null;

  const summary = canPark
    ? [timeLimit ? `${timeLimit} limit` : 'No limit posted', expiresAt && `until ${expiresAt}`, paymentRequired && 'payment required']
    : [specialConditions?.[0] || 'Restrictions are in force right now', estimatedFine && `fine ${estimatedFine}`];

  return (
    <Screen className={timerRunning ? 'pb-24' : ''}>
      <div className="pt-6" />

      {/* The verdict is the only loud thing on the screen, sized to be read at
          arm's length on a bright street. */}
      <section
        className={`animate-rise rounded-2xl p-6 ${
          canPark ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          {canPark ? (
            <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <X className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-5 text-[32px] font-semibold leading-tight tracking-tight">
          {canPark ? 'You can park here' : 'No parking right now'}
        </h1>
        <p className="mt-2 text-[15px] leading-snug opacity-90">
          {summary.filter(Boolean).join(' · ')}
        </p>
        <p className="mt-4 text-xs opacity-70">Checked at {sydneyTime()} Sydney time</p>
      </section>

      <Card className="mt-4">
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 className="text-sm font-semibold">Sign details</h2>
          <Badge variant={confidence >= 0.85 ? 'success' : 'warning'}>{confidencePct}% confident</Badge>
        </div>
        <div className="divide-y divide-border">
          {timeLimit && <DetailRow label="Limit">{timeLimit}</DetailRow>}
          {hours && <DetailRow label="Hours">{hours}</DetailRow>}
          {days?.length > 0 && <DetailRow label="Days">{shortDays(days)}</DetailRow>}
          {SIDE_LABEL[applicableSide] && <DetailRow label="Applies to">{SIDE_LABEL[applicableSide]}</DetailRow>}
          {paymentRequired && <DetailRow label="Payment">Required</DetailRow>}
          {vehicleTypes?.length > 0 && <DetailRow label="Vehicles">{vehicleTypes.join(', ')}</DetailRow>}
          {!canPark && estimatedFine && (
            <DetailRow label="Fine if caught">
              <span className="text-destructive">{estimatedFine}</span>
            </DetailRow>
          )}
        </div>
      </Card>

      {specialConditions?.length > (canPark ? 0 : 1) && (
        <ul className="mt-4 grid gap-1.5 px-1 text-sm leading-snug text-muted-foreground">
          {specialConditions.slice(canPark ? 0 : 1).map((condition) => (
            <li key={condition} className="flex gap-2">
              <span aria-hidden="true">•</span>
              {condition}
            </li>
          ))}
        </ul>
      )}

      {(rawText || location?.address) && (
        <div className="mt-4 grid gap-2 px-1 text-sm text-muted-foreground">
          {rawText && <p className="leading-snug">Sign reads “{rawText}”</p>}
          {location?.address && (
            <p className="flex items-start gap-1.5 leading-snug">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {location.address}
            </p>
          )}
        </div>
      )}

      <ScreenActions>
        {mockNotice}

        {/* While a timer runs, the floating TimerOverlay is the timer control. */}
        {canShowTimer && !timerRunning && (
          <Button size="lg" onClick={() => onStartTimer(parsedDurationMs)}>
            <Timer className="h-5 w-5" aria-hidden="true" />
            Start {timeLimit} timer
          </Button>
        )}

        <Button variant={canShowTimer && !timerRunning ? 'outline' : 'default'} onClick={onAnalyzeAnother}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Scan another sign
        </Button>
      </ScreenActions>
      {overlay}
    </Screen>
  );
};

export default ResultsDisplay;
