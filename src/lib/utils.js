import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge class names, letting a later Tailwind class override an earlier one
// (`cn('p-4', 'p-2')` → `p-2`). Same helper shadcn/ui components rely on.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
