import React, { useState } from 'react';
import { Camera, Car, AlertTriangle, Settings } from 'lucide-react';
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
  const [apiError, setApiError] = useState(null);

  // Check if OpenAI API key is configured
  const hasApiKey = !!process.env.REACT_APP_OPENAI_API_KEY;

  // DEBUG FUNCTION - Test API Key
  const testApiKey = async () => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    console.log('=== API KEY DEBUG ===');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key starts with sk-:', apiKey?.startsWith('sk-'));
    console.log('API Key length:', apiKey?.length);
    
    if (!apiKey) {
      console.error('❌ No API key found!');
      alert('❌ No API key detected. Check your .env file:\n\n1. Create .env file in project root\n2. Add: REACT_APP_OPENAI_API_KEY=sk-your-key\n3. Restart app');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Invalid API key format!');
      alert('❌ API key should start with "sk-"\nCheck your .env file format.');
      return;
    }
    
    // Test API call
    try {
      console.log('🧪 Testing API call...');
      alert('🧪 Testing API connection...');
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API key is valid!', data);
        alert('✅ SUCCESS! API key is working perfectly!\n\nYou can now analyze real parking signs with AI.');
      } else {
        const error = await response.json();
        console.error('❌ API call failed:', error);
        alert(`❌ API Error: ${error.error?.message || 'Unknown error'}\n\nCheck your API key and billing status.`);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      alert('❌ Network error. Check your internet connection.');
    }
  };

  const handleCameraCapture = (imageData) => {
    setCapturedImage(imageData);
    setApiError(null); // Clear any previous errors
    setCurrentView(VIEW_STATES.PREVIEW);
  };

  const handleCameraCancel = () => {
    setCurrentView(VIEW_STATES.HOME);
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setApiError(null);
    setCurrentView(VIEW_STATES.CAMERA);
  };

  const handleAnalyzeImage = async () => {
    setIsAnalyzing(true);
    setCurrentView(VIEW_STATES.ANALYZING);
    setApiError(null);
    
    try {
      let result;
      
      if (hasApiKey) {
        // Use real OpenAI API
        result = await ParkingAnalysisService.analyzeImage(capturedImage);
      } else {
        // Use mock data with warning
        result = await ParkingAnalysisService.getMockResponse();
        result.isMockData = true;
      }
      
      setAnalysisResult(result);
      setCurrentView(VIEW_STATES.RESULTS);
    } catch (error) {
      console.error('Analysis error:', error);
      setApiError(error.message);
      
      // Show error but allow retry
      if (error.message.includes('API key')) {
        setCurrentView(VIEW_STATES.HOME);
      } else {
        setCurrentView(VIEW_STATES.PREVIEW);
      }
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

  const handleStartCamera = () => {
    setApiError(null);
    setCurrentView(VIEW_STATES.CAMERA);
  };

  const renderApiKeyWarning = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div>
          <h3 className="font-medium text-yellow-800 mb-1">Demo Mode</h3>
          <p className="text-sm text-yellow-700 mb-2">
            Add your OpenAI API key to enable real parking sign analysis.
          </p>
          <details className="text-xs text-yellow-600">
            <summary className="cursor-pointer hover:text-yellow-800">Setup Instructions</summary>
            <div className="mt-2 space-y-1">
              <p>1. Get API key from OpenAI Platform</p>
              <p>2. Create .env file: REACT_APP_OPENAI_API_KEY=your-key</p>
              <p>3. Restart the app</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );

  const renderErrorMessage = () => {
    if (!apiError) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 mb-1">Analysis Failed</h3>
            <p className="text-sm text-red-700 mb-2">{apiError}</p>
            {apiError.includes('API key') && (
              <p className="text-xs text-red-600">
                Add your OpenAI API key to the .env file and restart the app.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderHomeScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="text-center mb-8 max-w-md">
        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
          <Car className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{APP_CONFIG.name}</h1>
        <p className="text-gray-600 text-xl mb-2">{APP_CONFIG.description}</p>
        <p className="text-gray-500 max-w-sm mx-auto">
          Take a photo of any parking sign and get instant interpretation with AI-powered analysis
        </p>
        
        {/* API Status */}
        <div className="mt-6">
          {hasApiKey ? (
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real AI Analysis Enabled</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-yellow-600 text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Demo Mode - Mock Data</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {renderErrorMessage()}

        {/* API Key Warning */}
        {!hasApiKey && renderApiKeyWarning()}
        
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
      
      {/* Main Action Button */}
      <button
        onClick={handleStartCamera}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <Camera className="w-6 h-6" />
        Take Photo of Parking Sign
      </button>

      {/* DEBUG BUTTON - Test API Key */}
      <button
        onClick={testApiKey}
        className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors"
      >
        🧪 Test API Key
      </button>
      
      {/* Version info */}
      <div className="mt-8 text-xs text-gray-400 text-center">
        <div>Version {APP_CONFIG.version} - Phase 1 MVP</div>
        {hasApiKey ? (
          <div className="text-green-500">OpenAI GPT-4V Integration Active</div>
        ) : (
          <div className="text-yellow-500">Mock Data Mode</div>
        )}
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
            showMockWarning={!hasApiKey}
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