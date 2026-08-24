import React, { useRef, useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { CAMERA_CONFIG } from '../utils/constants';

// Copy is split by cause: a denied permission is a thing the user can fix, and
// telling them exactly where to fix it beats a generic apology.
const ERROR_COPY = {
  denied: {
    heading: ['Camera access', 'is switched off'],
    body: 'Open the settings for this site in your browser and set Camera to Allow, then come back and try again.',
  },
  unavailable: {
    heading: ['Camera is', 'not available'],
    body: 'Another app may be holding the camera. Close anything else using it, then try again.',
  },
};

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
      // Auto-hide the tips overlay after 3 seconds.
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
    if (videoRef.current && canvasRef.current) {
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
      <div className="flex min-h-screen flex-col bg-ground">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
          <div className="flex flex-1 flex-col justify-center py-12">
            <div className="border-l-4 border-deny pl-4">
              <p className="kicker text-deny">Camera blocked</p>
              <h1 className="mt-2 font-display text-verdict-sm uppercase">
                {copy.heading[0]}{' '}
                <br />
                {copy.heading[1]}
              </h1>
            </div>
            <p className="mt-5 max-w-[34ch] text-[13px] leading-relaxed text-dim">{copy.body}</p>
          </div>
          <div className="pb-safe pb-6">
            <button onClick={onCancel} className="btn-quiet h-[46px] text-[13px]">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-screen w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Framing guide — the single most common cause of a bad read is a sign
          that does not fill the frame. */}
      <div
        className="pointer-events-none absolute inset-x-8 top-1/2 aspect-[4/3] -translate-y-1/2 border border-white/40"
        aria-hidden="true"
      />

      <div className="pt-safe absolute inset-x-0 top-0 p-5">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.17em] text-white/70">
          Fill the frame with the sign
        </p>
      </div>

      {showTips && (
        <div className="absolute inset-x-5 top-16 bg-black/70 p-4 backdrop-blur-sm">
          <p className="kicker mb-2 text-signal">For a clean read</p>
          <ul className="grid gap-1 text-[13px] leading-snug text-white/80">
            <li>Fill the frame with the sign</li>
            <li>Hold steady, both hands</li>
            <li>Include the directional arrows</li>
          </ul>
        </div>
      )}

      <div className="pb-safe absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-10">
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="p-3 text-white/70 transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>

        <button
          onClick={capturePhoto}
          aria-label="Capture photo of the parking sign"
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-signal text-signal-ink transition-transform duration-150 ease-out active:scale-95"
        >
          <Camera className="h-7 w-7" aria-hidden="true" />
        </button>

        <span className="w-12" aria-hidden="true" />
      </div>
    </div>
  );
};

export default CameraCapture;
