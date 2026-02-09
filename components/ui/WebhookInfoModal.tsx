'use client';

import { useEffect } from 'react';
import { X, Copy, CheckCircle, XCircle, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export interface WebhookInfoData {
  webhookUrl: string;
  hasWebhookSecret: boolean;
  storeId: string;
  webhookConfigured: boolean;
  totalOrders: number;
  lastOrder?: string;
  warning?: string;
}

interface WebhookInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WebhookInfoData | null;
}

export default function WebhookInfoModal({ isOpen, onClose, data }: WebhookInfoModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="webhook-info-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20 rounded-lg">
              <LinkIcon className="w-5 h-5 text-[#4CAF50]" />
            </div>
            <h2 id="webhook-info-title" className="text-lg font-bold text-gray-900 dark:text-white">
              معلومات Webhook
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 dark:text-slate-400"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {data ? (
            <>
              {/* Warning Banner */}
              {data.warning && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">{data.warning}</p>
                </div>
              )}

              {/* Info Rows */}
              <div className="space-y-3">
                {/* Webhook URL */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Webhook URL</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 truncate flex-1">
                      {data.webhookUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(data.webhookUrl)}
                      className="p-2 rounded-lg bg-[#4CAF50] hover:bg-[#388E3C] text-white flex-shrink-0 transition-colors"
                      title="نسخ الرابط"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Webhook Secret */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Webhook Secret</span>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${data.hasWebhookSecret ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {data.hasWebhookSecret ? (
                      <><CheckCircle className="w-4 h-4" /> محفوظ ✓</>
                    ) : (
                      <><XCircle className="w-4 h-4" /> غير محفوظ ✗</>
                    )}
                  </span>
                </div>

                {/* Store ID */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Store ID</span>
                  <code className="text-xs text-gray-900 dark:text-slate-100 break-all">
                    {data.storeId || 'غير محدد'}
                  </code>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">الحالة</span>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${data.webhookConfigured ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {data.webhookConfigured ? (
                      <><CheckCircle className="w-4 h-4" /> مضبوط ✓</>
                    ) : (
                      <><XCircle className="w-4 h-4" /> غير مضبوط ✗</>
                    )}
                  </span>
                </div>

                {/* Total Orders */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">إجمالي الطلبات</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {data.totalOrders ?? 0}
                  </span>
                </div>

                {/* Last Order */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">آخر طلب</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {data.lastOrder || 'لا يوجد'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-slate-400">
              جاري التحميل...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-[#4CAF50] hover:bg-[#388E3C] text-white font-medium transition-colors"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
}
