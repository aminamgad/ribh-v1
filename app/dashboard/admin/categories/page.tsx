'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, FolderOpen, Upload, X, Package, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { OptimizedImage } from '@/components/ui/LazyImage';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface Category {
  _id: string;
  name: string;
  nameEn: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive: boolean;
  order: number;
  slug: string;
  productCount?: number;
  subcategories?: Category[];
}

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    parentId: '',
    isActive: true,
    order: 0,
    image: '',
    images: [] as string[],
    icon: '',
    featured: false,
    showInMenu: true,
    showInHome: false,
    metaTitle: '',
    metaDescription: '',
    seoKeywords: [] as string[]
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Use cache hook for categories
  const { data: categoriesData, loading, refresh } = useDataCache<{ categories: Category[] }>({
    key: 'categories',
    fetchFn: async () => {
      // Fetch with tree structure and stats
      const response = await fetch('/api/categories?includeInactive=true&tree=true&withStats=true');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      
      // Transform categories
      const transformCategories = (cats: any[]): Category[] => {
        return cats.map(cat => ({
          _id: cat._id,
          name: cat.name,
          nameEn: cat.nameEn || '',
          description: cat.description,
          image: cat.image,
          parentId: cat.parentId?._id || cat.parentId || undefined,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          order: cat.order || 0,
          slug: cat.slug || '',
          productCount: cat.productCount || 0,
          subcategories: cat.subcategories && cat.subcategories.length > 0 
            ? transformCategories(cat.subcategories) 
            : undefined
        }));
      };
      
      if (data.categories && Array.isArray(data.categories)) {
        return { categories: transformCategories(data.categories) };
      } else {
        // Fallback: fetch without tree and build hierarchy manually
        const flatResponse = await fetch('/api/categories?includeInactive=true&withStats=true');
        if (flatResponse.ok) {
          const flatData = await flatResponse.json();
          const buildTree = (cats: any[]): Category[] => {
            const parentCats = cats.filter(c => !c.parentId);
            return parentCats.map(parent => ({
              ...parent,
              subcategories: cats
                .filter(c => c.parentId && String(c.parentId) === String(parent._id))
                .map(sub => {
                  const subTree = buildTree([sub]);
                  return subTree[0] || sub;
                })
            }));
          };
          return { categories: buildTree(flatData.categories || []) };
        }
      }
      throw new Error('Failed to fetch categories');
    },
    enabled: !!user && user.role === 'admin' && hasPermission(user, PERMISSIONS.CATEGORIES_MANAGE),
    forceRefresh: false,
    onError: () => {
      toast.error('حدث خطأ أثناء جلب الفئات');
    }
  });

  const categories = categoriesData?.categories || [];

  useEffect(() => {
    if (!user || user.role !== 'admin' || !hasPermission(user, PERMISSIONS.CATEGORIES_MANAGE)) {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      return;
    }
  }, [user]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-categories', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-categories', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchCategories for backward compatibility
  const fetchCategories = async () => {
    refresh();
  };

  const handleImageUpload = async () => {
    if (!imageFile) return formData.image;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', imageFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      } else {
        throw new Error('فشل رفع الصورة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الصورة');
      return formData.image;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const imageUrl = await handleImageUpload();
    const categoryData = {
      ...formData,
      image: imageUrl,
      order: parseInt(formData.order.toString())
    };

    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory._id}`
        : '/api/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (response.ok) {
        toast.success(editingCategory ? 'تم تحديث الفئة بنجاح' : 'تم إضافة الفئة بنجاح');
        resetForm();
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء حفظ الفئة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الفئة');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      nameEn: category.nameEn || '',
      description: category.description || '',
      parentId: category.parentId || '',
      isActive: category.isActive,
      order: category.order,
      image: category.image || '',
      images: (category as any).images || [],
      icon: (category as any).icon || '',
      featured: (category as any).featured || false,
      showInMenu: (category as any).showInMenu !== undefined ? (category as any).showInMenu : true,
      showInHome: (category as any).showInHome || false,
      metaTitle: (category as any).metaTitle || '',
      metaDescription: (category as any).metaDescription || '',
      seoKeywords: (category as any).seoKeywords || []
    });
    setImageFile(null); // Reset image file when editing
    setShowModal(true);
  };

  const handleDelete = async (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/categories/${categoryToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم حذف الفئة بنجاح');
        fetchCategories();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في حذف الفئة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الفئة');
    } finally {
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameEn: '',
      description: '',
      parentId: '',
      isActive: true,
      order: 0,
      image: '',
      images: [],
      icon: '',
      featured: false,
      showInMenu: true,
      showInHome: false,
      metaTitle: '',
      metaDescription: '',
      seoKeywords: []
    });
    setEditingCategory(null);
    setImageFile(null);
    setShowModal(false);
  };

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category);
    setLoadingProducts(true);
    
    try {
      const response = await fetch(`/api/products?category=${category._id}`);
      if (response.ok) {
        const data = await response.json();
        setCategoryProducts(data.products || []);
      } else {
        toast.error('حدث خطأ أثناء جلب منتجات الفئة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب منتجات الفئة');
    } finally {
      setLoadingProducts(false);
    }
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    
    return (
      <div key={category._id} className={`${level > 0 ? 'mr-4 sm:mr-8' : ''} mb-2`}>
        <div 
          className="card p-3 sm:p-4 hover:shadow-medium transition-shadow cursor-pointer active:scale-[0.98]"
          onClick={() => handleCategoryClick(category)}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse flex-1 min-w-0">
              {category.image ? (
                <OptimizedImage
                  src={category.image}
                  alt={category.name}
                  width={48}
                  height={48}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-slate-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
                  {category.name}
                  {category.nameEn && (
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mr-1 sm:mr-2">({category.nameEn})</span>
                  )}
                </h3>
                {category.description && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 line-clamp-1 mt-0.5 text-wrap-long">{category.description}</p>
                )}
                <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-1 flex-wrap gap-1 sm:gap-0">
                  <span>الترتيب: {category.order}</span>
                  <span className="flex items-center">
                    <Package className="w-3 h-3 ml-0.5 sm:ml-1" />
                    المنتجات: {category.productCount || 0}
                  </span>
                  <span className={`badge text-[10px] sm:text-xs ${category.isActive ? 'badge-success' : 'badge-secondary'}`}>
                    {category.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                  {(category as any).featured && (
                    <span className="badge badge-warning text-[10px] sm:text-xs">مميز</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 space-x-reverse flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/products?category=${category._id}`);
                }}
                className="p-1.5 sm:p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                title="عرض المنتجات"
              >
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(category);
                }}
                className="p-1.5 sm:p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                title="تعديل"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(category);
                }}
                className="p-1.5 sm:p-2 text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                title={category.productCount && category.productCount > 0 ? 'لا يمكن الحذف - الفئة تحتوي على منتجات' : 'حذف'}
                disabled={!!(category.productCount && category.productCount > 0)}
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {hasSubcategories && (
          <div className="mt-2">
            {category.subcategories!.map(sub => renderCategory(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">إدارة الفئات</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-slate-400 mt-1 sm:mt-2">إدارة فئات المنتجات وتنظيمها</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary min-h-[44px] text-sm sm:text-base px-3 sm:px-4 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
          إضافة فئة جديدة
        </button>
      </div>

      {/* Categories List or Products View */}
      {selectedCategory ? (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedCategory(null);
              setCategoryProducts([]);
            }}
            className="flex items-center text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 mb-3 sm:mb-4 min-h-[44px] text-sm sm:text-base"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
            العودة إلى الفئات
          </button>

          {/* Category Info */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse mb-3 sm:mb-4">
              {selectedCategory.image ? (
                <OptimizedImage
                  src={selectedCategory.image}
                  alt={selectedCategory.name}
                  width={64}
                  height={64}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-slate-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {selectedCategory.name}
                  {selectedCategory.nameEn && (
                    <span className="text-sm sm:text-base md:text-lg text-gray-500 dark:text-slate-400 mr-1 sm:mr-2">({selectedCategory.nameEn})</span>
                  )}
                </h2>
                {selectedCategory.description && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">{selectedCategory.description}</p>
                )}
                <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse mt-2 flex-wrap gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                    <Package className="w-3 h-3 sm:w-4 sm:h-4 inline ml-0.5 sm:ml-1" />
                    {selectedCategory.productCount || 0} منتج
                  </span>
                  <span className={`badge text-[10px] sm:text-xs ${selectedCategory.isActive ? 'badge-success' : 'badge-secondary'}`}>
                    {selectedCategory.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Products List */}
          {loadingProducts ? (
            <div className="flex items-center justify-center h-64">
              <div className="loading-spinner w-8 h-8"></div>
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="card text-center py-12">
              <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد منتجات</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                لا توجد منتجات في هذه الفئة حالياً
              </p>
              <button
                onClick={() => router.push(`/dashboard/products?category=${selectedCategory._id}`)}
                className="btn-primary"
              >
                <Package className="w-5 h-5 ml-2" />
                عرض جميع المنتجات
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  منتجات الفئة ({categoryProducts.length})
                </h3>
                <button
                  onClick={() => router.push(`/dashboard/products?category=${selectedCategory._id}`)}
                  className="btn-secondary"
                >
                  عرض الكل
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryProducts.slice(0, 6).map((product: any) => (
                  <div
                    key={product._id}
                    className="card p-4 hover:shadow-medium transition-shadow cursor-pointer"
                    onClick={() => router.push(`/dashboard/products/${product._id}`)}
                  >
                    {product.images && product.images.length > 0 ? (
                      <OptimizedImage
                        src={product.images[0]}
                        alt={product.name}
                        width={256}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-3">
                        <Package className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                      </div>
                    )}
                    <h4 className="font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 mb-2">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-primary-600 dark:text-primary-400 font-bold">
                        {product.marketerPrice} ₪
                      </span>
                      <span className={`badge ${product.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {product.isApproved ? 'معتمد' : 'قيد المراجعة'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {categoryProducts.length > 6 && (
                <div className="text-center">
                  <button
                    onClick={() => router.push(`/dashboard/products?category=${selectedCategory._id}`)}
                    className="btn-primary"
                  >
                    عرض جميع المنتجات ({categoryProducts.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {categories.length === 0 ? (
            <div className="card text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد فئات</h3>
              <p className="text-gray-600 dark:text-slate-400">لم تقم بإضافة أي فئات بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories
                .filter(cat => !cat.parentId)
                .sort((a, b) => a.order - b.order)
                .map(category => renderCategory(category))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 safe-area-inset">
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto mobile-modal-content">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100">
                {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-400 min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  اسم الفئة (عربي) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  اسم الفئة (إنجليزي)
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field text-sm sm:text-base min-h-[88px]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  الفئة الرئيسية
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                  disabled={!!editingCategory?.parentId}
                >
                  <option value="">بدون (فئة رئيسية)</option>
                  {categories
                    .filter(cat => !cat.parentId && cat._id !== editingCategory?._id)
                    .map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  الترتيب
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  صورة الفئة
                </label>
                {formData.image && !imageFile && (
                  <div className="mb-2">
                    <OptimizedImage
                      src={formData.image}
                      alt="Current"
                      width={80}
                      height={80}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs sm:text-sm text-gray-500 dark:text-slate-400 file:ml-2 sm:file:ml-4 file:py-2 file:px-3 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-900/30 file:text-primary-700 dark:file:text-primary-400 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50 min-h-[44px]"
                />
              </div>

              <div className="flex items-center min-h-[44px]">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 ml-2 w-4 h-4 sm:w-5 sm:h-5"
                />
                <label htmlFor="isActive" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                  فئة نشطة
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 space-y-2 sm:space-y-0 space-y-reverse sm:space-x-3 sm:space-x-reverse pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
                >
                  {uploading ? 'جاري الرفع...' : editingCategory ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="حذف الفئة"
        message={`هل أنت متأكد من حذف الفئة "${categoryToDelete?.name}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
} 