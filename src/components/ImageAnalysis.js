import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Screen, ScreenHeader, ScreenActions } from './Screen';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { Progress } from './ui/progress';

// Uncropped, so the edges of the photo can be checked — a sign cut off at an
// edge is exactly what this screen exists to catch.
const Photo = ({ src, className = '' }) => (
  <img
    src={src}
    alt="The parking sign you photographed"
    className={`w-full rounded-2xl border border-border bg-muted object-contain ${className}`}
  />
);

const ImageAnalysis = ({ capturedImage, onAnalyze, onRetake, isAnalyzing, error = null }) => {
  // ─── Working — a spinner, the photo in flight, and no progress lie ─────────
  if (isAnalyzing) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-foreground" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Reading the sign</h1>
          <p className="mt-2 max-w-[32ch] text-[15px] leading-relaxed text-muted-foreground">
            Lifting the text off the plate, then applying the current Sydney time and the
            arrow rules.
          </p>
          <Progress aria-label="Reading the sign" className="mt-8 max-w-[200px]" />
          {capturedImage && <Photo src={capturedImage} className="mt-10 h-32 opacity-50" />}
        </div>
      </Screen>
    );
  }

  // ─── Preview — the last chance to catch a bad photo ────────────────────────
  return (
    <Screen>
      <ScreenHeader
        eyebrow="Step 1 of 2"
        title="Is the sign readable?"
        description="If the text is blurred, angled away or cut off at an edge, retake it. The reader only sees what you see."
      />

      <Photo src={capturedImage} className="mt-6 max-h-[50vh]" />

      <ScreenActions>
        {error && (
          <Alert variant="destructive" title="Analysis failed">
            {error}
          </Alert>
        )}
        <Button size="lg" onClick={onAnalyze}>
          Read this sign
        </Button>
        <Button variant="outline" onClick={onRetake}>
          <Camera className="h-4 w-4" aria-hidden="true" />
          Retake the photo
        </Button>
      </ScreenActions>
    </Screen>
  );
};

export default ImageAnalysis;
