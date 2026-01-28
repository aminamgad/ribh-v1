'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Package, ImageIcon, AlertTriangle, RotateCcw, Clock, Tag } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  createdAt: string;
  data: {
    name?: string;
    images?: string[];
    tags?: string[];
    currentStep?: number;
    [key: string]: any;
  };
}

interface TemplateLoadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  template: Template | null;
  loading?: boolean;
}

export default function TemplateLoadConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  template,
  loading = false
}: TemplateLoadConfirmModalProps) {
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
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose, onConfirm]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstButton = modalRef.current.querySelector('button') as HTMLButtonElement;
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }
  }, [isOpen]);

  if (!isVisible || !template) return null;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch {
      return 'غير محدد';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-load-title"
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
        className={`relative bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden transform transition-all duration-300 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="template-load-title"
                className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100"
              >
                تحميل القالب
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
                سيتم استبدال البيانات الحالية
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
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Warning */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                  تحذير: سيتم استبدال البيانات الحالية
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  جميع البيانات المدخلة حالياً سيتم استبدالها ببيانات القالب. تأكد من حفظ أي بيانات مهمة قبل المتابعة.
                </p>
              </div>
            </div>
          </div>

          {/* Template Preview */}
          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                معاينة القالب
              </h4>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {formatDate(template.createdAt)}
              </span>
            </div>
            
            <div className="space-y-3">
              {/* Template Name */}
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-slate-400">اسم القالب</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {template.name}
                  </p>
                </div>
              </div>

              {/* Product Name */}
              {template.data.name && (
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-slate-400">اسم المنتج</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {template.data.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Images */}
              {template.data.images && template.data.images.length > 0 && (
                <div className="flex items-start gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-slate-400">الصور</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {template.data.images.length} صورة
                    </p>
                  </div>
                </div>
              )}

              {/* Current Step */}
              {template.data.currentStep && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-slate-400">الخطوة المحفوظة</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      الخطوة {template.data.currentStep} من 6
                    </p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {template.data.tags && template.data.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-slate-400">العلامات</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.data.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {template.data.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          +{template.data.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[44px] shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>جاري التحميل...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>تحميل القالب</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

