'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TemplateNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  loading?: boolean;
  existingNames?: string[];
}

export default function TemplateNameModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  existingNames = []
}: TemplateNameModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setName('');
      setError('');
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'اسم القالب مطلوب';
    }
    if (trimmed.length < 2) {
      return 'اسم القالب يجب أن يكون حرفين على الأقل';
    }
    if (trimmed.length > 50) {
      return 'اسم القالب يجب أن يكون أقل من 50 حرف';
    }
    if (existingNames.includes(trimmed)) {
      return 'يوجد قالب بنفس الاسم بالفعل';
    }
    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (error) {
      setError(validateName(value));
    }
  };

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim();
    const validationError = validateName(trimmed);
    
    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    onConfirm(trimmed);
  }, [name, onConfirm]);

  if (!isVisible) return null;

  const isValid = name.trim() && !validateName(name.trim());

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-name-title"
    >
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="template-name-title"
                className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100"
              >
                حفظ كقالب
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
                أدخل اسم القالب لحفظ المنتج الحالي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="template-name-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                اسم القالب
                <span className="text-red-500 mr-1">*</span>
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="template-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => {
                    if (name.trim()) {
                      setError(validateName(name.trim()));
                    }
                  }}
                  placeholder="مثال: منتجات إلكترونية"
                  maxLength={50}
                  disabled={loading}
                  className={`w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all text-sm sm:text-base min-h-[44px] ${
                    error
                      ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
                      : isValid
                      ? 'border-green-500 focus:ring-green-500 dark:border-green-500'
                      : 'border-gray-300 dark:border-slate-600 focus:ring-purple-500 dark:bg-slate-700 dark:text-slate-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {isValid && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>
              
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
              
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {name.length}/50 حرف
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>نصيحة:</strong> اختر اسماً واضحاً ووصفياً للقالب لتسهيل العثور عليه لاحقاً.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] w-full sm:w-auto"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !isValid}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[44px] shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>حفظ القالب</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

