import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Screen, ScreenHeader, ScreenActions } from './Screen';
import { Button } from './ui/button';

// The two choices are the whole screen: a big arrow, a one-word label, and a
// target that is hard to miss with a thumb. Left sits left, right sits right.
const SideButton = ({ label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card transition-[transform,border-color] duration-150 ease-out active:scale-[0.98] active:border-foreground"
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
    <span className="text-lg font-semibold">{label}</span>
  </button>
);

const SideSelection = ({ capturedImage, onSelectSide, onBack }) => (
  <Screen>
    <ScreenHeader
      onBack={onBack}
      eyebrow="Step 2 of 2"
      title="Which side of the sign are you on?"
      description="Arrows on the sign point at the stretch of kerb each rule covers, so the side you are parked on can change the answer."
    />

    {capturedImage && (
      <img
        src={capturedImage}
        alt="The parking sign you photographed"
        className="mt-6 h-36 w-full rounded-2xl border border-border object-cover"
      />
    )}

    <ScreenActions>
      <div className="grid grid-cols-2 gap-2.5">
        <SideButton label="Left" icon={ArrowLeft} onClick={() => onSelectSide('left')} />
        <SideButton label="Right" icon={ArrowRight} onClick={() => onSelectSide('right')} />
      </div>
      <Button variant="ghost" onClick={() => onSelectSide(null)}>
        Not sure, or no arrows on the sign
      </Button>
    </ScreenActions>
  </Screen>
);

export default SideSelection;
