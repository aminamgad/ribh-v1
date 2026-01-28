'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Clock, CheckCircle2, ImageIcon, Package, Calendar, Trash2, RotateCcw, XCircle, Tag, AlertTriangle } from 'lucide-react';

interface DraftData {
  name?: string;
  categoryId?: string;
  images?: string[];
  currentStep?: number;
  timestamp?: string;
  tags?: string[];
  specifications?: Array<{key: string, value: string}>;
  hasVariants?: boolean | null;
  variants?: any[];
  variantOptions?: any[];
  [key: string]: any;
}

interface DraftRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
  onDismiss: () => void;
  onDelete: () => void;
  draftData: DraftData | null;
  loading?: boolean;
  showDeleteConfirm?: boolean;
  onDeleteConfirm?: () => void;
  onDeleteCancel?: () => void;
}

export default function DraftRestoreModal({
  isOpen,
  onClose,
  onRestore,
  onDismiss,
  onDelete,
  draftData,
  loading = false,
  showDeleteConfirm = false,
  onDeleteConfirm,
  onDeleteCancel
}: DraftRestoreModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [internalShowDeleteConfirm, setInternalShowDeleteConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Check if user has set "don't ask again"
      const dontAsk = localStorage.getItem('draft-restore-dont-ask');
      if (dontAsk === 'true') {
        setDontAskAgain(true);
        onDismiss();
        return;
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onDismiss]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onRestore();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose, onRestore]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstButton = modalRef.current.querySelector('button') as HTMLButtonElement;
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }
  }, [isOpen]);

  if (!isVisible || !draftData) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return 'غير محدد';
    }
  };

  const calculateProgress = () => {
    let completed = 0;
    if (draftData.name && draftData.name.length >= 3) completed++;
    if (draftData.images && draftData.images.length > 0) completed++;
    if (draftData.marketerPrice && draftData.marketerPrice > 0) completed++;
    if (draftData.stockQuantity !== undefined) completed++;
    if (draftData.hasVariants !== undefined && draftData.hasVariants !== null) completed++;
    return Math.round((completed / 5) * 100);
  };

  const handleDontAskAgain = (checked: boolean) => {
    setDontAskAgain(checked);
    if (checked) {
      localStorage.setItem('draft-restore-dont-ask', 'true');
    } else {
      localStorage.removeItem('draft-restore-dont-ask');
    }
  };

  const handleDelete = () => {
    if (onDeleteConfirm && onDeleteCancel) {
      // Parent handles confirmation
      onDeleteConfirm();
    } else {
      // Show internal confirmation
      setInternalShowDeleteConfirm(true);
    }
  };

  const handleDeleteConfirm = () => {
    setInternalShowDeleteConfirm(false);
    onDelete();
  };

  const handleDeleteCancel = () => {
    setInternalShowDeleteConfirm(false);
    if (onDeleteCancel) {
      onDeleteCancel();
    }
  };

  const shouldShowDeleteConfirm = showDeleteConfirm || internalShowDeleteConfirm;

  const progress = calculateProgress();

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-restore-title"
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
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="draft-restore-title"
                className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100"
              >
                مسودة محفوظة
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
                تم العثور على مسودة محفوظة مسبقاً
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
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Draft Preview */}
          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4" />
                معاينة المسودة
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-gray-600 dark:text-slate-400">{progress}% مكتمل</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Product Name */}
              {draftData.name && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-slate-400">اسم المنتج</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {draftData.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Images */}
              {draftData.images && draftData.images.length > 0 && (
                <div className="flex items-start gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-slate-400">الصور</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {draftData.images.length} صورة
                    </p>
                  </div>
                </div>
              )}

              {/* Current Step */}
              {draftData.currentStep && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-slate-400">الخطوة الحالية</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      الخطوة {draftData.currentStep} من 6
                    </p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {draftData.tags && draftData.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-slate-400">العلامات</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {draftData.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {draftData.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          +{draftData.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Draft Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>تاريخ الحفظ:</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {formatDate(draftData.timestamp)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>التقدم:</span>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400 min-w-[3rem] text-left">
                {progress}%
              </span>
            </div>
          </div>

          {/* Don't Ask Again Option */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => handleDontAskAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">
                لا تسألني مرة أخرى
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px] order-3 sm:order-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف المسودة</span>
          </button>
          
          <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
            <button
              onClick={onDismiss}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex-1 sm:flex-none"
            >
              تجاهل
            </button>
            <button
              onClick={onRestore}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[44px] shadow-lg hover:shadow-xl flex-1 sm:flex-none"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>جاري الاستعادة...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>استعادة المسودة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Internal Delete Confirmation */}
        {shouldShowDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  تأكيد الحذف
                </h4>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                هل أنت متأكد من حذف هذه المسودة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors min-h-[44px]"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

