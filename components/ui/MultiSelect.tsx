'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'اختر...',
  label,
  className = ''
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const selectedLabels = selected
    .map((value) => options.find((opt) => opt.value === value)?.label)
    .filter(Boolean);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className={`w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 flex items-center justify-between min-h-[42px] ${
            isOpen ? 'ring-2 ring-[#FF9800] border-[#FF9800]' : ''
          }`}
        >
          <div className="flex-1 flex flex-wrap gap-1.5">
            {selected.length === 0 ? (
              <span className="text-gray-500 dark:text-slate-400">{placeholder}</span>
            ) : (
              selectedLabels.map((label, index) => (
                <span
                  key={selected[index]}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#FF9800]/10 dark:bg-[#FF9800]/20 text-[#FF9800] dark:text-[#FF9800] rounded text-sm"
                >
                  {label}
                  <button
                    onClick={(e) => handleRemove(selected[index], e)}
                    className="hover:bg-[#FF9800]/20 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 dark:text-slate-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400 text-center">
              لا توجد خيارات متاحة
            </div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => handleToggle(option.value)}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                    isSelected ? 'bg-[#FF9800]/5 dark:bg-[#FF9800]/10' : ''
                  }`}
                >
                  <span className="text-sm text-gray-900 dark:text-slate-100">
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#FF9800] dark:text-[#FF9800]" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

