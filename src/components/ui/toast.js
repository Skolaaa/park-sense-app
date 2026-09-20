import React, { useEffect } from 'react';

// One transient line at the bottom of the screen. Auto-dismisses.
const Toast = ({ message, onDone, duration = 2400 }) => {
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(onDone, duration);
    return () => clearTimeout(id);
  }, [message, onDone, duration]);

  if (!message) return null;
  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-6" role="status" aria-live="polite">
      <div className="animate-rise rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-float">
        {message}
      </div>
    </div>
  );
};

export default Toast;
