import React from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';

// The two choices are the whole screen: an arrow the size of a road marking,
// a one-word label, and a target that is hard to miss with a thumb.
const SideButton = ({ label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex min-h-[148px] flex-col items-center justify-center gap-4 border border-rule bg-panel transition-transform duration-150 ease-out active:scale-[0.98] active:border-signal"
  >
    <Icon className="h-10 w-10 text-signal" aria-hidden="true" />
    <span className="font-display text-2xl uppercase tracking-tight text-ink">{label}</span>
  </button>
);

const SideSelection = ({ capturedImage, onSelectSide, onBack }) => (
  <div className="flex min-h-screen flex-col bg-ground">
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
      <header className="pt-safe pt-6">
        <button
          onClick={onBack}
          className="-ml-1 flex items-center gap-1.5 py-2 text-dim transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="kicker">Back</span>
        </button>

        <p className="kicker mt-5">Step 2 of 2 · Your side</p>
        <h1 className="mt-3 font-display text-verdict-sm uppercase">
          Which side{' '}
          <br />
          are you on?
        </h1>
        <p className="mt-4 max-w-[32ch] text-[13px] leading-relaxed text-dim">
          Arrows on the plate point at the stretch of kerb each rule covers, so
          the side you are parked on can flip the answer.
        </p>
      </header>

      {capturedImage && (
        <figure className="mt-6 border border-rule bg-panel">
          {/* A reminder of the plate being read, deliberately quiet — the
              question, not the photo, is the job on this screen. */}
          <img
            src={capturedImage}
            alt="The parking sign you photographed"
            className="h-32 w-full object-cover opacity-70"
          />
        </figure>
      )}

      <div className="pb-safe mt-auto pb-6 pt-8">
        {/* Left sits left, right sits right — the layout carries the meaning. */}
        <div className="grid grid-cols-2 gap-2.5">
          <SideButton
            label="Left"
            icon={ArrowLeft}
            onClick={() => onSelectSide('left')}
          />
          <SideButton
            label="Right"
            icon={ArrowRight}
            onClick={() => onSelectSide('right')}
          />
        </div>

        <button
          onClick={() => onSelectSide(null)}
          className="btn-quiet mt-2.5 h-[46px] text-[13px] text-dim"
        >
          The sign applies to both sides
        </button>
      </div>
    </div>
  </div>
);

export default SideSelection;
