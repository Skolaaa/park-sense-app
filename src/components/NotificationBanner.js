import React, { useEffect } from 'react';
import { BellOff, X } from 'lucide-react';

const AUTO_DISMISS_MS = 8000;

// Shown when the browser refused notification permission, so the expiry
// warning can only reach the user while the app is on screen. It floats over
// whatever screen is showing, so it dismisses itself rather than sitting on
// top of the controls underneath.
const NotificationBanner = ({ onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-50 px-5">
      <div
        role="status"
        className="animate-rise pointer-events-auto mx-auto mt-4 flex w-full max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-float"
      >
        <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <p className="font-semibold">Notifications are off</p>
          <p className="mt-1 text-muted-foreground">
            The 15-minute warning can only reach you while this app is open. Allow
            notifications in your browser settings to be told in the background.
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-2 -mt-2 shrink-0 rounded-full p-2 text-muted-foreground transition-transform duration-150 ease-out active:scale-90"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default NotificationBanner;
