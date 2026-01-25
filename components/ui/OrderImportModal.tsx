'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function OrderImportModal({ isOpen, onClose, onImportSuccess }: OrderImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('يرجى اختيار ملف Excel صحيح (.xlsx, .xls, .csv)');
        return;
      }
      
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف للاستيراد');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        toast.success(result.message);
        if (result.totalProcessed > 0) {
          onImportSuccess();
        }
      } else {
        toast.error(result.message || 'فشل في استيراد الطلبات');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء استيراد الطلبات');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Create a sample template with proper column headers
    const templateData = [
      {
        'اسم العميل': 'أحمد محمد',
        'بريد العميل': 'ahmed@example.com',
        'هاتف العميل': '0599123456',
        'رمز المنتج': 'PROD001',
        'اسم المنتج': 'منتج تجريبي',
        'الكمية': 2,
        'العنوان': 'شارع الرئيسي',
        'المدينة': 'غزة',
        'المحافظة': 'غزة',
        'الرمز البريدي': '12345',
        'طريقة الدفع': 'cod',
        'ملاحظات': 'ملاحظات تجريبية'
      },
      {
        'اسم العميل': 'فاطمة علي',
        'بريد العميل': 'fatima@example.com',
        'هاتف العميل': '0599876543',
        'رمز المنتج': 'PROD002',
        'اسم المنتج': 'منتج آخر',
        'الكمية': 1,
        'العنوان': 'شارع السلام',
        'المدينة': 'رام الله',
        'المحافظة': 'رام الله والبيرة',
        'الرمز البريدي': '54321',
        'طريقة الدفع': 'cod',
        'ملاحظات': ''
      }
    ];

    // Convert to CSV with proper encoding
    const headers = Object.keys(templateData[0]);
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => 
        headers.map(header => {
          const value = (row as any)[header];
          // Escape quotes and wrap in quotes if contains comma or quotes
          const escapedValue = String(value).replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ].join('\n');

    // Add BOM for proper Arabic text encoding
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('تم تحميل قالب الاستيراد بنجاح');
  };

  const resetForm = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
              <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                استيراد الطلبات
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                استيراد الطلبات من ملف Excel
              </p>
            </div>
          </div>

          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  قالب الاستيراد
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  قم بتحميل القالب وملئه بالبيانات المطلوبة. تأكد من أن أسماء المنتجات موجودة في النظام.
                </p>
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  <strong>الأعمدة المطلوبة:</strong> اسم العميل، بريد العميل، هاتف العميل، رمز المنتج، اسم المنتج، الكمية، العنوان، المدينة، المحافظة، الرمز البريدي، طريقة الدفع، ملاحظات
                </div>
              </div>
              <button
                onClick={downloadTemplate}
                className="btn-secondary flex items-center flex-shrink-0"
              >
                <Download className="w-4 h-4 ml-2" />
                تحميل القالب
              </button>
            </div>
          </div>

          {/* Warning about file types */}
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mr-3">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ملاحظة مهمة
                </h4>
                <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>• لا تستخدم ملفات الطلبات المصدرة للاستيراد</p>
                  <p>• استخدم فقط قالب الاستيراد المقدم أعلاه</p>
                  <p>• تأكد من أن أسماء المنتجات موجودة في النظام</p>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              اختيار ملف Excel
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {!file ? (
                <div>
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400 mb-2">
                    اسحب الملف هنا أو اضغط للاختيار
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    اختيار ملف
                  </button>
                </div>
              ) : (
                <div>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(file.size / 1024 / 1024)} MB
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    تغيير الملف
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">
                نتائج الاستيراد
              </h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      تم الاستيراد: {importResult.totalProcessed}
                    </span>
                  </div>
                </div>
                {importResult.totalErrors > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 ml-2" />
                      <span className="text-red-800 dark:text-red-200 font-medium">
                        الأخطاء: {importResult.totalErrors}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Processed Orders */}
              {importResult.processedOrders && importResult.processedOrders.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 dark:text-slate-300 mb-2">
                    الطلبات المستوردة:
                  </h5>
                  <div className="max-h-32 overflow-y-auto">
                    {importResult.processedOrders.map((order: any, index: number) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                        {order.orderNumber} - {order.customerName} - {order.productName} (الكمية: {order.quantity})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div>
                  <h5 className="font-medium text-red-700 dark:text-red-300 mb-2">
                    الأخطاء:
                  </h5>
                  <div className="max-h-32 overflow-y-auto">
                    {importResult.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-600 dark:text-red-400 mb-1">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 space-x-reverse">
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={importing}
              className="btn-secondary"
            >
              إغلاق
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !file}
              className="btn-primary flex items-center"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  استيراد الطلبات
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
