'use client';

import React, { forwardRef } from 'react';
import { cn } from '@forky/shared';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  label: string;
}

const variantStyles = {
  default:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-400',
  ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
  danger: 'text-red-500 hover:bg-red-50 hover:text-red-600',
};

const sizeStyles = {
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-3',
};

const iconSizeStyles = {
  sm: '[&>svg]:h-4 [&>svg]:w-4',
  md: '[&>svg]:h-5 [&>svg]:w-5',
  lg: '[&>svg]:h-6 [&>svg]:w-6',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, variant = 'default', size = 'md', icon, label, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          iconSizeStyles[size],
          className
        )}
        aria-label={label}
        title={label}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
