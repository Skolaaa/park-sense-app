import React, { useRef, useEffect, useState } from 'react';
import { X, CameraOff } from 'lucide-react';
import { CAMERA_CONFIG } from '../utils/constants';
import { Screen, ScreenActions } from './Screen';
import { Button } from './ui/button';

// Copy is split by cause: a denied permission is a thing the user can fix, and
// telling them exactly where to fix it beats a generic apology.
const ERROR_COPY = {
  denied: {
    heading: 'Camera access is switched off',
    body: 'Open the settings for this site in your browser and set Camera to Allow, then come back and try again.',
  },
  unavailable: {
    heading: 'Camera is not available',
    body: 'Another app may be holding the camera. Close anything else using it, then try again.',
  },
};

const TIPS = ['Fill the frame with the sign', 'Hold steady with both hands', 'Include any arrows'];

const CameraCapture = ({ onCapture, onCancel, isActive }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [showTips, setShowTips] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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
          console.error('[ParkSense] Error accessing camera:', error);
          setCameraError(error.name === 'NotAllowedError' ? 'denied' : 'unavailable');
        }
      };

      startCamera();
      // Auto-hide the tips after 3 seconds.
      const timer = setTimeout(() => setShowTips(false), 3000);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    // `onCancel` is deliberately NOT a dependency: it is redefined on every
    // parent render, and including it tore down and re-acquired the camera on
    // each render (once a second while a parking timer is running).
  }, [isActive]);

  const capturePhoto = () => {
    // A tap before the first frame arrives would capture an empty canvas, which
    // then fails downstream as an unreadable photo.
    if (videoRef.current?.videoWidth && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      onCapture(imageData);
    }
  };

  if (!isActive) return null;

  if (cameraError) {
    const copy = ERROR_COPY[cameraError] ?? ERROR_COPY.unavailable;
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <CameraOff className="h-6 w-6 text-destructive" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight [text-wrap:balance]">
            {copy.heading}
          </h1>
          <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
            {copy.body}
          </p>
        </div>
        <ScreenActions>
          <Button variant="outline" onClick={onCancel}>
            Back
          </Button>
        </ScreenActions>
      </Screen>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black text-white">
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Framing guide — the single most common cause of a bad read is a sign
          that does not fill the frame. Corner brackets, not a full box, so the
          sign itself stays unobstructed. */}
      <div
        className="pointer-events-none absolute inset-x-10 top-1/2 aspect-[3/4] max-h-[55vh] -translate-y-1/2"
        aria-hidden="true"
      >
        {['left-0 top-0 border-l-2 border-t-2 rounded-tl-xl',
          'right-0 top-0 border-r-2 border-t-2 rounded-tr-xl',
          'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl',
          'bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl'].map((corner) => (
          <span key={corner} className={`absolute h-8 w-8 border-white/80 ${corner}`} />
        ))}
      </div>

      <div className="pt-safe absolute inset-x-0 top-0">
        <div className="flex items-center justify-between p-4">
          <span className="rounded-full bg-black/50 px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm">
            Line up the sign
          </span>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-transform duration-150 ease-out active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showTips && (
        <ul className="animate-rise absolute inset-x-5 top-20 grid gap-1.5 rounded-2xl bg-black/60 p-4 text-sm backdrop-blur-sm">
          {TIPS.map((tip) => (
            <li key={tip} className="flex items-center gap-2.5 text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>
      )}

      <div className="pb-safe absolute inset-x-0 bottom-0">
        <div className="flex justify-center pb-10">
          <button
            onClick={capturePhoto}
            aria-label="Capture photo of the parking sign"
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-transform duration-150 ease-out active:scale-95"
          >
            <span className="h-16 w-16 rounded-full bg-white" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
