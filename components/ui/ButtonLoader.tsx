'use client';

import { cn } from '@/lib/utils';

type ButtonLoaderVariant = 'light' | 'dark' | 'primary';

interface ButtonLoaderProps {
  /** للحصول على لون أبيض على خلفية داكنة (btn-primary) */
  variant?: ButtonLoaderVariant;
  /** حجم الـ loader: sm (4), default (5), lg (6) */
  size?: 'sm' | 'default' | 'lg';
  /** صنف إضافي للـ loader */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  default: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const variantClasses: Record<ButtonLoaderVariant, string> = {
  light:
    'border-2 border-white/30 border-t-white',
  dark:
    'border-2 border-gray-400/30 dark:border-slate-400/30 border-t-gray-600 dark:border-t-slate-200',
  primary:
    'border-2 border-[#FF9800]/30 border-t-[#FF9800]',
};

/**
 * Loader بسيط للاستخدام داخل الأزرار أثناء العمليات غير المتزامنة.
 * @example
 * <button disabled={loading}>
 *   {loading ? <ButtonLoader variant="light" /> : null}
 *   {loading ? 'جاري الحفظ...' : 'حفظ'}
 * </button>
 */
export default function ButtonLoader({
  variant = 'light',
  size = 'default',
  className,
}: ButtonLoaderProps) {
  return (
    <div
      role="status"
      aria-label="جاري التحميل"
      className={cn(
        'rounded-full animate-spin flex-shrink-0',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
}
