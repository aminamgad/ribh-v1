'use client';

import { useState } from 'react';
import { Download, Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

export default function OrderExportModal({ isOpen, onClose, userRole }: OrderExportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');
  const [format, setFormat] = useState('xlsx');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status !== 'all') params.append('status', status);
      params.append('format', format);

      const response = await fetch(`/api/orders/export?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_export_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('تم تصدير الطلبات بنجاح');
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في تصدير الطلبات');
      }
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error('حدث خطأ أثناء تصدير الطلبات');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                تصدير الطلبات
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                تصدير الطلبات إلى ملف Excel
              </p>
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              فترة التصدير
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              حالة الطلب
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="confirmed">مؤكد</option>
              <option value="processing">قيد المعالجة</option>
              <option value="ready_for_shipping">جاهز للشحن</option>
              <option value="shipped">تم الشحن</option>
              <option value="out_for_delivery">خارج للتوصيل</option>
              <option value="delivered">تم التسليم</option>
              <option value="cancelled">ملغي</option>
              <option value="returned">مرتجع</option>
              <option value="refunded">مسترد</option>
            </select>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              تنسيق الملف
            </label>
            <div className="flex space-x-3 space-x-reverse">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mr-2"
                />
                <FileSpreadsheet className="w-4 h-4 text-green-600 ml-1" />
                Excel (.xlsx)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mr-2"
                />
                <FileText className="w-4 h-4 text-blue-600 ml-1" />
                CSV
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 space-x-reverse">
            <button
              onClick={onClose}
              disabled={exporting}
              className="btn-secondary"
            >
              إلغاء
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary flex items-center"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 ml-2" />
                  تصدير الطلبات
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
