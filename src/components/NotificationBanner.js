import React from 'react';
import { X } from 'lucide-react';

// Shown when the browser refused notification permission, so the expiry
// warning can only reach the user while the app is on screen. Caution, not
// deny: nothing has gone wrong yet, but the safety net is thinner.
const NotificationBanner = ({ onDismiss }) => (
  <div className="pt-safe fixed inset-x-0 top-0 z-50 border-b border-rule bg-panel shadow-field">
    <div className="mx-auto flex w-full max-w-md items-start gap-3 border-l-4 border-caution px-4 py-3">
      <div className="flex-1">
        <p className="kicker text-caution">Notifications blocked</p>
        <p className="mt-1.5 text-[13px] leading-snug text-ink">
          The 15-minute warning can only reach you while this app is open. Allow
          notifications in your browser settings to be told in the background.
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-2 -mt-1 shrink-0 p-2 text-dim transition-transform duration-150 ease-out active:scale-[0.9] hover:text-ink"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
);

export default NotificationBanner;
