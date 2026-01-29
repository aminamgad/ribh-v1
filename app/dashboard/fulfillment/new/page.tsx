'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Package, Plus, X, Upload, AlertCircle, CheckCircle, Search, Filter, Info, TrendingUp, Calendar, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { OptimizedImage } from '@/components/ui/LazyImage';

interface Product {
  _id: string;
  name: string;
  costPrice: number;
  stockQuantity: number;
  images: string[];
  isApproved: boolean;
  isRejected: boolean;
  categoryId?: string;
  categoryName?: string;
}

interface FulfillmentProduct {
  productId: string;
  quantity: number;
  currentStock: number;
}

export default function NewFulfillmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<FulfillmentProduct[]>([]);
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard/fulfillment');
      return;
    }
    fetchProducts();
    fetchCategories();
  }, [user]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Filter products based on search and category
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.categoryId === selectedCategory
      );
    }
    
    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?supplier=true');
      if (response.ok) {
        const data = await response.json();
        // Filter approved products only
        const approvedProducts = data.products.filter((product: Product) => 
          product.isApproved && !product.isRejected
        );
        setProducts(approvedProducts);
        setFilteredProducts(approvedProducts);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب المنتجات');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
    }
  };

  const addProduct = (product: Product) => {
    const existingProduct = selectedProducts.find(p => p.productId === product._id);
    if (existingProduct) {
      toast.error('هذا المنتج مضاف بالفعل');
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product._id,
        quantity: 1,
        currentStock: product.stockQuantity
      }
    ]);
    
    toast.success(`تم إضافة ${product.name} إلى الطلب`);
  };

  const removeProduct = (productId: string) => {
    const product = getProductById(productId);
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
    if (product) {
      toast.success(`تم إزالة ${product.name} من الطلب`);
    }
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      toast.error('الكمية يجب أن تكون 1 على الأقل');
      return;
    }
    
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, quantity } : p
    ));
  };

  const updateProductStock = (productId: string, currentStock: number) => {
    if (currentStock < 0) {
      toast.error('المخزون لا يمكن أن يكون سالب');
      return;
    }
    
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, currentStock } : p
    ));
  };

  const getSelectedProduct = (productId: string) => {
    return selectedProducts.find(p => p.productId === productId);
  };

  const getProductById = (productId: string) => {
    return products.find(p => p._id === productId);
  };

  const calculateTotalValue = () => {
    return selectedProducts.reduce((total, item) => {
      const product = getProductById(item.productId);
      return total + (product?.costPrice || 0) * item.quantity;
    }, 0);
  };

  const calculateTotalItems = () => {
    return selectedProducts.reduce((total, item) => total + item.quantity, 0);
  };

  const validateForm = () => {
    if (selectedProducts.length === 0) {
      toast.error('يجب إضافة منتج واحد على الأقل');
      return false;
    }

    for (const item of selectedProducts) {
      if (item.quantity < 1) {
        toast.error('جميع الكميات يجب أن تكون 1 على الأقل');
        return false;
      }
      if (item.currentStock < 0) {
        toast.error('جميع قيم المخزون يجب أن تكون 0 أو أكثر');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const response = await fetch('/api/fulfillment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: selectedProducts,
          notes,
          expectedDeliveryDate: expectedDeliveryDate || undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('تم إنشاء طلب التخزين بنجاح');
        router.push('/dashboard/fulfillment');
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء إنشاء طلب التخزين');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء طلب التخزين');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSelectedProducts([]);
    setNotes('');
    setExpectedDeliveryDate('');
    toast.success('تم مسح جميع البيانات');
  };

  if (user?.role !== 'supplier') {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">طلب تخزين جديد</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-slate-400 mt-1 sm:mt-2">
            أضف المنتجات المعتمدة التي تريد تخزينها في المستودع
          </p>
        </div>
        
        {selectedProducts.length > 0 && (
          <button
            onClick={clearAll}
            className="btn-secondary text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 min-h-[44px] text-sm sm:text-base px-3 sm:px-4 w-full sm:w-auto"
          >
            <X className="w-4 h-4 ml-1.5 sm:ml-2" />
            مسح الكل
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Products Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2 text-primary-600 dark:text-primary-400" />
              اختيار المنتجات المعتمدة
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1">
              اختر المنتجات المعتمدة من الإدارة لإضافتها إلى طلب التخزين
            </p>
          </div>
          
          {/* Search and Filter */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="البحث في المنتجات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 sm:pr-11 pl-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                <div className="relative flex-1 sm:flex-initial" ref={categoryDropdownRef}>
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 z-10" />
                  <input
                    type="text"
                    value={categorySearch || (selectedCategory !== 'all' ? categories.find(c => c._id === selectedCategory)?.name || '' : '')}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      if (e.target.value.trim()) {
                        setShowCategoryDropdown(true);
                      } else {
                        setSelectedCategory('all');
                        setShowCategoryDropdown(false);
                      }
                    }}
                    onFocus={() => {
                      if (categories.length > 0) {
                        setShowCategoryDropdown(true);
                      }
                    }}
                    onClick={() => {
                      if (categories.length > 0) {
                        setShowCategoryDropdown(true);
                      }
                    }}
                    placeholder="ابحث عن فئة أو اختر من القائمة..."
                    className="input-field text-sm sm:text-base min-h-[44px] pr-10"
                  />
                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('all');
                          setCategorySearch('');
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 ${
                          selectedCategory === 'all' ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
                        }`}
                      >
                        جميع الفئات
                      </button>
                      {categories
                        .filter(cat => !categorySearch || cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map((category) => (
                          <button
                            key={category._id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(category._id);
                              setCategorySearch(category.name);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 ${
                              selectedCategory === category._id ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Results Summary */}
            <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-slate-400">
              عرض {filteredProducts.length} من أصل {products.length} منتج
              {searchTerm && ` - نتائج البحث عن "${searchTerm}"`}
              {selectedCategory !== 'all' && ` - فئة محددة`}
            </div>
          </div>
          
          <div className="p-6">
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-slate-400 mt-2">جاري تحميل المنتجات...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">لا توجد منتجات معتمدة متاحة للتخزين</p>
                <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">
                  يجب أن تكون المنتجات معتمدة من الإدارة قبل إمكانية طلب تخزينها
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">لا توجد نتائج للبحث</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="btn-secondary mt-2"
                >
                  مسح الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.some(p => p.productId === product._id);
                  return (
                    <div
                      key={product._id}
                      className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98] ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                          : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-400'
                      }`}
                      onClick={() => !isSelected && addProduct(product)}
                    >
                      {product.images && product.images.length > 0 ? (
                        <OptimizedImage
                          src={product.images[0]}
                          alt={product.name}
                          width={256}
                          height={128}
                          className="w-full h-24 sm:h-32 object-cover rounded-md mb-2 sm:mb-3"
                        />
                      ) : (
                        <div className="w-full h-24 sm:h-32 bg-gray-100 dark:bg-slate-700 rounded-md mb-2 sm:mb-3 flex items-center justify-center">
                          <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-slate-500" />
                        </div>
                      )}
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2 line-clamp-2">
                        {product.name}
                      </h4>
                      <div className="text-xs sm:text-sm space-y-0.5 sm:space-y-1">
                        <p className="text-gray-700 dark:text-slate-300">
                          <span className="font-medium">سعر التكلفة:</span> {product.costPrice} ₪
                        </p>
                        <p className="text-gray-700 dark:text-slate-300">
                          <span className="font-medium">المخزون الحالي:</span> {product.stockQuantity} قطعة
                        </p>
                        {product.categoryName && (
                          <p className="text-gray-600 dark:text-slate-400">
                            <span className="font-medium">الفئة:</span> {product.categoryName}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-primary-100 dark:bg-primary-900/30 rounded-md border border-primary-200 dark:border-primary-700">
                          <p className="text-xs sm:text-sm text-primary-800 dark:text-primary-200 font-medium text-center flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                            تم اختيار هذا المنتج
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Products */}
        {selectedProducts.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2 text-primary-600 dark:text-primary-400" />
                المنتجات المختارة ({selectedProducts.length})
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {selectedProducts.map((item) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;

                  return (
                    <div key={item.productId} className="border-2 border-gray-200 dark:border-slate-600 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-slate-700">
                      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          {product.images && product.images.length > 0 ? (
                            <OptimizedImage
                              src={product.images[0]}
                              alt={product.name}
                              width={64}
                              height={64}
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 dark:bg-slate-600 rounded-md flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
                              {product.name}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                              سعر التكلفة: {product.costPrice} ₪
                            </p>
                            {product.categoryName && (
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-500">
                                {product.categoryName}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(item.productId)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center flex-shrink-0"
                          title="إزالة المنتج"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                            الكمية المطلوبة
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateProductQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                            المخزون الحالي
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.currentStock}
                            onChange={(e) => updateProductStock(item.productId, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-600">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600 dark:text-slate-400 font-medium">القيمة الإجمالية:</span>
                          <span className="font-bold text-primary-600 dark:text-primary-400">
                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.costPrice * item.quantity)} ₪
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Enhanced Summary */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
                <h4 className="text-sm sm:text-base font-semibold text-primary-900 dark:text-primary-100 mb-2 sm:mb-3 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                  ملخص الطلب
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">عدد المنتجات:</span>
                    <span className="font-bold text-gray-900 dark:text-slate-100">
                      {selectedProducts.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">إجمالي القطع:</span>
                    <span className="font-bold text-gray-900 dark:text-slate-100">
                      {calculateTotalItems()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">القيمة الإجمالية:</span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(calculateTotalValue())} ₪
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2 text-warning-600 dark:text-warning-400" />
              معلومات إضافية
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2 flex items-center">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                ملاحظات (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[88px]"
                placeholder="أضف أي ملاحظات أو تفاصيل إضافية حول طلب التخزين..."
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2 flex items-center">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                تاريخ التسليم المتوقع (اختياري)
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 space-y-2 sm:space-y-0 space-y-reverse sm:space-x-3 sm:space-x-reverse sticky bottom-0 bg-white dark:bg-slate-900 p-3 sm:p-4 -mx-3 sm:-mx-4 md:-mx-6 border-t border-gray-200 dark:border-slate-700 safe-area-bottom">
          <button
            type="button"
            onClick={() => router.push('/dashboard/fulfillment')}
            className="btn-secondary min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || selectedProducts.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-1.5 sm:ml-2"></div>
                جاري الإرسال...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
                إنشاء طلب التخزين
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmSubmit}
        title="تأكيد إنشاء طلب التخزين"
        message={`هل أنت متأكد من إنشاء طلب التخزين؟ سيتم إرسال الطلب إلى الإدارة للمراجعة والموافقة.

تفاصيل الطلب:
• عدد المنتجات: ${selectedProducts.length}
• إجمالي القطع: ${calculateTotalItems()}
• القيمة الإجمالية: ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(calculateTotalValue())} ₪`}
        confirmText="إنشاء الطلب"
        cancelText="إلغاء"
        type="success"
        loading={loading}
      />
    </div>
  );
} 