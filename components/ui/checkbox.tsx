'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            {...props}
            id={checkboxId}
            className={cn(
              // Base styles - responsive square checkbox
              'h-4 w-4 sm:h-5 sm:w-5 shrink-0 rounded border-2 border-gray-300 dark:border-gray-600',
              'ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:ring-offset-gray-800 dark:focus-visible:ring-[#FF9800]',
              'transition-all duration-200 ease-in-out',
              'cursor-pointer appearance-none',
              // Checked state
              'checked:bg-[#FF9800] checked:border-[#FF9800] checked:text-white',
              // Hover state
              'hover:border-[#F57C00] dark:hover:border-[#F57C00]',
              // Focus state
              'focus:ring-2 focus:ring-[#FF9800] focus:ring-offset-2',
              // Checkmark will be handled by CSS pseudo-element in globals.css
              'relative',
              // Error state
              error && 'border-red-500 dark:border-red-500',
              className
            )}
            ref={ref}
          />
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'text-xs sm:text-sm font-medium leading-none cursor-pointer select-none',
                'text-gray-700 dark:text-gray-200',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                'transition-colors duration-200',
                'hover:text-gray-900 dark:hover:text-gray-100',
                error && 'text-red-500 dark:text-red-400'
              )}
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 mr-5 sm:mr-7">{error}</p>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };

