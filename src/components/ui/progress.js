import React from 'react';
import { cn } from '../../lib/utils';

// `value` is 0–100. Omit it for an indeterminate bar.
const Progress = ({ value, className, indicatorClassName, ...props }) => {
  const indeterminate = value === undefined || value === null;
  const clamped = indeterminate ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear',
          indeterminate && 'w-1/3 animate-pulse-slow',
          indicatorClassName
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
};

export { Progress };
