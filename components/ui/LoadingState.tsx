'use client';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export default function LoadingState({ message = 'جاري التحميل...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="loading-spinner w-10 h-10 mb-4" />
      <p className="text-sm text-gray-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
