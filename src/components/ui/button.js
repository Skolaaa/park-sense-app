import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Touch devices have no hover and latch :hover after a tap, so press feedback
// lives in :active. Every size clears the 44px touch target.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[transform,background-color,opacity] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-muted text-foreground',
        outline: 'border border-border bg-card text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
        success: 'bg-success text-success-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        warning: 'bg-warning text-warning-foreground',
      },
      size: {
        default: 'h-12 px-5 text-[15px]',
        sm: 'h-10 px-4 text-sm',
        lg: 'h-14 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';

export { Button, buttonVariants };
