'use client';

export const dynamic = 'force-dynamic';

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
  Inbox,
  Link as LinkIcon,
  List,
  LayoutGrid
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import SearchFilters from '@/components/search/SearchFilters';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import { useRouter } from 'next/navigation';
import ProductSection from '@/components/products/ProductSection';
import AdminProductsTableView from '@/components/products/AdminProductsTableView';
import { getStockBadgeText, calculateVariantStockQuantity } from '@/lib/product-helpers';

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
  isMarketerPriceManuallyAdjusted?: boolean;
  tags: string[];
  categoryName?: string;
  supplierName?: string;
  sales?: number;
  rating?: number;
  isRejected?: boolean;
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
  // Product variants
  hasVariants?: boolean;
  variants?: any[];
  variantOptions?: Array<{
    variantId: string;
    variantName: string;
    value: string;
    price?: number;
    stockQuantity: number;
    sku?: string;
    images?: string[];
  }>;
  metadata?: { easyOrdersProductId?: string; easyOrdersStoreId?: string; easyOrdersIntegrationId?: string };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - URL changes handled by event listeners
  
  // Use URL query string directly - no need for searchParams which causes re-renders
  const queryString = urlQueryString || '';
  
  // استعلام الفلاتر فقط (بدون page)
  const baseQueryString = useMemo(() => {
    const params = new URLSearchParams(queryString);
    params.delete('page');
    return params.toString();
  }, [queryString]);

  // رقم الصفحة الحالية من الـ URL (للترقيم: السابق / التالي)
  const currentPage = useMemo(() => {
    const p = new URLSearchParams(queryString).get('page');
    const n = parseInt(p || '1', 10);
    return isNaN(n) || n < 1 ? 1 : n;
  }, [queryString]);
  
  const cacheKey = useMemo(() => {
    const newKey = `products_${baseQueryString || 'default'}_p_${currentPage}`;
    if (cacheKeyRef.current !== newKey) {
      cacheKeyRef.current = newKey;
    }
    return newKey;
  }, [baseQueryString, currentPage]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [accumulatedProducts, setAccumulatedProducts] = useState<Product[]>([]);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
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
  
  // Export to Easy Orders states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingProductId, setExportingProductId] = useState<string | null>(null);
  const [unlinkingProductId, setUnlinkingProductId] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [exporting, setExporting] = useState(false);
  
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
  // View mode for marketer/wholesaler (list/grid)
  const [marketerViewMode, setMarketerViewMode] = useState<'list' | 'grid'>('grid');

  // ترتيب القائمة: حسب الاسم، السعر، المخزون، التاريخ (للمسوق والأدمن)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams(baseQueryString);
    params.set('page', String(currentPage));
    params.set('limit', '20');
    const qs = params.toString();
    const endpoint = qs ? `/api/products?${qs}` : `/api/products?page=${currentPage}&limit=20`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    const data = await response.json();
    return data;
  }, [baseQueryString, currentPage]);

  // Use cache hook for products
  const { data: productsData, loading, refresh } = useDataCache<{ products: Product[]; pagination?: any }>({
    key: cacheKey,
    fetchFn: fetchProducts,
    enabled: !!user,
    forceRefresh: false
  });

  // فلتر المورد: إبقاء منتجات المورد الحالي فقط (للمزامنة ولتحميل المزيد)
  const filterSupplierProducts = useCallback((list: Product[]): Product[] => {
    if (user?.role !== 'supplier' || !user._id) return list;
    const userSupplierId = user._id.toString();
    return list.filter((product: Product) => {
      let productSupplierId: string | null = null;
      if (product.supplierId) {
        if (typeof product.supplierId === 'object' && product.supplierId !== null) {
          productSupplierId = (product.supplierId as any)._id?.toString() || String(product.supplierId);
        } else {
          productSupplierId = String(product.supplierId);
        }
      }
      return productSupplierId === userSupplierId;
    });
  }, [user?.role, user?._id]);

  // مزامنة قائمة المنتجات من رد الـ API (صفحة واحدة لكل طلب)
  useEffect(() => {
    if (!productsData?.products) return;
    const filtered = filterSupplierProducts(productsData.products);
    setAccumulatedProducts(filtered);
    if (productsData.pagination) {
      setPagination(productsData.pagination);
    }
  }, [productsData, filterSupplierProducts]);

  // عند تغيير الفلاتر: إعادة الصفحة إلى 1
  const prevBaseQueryRef = useRef(baseQueryString);
  useEffect(() => {
    if (prevBaseQueryRef.current !== baseQueryString) {
      prevBaseQueryRef.current = baseQueryString;
      const params = new URLSearchParams(baseQueryString);
      params.set('page', '1');
      const newQuery = params.toString();
      if (typeof window !== 'undefined') {
        const newUrl = `/dashboard/products${newQuery ? `?${newQuery}` : ''}`;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        setUrlQueryString(newQuery);
        window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: newQuery } }));
      }
    }
  }, [baseQueryString]);

  const products = accumulatedProducts;

  // ملخص المنتجات: مخزون فعلي (مع احتساب المتغيرات) لأجل متوفر/غير متوفر
  const getEffectiveStock = useCallback((p: Product) => {
    if (p.hasVariants && p.variantOptions && p.variantOptions.length > 0) {
      return calculateVariantStockQuantity(p.variantOptions);
    }
    return p.stockQuantity ?? 0;
  }, []);

  const summaryCounts = useMemo(() => {
    const total = pagination.total || products.length;
    const available = products.filter(p => getEffectiveStock(p) > 0).length;
    const unavailable = products.filter(p => getEffectiveStock(p) <= 0).length;
    const favorites = (user?.role === 'marketer' || user?.role === 'wholesaler')
      ? products.filter(p => isFavorite(p._id)).length
      : 0;
    return { total, available, unavailable, favorites };
  }, [products, pagination.total, getEffectiveStock, user?.role, isFavorite]);

  // ترتيب المنتجات محلياً حسب الاختيار (اسم، سعر، مخزون، تاريخ)
  const sortedProducts = useMemo(() => {
    const list = [...products];
    const getPrice = (p: Product) => (user?.role === 'wholesaler' ? (p.wholesalerPrice ?? 0) : (p.marketerPrice ?? 0));
    const getDate = (p: Product) => new Date((p as any).createdAt || 0).getTime();
    const mult = sortOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '', 'ar');
      } else if (sortBy === 'price') {
        cmp = getPrice(a) - getPrice(b);
      } else if (sortBy === 'stock') {
        cmp = getEffectiveStock(a) - getEffectiveStock(b);
      } else {
        cmp = getDate(a) - getDate(b);
      }
      return mult * cmp;
    });
    return list;
  }, [products, sortBy, sortOrder, user?.role, getEffectiveStock]);

  const goToPage = useCallback((page: number) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(baseQueryString);
    params.set('page', String(page));
    const newQuery = params.toString();
    const newUrl = `/dashboard/products${newQuery ? `?${newQuery}` : ''}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    setUrlQueryString(newQuery);
    window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: newQuery } }));
  }, [baseQueryString]);

  // Check for refresh flag from sessionStorage on mount or route change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shouldRefresh = sessionStorage.getItem('refresh-products');
      if (shouldRefresh === 'true') {
        // Clear the flag
        sessionStorage.removeItem('refresh-products');
        // Refresh data
        refresh();
        refreshSections();
      }
    }
  }, [refresh, refreshSections]);

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

  // Fetch integrations for export functionality
  useEffect(() => {
    if ((user?.role === 'marketer' || user?.role === 'wholesaler') && !loadingIntegrations) {
      setLoadingIntegrations(true);
      fetch('/api/integrations')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.integrations) {
            const activeIntegrations = data.integrations.filter((int: any) => 
              int.status === 'active' && int.type === 'easy_orders'
            );
            setIntegrations(activeIntegrations);
            if (activeIntegrations.length === 1) {
              setSelectedIntegrationId(activeIntegrations[0].id);
            }
          }
        })
        .catch(err => {
          console.error('Error fetching integrations:', err);
        })
        .finally(() => {
          setLoadingIntegrations(false);
        });
    }
  }, [user?.role, loadingIntegrations]);

  // Handle export product
  const handleExportProduct = async (productId: string) => {
    if (integrations.length === 0) {
      toast.error('لا توجد تكاملات نشطة. يرجى إضافة تكامل Easy Orders أولاً');
      router.push('/dashboard/integrations');
      return;
    }

    if (integrations.length === 1) {
      // Direct export if only one integration
      setExportingProductId(productId);
      setSelectedIntegrationId(integrations[0].id);
      await performExport(productId, integrations[0].id);
    } else {
      // Show modal to select integration
      setExportingProductId(productId);
      setShowExportModal(true);
    }
  };

  // Perform export
  const performExport = async (productId: string, integrationId: string) => {
    setExporting(true);
    try {
      const response = await fetch('/api/integrations/easy-orders/export-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          integrationId
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('تم تصدير المنتج بنجاح إلى Easy Orders!');
        setShowExportModal(false);
        setExportingProductId(null);
        setSelectedIntegrationId('');
        refresh();
      } else {
        toast.error(data.error || 'فشل في تصدير المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تصدير المنتج');
    } finally {
      setExporting(false);
    }
  };

  const handleUnlinkExport = async (product: { _id: string }) => {
    if (integrations.length === 0) return;
    const integrationId = integrations.length === 1 ? integrations[0].id : selectedIntegrationId || integrations[0]?.id;
    if (!integrationId) return;
    setUnlinkingProductId(product._id);
    try {
      const response = await fetch('/api/integrations/easy-orders/unlink-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product._id, integrationId })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'تم إلغاء الربط. يمكنك تصدير المنتج مرة أخرى.');
        refresh();
      } else {
        toast.error(data.error || 'فشل إلغاء الربط');
      }
    } catch {
      toast.error('حدث خطأ أثناء إلغاء الربط');
    } finally {
      setUnlinkingProductId(null);
    }
  };

  // Handle export from modal
  const handleExportFromModal = async () => {
    if (!exportingProductId || !selectedIntegrationId) {
      toast.error('يرجى اختيار التكامل');
      return;
    }
    await performExport(exportingProductId, selectedIntegrationId);
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
      } else if (response.status === 403) {
        // Access denied - supplier trying to delete another supplier's product
        const error = await response.json().catch(() => ({}));
        toast.error(error.message || 'غير مصرح لك بحذف هذا المنتج');
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.message || 'فشل في حذف المنتج');
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
    
    if (quickEditData.wholesalerPrice && quickEditData.wholesalerPrice <= 0) {
      toast.error('سعر الجملة يجب أن يكون أكبر من 0');
      return;
    }
    
    if (quickEditData.wholesalerPrice && quickEditData.wholesalerPrice >= quickEditData.marketerPrice) {
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
      } else if (response.status === 403) {
        // Access denied - supplier trying to edit another supplier's product
        const error = await response.json().catch(() => ({}));
        toast.error(error.message || 'غير مصرح لك بتعديل هذا المنتج');
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
    
    setProcessing(true);
    try {
      const requestBody = {
        productIds: [selectedProduct._id],
        action: 'reject',
        rejectionReason: rejectionReason.trim()
      };

      const response = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('تم رفض المنتج بنجاح');
        
        // Add a small delay to ensure database is updated
        setTimeout(() => {
          refresh();
        }, 500);
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في رفض المنتج');
      }
    } catch (error) {
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

  const handleReviewProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowReviewModal(true);
    }
  };

  const confirmReview = async () => {
    if (!selectedProduct) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isApproved: false,
          isRejected: false,
          approvedAt: undefined,
          approvedBy: undefined,
          rejectionReason: undefined,
          rejectedAt: undefined,
          rejectedBy: undefined
        }),
      });

      if (response.ok) {
        toast.success('تم إعادة المنتج لحالة المراجعة بنجاح');
        refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في إعادة المنتج لحالة المراجعة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إعادة المنتج لحالة المراجعة');
    } finally {
      setProcessing(false);
      setShowReviewModal(false);
      setSelectedProduct(null);
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
                showExport={integrations.length > 0}
                onExport={(p) => handleExportProduct(p._id)}
                exportingProductId={exportingProductId}
                onUnlinkExport={handleUnlinkExport}
                unlinkingProductId={unlinkingProductId}
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
                showExport={integrations.length > 0}
                onExport={(p) => handleExportProduct(p._id)}
                exportingProductId={exportingProductId}
                onUnlinkExport={handleUnlinkExport}
                unlinkingProductId={unlinkingProductId}
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
                showExport={integrations.length > 0}
                onExport={(p) => handleExportProduct(p._id)}
                exportingProductId={exportingProductId}
                onUnlinkExport={handleUnlinkExport}
                unlinkingProductId={unlinkingProductId}
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
                showExport={integrations.length > 0}
                onExport={(p) => handleExportProduct(p._id)}
                exportingProductId={exportingProductId}
                onUnlinkExport={handleUnlinkExport}
                unlinkingProductId={unlinkingProductId}
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
                showExport={integrations.length > 0}
                onExport={(p) => handleExportProduct(p._id)}
                exportingProductId={exportingProductId}
                onUnlinkExport={handleUnlinkExport}
                unlinkingProductId={unlinkingProductId}
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
                showExport={integrations.length > 0}
                onExport={(p) => handleExportProduct(p._id)}
                exportingProductId={exportingProductId}
                onUnlinkExport={handleUnlinkExport}
                unlinkingProductId={unlinkingProductId}
              />
            </>
          )}
        </div>
      )}

      {/* Products Display - Admin uses table/list view, others use grid */}
      {loading && !productsData ? (
        // هيكل ثابت أثناء التحميل الأول (skeleton) لتفادي قفز الصفحة
        <div className="space-y-4" aria-busy="true" aria-label="جاري تحميل المنتجات">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
          </div>
          {user?.role === 'admin' ? (
            <div className="card overflow-hidden p-0">
              <div className="overflow-hidden">
                <div className="border-b border-gray-200 dark:border-slate-700">
                  <div className="flex gap-4 px-4 py-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-4 flex-1 min-w-[80px] rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
                    ))}
                  </div>
                </div>
                {[1, 2, 3, 4, 5, 6].map((row) => (
                  <div key={row} className="flex gap-4 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                    <div className="w-14 h-14 rounded bg-gray-200 dark:bg-slate-700 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
                      <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-600 animate-pulse" />
                    </div>
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-slate-700 animate-pulse shrink-0" />
                    <div className="h-4 w-14 rounded bg-gray-200 dark:bg-slate-700 animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="card overflow-hidden p-0">
                  <div className="aspect-square sm:aspect-[4/3] bg-gray-200 dark:bg-slate-700 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-slate-600 animate-pulse" />
                    <div className="h-6 w-1/4 rounded bg-gray-200 dark:bg-slate-700 animate-pulse mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center py-4">
            <div className="loading-spinner w-6 h-6" />
            <span className="mr-2 text-sm text-gray-600 dark:text-slate-400">جاري تحميل المنتجات...</span>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12 px-4 sm:py-16">
          <Package className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-slate-100 mb-2">
            {queryString ? 'لا توجد نتائج' : 'لا توجد منتجات'}
          </h3>
          <p className="text-gray-600 dark:text-slate-400 max-w-md mx-auto">
            {queryString
              ? 'لا توجد نتائج مطابقة لبحثك أو الفلاتر المحددة. جرّب تغيير الكلمات أو الفلاتر.'
              : user?.role === 'supplier'
                ? 'لم تقم بإضافة أي منتجات بعد. ابدأ بإضافة منتجك الأول!'
                : user?.role === 'admin'
                ? 'لا توجد منتجات في النظام. يمكن للموردين إضافة منتجات من حساباتهم.'
                : user?.role === 'marketer'
                ? 'لا توجد منتجات معتمدة متاحة للطلب حالياً. تواصل مع الإدارة أو جرّب لاحقاً.'
                : user?.role === 'wholesaler'
                ? 'لا توجد منتجات معتمدة للجملة متاحة حالياً. جرّب تغيير الفلاتر أو لاحقاً.'
                : 'لا توجد منتجات متاحة حالياً.'}
          </p>
          {user?.role === 'supplier' && !queryString && (
            <Link href="/dashboard/products/new" className="btn-primary mt-6 inline-flex items-center min-h-[44px]">
              <Plus className="w-5 h-5 ml-2" />
              إضافة منتج جديد
            </Link>
          )}
          {queryString && (user?.role === 'admin' || user?.role === 'marketer' || user?.role === 'wholesaler') && (
            <p className="text-sm text-gray-500 dark:text-slate-500 mt-4">جرّب مسح الفلاتر أو البحث بكلمات أخرى</p>
          )}
        </div>
      ) : (
        <>
          {/* شريط الترتيب: اسم، سعر، مخزون، تاريخ - للمسوق والأدمن والمورد وتاجر الجملة */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 py-2 sm:py-0">
            <span className="text-sm text-gray-600 dark:text-slate-400 w-full sm:w-auto">ترتيب حسب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'stock' | 'date')}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial min-w-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="name">الاسم</option>
              <option value="price">{user?.role === 'wholesaler' ? 'سعر الجملة' : 'السعر'}</option>
              <option value="stock">المخزون</option>
              <option value="date">التاريخ</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial min-w-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="asc">تصاعدي</option>
              <option value="desc">تنازلي</option>
            </select>
          </div>

          {user?.role === 'admin' ? (
        // Admin Table/List View - show loading indicator when loading new data
        <>
          {loading && productsData && (
            <div className="mb-4 flex items-center justify-center py-4">
              <div className="loading-spinner w-6 h-6"></div>
              <span className="mr-2 text-sm text-gray-600 dark:text-slate-400">جاري تحديث القائمة...</span>
            </div>
          )}
          <AdminProductsTableView
            products={sortedProducts}
            onApprove={handleApproveProduct}
            onReject={handleRejectProduct}
            onResubmit={handleResubmitProduct}
            onReview={handleReviewProduct}
            viewMode={adminViewMode}
            onViewModeChange={setAdminViewMode}
            userRole="admin"
          />
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-3 sm:gap-4 mt-8 mb-4 flex-wrap">
              <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="btn-secondary min-h-[44px] px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">السابق</button>
              <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">صفحة {currentPage} من {pagination.pages}</span>
              <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pagination.pages} className="btn-secondary min-h-[44px] px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">التالي</button>
            </div>
          )}
        </>
          ) : (user?.role === 'marketer' || user?.role === 'wholesaler') && marketerViewMode === 'list' ? (
        // Marketer/Wholesaler List View - table with add to cart & favorite
        <>
          {loading && productsData && (
            <div className="mb-4 flex items-center justify-center py-4">
              <div className="loading-spinner w-6 h-6"></div>
              <span className="mr-2 text-sm text-gray-600 dark:text-slate-400">جاري تحديث القائمة...</span>
            </div>
          )}
          <AdminProductsTableView
            products={sortedProducts}
            userRole={user?.role === 'wholesaler' ? 'wholesaler' : 'marketer'}
            viewMode={marketerViewMode}
            onViewModeChange={setMarketerViewMode}
            onAddToCart={(p) => handleAddToCart(p as Product)}
            isFavorite={isFavorite}
            onToggleFavorite={(p) => handleToggleFavorite(p as Product)}
          />
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-3 sm:gap-4 mt-8 mb-4 flex-wrap">
              <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="btn-secondary min-h-[44px] px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">السابق</button>
              <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">صفحة {currentPage} من {pagination.pages}</span>
              <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pagination.pages} className="btn-secondary min-h-[44px] px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">التالي</button>
            </div>
          )}
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
          {/* View toggle for Marketer/Wholesaler */}
          {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
            <div className="flex justify-end mb-4">
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 gap-0.5">
                <button
                  onClick={() => setMarketerViewMode('list')}
                  className={`px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-md transition-colors flex items-center justify-center ${marketerViewMode === 'list' ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
                >
                  <List className="w-4 h-4 ml-1" />
                  قائمة
                </button>
                <button
                  onClick={() => setMarketerViewMode('grid')}
                  className={`px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-md transition-colors flex items-center justify-center ${marketerViewMode === 'grid' ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
                >
                  <LayoutGrid className="w-4 h-4 ml-1" />
                  شبكة
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {sortedProducts.map((product) => (
              <div 
                key={product._id} 
                className={`card hover:shadow-medium transition-all duration-200 relative cursor-pointer active:scale-[0.98] ${
                  user?.role !== 'wholesaler' && product.isMinimumPriceMandatory && product.minimumSellingPrice
                    ? 'ring-2 ring-orange-200 dark:ring-orange-800'
                    : ''
                }`}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-base sm:text-lg md:text-xl font-bold ${
                          user?.role !== 'wholesaler' && product.isMarketerPriceManuallyAdjusted
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-primary-600 dark:text-primary-400'
                        }`}>
                          {user?.role === 'wholesaler' ? product.wholesalerPrice : product.marketerPrice} ₪
                        </p>
                      </div>
                      {user?.role !== 'wholesaler' && product.minimumSellingPrice && (
                        <p className={`text-[10px] sm:text-xs mt-1 ${
                          product.isMinimumPriceMandatory && product.minimumSellingPrice
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          السعر الأدنى: {product.minimumSellingPrice} ₪
                        </p>
                      )}
                      {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                        <p className="text-xs font-semibold mt-1 text-[#FF9800] dark:text-[#FF9800]">
                          ربح المسوق: {(() => {
                            const base = user?.role === 'wholesaler' ? (product.wholesalerPrice ?? 0) : (product.marketerPrice ?? 0);
                            const minP = product.minimumSellingPrice ?? 0;
                            const profit = minP > base ? minP - base : 0;
                            return `${profit.toFixed(2)} ₪`;
                          })()}
                        </p>
                      )}
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 space-x-reverse mt-1.5 sm:mt-2">
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                          (product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                            ? product.variantOptions.reduce((sum: number, opt: any) => sum + (opt.stockQuantity || 0), 0)
                            : product.stockQuantity) > 10 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : (product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                              ? product.variantOptions.reduce((sum: number, opt: any) => sum + (opt.stockQuantity || 0), 0)
                              : product.stockQuantity) > 0 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {getStockBadgeText(
                            product.stockQuantity,
                            product.hasVariants,
                            product.variantOptions
                          )}
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

                  {/* Stock Status and Export for Marketer/Wholesaler */}
                  {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
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
                      {/* Export to Easy Orders: يظهر فقط إذا لم يكن المنتج مُصدَّراً */}
                      {product.isApproved && product.isActive && integrations.length > 0 && !product.metadata?.easyOrdersProductId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportProduct(product._id);
                          }}
                          className="text-xs px-2 py-1 bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-lg transition-colors flex items-center gap-1"
                          title="تصدير إلى Easy Orders"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">تصدير</span>
                        </button>
                      )}
                      {/* مُصدّر: زر إلغاء الربط إذا حذفه من Easy Orders */}
                      {product.isApproved && product.isActive && integrations.length > 0 && product.metadata?.easyOrdersProductId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkExport(product);
                          }}
                          disabled={!!unlinkingProductId}
                          className="text-xs px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
                          title="حذفته من Easy Orders - إلغاء الربط لتمكين التصدير مرة أخرى"
                        >
                          مُصدّر
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ترقيم الصفحات: السابق | صفحة X من Y | التالي - للإدارة والمسوق */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-3 sm:gap-4 mt-8 mb-4 flex-wrap">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="btn-secondary min-h-[44px] px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">
                صفحة {currentPage} من {pagination.pages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pagination.pages}
                className="btn-secondary min-h-[44px] px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          )}
        </>
          )}
        </>
      )}

          {/* شريط الملخص السفلي: إجمالي · متوفر · غير متوفر (لجميع الأدوار) */}
          {products.length > 0 && (
            <div className="card py-3 px-3 sm:px-4 mb-4 sm:mb-6 border border-gray-200 dark:border-slate-600">
              <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 sm:gap-4 text-sm">
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  <span className="text-gray-500 dark:text-slate-400 ml-1">إجمالي المنتجات:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100 mr-2">{summaryCounts.total}</span>
                </span>
                <span className="hidden sm:inline text-gray-300 dark:text-slate-600">|</span>
                <span className="font-medium">
                  <span className="text-gray-500 dark:text-slate-400 ml-1">متوفر:</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mr-2">{summaryCounts.available}</span>
                </span>
                <span className="hidden sm:inline text-gray-300 dark:text-slate-600">|</span>
                <span className="font-medium">
                  <span className="text-gray-500 dark:text-slate-400 ml-1">غير متوفر:</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mr-2">{summaryCounts.unavailable}</span>
                </span>
                {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                  <>
                    <span className="hidden sm:inline text-gray-300 dark:text-slate-600">|</span>
                    <span className="font-medium">
                      <span className="text-gray-500 dark:text-slate-400 ml-1">المفضلة:</span>
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">{summaryCounts.favorites}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* بطاقات الملخص (إجمالي، متوفر، غير متوفر، المفضلة للمسوق/تاجر الجملة) */}
          {products.length > 0 && (
            <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${(user?.role === 'marketer' || user?.role === 'wholesaler') ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">إجمالي المنتجات</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{summaryCounts.total}</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-success-100 dark:bg-success-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-success-600 dark:text-success-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">متوفر</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{summaryCounts.available}</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-warning-100 dark:bg-warning-900/30 p-4 rounded-2xl shrink-0">
                    <Package className="w-7 h-7 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">غير متوفر</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{summaryCounts.unavailable}</p>
                  </div>
                </div>
              </div>

              {/* المفضلة للمسوق وتاجر الجملة */}
              {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                <div className="card p-6">
                  <div className="flex items-center gap-5">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-2xl shrink-0">
                      <Heart className="w-7 h-7 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">المفضلة</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{summaryCounts.favorites}</p>
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

      {/* Review Modal */}
      {showReviewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-[#FF9800]/10 dark:bg-[#FF9800]/20 p-2 rounded-full mr-3">
                <Clock className="w-6 h-6 text-[#FF9800] dark:text-[#FF9800]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعادة النظر في المنتج</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من إعادة المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong> لحالة المراجعة؟
              سيتم إلغاء حالة الموافقة وإرجاع المنتج لحالة المراجعة.
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmReview}
                disabled={processing}
                className="btn-warning flex items-center"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 ml-2" />
                    إعادة النظر
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
                    السعر الأدنى للبيع (السعر المقترح للمسوق)
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

      {/* Export to Easy Orders Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
              تصدير المنتج إلى Easy Orders
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              اختر التكامل الذي تريد تصدير المنتج إليه:
            </p>
            <div className="space-y-2 mb-6">
              {integrations.map((integration) => (
                <label
                  key={integration.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedIntegrationId === integration.id
                      ? 'border-[#4CAF50] bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="integration"
                    value={integration.id}
                    checked={selectedIntegrationId === integration.id}
                    onChange={(e) => setSelectedIntegrationId(e.target.value)}
                    className="w-4 h-4 text-[#4CAF50]"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {integration.storeName}
                    </p>
                    {integration.storeUrl && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {integration.storeUrl}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportingProductId(null);
                  setSelectedIntegrationId('');
                }}
                className="btn-secondary flex-1"
                disabled={exporting}
              >
                إلغاء
              </button>
              <button
                onClick={handleExportFromModal}
                disabled={exporting || !selectedIntegrationId}
                className="btn-primary flex-1 flex items-center justify-center"
              >
                {exporting ? (
                  <>
                    <RotateCw className="w-4 h-4 ml-2 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 ml-2" />
                    تصدير
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 