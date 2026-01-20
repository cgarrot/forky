'use client';

import React, { forwardRef } from 'react';
import { cn } from '@forky/shared-ui';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={id}
            className={cn(
              'w-full px-3 py-2 border rounded-md focus-visible:outline-none focus-visible:ring-2',
              {
                'border-gray-300 focus-visible:border-blue-500 focus-visible:ring-blue-500':
                  !error,
                'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500':
                  error,
              },
              icon && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
