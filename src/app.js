import React, { useState, useCallback, useEffect } from 'react';
import { Camera, ScanLine, Footprints, CheckCircle2, Timer, ChevronRight, Settings as SettingsIcon, History as HistoryIcon, RefreshCw } from 'lucide-react';
import CameraCapture from './components/CameraCapture';
import ImageAnalysis from './components/ImageAnalysis';
import ResultsDisplay from './components/ResultsDisplay';
import SideSelection from './components/SideSelection';
import ParkingTimer from './components/ParkingTimer';
import NotificationBanner from './components/NotificationBanner';
import LegalScreen from './components/LegalScreen';
import HistoryScreen, { HistoryRow } from './components/HistoryScreen';
import SettingsScreen from './components/SettingsScreen';
import CommunityConsentCard from './components/CommunityConsentCard';
import OutcomePrompt from './components/OutcomePrompt';
import EarlyAccessCard from './components/EarlyAccessCard';
import InstallCard from './components/InstallCard';
import Toast from './components/ui/toast';
import { Screen, ScreenActions } from './components/Screen';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Alert } from './components/ui/alert';
import { Card, CardContent } from './components/ui/card';
import { ParkingAnalysisService } from './services/parkingAnalysis';
import { LocationService } from './services/locationService';
import { NotificationService } from './services/notificationService';
import { PushService } from './services/pushService';
import { CommunityService } from './services/communityService';
import { OutcomeService } from './services/outcomeService';
import { HistoryService, makeThumbnail } from './services/historyService';
import { ShareService } from './services/shareService';
import { EarlyAccessService } from './services/earlyAccessService';
import { Consent } from './services/consent';
import { Analytics, EVENTS } from './services/analytics';
import { ErrorReporting } from './services/errorReporting';
import { TimerService } from './services/timerService';
import { useTimer } from './hooks/useTimer';
import { VIEW_STATES, APP_CONFIG } from './utils/constants';

const STEPS = [
  { Icon: ScanLine, text: 'Photograph the parking sign' },
  { Icon: Footprints, text: 'Say which side of it you are on' },
  { Icon: CheckCircle2, text: 'Get a yes or no, and a timer if you can stay' },
];

const INSTALL_DISMISSED_KEY = 'parksense_install_dismissed';
const readFlag = (key) => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
const writeFlag = (key) => { try { localStorage.setItem(key, '1'); } catch { /* ignore */ } };

const App = () => {
  const [currentView, setCurrentView] = useState(VIEW_STATES.HOME);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [historicalResult, setHistoricalResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [inAppWarning, setInAppWarning] = useState(false);
  const [consent, setConsent] = useState(() => Consent.get());
  const [scanCount, setScanCount] = useState(0);
  const [pendingOutcome, setPendingOutcome] = useState(() => OutcomeService.pending());
  const [returnView, setReturnView] = useState(VIEW_STATES.HOME);
  const [history, setHistory] = useState(() => HistoryService.list());
  const [earlyAccess, setEarlyAccess] = useState(() => EarlyAccessService.status());
  const [installDismissed, setInstallDismissed] = useState(() => readFlag(INSTALL_DISMISSED_KEY));
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [toast, setToast] = useState(null);

  const refreshPendingOutcome = useCallback(() => setPendingOutcome(OutcomeService.pending()), []);
  const clearToast = useCallback(() => setToast(null), []);

  const handleTimerExpired = useCallback(() => {
    OutcomeService.end();
    refreshPendingOutcome();
  }, [refreshPendingOutcome]);

  const {
    isRunning: timerRunning,
    remainingMs,
    totalMs,
    formattedTime: timerFormattedTime,
    percentRemaining,
    isWarningPhase,
    startTimer,
    stopTimer,
  } = useTimer({ onExpire: handleTimerExpired });

  useEffect(() => {
    ErrorReporting.setView(currentView);
  }, [currentView]);

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true);
    window.addEventListener('parksense:update', onUpdate);
    return () => window.removeEventListener('parksense:update', onUpdate);
  }, []);

  // ─── Navigation helpers ─────────────────────────────────────────────────────

  const goTo = (view, { remember = true } = {}) => {
    if (remember) setReturnView(currentView);
    setCurrentView(view);
  };
  const goBack = () => setCurrentView(returnView);

  // ─── Camera handlers ────────────────────────────────────────────────────────

  const handleCameraCapture = (imageData) => {
    setCapturedImage(imageData);
    setApiError(null);
    setCurrentView(VIEW_STATES.PREVIEW);
  };

  const handleCameraCancel = () => setCurrentView(VIEW_STATES.HOME);

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setApiError(null);
    setCurrentView(VIEW_STATES.CAMERA);
  };

  const handleStartCamera = () => {
    setApiError(null);
    setHistoricalResult(false);
    setCurrentView(VIEW_STATES.CAMERA);
  };

  // ─── Analysis handlers ───────────────────────────────────────────────────────

  const handleAnalyzeImage = () => {
    setApiError(null);
    setCurrentView(VIEW_STATES.SIDE_SELECTION);
  };

  const performAnalysis = async (side) => {
    setIsAnalyzing(true);
    setCurrentView(VIEW_STATES.ANALYZING);
    setApiError(null);
    Analytics.track(EVENTS.SCAN_STARTED, { side: side ?? 'unknown' });
    try {
      const result = await ParkingAnalysisService.analyzeImage(capturedImage, side);

      // A short buzz that says "yes" or "no" without looking at the screen.
      try { navigator.vibrate?.(result.noSignFound ? 0 : result.canPark ? 30 : [40, 60, 40]); } catch { /* ignore */ }

      // Keep it, with a thumbnail. The full-size photo is never stored.
      const thumb = await makeThumbnail(capturedImage);
      const entry = HistoryService.add(result, thumb);
      if (entry) setHistory(HistoryService.list());

      // Attach location in the background — don't block the result. The
      // community scan event waits for it, because a scan with no street is
      // no use to anyone.
      LocationService.getCurrentAddress().then((location) => {
        if (location) {
          setAnalysisResult((prev) => (prev ? { ...prev, location } : { ...result, location }));
          if (entry) { HistoryService.attachLocation(entry.id, location); setHistory(HistoryService.list()); }
          if (!result.isMockData) CommunityService.recordScan({ ...result, location });
        }
      }).catch(() => {});

      setAnalysisResult(result);
      setHistoricalResult(false);
      setScanCount((n) => n + 1);
      setCurrentView(VIEW_STATES.RESULTS);
      Analytics.track(EVENTS.SCAN_COMPLETED, {
        can_park: result.canPark, kind: result.kind ?? null, confidence: result.confidence,
        no_sign: !!result.noSignFound, mock: !!result.isMockData,
        public_holiday: !!result.calendar?.isPublicHoliday, side_ambiguous: !!result.sideAmbiguous,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setApiError(error.message);
      setCurrentView(VIEW_STATES.PREVIEW);
      Analytics.track(EVENTS.SCAN_FAILED, { message: String(error.message).slice(0, 80) });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setHistoricalResult(false);
    setApiError(null);
    setCurrentView(VIEW_STATES.HOME);
  };

  const openHistoryEntry = (entry) => {
    setAnalysisResult(entry.result);
    setHistoricalResult(true);
    setReturnView(currentView);
    setCurrentView(VIEW_STATES.RESULTS);
  };

  // ─── Timer handlers ──────────────────────────────────────────────────────────

  const handleStartTimer = async (durationMs) => {
    const permission = await NotificationService.requestPermission();
    if (permission !== 'granted') setInAppWarning(true);
    startTimer(durationMs);
    NotificationService.scheduleWarning(durationMs);
    OutcomeService.begin(analysisResult, durationMs);
    if (!analysisResult?.isMockData) CommunityService.recordTimerStart(analysisResult, durationMs);

    // Push reminders reach a closed tab; the setTimeout above only reaches an
    // open one. Both are armed; the service worker's `tag` de-duplicates.
    const label = analysisResult?.location?.address?.split(',').slice(0, 2).join(',').trim() || null;
    PushService.scheduleReminders(Date.now() + durationMs, { label }).then((ok) => {
      if (ok) setToast('Reminder set. It will reach you even if you close the app.');
      Analytics.track(EVENTS.REMINDER_SCHEDULED, { channel: ok ? 'push' : permission === 'granted' ? 'notification' : 'in_app' });
    });

    Analytics.track(EVENTS.TIMER_STARTED, { duration_min: Math.round(durationMs / 60000), notifications: permission });
  };

  const handleStopTimer = () => {
    const elapsedMs = totalMs > 0 ? totalMs - remainingMs : 0;
    stopTimer();
    NotificationService.cancelScheduled();
    PushService.cancelReminders();
    setInAppWarning(false);
    OutcomeService.end();
    refreshPendingOutcome();
    if (!analysisResult?.isMockData) CommunityService.recordTimerStop(analysisResult, elapsedMs);
    Analytics.track(EVENTS.TIMER_STOPPED, { elapsed_min: Math.round(elapsedMs / 60000) });
  };

  const handleViewTimer = () => setCurrentView(VIEW_STATES.TIMER);
  const dismissWarning = useCallback(() => setInAppWarning(false), []);

  // ─── Community, sharing, settings ────────────────────────────────────────────

  const handleOutcome = (outcome) => {
    if (pendingOutcome) CommunityService.recordOutcome(pendingOutcome, outcome);
    Analytics.track(EVENTS.OUTCOME_REPORTED, { outcome });
    OutcomeService.clear();
    setPendingOutcome(null);
    setToast('Thanks. That helps make the readings better.');
  };

  const handleReportWrongReading = (result, text) => {
    CommunityService.reportWrongReading(result, text);
    Analytics.track(EVENTS.FEEDBACK_SENT, { can_park: result?.canPark ?? null, kind: result?.kind ?? null });
  };

  const handleConsent = (value) => {
    Consent.set(value);
    setConsent(value);
    Analytics.track(EVENTS.CONSENT_CHANGED, { value });
  };

  const handleShare = async (result) => {
    const outcome = await ShareService.share(result);
    if (outcome === 'copied') setToast('Copied to clipboard');
    if (outcome === 'unavailable') setToast('Sharing is not available in this browser');
    Analytics.track(EVENTS.RESULT_SHARED, { outcome });
  };

  const handleClearData = () => {
    HistoryService.clear();
    OutcomeService.clear();
    TimerService.clear();
    if (timerRunning) handleStopTimer();
    try { localStorage.removeItem(INSTALL_DISMISSED_KEY); } catch { /* ignore */ }
    Consent.set('declined');
    setConsent(null);
    try { localStorage.removeItem('parksense_community_consent'); localStorage.removeItem('parksense_early_access'); } catch { /* ignore */ }
    setEarlyAccess(null);
    setHistory([]);
    setPendingOutcome(null);
    setAnalysisResult(null);
    setToast('Cleared');
    setCurrentView(VIEW_STATES.HOME);
  };

  // ─── Home ────────────────────────────────────────────────────────────────────

  const isMockResult = !!analysisResult?.isMockData;

  // One card at a time on the home screen, in order of what matters most.
  // Nothing is asked before the first scan: the user should know what a
  // scan is before being asked to share one.
  const hasScanned = scanCount > 0 || history.length > 0;
  const homeCard = (() => {
    if (pendingOutcome && !timerRunning) return <OutcomePrompt session={pendingOutcome} onAnswer={handleOutcome} />;
    if (!hasScanned) return null;
    if (consent === null) {
      return <CommunityConsentCard onDecide={handleConsent} onShowPrivacy={() => goTo(VIEW_STATES.PRIVACY)} />;
    }
    if (earlyAccess === null) {
      return <EarlyAccessCard source="home" onDone={(v) => { setEarlyAccess(v); if (v === 'joined') setToast("You're on the list"); }} />;
    }
    if (!installDismissed) {
      return <InstallCard onDismiss={() => { writeFlag(INSTALL_DISMISSED_KEY); setInstallDismissed(true); }} />;
    }
    return null;
  })();

  const renderHomeScreen = () => (
    <Screen>
      <header className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground"
            aria-hidden="true"
          >
            P
          </span>
          <span className="text-base font-semibold">{APP_CONFIG.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge>Sydney</Badge>
          <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => goTo(VIEW_STATES.SETTINGS)}>
            <SettingsIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-8">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight [text-wrap:balance]">
          Can I park here?
        </h1>
        <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
          Photograph the sign. ParkSense reads it, applies today's date, the time and any
          arrows, and gives you a straight answer.
        </p>

        {history.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="grid gap-4 p-5">
              {STEPS.map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                  </span>
                  <span className="text-[15px] leading-snug">{text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <HistoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Recent
              </h2>
              <button type="button" onClick={() => goTo(VIEW_STATES.HISTORY)} className="text-xs font-medium text-muted-foreground underline underline-offset-2">
                {history.length > 3 ? `See all ${history.length}` : 'See all'}
              </button>
            </div>
            <Card className="divide-y divide-border overflow-hidden">
              {history.slice(0, 3).map((entry) => <HistoryRow key={entry.id} entry={entry} onOpen={openHistoryEntry} />)}
            </Card>
          </div>
        )}
      </div>

      <ScreenActions className="pt-0">
        {updateAvailable && (
          <Alert title="Update ready">
            <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-2">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reload to get the latest version
            </button>
          </Alert>
        )}

        {apiError && (
          <Alert variant="destructive" title="Analysis failed">
            {apiError}
          </Alert>
        )}

        {isMockResult && (
          <Alert variant="warning" title="Demo mode">
            No API key is configured, so results are sample data.
          </Alert>
        )}

        {timerRunning && (
          <button
            onClick={handleViewTimer}
            className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-transform duration-150 ease-out active:scale-[0.98] ${
              isWarningPhase ? 'border-warning/40 bg-warning/5' : 'border-border bg-card'
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isWarningPhase ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'
              }`}
            >
              <Timer className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {isWarningPhase ? 'Parking ends soon' : 'Parking timer running'}
              </span>
              <span className="tabular mt-0.5 block text-sm text-muted-foreground">
                {timerFormattedTime} left
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>
        )}

        {homeCard}

        <Button size="lg" onClick={handleStartCamera}>
          <Camera className="h-5 w-5" aria-hidden="true" />
          Scan a sign
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          v{APP_CONFIG.version} · Sydney parking rules ·{' '}
          <button type="button" className="underline underline-offset-2" onClick={() => goTo(VIEW_STATES.PRIVACY)}>Privacy</button>
        </p>
      </ScreenActions>
    </Screen>
  );

  // ─── View router ─────────────────────────────────────────────────────────────

  const renderCurrentView = () => {
    switch (currentView) {
      case VIEW_STATES.CAMERA:
        return (
          <CameraCapture
            onCapture={handleCameraCapture}
            onCancel={handleCameraCancel}
            isActive={true}
          />
        );

      case VIEW_STATES.PREVIEW:
      case VIEW_STATES.ANALYZING:
        return (
          <ImageAnalysis
            capturedImage={capturedImage}
            onAnalyze={handleAnalyzeImage}
            onRetake={handleRetakePhoto}
            isAnalyzing={isAnalyzing}
            error={apiError}
          />
        );

      case VIEW_STATES.SIDE_SELECTION:
        return (
          <SideSelection
            capturedImage={capturedImage}
            onSelectSide={performAnalysis}
            onBack={() => setCurrentView(VIEW_STATES.PREVIEW)}
          />
        );

      case VIEW_STATES.RESULTS:
        return (
          <ResultsDisplay
            analysisResult={analysisResult}
            historical={historicalResult}
            onAnalyzeAnother={handleAnalyzeAnother}
            onBack={historicalResult ? goBack : undefined}
            showMockWarning={isMockResult}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onViewTimer={handleViewTimer}
            onReportWrongReading={handleReportWrongReading}
            onShare={handleShare}
            communityEnabled={consent === 'granted'}
            timerRunning={timerRunning}
            timerFormattedTime={timerFormattedTime}
            timerWarningPhase={isWarningPhase}
          />
        );

      case VIEW_STATES.TIMER:
        return (
          <ParkingTimer
            remainingMs={remainingMs}
            totalMs={totalMs}
            formattedTime={timerFormattedTime}
            percentRemaining={percentRemaining}
            isWarningPhase={isWarningPhase}
            onStop={handleStopTimer}
            onBack={() => setCurrentView(analysisResult ? VIEW_STATES.RESULTS : VIEW_STATES.HOME)}
            analysisResult={analysisResult}
          />
        );

      case VIEW_STATES.HISTORY:
        return (
          <HistoryScreen
            entries={history}
            onOpen={openHistoryEntry}
            onClear={() => { HistoryService.clear(); setHistory([]); setToast('History cleared'); }}
            onBack={goBack}
          />
        );

      case VIEW_STATES.SETTINGS:
        return (
          <SettingsScreen
            consent={consent}
            onConsentChange={handleConsent}
            onOpenLegal={(kind) => goTo(kind === 'privacy' ? VIEW_STATES.PRIVACY : VIEW_STATES.TERMS)}
            onClearData={handleClearData}
            onBack={goBack}
          />
        );

      case VIEW_STATES.PRIVACY:
      case VIEW_STATES.TERMS:
        return (
          <LegalScreen
            kind={currentView === VIEW_STATES.PRIVACY ? 'privacy' : 'terms'}
            onBack={goBack}
          />
        );

      case VIEW_STATES.HOME:
      default:
        return renderHomeScreen();
    }
  };

  return (
    <div className="min-h-screen">
      {inAppWarning && (
        <NotificationBanner onDismiss={dismissWarning} />
      )}
      {renderCurrentView()}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
};

export default App;
