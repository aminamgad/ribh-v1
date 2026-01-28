'use client';

import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Save, XCircle, CloudOff } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSaveDraft?: () => void;
  loading?: boolean;
  hasDraft?: boolean;
}

export default function UnsavedChangesModal({
  isOpen,
  onClose,
  onDiscard,
  onSaveDraft,
  loading = false,
  hasDraft = false
}: UnsavedChangesModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstButton = modalRef.current.querySelector('button') as HTMLButtonElement;
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`relative bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="unsaved-changes-title"
                className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100"
              >
                تغييرات غير محفوظة
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
                لديك تغييرات لم يتم حفظها
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
          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <CloudOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                  تحذير: تغييرات غير محفوظة
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  لديك تغييرات لم يتم حفظها. إذا تركت هذه الصفحة الآن، سيتم فقدان جميع التغييرات.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-700 dark:text-slate-300 text-center mb-4">
            ماذا تريد أن تفعل؟
          </p>

          {/* Options */}
          <div className="space-y-2">
            {onSaveDraft && (
              <button
                onClick={() => {
                  onSaveDraft();
                  onClose();
                }}
                disabled={loading}
                className="w-full px-4 py-3 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>حفظ المسودة والمتابعة</span>
              </button>
            )}
            
            <button
              onClick={() => {
                onDiscard();
                onClose();
              }}
              disabled={loading}
              className="w-full px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <XCircle className="w-4 h-4" />
              <span>تجاهل التغييرات والمتابعة</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

