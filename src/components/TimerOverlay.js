import React from 'react';
import { Timer, Eye, X } from 'lucide-react';

const TimerOverlay = ({ formattedTime, isWarningPhase, onViewTimer, onStop }) => {
  const bgClass = isWarningPhase
    ? 'bg-amber-500 border-amber-600'
    : 'bg-blue-600 border-blue-700';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t ${bgClass} text-white px-4 py-3 safe-area-bottom`}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Time display */}
        <div className="flex items-center gap-2">
          <Timer className={`w-5 h-5 ${isWarningPhase ? 'animate-pulse-slow' : ''}`} />
          <span className="font-bold tabular-nums text-lg">{formattedTime}</span>
          <span className="text-sm opacity-80">remaining</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onViewTimer}
            className="flex items-center gap-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <button
            onClick={onStop}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            aria-label="Stop timer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerOverlay;
