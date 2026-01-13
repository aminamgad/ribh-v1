'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

interface Category {
  _id: string;
  name: string;
  nameEn: string;
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
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [showFilters, setShowFilters] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(searchParams.get('status') || '');

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (inStock) params.set('inStock', 'true');
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    if (approvalStatus) params.set('status', approvalStatus);
    
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
    
    if (onSearch) {
      onSearch({
        q: searchQuery,
        category: selectedCategory,
        minPrice,
        maxPrice,
        inStock,
        sortBy,
        sortOrder,
        status: approvalStatus
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setSortBy('createdAt');
    setSortOrder('desc');
    setApprovalStatus('');
    
    router.push('/dashboard/products');
    
    if (onSearch) {
      onSearch({});
    }
  };

  const hasActiveFilters = searchQuery || selectedCategory || minPrice || maxPrice || inStock || approvalStatus;

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
          className="btn-secondary"
        >
          <Filter className="w-5 h-5 ml-2" />
          فلاتر
          {hasActiveFilters && (
            <span className="mr-2 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {[searchQuery, selectedCategory, minPrice, maxPrice, inStock].filter(Boolean).length}
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">فلاتر البحث</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 font-medium"
            >
              مسح الكل
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                الفئة
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                <option value="">جميع الفئات</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Approval Status Filter - Admin Only */}
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  حالة الموافقة
                </label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="">جميع المنتجات</option>
                  <option value="approved">معتمد</option>
                  <option value="pending">في انتظار الموافقة</option>
                </select>
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
        </div>
      )}
    </div>
  );
} 