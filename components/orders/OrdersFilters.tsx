'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, X, Filter } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import OrderStatusSelect from '@/components/ui/OrderStatusSelect';

interface OrdersFiltersProps {
  onFiltersChange?: () => void;
}

export default function OrdersFilters({ onFiltersChange }: OrdersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Filter states - initialize from URL
  const [customerSearch, setCustomerSearch] = useState(() => searchParams.get('customerSearch') || '');
  const [orderNumberSearch, setOrderNumberSearch] = useState(() => searchParams.get('orderNumberSearch') || '');
  const [productSearch, setProductSearch] = useState(() => searchParams.get('productSearch') || '');
  const [startDate, setStartDate] = useState(() => searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(() => searchParams.get('endDate') || '');
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') || 'all');
  const [filterCountry, setFilterCountry] = useState(() => searchParams.get('country') || 'all');

  // Countries list (can be extended later)
  const countries = [
    { value: 'all', label: 'جميع الدول' },
    { value: 'المملكة العربية السعودية', label: 'المملكة العربية السعودية' },
    { value: 'فلسطين', label: 'فلسطين' },
    { value: 'الأردن', label: 'الأردن' },
    { value: 'مصر', label: 'مصر' },
    { value: 'لبنان', label: 'لبنان' },
  ];

  const applyFilters = () => {
    const params = new URLSearchParams();

    // Search filters
    if (customerSearch.trim()) {
      params.set('customerSearch', customerSearch.trim());
    }
    if (orderNumberSearch.trim()) {
      params.set('orderNumberSearch', orderNumberSearch.trim());
    }
    if (productSearch.trim()) {
      params.set('productSearch', productSearch.trim());
    }

    // Date range
    if (startDate) {
      params.set('startDate', startDate);
    }
    if (endDate) {
      params.set('endDate', endDate);
    }

    // Status filter
    if (filterStatus && filterStatus !== 'all') {
      params.set('status', filterStatus);
    }

    // Country filter
    if (filterCountry && filterCountry !== 'all') {
      params.set('country', filterCountry);
    }

    router.push(`${pathname}?${params.toString()}`);
    
    // Save filters to sessionStorage
    try {
      const queryString = params.toString();
      if (queryString) {
        sessionStorage.setItem('filters_/dashboard/orders', queryString);
      } else {
        sessionStorage.removeItem('filters_/dashboard/orders');
      }
    } catch (e) {
      // Ignore errors
    }

    if (onFiltersChange) {
      onFiltersChange();
    }
  };

  const clearFilters = () => {
    setCustomerSearch('');
    setOrderNumberSearch('');
    setProductSearch('');
    setStartDate('');
    setEndDate('');
    setFilterStatus('all');
    setFilterCountry('all');

    router.push(pathname);
    
    // Clear from sessionStorage
    try {
      sessionStorage.removeItem('filters_/dashboard/orders');
    } catch (e) {
      // Ignore errors
    }

    if (onFiltersChange) {
      onFiltersChange();
    }
  };

  const hasActiveFilters =
    customerSearch.trim() ||
    orderNumberSearch.trim() ||
    productSearch.trim() ||
    startDate ||
    endDate ||
    (filterStatus && filterStatus !== 'all') ||
    (filterCountry && filterCountry !== 'all');

  return (
    <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="space-y-4">
        {/* Search Fields Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer/Phone Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              قم بالبحث باستخدام اسم العميل أو رقم هاتف العميل
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="اسم العميل أو رقم الهاتف"
                className="w-full pr-11 pl-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Order Number Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              قم بالبحث باستخدام كود الطلب
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                value={orderNumberSearch}
                onChange={(e) => setOrderNumberSearch(e.target.value)}
                placeholder="رقم الطلب"
                className="w-full pr-11 pl-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Product/SKU Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              البحث باسم المنتج أو SKU
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="اسم المنتج أو SKU"
                className="w-full pr-11 pl-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Search Fields Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              من تاريخ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              إلى تاريخ
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          {/* Status Filter */}
          <div>
            <OrderStatusSelect
              value={filterStatus as any}
              onChange={(value) => setFilterStatus(value)}
              label="حالة الطلب"
            />
          </div>
        </div>

        {/* Country Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              الدولة
            </label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="input-field"
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={clearFilters}
            className="px-6 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            إزالة الفلترة
          </button>
          
          <button
            onClick={applyFilters}
            className="px-6 py-2.5 bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            بحث
          </button>
        </div>
      </div>
    </div>
  );
}

