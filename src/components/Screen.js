import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

// One shell for every screen: a single phone-width column with the content
// growing to fill and the actions pinned to the bottom edge. Safe-area insets
// are applied here once, so screens use plain padding inside.
const Screen = ({ children, className }) => (
  <div className="pt-safe pb-safe flex min-h-screen flex-col bg-background">
    <div className={cn('mx-auto flex w-full max-w-md flex-1 flex-col px-5', className)}>
      {children}
    </div>
  </div>
);

// Top of a screen: optional back button, then the title and lead text.
const ScreenHeader = ({ eyebrow, title, description, onBack, backLabel = 'Back' }) => (
  <header className="pt-4">
    {onBack && (
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 mb-2 px-2 font-medium">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        {backLabel}
      </Button>
    )}
    {eyebrow && (
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
    )}
    <h1 className="text-[28px] font-semibold leading-tight tracking-tight [text-wrap:balance]">{title}</h1>
    {description && (
      <p className="mt-2 max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">{description}</p>
    )}
  </header>
);

// Action area pinned to the bottom of the screen, above the home indicator.
const ScreenActions = ({ children, className }) => (
  <div className={cn('mt-auto grid gap-2.5 pb-6 pt-6', className)}>{children}</div>
);

export { Screen, ScreenHeader, ScreenActions };
