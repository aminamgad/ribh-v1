'use client';

import { useEffect, useState, useMemo, useTransition, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { useDataCache as useDataCacheContext } from '@/components/providers/DataCacheProvider';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ShoppingCart, 
  Heart, 
  CheckCircle, 
  XCircle,
  RotateCw,
  AlertCircle,
  Save,
  BarChart3,
  Lock,
  Unlock,
  Sparkles,
  TrendingUp,
  Home,
  Heart as HeartIcon,
  Zap,
  Gamepad2,
  ArrowLeft,
  Clock,
  Inbox
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import SearchFilters from '@/components/search/SearchFilters';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import { useRouter } from 'next/navigation';
import ProductSection from '@/components/products/ProductSection';
import AdminProductsTableView from '@/components/products/AdminProductsTableView';

interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  marketerPrice: number;
  wholesalerPrice: number;
  stockQuantity: number;
  isActive: boolean;
  isApproved: boolean;
  isFulfilled: boolean;
  categoryId: string;
  supplierId: string;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
  tags: string[];
  categoryName?: string;
  supplierName?: string;
  sales?: number;
  rating?: number;
  isRejected?: boolean;
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const [urlQueryString, setUrlQueryString] = useState(() => 
    typeof window !== 'undefined' ? window.location.search.substring(1) : ''
  );
  const { refreshData } = useDataCacheContext();
  const [isPending, startTransition] = useTransition();
  const cacheKeyRef = useRef<string>('');
  const previousQueryRef = useRef<string>('');
  
  // Sync with actual URL changes from popstate events and custom events
  useEffect(() => {
    let isUpdating = false; // Flag to prevent infinite loops
    
    const handleUrlChange = (e?: Event) => {
      if (isUpdating || typeof window === 'undefined') return;
      
      // Get query from event detail if available, otherwise from window.location
      let newQuery: string;
      if (e && 'detail' in e && (e as any).detail?.query !== undefined) {
        newQuery = (e as any).detail.query || '';
      } else {
        newQuery = window.location.search.substring(1);
      }
      
      // Only update if query actually changed
      if (urlQueryString !== newQuery) {
        previousQueryRef.current = urlQueryString;
        // Use startTransition to mark state update as non-urgent, preventing full page re-render
        startTransition(() => {
          setUrlQueryString(newQuery);
        });
        // Reset flag immediately (no delay)
        isUpdating = false;
      }
    };
    
    // Check on mount
    if (typeof window !== 'undefined') {
      handleUrlChange();
    }
    
    // Listen to popstate events (when URL changes via history API)
    window.addEventListener('popstate', handleUrlChange);
    
    // Listen to custom urlchange events - prioritize these over popstate
    const handleUrlChangeEvent = (e: Event) => {
      // Always use detail.query from custom event if available
      if (e && 'detail' in e && (e as any).detail?.query !== undefined) {
        const newQuery = (e as any).detail.query || '';
        // Update immediately for instant response (no startTransition delay)
        // This ensures filters respond instantly when changed
        setUrlQueryString((prev) => {
          if (prev !== newQuery) {
            return newQuery;
          }
          return prev;
        });
      } else {
        handleUrlChange(e);
      }
    };
    
    window.addEventListener('urlchange', handleUrlChangeEvent);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('urlchange', handleUrlChangeEvent);
    };
  }, []); // Remove startTransition from dependencies
  
  // Use URL query string directly - no need for searchParams which causes re-renders
  // This is synchronous - no delay
  const queryString = urlQueryString || '';
  
  // Generate cache key based on query string - synchronous calculation
  // This updates immediately when queryString changes
  const cacheKey = useMemo(() => {
    const newKey = `products_${queryString || 'default'}`;
    if (cacheKeyRef.current !== newKey) {
      console.log('Cache key changed:', {
        oldKey: cacheKeyRef.current,
        newKey,
        queryString,
        hasSuppliers: queryString.includes('suppliers')
      });
      cacheKeyRef.current = newKey;
    }
    return newKey;
  }, [queryString]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Locking states
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [lockAction, setLockAction] = useState<'lock' | 'unlock' | null>(null);
  const [locking, setLocking] = useState(false);
  
  // Quick edit states
  const [quickEditData, setQuickEditData] = useState({
    name: '',
    marketerPrice: 0,
    wholesalerPrice: 0,
    stockQuantity: 0,
    minimumSellingPrice: 0,
    isMinimumPriceMandatory: false
  });

  // View mode for admin (list/grid)
  const [adminViewMode, setAdminViewMode] = useState<'list' | 'grid'>('list');

  const router = useRouter();

  // Use cache hook for product sections (only for marketer when no filters)
  const { data: sectionsData, loading: sectionsLoading, refresh: refreshSections } = useDataCache<{
    newArrivals: Product[];
    bestSellers: Product[];
    gardenHome: Product[];
    healthBeauty: Product[];
    electronics: Product[];
    games: Product[];
  }>({
    key: 'product_sections',
    fetchFn: async () => {
      // Fetch all sections in parallel
      const [newArrivalsRes, bestSellersRes, categoriesRes] = await Promise.all([
        fetch('/api/products?limit=8'),
        fetch('/api/products?limit=20'), // Get more to sort by sales
        fetch('/api/categories?active=true')
      ]);

      const [newArrivalsData, bestSellersData, categoriesData] = await Promise.all([
        newArrivalsRes.ok ? newArrivalsRes.json() : { products: [] },
        bestSellersRes.ok ? bestSellersRes.json() : { products: [] },
        categoriesRes.ok ? categoriesRes.json() : { categories: [] }
      ]);

      // Sort new arrivals by createdAt (newest first)
      const newArrivals = (newArrivalsData.products || [])
        .filter((p: Product) => p.isApproved && !p.isRejected && !p.isLocked)
        .sort((a: Product, b: Product) => {
          const dateA = new Date((a as any).createdAt || 0).getTime();
          const dateB = new Date((b as any).createdAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 8);

      // Sort best sellers by sales (highest first)
      const bestSellers = (bestSellersData.products || [])
        .filter((p: Product) => p.isApproved && !p.isRejected && !p.isLocked)
        .sort((a: Product, b: Product) => (b.sales || 0) - (a.sales || 0))
        .slice(0, 8);

      // Find category IDs by name
      const categories = categoriesData.categories || [];
      const gardenHomeCat = categories.find((c: any) => 
        c.name?.includes('حديقة') || c.name?.includes('منزل') || c.nameEn?.toLowerCase().includes('garden') || c.nameEn?.toLowerCase().includes('home')
      );
      const healthBeautyCat = categories.find((c: any) => 
        c.name?.includes('صحة') || c.name?.includes('جمال') || c.nameEn?.toLowerCase().includes('health') || c.nameEn?.toLowerCase().includes('beauty')
      );
      const electronicsCat = categories.find((c: any) => 
        c.name?.includes('إلكترون') || c.nameEn?.toLowerCase().includes('electronic')
      );
      const gamesCat = categories.find((c: any) => 
        c.name?.includes('لعبة') || c.name?.includes('ألعاب') || c.nameEn?.toLowerCase().includes('game')
      );

      // Fetch products by category
      const categoryPromises = [];
      if (gardenHomeCat) {
        categoryPromises.push(
          fetch(`/api/products?category=${gardenHomeCat._id}&limit=8`).then(r => r.ok ? r.json() : { products: [] })
        );
      } else {
        categoryPromises.push(Promise.resolve({ products: [] }));
      }

      if (healthBeautyCat) {
        categoryPromises.push(
          fetch(`/api/products?category=${healthBeautyCat._id}&limit=8`).then(r => r.ok ? r.json() : { products: [] })
        );
      } else {
        categoryPromises.push(Promise.resolve({ products: [] }));
      }

      if (electronicsCat) {
        categoryPromises.push(
          fetch(`/api/products?category=${electronicsCat._id}&limit=8`).then(r => r.ok ? r.json() : { products: [] })
        );
      } else {
        categoryPromises.push(Promise.resolve({ products: [] }));
      }

      if (gamesCat) {
        categoryPromises.push(
          fetch(`/api/products?category=${gamesCat._id}&limit=8`).then(r => r.ok ? r.json() : { products: [] })
        );
      } else {
        categoryPromises.push(Promise.resolve({ products: [] }));
      }

      const [gardenHomeData, healthBeautyData, electronicsData, gamesData] = await Promise.all(categoryPromises);

      // Filter and limit category products
      const filterApproved = (products: Product[]) => 
        products.filter((p: Product) => p.isApproved && !p.isRejected && !p.isLocked).slice(0, 8);

      return {
        newArrivals: newArrivals,
        bestSellers: bestSellers,
        gardenHome: filterApproved(gardenHomeData.products || []),
        healthBeauty: filterApproved(healthBeautyData.products || []),
        electronics: filterApproved(electronicsData.products || []),
        games: filterApproved(gamesData.products || [])
      };
    },
    enabled: !!user && user.role === 'marketer' && !queryString,
    forceRefresh: false
  });

  const productSections = sectionsData || {
    newArrivals: [],
    bestSellers: [],
    gardenHome: [],
    healthBeauty: [],
    electronics: [],
    games: []
  };

  // Fetch function - use useCallback to ensure it uses latest queryString
  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams(queryString);
    const hasAdminFilters =
      params.has('stockStatus') ||
      params.has('suppliers') ||
      params.has('startDate') ||
      params.has('endDate');
    const endpoint =
      (hasAdminFilters || user?.role === 'admin')
        ? (queryString ? `/api/products?${queryString}` : '/api/products')
        : queryString
          ? `/api/search?${queryString}`
          : '/api/products';
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    const data = await response.json();
    return data;
  }, [queryString, user?.role]);

  // Use cache hook for products
  const { data: productsData, loading, refresh } = useDataCache<{ products: Product[]; pagination?: any }>({
    key: cacheKey,
    fetchFn: fetchProducts,
    enabled: !!user,
    forceRefresh: false
  });

  const products = productsData?.products || [];
  
  
  useEffect(() => {
    if (productsData?.pagination) {
      setPagination(productsData.pagination);
    }
  }, [productsData]);

  // Listen for refresh events from header button
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      refreshSections();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-products', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-products', handleRefresh);
    };
  }, [refresh, refreshSections]);

  // Keep fetchProductSections for backward compatibility
  const fetchProductSections = async () => {
    refreshSections();
  };


  // Handle search callback - memoize to prevent re-creating on every render
  // Empty function to prevent unnecessary re-renders of SearchFilters
  const handleSearch = useCallback(() => {
    // Filters apply automatically via urlchange event, no need to do anything here
    // This callback is kept for backward compatibility
  }, []);

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف المنتج بنجاح');
        refresh();
      } else {
        toast.error('فشل في حذف المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المنتج');
    } finally {
      setProcessing(false);
      setShowDeleteModal(false);
      setSelectedProduct(null);
    }
  };

  const handleQuickEdit = (product: Product) => {
    setSelectedProduct(product);
    setQuickEditData({
      name: product.name,
      marketerPrice: product.marketerPrice,
      wholesalerPrice: product.wholesalerPrice || 0,
      stockQuantity: product.stockQuantity,
      minimumSellingPrice: product.minimumSellingPrice || 0,
      isMinimumPriceMandatory: product.isMinimumPriceMandatory || false
    });
    setShowQuickEditModal(true);
  };

  const handleQuickEditSave = async () => {
    if (!selectedProduct) return;
    
    // Validation
    if (!quickEditData.name.trim()) {
      toast.error('اسم المنتج مطلوب');
      return;
    }
    
    if (quickEditData.marketerPrice <= 0) {
      toast.error('سعر المسوق يجب أن يكون أكبر من 0');
      return;
    }
    
    if (quickEditData.wholesalerPrice <= 0) {
      toast.error('سعر الجملة يجب أن يكون أكبر من 0');
      return;
    }
    
    if (quickEditData.wholesalerPrice >= quickEditData.marketerPrice) {
      toast.error('سعر الجملة يجب أن يكون أقل من سعر المسوق');
      return;
    }
    
    if (quickEditData.minimumSellingPrice > 0 && quickEditData.marketerPrice < quickEditData.minimumSellingPrice) {
      toast.error('سعر المسوق يجب أن يكون أكبر من أو يساوي السعر الأدنى للبيع');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quickEditData),
      });

      if (response.ok) {
        toast.success('تم تحديث المنتج بنجاح');
        refresh();
        setShowQuickEditModal(false);
        setSelectedProduct(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في تحديث المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث المنتج');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleFavorite = async (product: Product) => {
    if (isFavorite(product._id)) {
      await removeFromFavorites(product._id);
    } else {
      await addToFavorites(product as any);
    }
  };

  const handleLockProduct = (product: Product, action: 'lock' | 'unlock') => {
    setSelectedProduct(product);
    setLockAction(action);
    setLockReason('');
    setShowLockModal(true);
  };

  const confirmLock = async () => {
    if (!selectedProduct) return;
    
    try {
      setLocking(true);
      
      const response = await fetch(`/api/products/${selectedProduct._id}/lock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isLocked: lockAction === 'lock',
          lockReason: lockAction === 'lock' ? lockReason : undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        refresh(); // Refresh products list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في قفل/إلغاء قفل المنتج');
      }
    } catch (error) {
      console.error('Error locking/unlocking product:', error);
      toast.error('حدث خطأ أثناء قفل/إلغاء قفل المنتج');
    } finally {
      setLocking(false);
      setShowLockModal(false);
      setLockReason('');
      setLockAction(null);
      setSelectedProduct(null);
    }
  };

  const canLockProduct = (product: Product) => {
    if (!user) return false;
    return user.role === 'admin' || 
           (user.role === 'supplier' && product.supplierId === user._id);
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!product.isApproved) {
      toast.error('المنتج غير معتمد بعد');
      return;
    }

    if (product.stockQuantity <= 0) {
      toast.error('المنتج غير متوفر في المخزون حالياً');
      return;
    }

    try {
      // استخدام المنتج الأصلي بدلاً من إنشاء كائن جديد
      addToCart(product as any);
      
      // إشعار واحد فقط
      toast.success(`تم إضافة ${product.name} إلى السلة بنجاح`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج إلى السلة');
    }
  };

  const handleApproveProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowApproveModal(true);
    }
  };

  const confirmApprove = async () => {
    if (!selectedProduct) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: [selectedProduct._id],
          action: 'approve',
          adminNotes: 'تمت الموافقة من لوحة التحكم'
        }),
      });

      if (response.ok) {
        toast.success('تمت الموافقة على المنتج بنجاح');
        
        // Add a small delay to ensure database is updated
        setTimeout(() => {
          refresh();
        }, 500);
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في الموافقة على المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الموافقة على المنتج');
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
      setSelectedProduct(null);
    }
  };

  const handleRejectProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowRejectModal(true);
    }
  };

  const confirmReject = async () => {
    if (!selectedProduct || !rejectionReason.trim()) {
      toast.error('يرجى إدخال سبب الرفض');
      return;
    }
    
    console.log('🚫 Starting rejection process for:', {
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      currentStatus: {
        isApproved: selectedProduct.isApproved,
        isRejected: selectedProduct.isRejected
      },
      rejectionReason: rejectionReason.trim()
    });
    
    setProcessing(true);
    try {
      console.log('🚫 Rejecting product:', {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        rejectionReason: rejectionReason.trim()
      });

      const requestBody = {
        productIds: [selectedProduct._id],
        action: 'reject',
        rejectionReason: rejectionReason.trim()
      };
      
      console.log('📤 Sending request body:', requestBody);

      const response = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Rejection result:', result);
        toast.success('تم رفض المنتج بنجاح');
        
        // Add a small delay to ensure database is updated
        setTimeout(() => {
          console.log('🔄 Refreshing products after rejection...');
          refresh();
        }, 500);
      } else {
        const error = await response.json();
        console.error('❌ Rejection error:', error);
        toast.error(error.message || 'فشل في رفض المنتج');
      }
    } catch (error) {
      console.error('❌ Rejection exception:', error);
      toast.error('حدث خطأ أثناء رفض المنتج');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
      setSelectedProduct(null);
      setRejectionReason('');
    }
  };

  const handleResubmitProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowResubmitModal(true);
    }
  };

  const confirmResubmit = async () => {
    if (!selectedProduct) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRejected: false,
          rejectionReason: undefined,
          rejectedAt: undefined,
          rejectedBy: undefined
        }),
      });

      if (response.ok) {
        toast.success('تم إعادة تقديم المنتج بنجاح');
        refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في إعادة تقديم المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إعادة تقديم المنتج');
    } finally {
      setProcessing(false);
      setShowResubmitModal(false);
      setSelectedProduct(null);
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'إدارة المنتجات';
      case 'supplier':
        return 'منتجاتي';
      case 'marketer':
        return 'منتجات متاحة للبيع';
      case 'wholesaler':
        return 'منتجات الجملة';
      default:
        return 'المنتجات';
    }
  };

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'supplier':
        return 'إدارة منتجاتك وإضافة منتجات جديدة';
      case 'admin':
        return 'إدارة جميع المنتجات في المنصة';
      case 'marketer':
        return 'تصفح المنتجات المعتمدة وأضفها للسلة لإنشاء طلبات للعملاء';
      case 'wholesaler':
        return 'تصفح المنتجات المتاحة للطلب بالجملة';
      default:
        return '';
    }
  };
  
  const getRoleDescriptionMobile = () => {
    switch (user?.role) {
      case 'supplier':
        return 'إدارة منتجاتك وإضافة منتجات جديدة';
      case 'admin':
        return 'إدارة جميع المنتجات في المنصة';
      case 'marketer':
        return (
          <>
            <span className="block sm:inline">تصفح المنتجات المعتمدة</span>
            <span className="block sm:inline">وأضفها للسلة لإنشاء طلبات للعملاء</span>
          </>
        );
      case 'wholesaler':
        return 'تصفح المنتجات المتاحة للطلب بالجملة';
      default:
        return '';
    }
  };

  // Don't block entire page on loading - show loading indicator inline instead
  // This prevents SearchFilters from being unmounted and losing its state

  return (
    <div className="space-y-6">
      {/* Header - Enhanced for Marketer */}
      <div className={`${user?.role === 'marketer' ? 'bg-gradient-to-r from-[#FF9800] to-[#F57C00] rounded-xl p-6 text-white shadow-lg' : ''}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold ${user?.role === 'marketer' ? 'text-white' : 'text-gray-900 dark:text-slate-100'}`}>
              {getRoleTitle()}
            </h1>
            <p className={`mt-2 text-sm sm:text-base ${user?.role === 'marketer' ? 'text-white/90' : 'text-gray-600 dark:text-slate-400'} text-wrap-long`}>
              {user?.role === 'marketer' ? getRoleDescriptionMobile() : getRoleDescription()}
            </p>
          </div>

          {(user?.role === 'supplier' || user?.role === 'admin') && (
            <Link href="/dashboard/products/new" className="btn-primary">
              <Plus className="w-5 h-5 ml-2" />
              إضافة منتج جديد
            </Link>
          )}
          
          {user?.role === 'marketer' && (
            <div className="flex items-center space-x-3 space-x-reverse">
              <Link href="/dashboard/cart" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
                <ShoppingCart className="w-5 h-5 ml-2" />
                سلة التسوق
              </Link>
              <Link href="/dashboard/favorites" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
                <Heart className="w-5 h-5 ml-2" />
                المفضلة
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <SearchFilters onSearch={handleSearch} />

      {/* Product Sections for Marketer - Only show when no filters/search */}
      {user?.role === 'marketer' && !queryString && (
        <div className="space-y-8">
          {sectionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner w-8 h-8"></div>
              <span className="mr-3 text-gray-600 dark:text-slate-400">جاري تحميل الأقسام...</span>
            </div>
          ) : (
            <>
              {/* New Arrivals Section */}
              <ProductSection
                title="المضافة حديثاً"
                icon={<Sparkles className="w-6 h-6" />}
                products={productSections.newArrivals}
                onViewAll={() => router.push('/dashboard/products?sortBy=createdAt&sortOrder=desc')}
                onProductClick={(product) => router.push(`/dashboard/products/${product._id}`)}
                onAddToCart={(product: any) => handleAddToCart(product)}
                onToggleFavorite={(product: any) => handleToggleFavorite(product)}
                isFavorite={isFavorite}
              />

              {/* Best Sellers Section */}
              <ProductSection
                title="الأكثر مبيعاً"
                icon={<TrendingUp className="w-6 h-6" />}
                products={productSections.bestSellers}
                onViewAll={() => router.push('/dashboard/products?sortBy=sales&sortOrder=desc')}
                onProductClick={(product) => router.push(`/dashboard/products/${product._id}`)}
                onAddToCart={(product: any) => handleAddToCart(product)}
                onToggleFavorite={(product: any) => handleToggleFavorite(product)}
                isFavorite={isFavorite}
              />

              {/* Garden & Home Section */}
              <ProductSection
                title="الحديقة والمنزل"
                icon={<Home className="w-6 h-6" />}
                products={productSections.gardenHome}
                onViewAll={() => {
                  const cat = productSections.gardenHome[0]?.categoryId;
                  if (cat) router.push(`/dashboard/products?category=${cat}`);
                  else router.push('/dashboard/products');
                }}
                onProductClick={(product) => router.push(`/dashboard/products/${product._id}`)}
                onAddToCart={(product: any) => handleAddToCart(product)}
                onToggleFavorite={(product: any) => handleToggleFavorite(product)}
                isFavorite={isFavorite}
              />

              {/* Health & Beauty Section */}
              <ProductSection
                title="الصحة والجمال"
                icon={<HeartIcon className="w-6 h-6" />}
                products={productSections.healthBeauty}
                onViewAll={() => {
                  const cat = productSections.healthBeauty[0]?.categoryId;
                  if (cat) router.push(`/dashboard/products?category=${cat}`);
                  else router.push('/dashboard/products');
                }}
                onProductClick={(product) => router.push(`/dashboard/products/${product._id}`)}
                onAddToCart={(product: any) => handleAddToCart(product)}
                onToggleFavorite={(product: any) => handleToggleFavorite(product)}
                isFavorite={isFavorite}
              />

              {/* Electronics Section */}
              <ProductSection
                title="إلكترونيات"
                icon={<Zap className="w-6 h-6" />}
                products={productSections.electronics}
                onViewAll={() => {
                  const cat = productSections.electronics[0]?.categoryId;
                  if (cat) router.push(`/dashboard/products?category=${cat}`);
                  else router.push('/dashboard/products');
                }}
                onProductClick={(product) => router.push(`/dashboard/products/${product._id}`)}
                onAddToCart={(product: any) => handleAddToCart(product)}
                onToggleFavorite={(product: any) => handleToggleFavorite(product)}
                isFavorite={isFavorite}
              />

              {/* Games Section */}
              <ProductSection
                title="ألعاب"
                icon={<Gamepad2 className="w-6 h-6" />}
                products={productSections.games}
                onViewAll={() => {
                  const cat = productSections.games[0]?.categoryId;
                  if (cat) router.push(`/dashboard/products?category=${cat}`);
                  else router.push('/dashboard/products');
                }}
                onProductClick={(product) => router.push(`/dashboard/products/${product._id}`)}
                onAddToCart={(product: any) => handleAddToCart(product)}
                onToggleFavorite={(product: any) => handleToggleFavorite(product)}
                isFavorite={isFavorite}
              />
            </>
          )}
        </div>
      )}

      {/* Products Display - Admin uses table/list view, others use grid */}
      {loading && !productsData ? (
        // Show loading spinner inline when first loading (but keep filters visible)
        <div className="flex items-center justify-center py-12">
          <div className="loading-spinner w-8 h-8"></div>
          <span className="mr-3 text-gray-600 dark:text-slate-400">جاري تحميل المنتجات...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد منتجات</h3>
          <p className="text-gray-600 dark:text-slate-400">
            {queryString 
              ? 'لا توجد نتائج مطابقة لبحثك'
              : user?.role === 'supplier'
                ? 'لم تقم بإضافة أي منتجات بعد. ابدأ بإضافة منتجك الأول!'
                : user?.role === 'marketer'
                ? 'لا توجد منتجات معتمدة متاحة حالياً.'
                : 'لا توجد منتجات متاحة حالياً.'
            }
          </p>
          {user?.role === 'supplier' && !queryString && (
            <Link href="/dashboard/products/new" className="btn-primary mt-4">
              <Plus className="w-5 h-5 ml-2" />
              إضافة منتج جديد
            </Link>
          )}
        </div>
      ) : user?.role === 'admin' ? (
        // Admin Table/List View - show loading indicator when loading new data
        <>
          {loading && productsData && (
            <div className="mb-4 flex items-center justify-center py-4">
              <div className="loading-spinner w-6 h-6"></div>
              <span className="mr-2 text-sm text-gray-600 dark:text-slate-400">جاري تحديث القائمة...</span>
            </div>
          )}
          <AdminProductsTableView
            products={products}
            onApprove={handleApproveProduct}
            onReject={handleRejectProduct}
            viewMode={adminViewMode}
            onViewModeChange={setAdminViewMode}
          />
        </>
      ) : (
        <>
          {/* Show loading indicator when loading new data but keep previous data visible */}
          {loading && productsData && (
            <div className="mb-4 flex items-center justify-center py-4">
              <div className="loading-spinner w-6 h-6"></div>
              <span className="mr-2 text-sm text-gray-600 dark:text-slate-400">جاري تحديث القائمة...</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {products.map((product) => (
              <div 
                key={product._id} 
                className="card hover:shadow-medium transition-all duration-200 relative cursor-pointer active:scale-[0.98]"
                onClick={() => router.push(`/dashboard/products/${product._id}`)}
              >
                {/* Favorite button for marketers/wholesalers */}
                {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(product);
                    }}
                    className="absolute top-2 left-2 p-2 sm:p-2.5 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-shadow z-10 flex items-center justify-center min-w-[44px] min-h-[44px]"
                  >
                    <Heart 
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${
                        isFavorite(product._id) 
                          ? 'text-danger-600 dark:text-danger-400 fill-current' 
                          : 'text-gray-400 dark:text-slate-500 hover:text-danger-600 dark:hover:text-danger-400'
                      }`} 
                    />
                  </button>
                )}

                                 {/* Product Media */}
                 <div className="relative mb-3 sm:mb-4 md:mb-6">
                   <MediaThumbnail
                     media={product.images || []}
                     alt={product.name}
                     className="w-full aspect-square"
                     showTypeBadge={true}
                     priority={products.indexOf(product) < 8} // Priority for first 8 visible products
                     width={300}
                     height={300}
                     fallbackIcon={<Package className="w-12 h-12 text-gray-400 dark:text-slate-500" />}
                   />
                   
                   {/* Quick Edit Overlay for Suppliers */}
                   {user?.role === 'supplier' && (
                     <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleQuickEdit(product);
                         }}
                         className="bg-white dark:bg-slate-800 text-[#FF9800] dark:text-[#FF9800] px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 space-x-reverse min-h-[44px]"
                       >
                         <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                         <span className="text-xs sm:text-sm font-medium">تعديل سريع</span>
                       </button>
                     </div>
                   )}
                 </div>

                {/* Product Info */}
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">{product.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 line-clamp-2 hidden sm:block text-wrap-long">{product.description}</p>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-base sm:text-lg md:text-xl font-bold text-primary-600 dark:text-primary-400">
                        {user?.role === 'wholesaler' ? product.wholesalerPrice : product.marketerPrice} ₪
                      </p>
                      {user?.role === 'marketer' && product.minimumSellingPrice && (
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                          السعر الأدنى: {product.minimumSellingPrice} ₪
                        </p>
                      )}
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 space-x-reverse mt-1.5 sm:mt-2">
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                          product.stockQuantity > 10 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : product.stockQuantity > 0 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {product.stockQuantity > 0 ? `متوفر (${product.stockQuantity})` : 'غير متوفر'}
                        </span>
                         
                         {/* Quick Edit Indicator for Suppliers */}
                         {user?.role === 'supplier' && (
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleQuickEdit(product);
                             }}
                             className="text-[10px] sm:text-xs text-[#FF9800] dark:text-[#FF9800] hover:text-[#F57C00] dark:hover:text-[#F57C00] font-medium px-1.5 py-0.5 min-h-[28px]"
                             title="تعديل سريع"
                           >
                             ✏️ تعديل
                           </button>
                         )}
                       </div>
                     </div>

                     <div className="flex items-center space-x-1 space-x-reverse">
                       {(() => {
                         // لا تظهر شارة "معتمد" للمسوق
                         if (user?.role === 'marketer') {
                           return null;
                         }
                         
                         console.log('🎯 Product status check:', {
                           id: product._id,
                           name: product.name,
                           isApproved: product.isApproved,
                           isRejected: product.isRejected,
                           status: product.isApproved ? 'معتمد' : product.isRejected ? 'مرفوض' : 'قيد المراجعة'
                         });
                         
                         if (product.isApproved) {
                           return <span className="badge badge-success">معتمد</span>;
                         } else if (product.isRejected) {
                           return <span className="badge badge-danger">مرفوض</span>;
                         } else {
                           return <span className="badge badge-warning">قيد المراجعة</span>;
                         }
                       })()}
                       {product.isLocked && (
                         <span className="badge badge-danger">
                           <Lock className="w-3 h-3 ml-1" />
                           مقفل
                         </span>
                       )}
                     </div>
                   </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 dark:border-slate-700 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/products/${product._id}`);
                      }}
                      className="text-primary-600 dark:text-primary-400 text-xs sm:text-sm font-medium flex items-center min-h-[36px] sm:min-h-[40px] px-2 sm:px-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      <span className="hidden sm:inline">عرض</span>
                    </button>

                    {/* Actions for Marketer/Wholesaler */}
                    {(user?.role === 'marketer' || user?.role === 'wholesaler') && product.isApproved && !product.isLocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        className={`text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center justify-center min-h-[36px] sm:min-h-[44px] flex-1 ${
                          product.stockQuantity > 0 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md hover:shadow-lg active:scale-95' 
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        title={product.stockQuantity > 0 ? 'إضافة للسلة' : 'غير متوفر في المخزون'}
                        disabled={product.stockQuantity <= 0}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 flex-shrink-0" />
                        <span className="truncate">{product.stockQuantity > 0 ? 'إضافة للسلة' : 'غير متوفر'}</span>
                      </button>
                    )}

                                         {/* Actions for Supplier/Admin */}
                     {(user?.role === 'supplier' || user?.role === 'admin') && (
                       <div className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse">
                         <Link
                           href={`/dashboard/products/${product._id}/edit`}
                           className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                           title="تعديل كامل"
                           onClick={(e) => e.stopPropagation()}
                         >
                           <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                         </Link>
                        
                        {user?.role === 'admin' && !product.isApproved && !product.isRejected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveProduct(product._id);
                            }}
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 p-2 sm:p-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="اعتماد المنتج"
                          >
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                        
                        {user?.role === 'admin' && !product.isApproved && !product.isRejected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectProduct(product._id);
                            }}
                            className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 p-2 sm:p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="رفض المنتج"
                          >
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                        
                        {user?.role === 'admin' && product.isRejected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResubmitProduct(product._id);
                            }}
                            className="text-[#FF9800] dark:text-[#FF9800] hover:text-[#F57C00] dark:hover:text-[#F57C00] p-2 sm:p-2.5 rounded-lg hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="إعادة تقديم"
                          >
                            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                        
                        {user?.role === 'admin' && (
                          <Link
                            href={`/dashboard/admin/product-stats?productId=${product._id}`}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-2 sm:p-2.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="عرض الإحصائيات"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Link>
                        )}
                        
                        {/* Lock/Unlock Product Button */}
                        {canLockProduct(product) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLockProduct(product, product.isLocked ? 'unlock' : 'lock');
                            }}
                            className={`${
                              product.isLocked 
                                ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300' 
                                : 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                            }`}
                            title={product.isLocked ? 'إلغاء قفل المنتج' : 'قفل المنتج'}
                          >
                            {product.isLocked ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product._id);
                          }}
                          className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
                          title="حذف المنتج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stock Status for Marketer/Wholesaler */}
                  {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                    <div className="mt-2">
                      {product.stockQuantity > 0 ? (
                        <div className="flex items-center text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4 ml-1" />
                          متوفر ({product.stockQuantity} قطعة)
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4 ml-1" />
                          نفذ المخزون
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-2 space-x-reverse mt-8">
              <button
                onClick={() => {
                  const params = new URLSearchParams(queryString);
                  params.set('page', (pagination.page - 1).toString());
                  const newQuery = params.toString();
                  const newUrl = `/dashboard/products${newQuery ? `?${newQuery}` : ''}`;
                  
                  // Update URL without page reload
                  if (typeof window !== 'undefined') {
                    const newState = { ...window.history.state, as: newUrl, url: newUrl };
                    window.history.replaceState(newState, '', newUrl);
                    
                    // Update local state - no need for startTransition, urlQueryString update will trigger cache refresh
                    setUrlQueryString(newQuery);
                    
                    // Trigger events for other listeners
                    const popStateEvent = new PopStateEvent('popstate', { state: newState });
                    window.dispatchEvent(popStateEvent);
                    window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: newQuery } }));
                  }
                }}
                disabled={pagination.page === 1}
                className="btn-secondary"
              >
                السابق
              </button>
              
              <span className="text-sm text-gray-600 dark:text-slate-400">
                صفحة {pagination.page} من {pagination.pages}
              </span>
              
              <button
                onClick={() => {
                  const params = new URLSearchParams(queryString);
                  params.set('page', (pagination.page + 1).toString());
                  const newQuery = params.toString();
                  const newUrl = `/dashboard/products${newQuery ? `?${newQuery}` : ''}`;
                  
                  // Update URL without page reload
                  if (typeof window !== 'undefined') {
                    const newState = { ...window.history.state, as: newUrl, url: newUrl };
                    window.history.replaceState(newState, '', newUrl);
                    
                    // Update local state - no need for startTransition, urlQueryString update will trigger cache refresh
                    setUrlQueryString(newQuery);
                    
                    // Trigger events for other listeners
                    const popStateEvent = new PopStateEvent('popstate', { state: newState });
                    window.dispatchEvent(popStateEvent);
                    window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: newQuery } }));
                  }
                }}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}

                           {/* Stats - لا تظهر للمسوق */}
          {user?.role !== 'marketer' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* إجمالي المنتجات المعتمدة */}
              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">إجمالي المنتجات</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{pagination.total || products.length}</p>
                  </div>
                </div>
              </div>

              {/* المنتجات المتوفرة */}
              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-success-100 dark:bg-success-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-success-600 dark:text-success-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">متوفر</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                      {products.filter(p => p.stockQuantity > 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* المنتجات غير المتوفرة */}
              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-warning-100 dark:bg-warning-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">غير متوفر</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                      {products.filter(p => p.stockQuantity <= 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* إحصائيات إضافية لتاجر الجملة فقط */}
              {user?.role === 'wholesaler' && (
                <div className="card p-6">
                  <div className="flex items-center gap-5">
                    <div className="bg-info-100 dark:bg-info-900/30 p-4 rounded-2xl shrink-0">
                      <Package className="w-7 h-7 text-info-600 dark:text-info-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">المفضلة</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                        {products.filter(p => isFavorite(p._id)).length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* إحصائيات للمورد والإدارة فقط */}
          {(user?.role === 'supplier' || user?.role === 'admin') && (
            <>
              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-success-100 dark:bg-success-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-success-600 dark:text-success-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">معتمد</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                      {products.filter(p => p.isApproved).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-warning-100 dark:bg-warning-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">قيد المراجعة</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                      {products.filter(p => !p.isApproved && !p.isRejected).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-danger-100 dark:bg-danger-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-danger-600 dark:text-danger-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">مرفوض</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                      {products.filter(p => p.isRejected).length}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

      {/* Resubmit Modal */}
      {showResubmitModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full mr-3">
                <RotateCw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعادة تقديم المنتج</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من إعادة تقديم المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong> للمراجعة؟
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowResubmitModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmResubmit}
                disabled={processing}
                className="btn-primary flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4 ml-2" />
                    إعادة تقديم
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {showResubmitModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full mr-3">
                <RotateCw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعادة تقديم المنتج</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من إعادة تقديم المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong> للمراجعة؟
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowResubmitModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmResubmit}
                disabled={processing}
                className="btn-primary flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4 ml-2" />
                    إعادة تقديم
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApproveModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-full mr-3">
                <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">تأكيد الموافقة</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من الموافقة على المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong>؟
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmApprove}
                disabled={processing}
                className="btn-success flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    موافقة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-danger-100 dark:bg-danger-900/30 p-2 rounded-full mr-3">
                <XCircle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">رفض المنتج</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              هل أنت متأكد من رفض المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong>؟
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                سبب الرفض <span className="text-danger-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب رفض المنتج..."
                className="input-field"
                rows={3}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedProduct(null);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmReject}
                disabled={processing || !rejectionReason.trim()}
                className="btn-danger flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 ml-2" />
                    رفض
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-danger-100 dark:bg-danger-900/30 p-2 rounded-full mr-3">
                <AlertCircle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">تأكيد الحذف</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من حذف المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong>؟ 
              <br />
              <span className="text-sm text-danger-600 dark:text-danger-400">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={processing}
                className="btn-danger flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {showQuickEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                              <div className="bg-[#FF9800]/20 dark:bg-[#FF9800]/30 p-2 rounded-full mr-3">
                <Edit className="w-6 h-6 text-[#FF9800] dark:text-[#FF9800]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">تعديل سريع</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{selectedProduct.name}</p>
                </div>
              </div>
              
              {/* Product Image Preview */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <MediaThumbnail
                    media={selectedProduct.images}
                    alt={selectedProduct.name}
                    className="w-full h-full"
                    showTypeBadge={false}
                    width={64}
                    height={64}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  اسم المنتج
                </label>
                <input
                  type="text"
                  value={quickEditData.name}
                  onChange={(e) => setQuickEditData({...quickEditData, name: e.target.value})}
                  className="input-field"
                  placeholder="اسم المنتج"
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    سعر المسوق (الأساسي)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.marketerPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, marketerPrice: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    سعر الجملة (للتجار)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.wholesalerPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, wholesalerPrice: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>

                             {/* Stock Quantity */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                   الكمية المتوفرة
                 </label>
                 <div className="relative">
                   <input
                     type="number"
                     min="0"
                     value={quickEditData.stockQuantity}
                     onChange={(e) => setQuickEditData({...quickEditData, stockQuantity: parseInt(e.target.value) || 0})}
                     className="input-field pr-12"
                     placeholder="0"
                   />
                   <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                     <span className={`text-xs px-2 py-1 rounded-full ${
                       quickEditData.stockQuantity > 10 
                         ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                         : quickEditData.stockQuantity > 0 
                         ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                         : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                     }`}>
                       {quickEditData.stockQuantity > 10 ? 'متوفر' : quickEditData.stockQuantity > 0 ? 'منخفض' : 'نفذ'}
                     </span>
                   </div>
                 </div>
               </div>

              {/* Minimum Selling Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    السعر الأدنى للبيع (اختياري)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.minimumSellingPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, minimumSellingPrice: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="isMinimumPriceMandatory"
                    checked={quickEditData.isMinimumPriceMandatory}
                    onChange={(e) => setQuickEditData({...quickEditData, isMinimumPriceMandatory: e.target.checked})}
                    className="w-4 h-4 text-[#FF9800] bg-gray-100 border-gray-300 rounded focus:ring-[#FF9800] dark:focus:ring-[#FF9800] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="isMinimumPriceMandatory" className="mr-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    إلزامي للمسوقين
                  </label>
                </div>
                             </div>
             </div>
             
             {/* Profit Preview */}
             <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mt-4">
               <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">معاينة الأرباح</h4>
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                   <span className="text-gray-600 dark:text-slate-400">الفرق بين الأسعار:</span>
                   <span className="block font-medium text-green-600 dark:text-green-400">
                     {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quickEditData.marketerPrice - quickEditData.wholesalerPrice)} ₪
                   </span>
                 </div>
                 <div>
                   <span className="text-gray-600 dark:text-slate-400">نسبة الربح:</span>
                   <span className="block font-medium text-[#FF9800] dark:text-[#FF9800]">
                     {new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format((quickEditData.marketerPrice - quickEditData.wholesalerPrice) / quickEditData.marketerPrice * 100)}%
                   </span>
                 </div>
               </div>
             </div>
             
             <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => {
                  setShowQuickEditModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={handleQuickEditSave}
                disabled={processing || !quickEditData.name.trim()}
                className="btn-primary flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock/Unlock Modal */}
      {showLockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  lockAction === 'lock' 
                    ? 'bg-red-100 dark:bg-red-900/30' 
                    : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  {lockAction === 'lock' ? (
                    <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {lockAction === 'lock' ? 'قفل المنتج' : 'إلغاء قفل المنتج'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {lockAction === 'lock' 
                      ? 'سيتم إخفاء هذا المنتج عن المسوقين والتجار' 
                      : 'سيتم إظهار هذا المنتج للمسوقين والتجار مرة أخرى'
                    }
                  </p>
                </div>
              </div>
              
              {lockAction === 'lock' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    سبب القفل (اختياري)
                  </label>
                  <textarea
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="اكتب سبب قفل المنتج هنا..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 resize-none"
                    rows={3}
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => {
                    setShowLockModal(false);
                    setLockReason('');
                    setLockAction(null);
                    setSelectedProduct(null);
                  }}
                  disabled={locking}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmLock}
                  disabled={locking}
                  className={`btn flex items-center ${
                    lockAction === 'lock' ? 'btn-danger' : 'btn-success'
                  }`}
                >
                  {locking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري {lockAction === 'lock' ? 'القفل' : 'إلغاء القفل'}...
                    </>
                  ) : (
                    <>
                      {lockAction === 'lock' ? (
                        <>
                          <Lock className="w-4 h-4 ml-2" />
                          قفل المنتج
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 ml-2" />
                          إلغاء القفل
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 