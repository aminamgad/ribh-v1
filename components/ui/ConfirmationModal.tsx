'use client';

import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void; // Optional custom cancel handler
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  customContent?: React.ReactNode;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'warning',
  loading = false,
  customContent
}: ConfirmationModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      prevFocusRef.current = document.activeElement as HTMLElement | null;
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
        prevFocusRef.current?.focus?.();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus trap + Escape handler
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const modal = modalRef.current;
    const focusables = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'info':
        return <Info className="w-6 h-6 text-[#FF9800] dark:text-[#FF9800]" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'info':
        return 'bg-[#FF9800] hover:bg-[#F57C00] focus:ring-[#FF9800]';
      default:
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
    }
  };

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      if (onCancel) {
        onCancel();
      } else {
        onClose();
      }
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-opacity duration-200 safe-area-inset ${
      isOpen ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal - focus trap container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        className={`relative bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6">
                {getIcon()}
              </div>
            </div>
            <h3 id="confirmation-modal-title" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">
              {title}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 sm:p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 mr-2 sm:mr-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-700 dark:text-slate-300 leading-relaxed">
            {message}
          </p>
          {customContent && (
            <div className="mt-3 sm:mt-4">
              {customContent}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 space-y-reverse sm:space-x-reverse p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] w-full sm:w-auto"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2.5 sm:py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonStyles()} disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 space-x-reverse min-h-[44px] w-full sm:w-auto`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                <span>جاري التحميل...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
