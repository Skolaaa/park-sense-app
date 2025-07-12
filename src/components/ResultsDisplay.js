import React from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, Car, AlertTriangle, RotateCcw } from 'lucide-react';

const ResultsDisplay = ({ analysisResult, onAnalyzeAnother, showMockWarning = false }) => {
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
    rawText 
  } = analysisResult;

  const getConfidenceColor = (score) => {
    if (score > 0.9) return 'text-green-600';
    if (score > 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (score) => {
    if (score > 0.9) return 'High Confidence';
    if (score > 0.8) return 'Medium Confidence';
    return 'Low Confidence - Please Verify';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Mock Data Warning */}
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
        {/* Main Result Card */}
        <div className={`rounded-xl p-6 text-center ${
          canPark 
            ? 'bg-green-100 border-2 border-green-300' 
            : 'bg-red-100 border-2 border-red-300'
        }`}>
          <div className="flex justify-center mb-4">
            {canPark ? (
              <CheckCircle className="w-16 h-16 text-green-600" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${
            canPark ? 'text-green-800' : 'text-red-800'
          }`}>
            {canPark ? 'You Can Park Here!' : 'No Parking Allowed'}
          </h2>
          <p className={`${canPark ? 'text-green-700' : 'text-red-700'}`}>
            {canPark 
              ? 'Based on current time and conditions' 
              : 'Parking restrictions are in effect'
            }
          </p>
        </div>

        {/* Detailed Information Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Parking Details</h3>
          
          {/* Time Limit */}
          {timeLimit && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Time Limit</p>
                <p className="text-gray-600">{timeLimit}</p>
              </div>
            </div>
          )}

          {/* Payment Required */}
          {paymentRequired && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Payment Required</p>
                <p className="text-gray-600">Paid parking zone</p>
              </div>
            </div>
          )}

          {/* Active Days */}
          {days && days.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Car className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Active Days</p>
                <p className="text-gray-600">{days.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Hours */}
          {hours && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">Active Hours</p>
                <p className="text-gray-600">{hours}</p>
              </div>
            </div>
          )}

          {/* Vehicle Types */}
          {vehicleTypes && vehicleTypes.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <Car className="w-5 h-5 text-indigo-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Allowed Vehicles</p>
                <p className="text-gray-600">{vehicleTypes.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Special Conditions */}
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

          {/* Raw Text Recognition */}
          {rawText && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">Detected Text</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg font-mono">
                "{rawText}"
              </p>
            </div>
          )}

          {/* Confidence Score */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-500">AI Confidence</span>
                <p className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                  {getConfidenceText(confidence)}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold ${getConfidenceColor(confidence)}`}>
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>
            
            {/* Confidence bar */}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  confidence > 0.9 ? 'bg-green-500' : 
                  confidence > 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onAnalyzeAnother}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Analyze Another Sign
          </button>
          
          {/* Future: Add to Map, Share Result, etc. */}
          <div className="grid grid-cols-2 gap-3">
            <button
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
              disabled
            >
              Save Location
            </button>
            <button
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
              disabled
            >
              Share Result
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Coming in Phase 2: Save to map and share results
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;