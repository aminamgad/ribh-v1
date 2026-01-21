'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, CheckCircle, Package, Truck, X, RotateCcw, ChevronDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type OrderStatusValue = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

interface OrderStatusOption {
  value: OrderStatusValue;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

interface OrderStatusMultiSelectProps {
  value: OrderStatusValue[];
  onChange: (value: OrderStatusValue[]) => void;
  label?: string;
  className?: string;
}

const statusOptions: OrderStatusOption[] = [
  {
    value: 'pending',
    label: 'معلق',
    icon: Clock,
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    value: 'confirmed',
    label: 'مؤكد',
    icon: CheckCircle,
    color: 'text-[#FF9800] dark:text-[#FFB74D]',
    bgColor: 'bg-[#FF9800]/10 dark:bg-[#FF9800]/20',
    borderColor: 'border-[#FF9800]/30 dark:border-[#FF9800]/50',
    iconColor: 'text-[#FF9800] dark:text-[#FFB74D]'
  },
  {
    value: 'processing',
    label: 'قيد المعالجة',
    icon: Package,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    value: 'shipped',
    label: 'تم الشحن',
    icon: Truck,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    iconColor: 'text-indigo-600 dark:text-indigo-400'
  },
  {
    value: 'delivered',
    label: 'تم التسليم',
    icon: CheckCircle,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  {
    value: 'cancelled',
    label: 'ملغي',
    icon: X,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  {
    value: 'returned',
    label: 'مرتجع',
    icon: RotateCcw,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400'
  }
];

export default function OrderStatusMultiSelect({
  value,
  onChange,
  label,
  className = ''
}: OrderStatusMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOptions = statusOptions.filter(opt => value.includes(opt.value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (statusValue: OrderStatusValue) => {
    if (value.includes(statusValue)) {
      // Remove from selection
      onChange(value.filter(v => v !== statusValue));
    } else {
      // Add to selection
      onChange([...value, statusValue]);
    }
  };

  const handleRemove = (statusValue: OrderStatusValue, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== statusValue));
  };

  const getDisplayText = () => {
    if (value.length === 0) {
      return 'جميع الحالات';
    }
    if (value.length === 1) {
      return selectedOptions[0]?.label || '';
    }
    return `${value.length} حالات محددة`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 
          border rounded-lg transition-all duration-200 min-h-[44px]
          ${isOpen 
            ? 'ring-2 ring-[#FF9800] border-[#FF9800] shadow-lg' 
            : 'border-gray-300 dark:border-slate-600 hover:border-[#FF9800]/50'
          }
          ${value.length === 0
            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100'
            : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100'
          }
        `}
      >
        <div className="flex items-center gap-2 flex-1 text-right flex-wrap">
          {value.length === 0 ? (
            <span className="font-medium text-gray-500 dark:text-slate-400">
              {getDisplayText()}
            </span>
          ) : value.length <= 2 ? (
            // Show selected statuses as chips if 2 or fewer
            selectedOptions.map((option) => {
              const Icon = option.icon;
              return (
                <span
                  key={option.value}
                  className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                    ${option.bgColor} ${option.color} ${option.borderColor} border
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${option.iconColor}`} />
                  <span className="flex-shrink-0">{option.label}</span>
                  <button
                    onClick={(e) => handleRemove(option.value, e)}
                    className={`
                      flex items-center justify-center
                      w-5 h-5 min-w-[20px] min-h-[20px]
                      rounded-full
                      hover:bg-black/10 dark:hover:bg-white/10
                      active:bg-black/15 dark:active:bg-white/15
                      transition-all duration-150
                      focus:outline-none focus:ring-2 focus:ring-offset-1
                      ml-0.5
                      ${option.color}
                    `}
                    aria-label={`إزالة ${option.label}`}
                    title={`إزالة ${option.label}`}
                  >
                    <X className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                  </button>
                </span>
              );
            })
          ) : (
            // Show count if more than 2
            <>
              {selectedOptions.slice(0, 2).map((option) => {
                const Icon = option.icon;
                return (
                  <span
                    key={option.value}
                    className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                      ${option.bgColor} ${option.color} ${option.borderColor} border
                    `}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${option.iconColor}`} />
                    <span className="flex-shrink-0">{option.label}</span>
                    <button
                      onClick={(e) => handleRemove(option.value, e)}
                      className={`
                        flex items-center justify-center
                        w-5 h-5 min-w-[20px] min-h-[20px]
                        rounded-full
                        hover:bg-black/10 dark:hover:bg-white/10
                        active:bg-black/15 dark:active:bg-white/15
                        transition-all duration-150
                        focus:outline-none focus:ring-2 focus:ring-offset-1
                        ml-0.5
                        ${option.color}
                      `}
                      aria-label={`إزالة ${option.label}`}
                      title={`إزالة ${option.label}`}
                    >
                      <X className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                    </button>
                  </span>
                );
              })}
              <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                +{value.length - 2} أخرى
              </span>
            </>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 dark:text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="py-1 max-h-80 overflow-auto">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = value.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-right
                    transition-all duration-150
                    ${isSelected
                      ? `${option.bgColor} ${option.color} ${option.borderColor} border-r-2 font-medium`
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? option.iconColor : 'text-gray-400 dark:text-slate-500'}`} />
                  <span className="flex-1">{option.label}</span>
                  {isSelected && (
                    <CheckCircle className={`w-4 h-4 ${option.iconColor}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

