import React from 'react';
import { cva } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

const alertVariants = cva('flex gap-3 rounded-xl border p-4 text-sm leading-snug', {
  variants: {
    variant: {
      default: 'border-border bg-card text-foreground',
      destructive: 'border-destructive/30 bg-destructive/5 text-foreground',
      warning: 'border-warning/30 bg-warning/5 text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

const ICONS = {
  default: { Icon: Info, tone: 'text-muted-foreground' },
  destructive: { Icon: AlertCircle, tone: 'text-destructive' },
  warning: { Icon: AlertTriangle, tone: 'text-warning' },
};

const Alert = ({ className, variant = 'default', title, children, ...props }) => {
  const { Icon, tone } = ICONS[variant] ?? ICONS.default;
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-1', 'text-muted-foreground')}>{children}</div>}
      </div>
    </div>
  );
};

export { Alert, alertVariants };
