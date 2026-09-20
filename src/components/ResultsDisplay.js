import React, { useState } from 'react';
import { Timer, RotateCcw, MapPin, Camera, Check, X, AlertTriangle, ImageOff, CalendarDays, Share2, ChevronLeft } from 'lucide-react';
import { parseTimeLimit } from '../utils/timeParser';
import TimerOverlay from './TimerOverlay';
import Timeline from './Timeline';
import StreetInsights from './StreetInsights';
import WrongReadingForm from './WrongReadingForm';
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

const KIND_LABEL = {
  no_stopping: 'No Stopping is in force',
  clearway: 'Clearway is in force',
  bus_zone: 'Bus zone',
  taxi_zone: 'Taxi zone',
  works_zone: 'Works zone',
  no_parking: 'No Parking is in force',
  loading_zone: 'Loading zone',
  disabled_only: 'Disability parking only',
  permit_only: 'Permit holders only',
};

// Notes the engine wrote about the calendar are shown as their own callout,
// because "today is a public holiday so this sign is off" is the headline,
// not a footnote.
const isCalendarNote = (s) => /reg 318|public holiday|school day|school holidays/i.test(s);

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

const Disclaimer = () => (
  <p className="px-1 text-center text-xs leading-snug text-muted-foreground">
    ParkSense can misread a sign. Check it yourself before you walk away.
  </p>
);

const ResultsDisplay = ({
  analysisResult,
  historical = false,
  onBack,
  onAnalyzeAnother,
  onShare,
  showMockWarning = false,
  onStartTimer,
  onStopTimer,
  onViewTimer,
  onReportWrongReading,
  communityEnabled = false,
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
    kind,
    timeLimit,
    days,
    hours,
    paymentRequired,
    vehicleTypes,
    specialConditions = [],
    confidence,
    rawText,
    applicableSide,
    estimatedFine,
    fine,
    location,
    isMockData,
    calendar,
    timeline,
    nextChange,
    mustLeaveByMs,
    sideAmbiguous,
  } = analysisResult;

  const parsedDurationMs = parseTimeLimit(timeLimit);
  const canShowTimer = !historical && canPark && timeLimit && parsedDurationMs;
  const checkedAtMs = historical && analysisResult.timestamp ? Date.parse(analysisResult.timestamp) : Date.now();
  const isLowConfidence = confidence > 0 && confidence < 0.65;
  const confidencePct = Math.round(confidence * 100);

  const calendarNotes = specialConditions.filter(isCalendarNote);
  const otherNotes = specialConditions.filter((s) => !isCalendarNote(s));

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

  const feedback = onReportWrongReading ? (
    <WrongReadingForm onSubmit={(text) => onReportWrongReading(analysisResult, text)} />
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
              {otherNotes.length > 0 && (
                <ul className="mt-3 grid gap-1.5 text-sm leading-snug text-muted-foreground">
                  {otherNotes.map((n) => (
                    <li key={n} className="flex gap-2"><span aria-hidden="true">•</span>{n}</li>
                  ))}
                </ul>
              )}
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
          {feedback}
        </ScreenActions>
        {overlay}
      </Screen>
    );
  }

  // ─── Full verdict ──────────────────────────────────────────────────────────
  const leaveBy = historical ? null : (mustLeaveByMs ?? (parsedDurationMs ? Date.now() + parsedDurationMs : null));
  const leaveByLabel = leaveBy ? sydneyTime(leaveBy) : null;
  const opensAt = !canPark && nextChange?.canPark ? sydneyTime(nextChange.atMs) : null;
  const closesAt = canPark && nextChange && !nextChange.canPark ? sydneyTime(nextChange.atMs) : null;

  const summary = canPark
    ? [timeLimit ? `${timeLimit} limit` : 'No limit posted', leaveByLabel && `leave by ${leaveByLabel}`, paymentRequired && 'payment required']
    : [KIND_LABEL[kind] || 'Restrictions are in force right now', opensAt && `opens ${opensAt}`, estimatedFine && `fine ${estimatedFine}`];

  return (
    <Screen className={timerRunning ? 'pb-24' : ''}>
      {onBack ? (
        <div className="pt-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 px-2 font-medium">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Back
          </Button>
        </div>
      ) : (
        <div className="pt-6" />
      )}

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
        <p className="mt-4 text-xs opacity-70">
          {historical ? `Checked ${new Date(checkedAtMs).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' })} at ` : 'Checked at '}
          {sydneyTime(checkedAtMs)} Sydney time
        </p>
      </section>

      {historical && (
        <Alert className="mt-4" title="An earlier result">
          This is what the sign meant when you scanned it. Rescan for a current answer.
        </Alert>
      )}

      {calendarNotes.length > 0 && (
        <Alert className="mt-4" title={calendar?.isPublicHoliday ? `Public holiday${calendar.holidayName ? ` — ${calendar.holidayName}` : ''}` : 'Not a school day'}>
          {calendarNotes.map((n) => <p key={n}>{n}</p>)}
        </Alert>
      )}

      {sideAmbiguous && (
        <Alert className="mt-4" variant="warning" title="Which side are you on?">
          The arrows on this sign point both ways, so the strictest rule is shown. Rescan and pick your side for a precise answer.
        </Alert>
      )}

      <Card className="mt-4">
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 className="text-sm font-semibold">Sign details</h2>
          <Badge variant={confidence >= 0.85 ? 'success' : 'warning'}>{confidencePct}% confident</Badge>
        </div>
        <div className="divide-y divide-border">
          {timeLimit && <DetailRow label="Limit">{timeLimit}</DetailRow>}
          {leaveByLabel && canPark && <DetailRow label="Leave by">{leaveByLabel}</DetailRow>}
          {closesAt && !timeLimit && <DetailRow label="Restriction starts">{closesAt}</DetailRow>}
          {opensAt && <DetailRow label="Parking opens">{opensAt}</DetailRow>}
          {hours && <DetailRow label="Hours">{hours}</DetailRow>}
          {days?.length > 0 && <DetailRow label="Days">{shortDays(days)}</DetailRow>}
          {SIDE_LABEL[applicableSide] && <DetailRow label="Applies to">{SIDE_LABEL[applicableSide]}</DetailRow>}
          {paymentRequired && <DetailRow label="Payment">Required</DetailRow>}
          {vehicleTypes?.length > 0 && <DetailRow label="Vehicles">{vehicleTypes.join(', ')}</DetailRow>}
          {estimatedFine && (
            <DetailRow label={canPark ? 'Fine if you overstay' : 'Fine if caught'}>
              <span className={canPark ? '' : 'text-destructive'}>{estimatedFine}</span>
              {fine?.stale && <span className="block text-xs font-normal text-muted-foreground">may be out of date</span>}
            </DetailRow>
          )}
        </div>
        {timeline?.length > 1 && (
          <>
            <p className="flex items-center gap-1.5 px-5 pt-3 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Next 12 hours
            </p>
            <Timeline bands={timeline} />
          </>
        )}
      </Card>

      {otherNotes.length > 0 && (
        <ul className="mt-4 grid gap-1.5 px-1 text-sm leading-snug text-muted-foreground">
          {otherNotes.map((condition) => (
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

      <StreetInsights location={location} enabled={communityEnabled} />

      <ScreenActions>
        {mockNotice}
        <Disclaimer />

        {/* While a timer runs, the floating TimerOverlay is the timer control. */}
        {canShowTimer && !timerRunning && (
          <Button size="lg" onClick={() => onStartTimer(parsedDurationMs)}>
            <Timer className="h-5 w-5" aria-hidden="true" />
            Start {timeLimit} timer
          </Button>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-2.5">
          <Button variant={canShowTimer && !timerRunning ? 'outline' : 'default'} onClick={onAnalyzeAnother}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Scan another sign
          </Button>
          {onShare && (
            <Button variant="outline" size="icon" className="h-12 w-12" aria-label="Share this result" onClick={() => onShare(analysisResult)}>
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
        {feedback}
      </ScreenActions>
      {overlay}
    </Screen>
  );
};

export default ResultsDisplay;
