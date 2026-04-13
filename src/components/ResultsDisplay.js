import React from 'react';
import {
  CheckCircle, XCircle, Clock, DollarSign, Car, AlertTriangle,
  RotateCcw, Timer, MapPin, AlertOctagon, Camera,
} from 'lucide-react';
import { parseTimeLimit } from '../utils/timeParser';
import TimerOverlay from './TimerOverlay';

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
  } = analysisResult;

  const parsedDurationMs = parseTimeLimit(timeLimit);
  const canShowTimer = canPark && timeLimit && parsedDurationMs;

  const getConfidenceColor = (score) => {
    if (score >= 0.85) return 'text-green-600';
    if (score >= 0.65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBarColor = (score) => {
    if (score >= 0.85) return 'bg-green-500';
    if (score >= 0.65) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceText = (score) => {
    if (score >= 0.85) return 'Sign clearly read — result is reliable';
    if (score >= 0.65) return 'Sign partially read — verify key details before parking';
    if (score > 0)     return 'Sign unclear — retake for a reliable result';
    return 'Unable to read sign';
  };

  const sideLabel = applicableSide === 'left' ? 'LEFT'
    : applicableSide === 'right' ? 'RIGHT'
    : null;

  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${timerRunning ? 'pb-24' : ''}`}>
      <div className="max-w-md mx-auto space-y-4">

        {/* Mock data warning */}
        {(showMockWarning || analysisResult.isMockData) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Demo Result</h3>
                <p className="text-sm text-yellow-700">
                  This is mock data. Add your OpenAI API key for real parking sign analysis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No sign found — show a dedicated prompt and stop rendering further */}
        {noSignFound && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-5">
              <Camera className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Parking Sign Detected</h2>
            <p className="text-gray-500 text-sm max-w-xs mb-8">
              Make sure the parking sign fills the frame and the text is clearly visible, then try again.
            </p>
            <button
              onClick={onAnalyzeAnother}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-colors shadow"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        )}

        {/* All remaining content only renders when a sign was found */}
        {!noSignFound && <>

        {/* Low confidence banner — only for scores in the uncertain range */}
        {confidence > 0 && confidence < 0.65 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Sign unclear — retake for a reliable result</p>
                <p className="text-sm text-orange-700 mt-0.5">
                  Fill the frame with the sign, hold steady, and ensure all text is readable.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main result card */}
        <div className={`rounded-xl p-6 text-center ${
          canPark
            ? 'bg-green-100 border-2 border-green-300'
            : 'bg-red-100 border-2 border-red-300'
        }`}>
          <div className="flex justify-center mb-4">
            {canPark
              ? <CheckCircle className="w-16 h-16 text-green-600" />
              : <XCircle className="w-16 h-16 text-red-600" />
            }
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${canPark ? 'text-green-800' : 'text-red-800'}`}>
            {canPark ? 'You Can Park Here!' : 'No Parking Allowed'}
          </h2>
          <p className={canPark ? 'text-green-700' : 'text-red-700'}>
            {canPark
              ? 'Based on current time and conditions'
              : 'Parking restrictions are in effect'}
          </p>
          {/* Side badge */}
          {sideLabel && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white bg-opacity-60 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
              <Car className="w-3 h-3" />
              Analysing {sideLabel} side rules
            </div>
          )}
        </div>

        {/* Location */}
        {location?.address && (
          <div className="flex items-start gap-3 bg-white rounded-xl shadow px-4 py-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-600 leading-snug">{location.address}</p>
          </div>
        )}

        {/* Estimated fine (shown when can't park) */}
        {!canPark && estimatedFine && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Estimated Fine if Caught</p>
              <p className="text-red-700 font-semibold">{estimatedFine}</p>
            </div>
          </div>
        )}

        {/* Detail cards */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Parking Details</h3>

          {timeLimit && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Time Limit</p>
                <p className="text-gray-600">{timeLimit}</p>
              </div>
            </div>
          )}

          {paymentRequired && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Payment Required</p>
                <p className="text-gray-600">Paid parking zone</p>
              </div>
            </div>
          )}

          {days && days.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Car className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Restriction Days</p>
                <p className="text-gray-600">{days.join(', ')}</p>
              </div>
            </div>
          )}

          {hours && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">Restriction Hours</p>
                <p className="text-gray-600">{hours}</p>
              </div>
            </div>
          )}

          {vehicleTypes && vehicleTypes.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <Car className="w-5 h-5 text-indigo-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Allowed Vehicles</p>
                <p className="text-gray-600">{vehicleTypes.join(', ')}</p>
              </div>
            </div>
          )}

          {specialConditions && specialConditions.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Special Conditions</p>
                {specialConditions.map((condition, index) => (
                  <p key={index} className="text-gray-600 mb-1">{condition}</p>
                ))}
              </div>
            </div>
          )}

          {rawText && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">Detected Text</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg font-mono">"{rawText}"</p>
            </div>
          )}

          {/* Confidence score */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-500">AI Confidence</span>
                <p className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                  {getConfidenceText(confidence)}
                </p>
              </div>
              <span className={`text-lg font-bold ${getConfidenceColor(confidence)}`}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getConfidenceBarColor(confidence)}`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Start Timer — only when parking is allowed and time limit is parseable */}
          {canShowTimer && !timerRunning && (
            <button
              onClick={() => onStartTimer(parsedDurationMs)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <Timer className="w-5 h-5" />
              Start Parking Timer ({timeLimit})
            </button>
          )}

          {/* Timer running — show "View Timer" button */}
          {timerRunning && (
            <button
              onClick={onViewTimer}
              className={`w-full font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg ${
                timerWarningPhase
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Timer className={`w-5 h-5 ${timerWarningPhase ? 'animate-pulse-slow' : ''}`} />
              {timerFormattedTime} remaining — View Timer
            </button>
          )}

          <button
            onClick={onAnalyzeAnother}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Analyse Another Sign
          </button>
        </div>

        </>} {/* end !noSignFound */}
      </div>

      {/* Sticky timer overlay */}
      {timerRunning && (
        <TimerOverlay
          formattedTime={timerFormattedTime}
          isWarningPhase={timerWarningPhase}
          onViewTimer={onViewTimer}
          onStop={onStopTimer}
        />
      )}
    </div>
  );
};

export default ResultsDisplay;
