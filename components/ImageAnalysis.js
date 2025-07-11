import React from 'react';
import { RotateCcw, Camera } from 'lucide-react';

const ImageAnalysis = ({ 
  capturedImage, 
  onAnalyze, 
  onRetake, 
  isAnalyzing, 
  analysisProgress = 70 
}) => {
  const renderPreview = () => (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <img
            src={capturedImage}
            alt="Captured parking sign"
            className="w-full h-64 object-cover"
          />
        </div>
        
        <div className="space-y-4">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Parking Sign'}
          </button>
          
          <button
            onClick={onRetake}
            disabled={isAnalyzing}
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Retake Photo
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-pulse">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Parking Sign</h2>
        <p className="text-gray-600 mb-8">Our AI is reading the sign and interpreting parking rules...</p>
        
        <div className="mt-8 space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">Processing image...</p>
        </div>

        {/* Show captured image thumbnail while analyzing */}
        <div className="mt-8 max-w-48 mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={capturedImage}
              alt="Analyzing"
              className="w-full h-24 object-cover opacity-75"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (isAnalyzing) {
    return renderAnalyzing();
  }

  return renderPreview();
};

export default ImageAnalysis;