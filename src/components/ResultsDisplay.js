import React from 'react';
import {
  CheckCircle, XCircle, Clock, DollarSign, Car, AlertTriangle,
  RotateCcw, Timer, MapPin, AlertOctagon,
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
    if (score > 0.9) return 'text-green-600';
    if (score > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (score) => {
    if (score > 0.9) return 'High Confidence';
    if (score > 0.6) return 'Medium Confidence';
    return 'Low Confidence — Please Verify';
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

        {/* Low confidence hint */}
        {confidence < 0.6 && confidence > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Low confidence result</p>
                <p className="text-sm text-yellow-700">
                  Consider retaking the photo — fill the frame with the sign and ensure the text is clearly readable.
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
                className={`h-2 rounded-full transition-all duration-500 ${
                  confidence > 0.9 ? 'bg-green-500' :
                  confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
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
