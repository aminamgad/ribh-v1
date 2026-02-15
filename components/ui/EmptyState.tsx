'use client';

import { LucideIcon } from 'lucide-react';
import { Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon = Package, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-4 max-w-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
