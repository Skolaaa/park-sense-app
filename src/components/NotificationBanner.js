import React from 'react';
import { BellOff, X } from 'lucide-react';

const NotificationBanner = ({ onDismiss }) => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white px-4 py-3 flex items-center justify-between gap-3 safe-area-top">
    <div className="flex items-center gap-2 text-sm">
      <BellOff className="w-4 h-4 shrink-0 text-gray-400" />
      <span>Notifications blocked — we'll show an in-app alert at 15 minutes.</span>
    </div>
    <button
      onClick={onDismiss}
      className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors shrink-0"
      aria-label="Dismiss"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

export default NotificationBanner;
