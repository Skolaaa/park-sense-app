import React from 'react';
import { cn } from '../../lib/utils';

const Card = ({ className, ...props }) => (
  <div className={cn('rounded-2xl border border-border bg-card', className)} {...props} />
);

const CardContent = ({ className, ...props }) => (
  <div className={cn('p-5', className)} {...props} />
);

export { Card, CardContent };
