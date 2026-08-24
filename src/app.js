import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import CameraCapture from './components/CameraCapture';
import ImageAnalysis from './components/ImageAnalysis';
import ResultsDisplay from './components/ResultsDisplay';
import SideSelection from './components/SideSelection';
import ParkingTimer from './components/ParkingTimer';
import NotificationBanner from './components/NotificationBanner';
import { ParkingAnalysisService } from './services/parkingAnalysis';
import { LocationService } from './services/locationService';
import { NotificationService } from './services/notificationService';
import { useTimer } from './hooks/useTimer';
import { VIEW_STATES, APP_CONFIG } from './utils/constants';

const App = () => {
  const [currentView, setCurrentView] = useState(VIEW_STATES.HOME);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [, setSelectedSide] = useState(null);
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

  const handleSideSelected = (side) => {
    setSelectedSide(side);
    performAnalysis(side);
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
    setSelectedSide(null);
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

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const isMockResult = !!analysisResult?.isMockData;

  const renderErrorMessage = () => {
    if (!apiError) return null;
    return (
      <div className="mb-5 border-l-4 border-deny bg-panel px-4 py-3">
        <p className="kicker text-deny">Analysis failed</p>
        <p className="mt-1.5 text-[13px] leading-snug text-ink">{apiError}</p>
      </div>
    );
  };

  const renderHomeScreen = () => (
    <div className="flex min-h-screen flex-col bg-ground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <header className="pt-safe pt-8">
          <p className="kicker">Kerbside reader · Sydney</p>
        </header>

        {/* The headline sits in the free space rather than pinning to the top,
            which left half a phone of dead ground on a tall screen. */}
        <div className="flex flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-verdict uppercase">
            Point it{' '}
            <br />
            at the sign
          </h1>
          <p className="mt-5 max-w-[30ch] text-[13px] leading-relaxed text-dim">
            Reads NSW plates, applies the current Sydney time and the arrow
            rules, then answers the only question that matters.
          </p>
        </div>

        <div className="pb-safe pb-6">
          {renderErrorMessage()}

          {isMockResult && (
            <p className="kicker mb-4 text-caution">Demo data — no API key configured</p>
          )}

          <div className="mb-4 h-px bg-rule" />

          {timerRunning ? (
            <button
              onClick={handleViewTimer}
              className="mb-4 w-full border border-rule bg-panel px-4 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              <div className="flex items-baseline justify-between">
                <span className="kicker">Running timer</span>
                <span
                  className={`font-mono text-base ${isWarningPhase ? 'text-caution' : 'text-signal'}`}
                >
                  {timerFormattedTime}
                </span>
              </div>
              <p className="mt-1 text-xs text-dim">
                {isWarningPhase ? 'Expiring soon — move the car' : 'Tap to view'}
              </p>
            </button>
          ) : (
            <p className="mb-4 text-xs text-faint">No timer running.</p>
          )}

          <button onClick={handleStartCamera} className="btn-signal h-[52px]">
            <Camera className="h-5 w-5" aria-hidden="true" />
            Scan a sign
          </button>

          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-wider text-faint">
            v{APP_CONFIG.version} · Sydney parking
          </p>
        </div>
      </div>
    </div>
  );


  // ─── View router ─────────────────────────────────────────────────────────────

  const renderCurrentView = () => {
    switch (currentView) {
      case VIEW_STATES.HOME:
        return renderHomeScreen();

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
            onSelectSide={handleSideSelected}
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

      default:
        return renderHomeScreen();
    }
  };

  return (
    <div className="min-h-screen">
      {inAppWarning && (
        <NotificationBanner onDismiss={() => setInAppWarning(false)} />
      )}
      {renderCurrentView()}
    </div>
  );
};

export default App;
