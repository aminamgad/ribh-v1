'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * مكوّن موحد لعرض رسائل الخطأ بتصميم واضح ومتسق
 */
export default function ErrorMessage({
  message,
  onRetry,
  retryLabel = 'إعادة المحاولة',
  className = '',
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}
    >
      <AlertCircle
        className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-offset-1 rounded"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
