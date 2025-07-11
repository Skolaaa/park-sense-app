import React, { useState } from 'react';
import { Camera, Car } from 'lucide-react';
import CameraCapture from './components/CameraCapture';
import ImageAnalysis from './components/ImageAnalysis';
import ResultsDisplay from './components/ResultsDisplay';
import { ParkingAnalysisService } from './services/parkingAnalysis';
import { VIEW_STATES, APP_CONFIG } from './utils/constants';

const App = () => {
  const [currentView, setCurrentView] = useState(VIEW_STATES.HOME);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCameraCapture = (imageData) => {
    setCapturedImage(imageData);
    setCurrentView(VIEW_STATES.PREVIEW);
  };

  const handleCameraCancel = () => {
    setCurrentView(VIEW_STATES.HOME);
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setCurrentView(VIEW_STATES.CAMERA);
  };

  const handleAnalyzeImage = async () => {
    setIsAnalyzing(true);
    setCurrentView(VIEW_STATES.ANALYZING);
    
    try {
      const result = await ParkingAnalysisService.analyzeImage(capturedImage);
      setAnalysisResult(result);
      setCurrentView(VIEW_STATES.RESULTS);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze image. Please try again.');
      setCurrentView(VIEW_STATES.PREVIEW);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setCurrentView(VIEW_STATES.HOME);
  };

  const handleStartCamera = () => {
    setCurrentView(VIEW_STATES.CAMERA);
  };

  const renderHomeScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
          <Car className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{APP_CONFIG.name}</h1>
        <p className="text-gray-600 text-xl mb-2">{APP_CONFIG.description}</p>
        <p className="text-gray-500 max-w-sm mx-auto">
          Take a photo of any parking sign and get instant interpretation with AI-powered analysis
        </p>
        
        {/* Features Preview */}
        <div className="mt-8 space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Instant sign recognition</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Time & payment rules</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Smart recommendations</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleStartCamera}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <Camera className="w-6 h-6" />
        Take Photo of Parking Sign
      </button>
      
      {/* Version info */}
      <div className="mt-8 text-xs text-gray-400">
        Version {APP_CONFIG.version} - Phase 1 MVP
      </div>
    </div>
  );

  // Render the appropriate view
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
          />
        );
        
      case VIEW_STATES.RESULTS:
        return (
          <ResultsDisplay
            analysisResult={analysisResult}
            onAnalyzeAnother={handleAnalyzeAnother}
          />
        );
        
      default:
        return renderHomeScreen();
    }
  };

  return (
    <div className="min-h-screen">
      {renderCurrentView()}
    </div>
  );
};

export default App;