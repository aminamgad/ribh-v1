'use client';

import { useState, useEffect } from 'react';
import { Filter, X, Calendar, Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import MultiSelect from '@/components/ui/MultiSelect';
import toast from 'react-hot-toast';

interface Supplier {
  _id: string;
  name: string;
  companyName?: string;
}

interface AdminProductFiltersProps {
  onFiltersChange?: () => void;
}

export default function AdminProductFilters({ onFiltersChange }: AdminProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Filter states
  const [selectedStockStatus, setSelectedStockStatus] = useState<string[]>(() => {
    const stockParam = searchParams.get('stockStatus');
    return stockParam ? stockParam.split(',') : [];
  });
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(() => {
    const suppliersParam = searchParams.get('suppliers');
    return suppliersParam ? suppliersParam.split(',') : [];
  });
  const [startDate, setStartDate] = useState(() => searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(() => searchParams.get('endDate') || '');

  // Stock status options
  const stockStatusOptions = [
    { value: 'in_stock', label: 'متوفر (أكثر من 10)' },
    { value: 'low_stock', label: 'منخفض (1-10)' },
    { value: 'out_of_stock', label: 'نفد (0)' },
  ];

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const response = await fetch('/api/admin/users?role=supplier&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('حدث خطأ أثناء جلب قائمة الموردين');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier._id,
    label: supplier.companyName || supplier.name,
  }));

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Stock status filter
    if (selectedStockStatus.length > 0) {
      params.set('stockStatus', selectedStockStatus.join(','));
    } else {
      params.delete('stockStatus');
    }

    // Suppliers filter
    if (selectedSuppliers.length > 0) {
      params.set('suppliers', selectedSuppliers.join(','));
    } else {
      params.delete('suppliers');
    }

    // Date range filter
    if (startDate) {
      params.set('startDate', startDate);
    } else {
      params.delete('startDate');
    }

    if (endDate) {
      params.set('endDate', endDate);
    } else {
      params.delete('endDate');
    }

    const queryString = params.toString();
    router.push(`/dashboard/products?${queryString}`);
    
    // Save filters to sessionStorage
    try {
      if (queryString) {
        sessionStorage.setItem('filters_/dashboard/products', queryString);
      } else {
        sessionStorage.removeItem('filters_/dashboard/products');
      }
    } catch (e) {
      // Ignore errors
    }
    
    setShowFilters(false);
    if (onFiltersChange) {
      onFiltersChange();
    }
  };

  const clearFilters = () => {
    setSelectedStockStatus([]);
    setSelectedSuppliers([]);
    setStartDate('');
    setEndDate('');

    const params = new URLSearchParams(searchParams.toString());
    params.delete('stockStatus');
    params.delete('suppliers');
    params.delete('startDate');
    params.delete('endDate');

    router.push(`/dashboard/products?${params.toString()}`);
    if (onFiltersChange) {
      onFiltersChange();
    }
  };

  const hasActiveFilters =
    selectedStockStatus.length > 0 ||
    selectedSuppliers.length > 0 ||
    startDate ||
    endDate;

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedStockStatus.length > 0) {
        params.append('stockStatus', selectedStockStatus.join(','));
      }
      if (selectedSuppliers.length > 0) {
        params.append('suppliers', selectedSuppliers.join(','));
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/products/export?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('تم تصدير المنتجات بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في تصدير المنتجات');
      }
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('حدث خطأ أثناء تصدير المنتجات');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            hasActiveFilters
              ? 'bg-[#FF9800] text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>فلاتر المنتجات</span>
          {hasActiveFilters && (
            <span className="bg-white/20 dark:bg-white/20 text-xs px-2 py-0.5 rounded-full">
              {[selectedStockStatus.length, selectedSuppliers.length, startDate ? 1 : 0, endDate ? 1 : 0]
                .filter((count) => count > 0).length}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              فلاتر المنتجات المتقدمة
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stock Status Filter */}
          <div>
            <MultiSelect
              options={stockStatusOptions}
              selected={selectedStockStatus}
              onChange={setSelectedStockStatus}
              placeholder="اختر حالة المخزون"
              label="حالة المخزون"
            />
          </div>

          {/* Suppliers Filter */}
          <div>
            <MultiSelect
              options={supplierOptions}
              selected={selectedSuppliers}
              onChange={setSelectedSuppliers}
              placeholder={loadingSuppliers ? 'جاري التحميل...' : 'اختر الموردين'}
              label="المورد"
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              تاريخ الإضافة
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              مسح الفلاتر
            </button>
            <button
              onClick={applyFilters}
              className="px-6 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg transition-colors"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

