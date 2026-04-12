import React from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';

const SideSelection = ({ capturedImage, onSelectSide, onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Back button */}
      <div className="p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Captured image thumbnail */}
      {capturedImage && (
        <div className="px-4">
          <img
            src={capturedImage}
            alt="Captured parking sign"
            className="w-full h-48 object-cover rounded-xl shadow"
          />
        </div>
      )}

      {/* Prompt */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Which side of the sign are you on?
        </h2>
        <p className="text-gray-500 text-center text-sm mb-8 max-w-xs">
          Sydney signs often have different rules for each direction. Select your side for an accurate result.
        </p>

        {/* Side buttons */}
        <div className="flex gap-4 w-full max-w-sm">
          <button
            onClick={() => onSelectSide('left')}
            className="flex-1 flex flex-col items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-8 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ArrowLeft className="w-10 h-10" />
            <span className="text-lg">Left</span>
          </button>

          <button
            onClick={() => onSelectSide('right')}
            className="flex-1 flex flex-col items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-8 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ArrowRight className="w-10 h-10" />
            <span className="text-lg">Right</span>
          </button>
        </div>

        {/* Skip option */}
        <button
          onClick={() => onSelectSide(null)}
          className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Skip — sign applies to both sides
        </button>
      </div>
    </div>
  );
};

export default SideSelection;
