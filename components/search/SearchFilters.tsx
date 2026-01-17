'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, Calendar, Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import MultiSelect from '@/components/ui/MultiSelect';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
  nameEn: string;
}

interface Supplier {
  _id: string;
  name: string;
  companyName?: string;
}

interface SearchFiltersProps {
  onSearch?: (filters: any) => void;
}

export default function SearchFilters({ onSearch }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const categoryParam = searchParams.get('category');
    return categoryParam ? categoryParam.split(',').filter(Boolean) : [];
  });
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedApprovalStatuses, setSelectedApprovalStatuses] = useState<string[]>(() => {
    const statusParam = searchParams.get('status');
    return statusParam ? statusParam.split(',').filter(Boolean) : [];
  });

  // Admin-specific filter states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [minStock, setMinStock] = useState(() => searchParams.get('minStock') || '');
  const [maxStock, setMaxStock] = useState(() => searchParams.get('maxStock') || '');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(() => {
    const suppliersParam = searchParams.get('suppliers');
    return suppliersParam ? suppliersParam.split(',') : [];
  });
  const [startDate, setStartDate] = useState(() => searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(() => searchParams.get('endDate') || '');

  useEffect(() => {
    fetchCategories();
    if (user?.role === 'admin') {
      fetchSuppliers();
    }
  }, [user?.role]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

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

  const categoryOptions = categories.map((category) => ({
    value: category._id,
    label: category.name,
  }));

  const approvalStatusOptions = [
    { value: 'approved', label: 'معتمد' },
    { value: 'pending', label: 'في انتظار الموافقة' },
    { value: 'rejected', label: 'مرفوض' },
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (inStock) params.set('inStock', 'true');
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    if (selectedApprovalStatuses.length > 0) params.set('status', selectedApprovalStatuses.join(','));
    
    // Admin-specific filters
    if (user?.role === 'admin') {
      if (minStock) params.set('minStock', minStock);
      if (maxStock) params.set('maxStock', maxStock);
      if (selectedSuppliers.length > 0) {
        params.set('suppliers', selectedSuppliers.join(','));
      }
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    
    const queryString = params.toString();
    router.push(`/dashboard/products${queryString ? `?${queryString}` : ''}`);
    
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
    if (onSearch) {
      onSearch({
        q: searchQuery,
        category: selectedCategories,
        minPrice,
        maxPrice,
        inStock,
        sortBy,
        sortOrder,
        status: selectedApprovalStatuses,
        minStock,
        maxStock,
        suppliers: selectedSuppliers,
        startDate,
        endDate
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setSortBy('createdAt');
    setSortOrder('desc');
    setSelectedApprovalStatuses([]);
    
    // Clear admin filters
    if (user?.role === 'admin') {
      setMinStock('');
      setMaxStock('');
      setSelectedSuppliers([]);
      setStartDate('');
      setEndDate('');
    }
    
    router.push('/dashboard/products');

    // Clear stored filters so they don't interfere across reloads
    try {
      sessionStorage.removeItem('filters_/dashboard/products');
    } catch (e) {
      // Ignore errors
    }

    setShowFilters(false);
    
    if (onSearch) {
      onSearch({});
    }
  };

  const hasActiveFilters = searchQuery || selectedCategories.length > 0 || minPrice || maxPrice || inStock || selectedApprovalStatuses.length > 0 ||
    (user?.role === 'admin' && (minStock || maxStock || selectedSuppliers.length > 0 || startDate || endDate));

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      
      if (minStock) {
        params.append('minStock', minStock);
      }
      if (maxStock) {
        params.append('maxStock', maxStock);
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
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-300 w-5 h-5" />
          <input
            type="text"
            placeholder="البحث عن المنتجات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="input-field pr-10"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={user?.role === 'admin' && hasActiveFilters
            ? 'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-[#FF9800] text-white'
            : 'btn-secondary'}
        >
          <Filter className="w-5 h-5 ml-2" />
          {user?.role === 'admin' ? 'فلاتر المنتجات' : 'فلاتر'}
          {hasActiveFilters && (
            <span className={`mr-2 text-xs px-1.5 py-0.5 rounded-full ${
              user?.role === 'admin' 
                ? 'bg-white/20 text-white' 
                : 'bg-primary-600 text-white'
            }`}>
              {user?.role === 'admin'
                ? [
                    searchQuery,
                    selectedCategories.length,
                    minPrice,
                    maxPrice,
                    inStock,
                    selectedApprovalStatuses.length,
                    minStock,
                    maxStock,
                    selectedSuppliers.length,
                    startDate,
                    endDate
                  ].filter(Boolean).length
                : [
                    searchQuery,
                    selectedCategories.length,
                    minPrice,
                    maxPrice,
                    inStock
                  ].filter(Boolean).length}
            </span>
          )}
        </button>
        
        <button
          onClick={handleSearch}
          className="btn-primary"
        >
          بحث
        </button>
      </div>

      {/* Export Button for Admin */}
      {user?.role === 'admin' && hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-6 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {user?.role === 'admin' ? 'فلاتر المنتجات المتقدمة' : 'فلاتر البحث'}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={clearFilters}
                className="text-sm text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 font-medium"
              >
                مسح الكل
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                الفئات
              </label>
              <MultiSelect
                options={categoryOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                placeholder="جميع الفئات"
              />
            </div>

            {/* Approval Status Filter - Admin Only */}
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  حالة الموافقة
                </label>
                <MultiSelect
                  options={approvalStatusOptions}
                  selected={selectedApprovalStatuses}
                  onChange={setSelectedApprovalStatuses}
                  placeholder="جميع الحالات"
                />
              </div>
            )}

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                السعر من
              </label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                السعر إلى
              </label>
              <input
                type="number"
                placeholder="1000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Stock Filter */}
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 ml-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  المنتجات المتوفرة فقط
                </span>
              </label>
            </div>
          </div>

          {/* Admin-specific Filters */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4">
                  فلاتر الإدارة
                </h4>
                
                {/* Stock Quantity Range Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    نطاق المخزون
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                        من
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                        إلى
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="لا نهائي"
                        value={maxStock}
                        onChange={(e) => setMaxStock(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Suppliers Filter */}
                <div className="mb-4">
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
              </div>
            </>
          )}

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                ترتيب حسب
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field"
              >
                <option value="createdAt">تاريخ الإضافة</option>
                <option value="price">السعر</option>
                <option value="name">الاسم</option>
                <option value="stock">المخزون</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                اتجاه الترتيب
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input-field"
              >
                <option value="desc">تنازلي</option>
                <option value="asc">تصاعدي</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg transition-colors"
            >
              {user?.role === 'admin' ? 'تطبيق الفلاتر' : 'بحث'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 