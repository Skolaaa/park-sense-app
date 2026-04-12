import React, { useRef, useEffect, useState } from 'react';
import { Camera, XCircle } from 'lucide-react';
import { CAMERA_CONFIG } from '../utils/constants';

const CameraCapture = ({ onCapture, onCancel, isActive }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    if (isActive) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONFIG);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          alert('Unable to access camera. Please ensure you have granted camera permissions.');
          onCancel();
        }
      };

      startCamera();
      // Auto-hide the tips overlay after 3 seconds.
      const timer = setTimeout(() => setShowTips(false), 3000);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isActive, onCancel]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      stopCamera();
      onCapture(imageData);
    }
  };

  if (!isActive) return null;

  return (
    <div className="relative h-screen bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Photo quality tips overlay — auto-hides after 3s */}
      {showTips && (
        <div className="absolute top-16 left-4 right-4">
          <div className="bg-black bg-opacity-70 text-white p-4 rounded-xl text-sm space-y-1.5">
            <p className="font-semibold text-blue-300 mb-2">Tips for best results</p>
            <p>• Fill the frame with the sign</p>
            <p>• Hold steady — use both hands</p>
            <p>• Include any directional arrows</p>
            <p>• Ensure text is clearly readable</p>
          </div>
        </div>
      )}

      {/* Instruction bar */}
      <div className="absolute top-4 left-4 right-4">
        <div className="bg-black bg-opacity-50 text-white p-3 rounded-lg text-center">
          <p className="text-sm">Position the parking sign in the frame</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
        <button
          onClick={onCancel}
          className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full transition-colors"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <button
          onClick={capturePhoto}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full transition-colors shadow-lg"
        >
          <Camera className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
