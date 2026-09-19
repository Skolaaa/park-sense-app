import React, { useState, useCallback } from 'react';
import { Camera, ScanLine, Footprints, CheckCircle2, Timer, ChevronRight } from 'lucide-react';
import CameraCapture from './components/CameraCapture';
import ImageAnalysis from './components/ImageAnalysis';
import ResultsDisplay from './components/ResultsDisplay';
import SideSelection from './components/SideSelection';
import ParkingTimer from './components/ParkingTimer';
import NotificationBanner from './components/NotificationBanner';
import { Screen, ScreenActions } from './components/Screen';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Alert } from './components/ui/alert';
import { Card, CardContent } from './components/ui/card';
import { ParkingAnalysisService } from './services/parkingAnalysis';
import { LocationService } from './services/locationService';
import { NotificationService } from './services/notificationService';
import { useTimer } from './hooks/useTimer';
import { VIEW_STATES, APP_CONFIG } from './utils/constants';

const STEPS = [
  { Icon: ScanLine, text: 'Photograph the parking sign' },
  { Icon: Footprints, text: 'Say which side of it you are on' },
  { Icon: CheckCircle2, text: 'Get a yes or no, and a timer if you can stay' },
];

const App = () => {
  const [currentView, setCurrentView] = useState(VIEW_STATES.HOME);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [inAppWarning, setInAppWarning] = useState(false);

  const {
    isRunning: timerRunning,
    remainingMs,
    totalMs,
    formattedTime: timerFormattedTime,
    percentRemaining,
    isWarningPhase,
    startTimer,
    stopTimer,
  } = useTimer();

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

    try {
      const result = await ParkingAnalysisService.analyzeImage(capturedImage, side);

      // Attach location in the background — don't block the result.
      LocationService.getCurrentAddress().then((location) => {
        if (location) {
          setAnalysisResult((prev) => prev ? { ...prev, location } : { ...result, location });
        }
      }).catch(() => {});

      setAnalysisResult(result);
      setCurrentView(VIEW_STATES.RESULTS);
    } catch (error) {
      console.error('Analysis error:', error);
      setApiError(error.message);
      setCurrentView(VIEW_STATES.PREVIEW);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setApiError(null);
    setCurrentView(VIEW_STATES.HOME);
  };

  // ─── Timer handlers ──────────────────────────────────────────────────────────

  const handleStartTimer = async (durationMs) => {
    const permission = await NotificationService.requestPermission();
    if (permission !== 'granted') setInAppWarning(true);
    startTimer(durationMs);
    NotificationService.scheduleWarning(durationMs);
  };

  const handleStopTimer = () => {
    stopTimer();
    NotificationService.cancelScheduled();
    setInAppWarning(false);
  };

  const handleViewTimer = () => setCurrentView(VIEW_STATES.TIMER);
  const dismissWarning = useCallback(() => setInAppWarning(false), []);

  // ─── Home ────────────────────────────────────────────────────────────────────

  const isMockResult = !!analysisResult?.isMockData;

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
        <Badge>Sydney</Badge>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight [text-wrap:balance]">
          Can I park here?
        </h1>
        <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
          Photograph the sign. ParkSense reads it, applies the current time and any
          arrows, and gives you a straight answer.
        </p>

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
      </div>

      <ScreenActions className="pt-0">
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

        <Button size="lg" onClick={handleStartCamera}>
          <Camera className="h-5 w-5" aria-hidden="true" />
          Scan a sign
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          v{APP_CONFIG.version} · Sydney parking rules
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
            onAnalyzeAnother={handleAnalyzeAnother}
            showMockWarning={isMockResult}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onViewTimer={handleViewTimer}
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
            onBack={() => setCurrentView(VIEW_STATES.RESULTS)}
            analysisResult={analysisResult}
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
    </div>
  );
};

export default App;
