'use client';

import { cn } from '@forky/shared';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export const Spinner = ({ size = 'md', color, className }: SpinnerProps) => {
  return (
    <Loader2
      className={cn('animate-spin text-blue-600', sizeClasses[size], className)}
      style={color ? { color } : undefined}
      aria-label="Loading"
    />
  );
};
