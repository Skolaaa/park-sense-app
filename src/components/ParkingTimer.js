import React from 'react';
import { ChevronLeft, Square } from 'lucide-react';

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
  const strokeDashoffset = CIRCUMFERENCE * (1 - percentRemaining / 100);

  const ringColor = isExpired
    ? '#ef4444'
    : isWarningPhase
    ? '#f59e0b'
    : '#2563eb';

  const bgClass = isExpired
    ? 'bg-red-50'
    : isWarningPhase
    ? 'bg-amber-50'
    : 'bg-gray-50';

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Results</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-8 tracking-wide uppercase text-sm">
          Parking Timer
        </h2>

        {/* Circular progress ring */}
        <div className="relative mb-8">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Background track */}
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
            />
            {/* Progress arc */}
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
            />
          </svg>

          {/* Countdown text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isExpired ? (
              <>
                <span className="text-2xl font-bold text-red-600">TIME'S UP</span>
              </>
            ) : (
              <>
                <span
                  className={`text-3xl font-bold tabular-nums ${
                    isWarningPhase ? 'text-amber-600 animate-pulse-slow' : 'text-gray-900'
                  }`}
                >
                  {formattedTime}
                </span>
                <span className="text-xs text-gray-500 mt-1">remaining</span>
              </>
            )}
          </div>
        </div>

        {/* Status message */}
        {isExpired && (
          <div className="bg-red-100 border border-red-300 rounded-xl px-6 py-4 text-center mb-6">
            <p className="text-red-800 font-semibold">Your parking time has expired.</p>
            <p className="text-red-700 text-sm mt-1">Move your vehicle now to avoid a fine.</p>
          </div>
        )}

        {isWarningPhase && !isExpired && (
          <div className="bg-amber-100 border border-amber-300 rounded-xl px-6 py-4 text-center mb-6">
            <p className="text-amber-800 font-semibold">15 minutes remaining</p>
            <p className="text-amber-700 text-sm mt-1">Start heading back to your vehicle.</p>
          </div>
        )}

        {/* Analysis context */}
        {analysisResult && (
          <div className="bg-white rounded-xl shadow px-5 py-4 w-full max-w-xs mb-8 space-y-2">
            {analysisResult.rawText && (
              <p className="text-xs text-gray-500 font-mono text-center">"{analysisResult.rawText}"</p>
            )}
            {analysisResult.applicableSide && analysisResult.applicableSide !== 'both' && (
              <p className="text-xs text-center text-blue-600 font-medium">
                Analysing {analysisResult.applicableSide.toUpperCase()} side rules
              </p>
            )}
            {analysisResult.location?.address && (
              <p className="text-xs text-gray-400 text-center">{analysisResult.location.address}</p>
            )}
          </div>
        )}

        {/* Stop button */}
        <button
          onClick={onStop}
          className="flex items-center gap-2 border-2 border-red-400 text-red-600 hover:bg-red-50 font-semibold py-3 px-8 rounded-xl transition-colors"
        >
          <Square className="w-4 h-4 fill-current" />
          Stop Timer
        </button>
      </div>
    </div>
  );
};

export default ParkingTimer;
