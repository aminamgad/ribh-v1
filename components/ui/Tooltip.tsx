'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  icon?: boolean;
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top',
  className = '',
  icon = false 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700'
  };

  if (icon) {
    return (
      <div className={`relative inline-block ${className}`}>
        <div
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          className="cursor-help"
        >
          <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" />
        </div>
        {isVisible && (
          <div className={`absolute ${positionClasses[position]} z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-fade-in`}>
            {content}
            <div className={`absolute ${arrowClasses[position]} w-0 h-0 border-4 border-transparent`} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute ${positionClasses[position]} z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg max-w-xs pointer-events-none animate-fade-in`}>
          {content}
          <div className={`absolute ${arrowClasses[position]} w-0 h-0 border-4 border-transparent`} />
        </div>
      )}
    </div>
  );
}



