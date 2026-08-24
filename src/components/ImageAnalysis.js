import React from 'react';
import { Camera } from 'lucide-react';

// Same screen chrome as the home screen and the results screen: one column,
// capped at a phone width, with the action area pinned to the bottom edge.
const Screen = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-ground">
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">{children}</div>
  </div>
);

const ImageAnalysis = ({
  capturedImage,
  onAnalyze,
  onRetake,
  isAnalyzing,
  error = null,
  analysisProgress = 70,
}) => {
  // The caller owns the number; the bar must not blow past its track if it
  // ever arrives out of range.
  const progress = Math.max(0, Math.min(100, analysisProgress));

  // ─── Preview — the last chance to catch a bad photo ────────────────────────
  const renderPreview = () => (
    <Screen>
      <header className="pt-safe pt-10">
        <p className="kicker">Step 1 of 2 · Photo check</p>
        <h1 className="mt-3 font-display text-verdict-sm uppercase">
          Is the sign{' '}
          <br />
          readable?
        </h1>
      </header>

      <figure className="mt-6 border border-rule bg-panel">
        <img
          src={capturedImage}
          alt="The parking sign you photographed"
          className="h-64 w-full object-cover"
        />
      </figure>

      <p className="mt-4 max-w-[32ch] text-[13px] leading-relaxed text-dim">
        The reader only sees what you see. If the text is blurred, angled away
        or cut off at an edge, retake it.
      </p>

      <div className="pb-safe mt-auto grid gap-2.5 pb-6 pt-8">
        {/* Same treatment as the error panel on the home screen — a rule in the
            verdict red, not a red card that competes with a verdict. */}
        {error && (
          <div className="mb-2 border-l-4 border-deny bg-panel px-4 py-3">
            <p className="kicker text-deny">Analysis failed</p>
            <p className="mt-1.5 text-[13px] leading-snug text-ink">{error}</p>
          </div>
        )}

        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="btn-signal h-[52px] disabled:opacity-40"
        >
          Read this sign
        </button>

        <button
          onClick={onRetake}
          disabled={isAnalyzing}
          className="btn-quiet h-[46px] disabled:opacity-40"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Retake the photo
        </button>
      </div>
    </Screen>
  );

  // ─── Working — a quiet progress rule, not a spinner ────────────────────────
  const renderAnalyzing = () => (
    <Screen>
      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="kicker">Working</p>
        <h1 className="mt-3 font-display text-verdict-sm uppercase">
          Reading{' '}
          <br />
          the sign
        </h1>
        <p className="mt-4 max-w-[32ch] text-[13px] leading-relaxed text-dim">
          Lifting the text off the plate, then applying the current Sydney time
          and the arrow rules.
        </p>

        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <span className="kicker">Progress</span>
            <span className="font-mono text-xs text-signal">{progress}%</span>
          </div>
          <div
            className="mt-2 h-1 w-full bg-rule"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Reading the sign"
          >
            <div
              className="h-full bg-signal transition-[width] duration-1000 ease-out animate-pulse-slow"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {capturedImage && (
          <figure className="mt-8 border border-rule bg-panel">
            {/* Decorative here — it only confirms which photo is in flight. */}
            <img src={capturedImage} alt="" className="h-24 w-full object-cover opacity-40" />
          </figure>
        )}
      </div>
    </Screen>
  );

  if (isAnalyzing) {
    return renderAnalyzing();
  }

  return renderPreview();
};

export default ImageAnalysis;
