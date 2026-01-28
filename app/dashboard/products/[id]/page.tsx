'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { 
  ArrowLeft, 
  Package, 
  Store, 
  Heart, 
  ShoppingCart, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  XCircle,
  Tag,
  Scale,
  Ruler,
  User,
  Calendar,
  MessageSquare,
  Send,
  X,
  BarChart3,
  Lock,
  Unlock,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MediaDisplay from '@/components/ui/MediaDisplay';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import ProductVariantSelector from '@/components/ui/ProductVariantSelector';
import CommentsSection from '@/components/ui/CommentsSection';
import { ProductVariant, ProductVariantOption } from '@/types';
import { getCloudinaryThumbnailUrl, isCloudinaryUrl } from '@/lib/mediaUtils';

interface Product {
  _id: string;
  name: string;
  description: string;
  marketingText?: string;
  images: string[];
  marketerPrice: number;
  wholesalerPrice: number;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
  stockQuantity: number;
  isActive: boolean;
  isApproved: boolean;
  isFulfilled: boolean;
  categoryName?: string;
  supplierName?: string;
  sku?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isRejected?: boolean; // Added for rejection status
  rejectionReason?: string; // Added for rejection reason
  adminNotes?: string; // Added for admin notes
  approvedAt?: string; // Added for approval date
  approvedBy?: string; // Added for approval user
  rejectedAt?: string; // Added for rejection date
  rejectedBy?: string; // Added for rejection user
  categoryId?: { name: string }; // Added for category ID
  supplierId?: { _id: string; name: string; companyName: string } | string; // Added for supplier ID
  // Product variants
  hasVariants?: boolean;
  variants?: ProductVariant[];
  variantOptions?: ProductVariantOption[];
  // Locking fields
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  lockReason?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Approval states
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  
  // Locking states
  const [locking, setLocking] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [lockAction, setLockAction] = useState<'lock' | 'unlock' | null>(null);
  
  // Product variants state
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  
  // Copy marketing text function
  const copyMarketingText = () => {
    if (product?.marketingText) {
      navigator.clipboard.writeText(product.marketingText);
      toast.success('تم نسخ النص التسويقي');
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  // Preload product images for faster display
  useEffect(() => {
    if (product?.images && product.images.length > 0) {
      // Preload main image (first image) with high priority
      const mainImage = product.images[0];
      if (isCloudinaryUrl(mainImage)) {
        const mainImageUrl = getCloudinaryThumbnailUrl(mainImage, { 
          width: 800, 
          height: 800, 
          crop: 'fill', 
          quality: 'auto:best',
          format: 'auto',
          dpr: 'auto'
        });
        
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = mainImageUrl;
        document.head.appendChild(link);
      }
      
      // Preload first 3 thumbnails
      const thumbnails = product.images.slice(1, 4);
      thumbnails.forEach((imageUrl) => {
        if (isCloudinaryUrl(imageUrl)) {
          const thumbnailUrl = getCloudinaryThumbnailUrl(imageUrl, { 
            width: 200, 
            height: 200, 
            crop: 'fill', 
            quality: 'auto:good',
            format: 'auto',
            dpr: 'auto'
          });
          
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = thumbnailUrl;
          document.head.appendChild(link);
        }
      });
      
      // Cleanup on unmount
      return () => {
        const prefetchLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
        prefetchLinks.forEach(link => {
          if (product.images.some(img => link.getAttribute('href')?.includes(img))) {
            link.remove();
          }
        });
      };
    }
  }, [product?.images]);

  // Poll for new messages when chat is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showChat) {
      interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showChat]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setProduct(data.product);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'المنتج غير موجود');
        router.push('/dashboard/products');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب تفاصيل المنتج');
      router.push('/dashboard/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف المنتج بنجاح');
        router.push('/dashboard/products');
      } else {
        toast.error('فشل في حذف المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المنتج');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleLockProduct = (action: 'lock' | 'unlock') => {
    setLockAction(action);
    setLockReason('');
    setShowLockModal(true);
  };

  const confirmLock = async () => {
    if (!product) return;
    
    try {
      setLocking(true);
      
      const response = await fetch(`/api/products/${product._id}/lock`, {
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
        await fetchProduct(); // Refresh product data
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
    }
  };

  const canLockProduct = () => {
    if (!product || !user) return false;
    return user.role === 'admin' || 
           (user.role === 'supplier' && 
            (typeof product.supplierId === 'string' ? product.supplierId === user._id : product.supplierId?._id === user._id));
  };

  const handleToggleFavorite = async () => {
    if (!product) return;
    
    if (isFavorite(product._id)) {
      await removeFromFavorites(product._id);
    } else {
      await addToFavorites(product as any);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!product.isApproved) {
      toast.error('المنتج غير معتمد بعد');
      return;
    }

    // Check if product has variants and if variants are selected
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const requiredVariants = product.variants.filter(v => v.isRequired);
      const selectedRequiredVariants = requiredVariants.filter(v => selectedVariants[v.name]);
      
      if (selectedRequiredVariants.length !== requiredVariants.length) {
        toast.error('يرجى تحديد جميع المتغيرات المطلوبة');
        return;
      }
      
      // Find the selected variant option
      const selectedOption = product.variantOptions?.find(option => {
        const optionVariants = option.variantName.split(' - ');
        return optionVariants.every(opt => {
          const [name, val] = opt.split(': ');
          return selectedVariants[name] === val;
        });
      });
      
      if (!selectedOption) {
        toast.error('الخيار المحدد غير متوفر');
        return;
      }
      
      if (selectedOption.stockQuantity <= 0) {
        toast.error('الخيار المحدد غير متوفر في المخزون');
        return;
      }
      
      try {
        addToCart(product as any, 1, selectedVariants, selectedOption);
        toast.success(`تم إضافة ${product.name} (${selectedOption.variantName}) إلى السلة بنجاح`);
      } catch (error) {
        toast.error('حدث خطأ أثناء إضافة المنتج إلى السلة');
      }
    } else {
      // Regular product without variants
      if (product.stockQuantity <= 0) {
        toast.error('المنتج غير متوفر في المخزون حالياً');
        return;
      }

      try {
        addToCart(product as any);
        toast.success(`تم إضافة ${product.name} إلى السلة بنجاح`);
      } catch (error) {
        toast.error('حدث خطأ أثناء إضافة المنتج إلى السلة');
      }
    }
  };

  // Chat functions
  const handleOpenChat = async () => {
    setShowChat(true);
    await fetchMessages();
  };

  const fetchMessages = async () => {
    try {
      // Get the supplier ID correctly
      const supplierId = typeof product?.supplierId === 'object' ? product?.supplierId?._id : product?.supplierId;
      if (!supplierId || !user?._id) {
        return;
      }
      
      // Create conversation ID by combining user IDs
      const conversationId = [user._id, supplierId].sort().join('-');
      
      const response = await fetch(`/api/messages/conversations/${conversationId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !product?.supplierId) {
      return;
    }
    
    // Get the supplier ID correctly
    const supplierId = typeof product?.supplierId === 'object' ? product?.supplierId?._id : product?.supplierId;
    if (!supplierId) {
      return;
    }
    
    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: supplierId,
          subject: `استفسار بخصوص ${product.name}`,
          content: newMessage,
          productId: product._id
        }),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        setNewMessage('');
        await fetchMessages();
        toast.success('تم إرسال الرسالة بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في إرسال الرسالة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  // Approval functions
  const handleApproveProduct = async () => {
    setShowApproveConfirm(true);
  };

  const confirmApprove = async () => {
    setApproving(true);
    try {
      const response = await fetch(`/api/products/${params.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('تم الموافقة على المنتج بنجاح');
        await fetchProduct(); // Refresh product data
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في الموافقة على المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الموافقة على المنتج');
    } finally {
      setApproving(false);
      setShowApproveConfirm(false);
    }
  };

  const confirmReview = async () => {
    if (!reviewAction) return;
    
    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isApproved: false,
          isRejected: false,
          rejectionReason: null,
          adminNotes: reviewAction === 'approve' 
            ? `تم إلغاء الموافقة بواسطة ${user?.name} في ${new Date().toLocaleString('en-US')}`
            : `تم إعادة النظر في المنتج بواسطة ${user?.name} في ${new Date().toLocaleString('en-US')}`
        }),
      });

      if (response.ok) {
        const message = reviewAction === 'approve' 
          ? 'تم إلغاء الموافقة على المنتج بنجاح'
          : 'تم إعادة النظر في المنتج بنجاح';
        toast.success(message);
        await fetchProduct(); // Refresh product data
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في العملية');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء العملية');
    } finally {
      setShowReviewConfirm(false);
      setReviewAction(null);
    }
  };

  const handleRejectProduct = async () => {
    if (!rejectionReason.trim()) {
      toast.error('يرجى إدخال سبب الرفض');
      return;
    }
    
    setRejecting(true);
    try {
      const response = await fetch(`/api/products/${params.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim()
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('تم رفض المنتج بنجاح');
        setShowRejectModal(false);
        setRejectionReason('');
        await fetchProduct(); // Refresh product data
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في رفض المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض المنتج');
    } finally {
      setRejecting(false);
    }
  };

  const handleReviewAction = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setShowReviewConfirm(true);
  };

  const handleVariantChange = (newSelectedVariants: Record<string, string>) => {
    setSelectedVariants(newSelectedVariants);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">جاري تحميل تفاصيل المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">المنتج غير موجود</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">المنتج الذي تبحث عنه غير موجود أو تم حذفه</p>
          <Link href="/dashboard/products" className="btn-primary">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للمنتجات
          </Link>
        </div>
      </div>
    );
  }

  // Transform product for frontend
  const transformedProduct = {
    _id: product._id,
    name: product.name,
    description: product.description,
    images: product.images,
    marketerPrice: product.marketerPrice,
    wholesalerPrice: product.wholesalerPrice,
    stockQuantity: product.stockQuantity,
    isActive: product.isActive,
    isApproved: product.isApproved,
    isRejected: product.isRejected,
    rejectionReason: product.rejectionReason,
    adminNotes: product.adminNotes,
    approvedAt: product.approvedAt,
    approvedBy: product.approvedBy,
    rejectedAt: product.rejectedAt,
    rejectedBy: product.rejectedBy,
    isFulfilled: product.isFulfilled,
    categoryName: product.categoryId?.name,
    supplierId: product.supplierId,
    supplierName: typeof product.supplierId === 'object' ? (product.supplierId?.name || product.supplierId?.companyName) : product.supplierId,
    sku: product.sku,
    weight: product.weight,
    dimensions: product.dimensions,
    tags: product.tags,
    specifications: product.specifications,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };

  const currentPrice = user?.role === 'wholesaler' ? product.wholesalerPrice : product.marketerPrice;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link 
              href="/dashboard/products"
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للمنتجات
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">تفاصيل المنتج</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {(user?.role === 'marketer' || user?.role === 'wholesaler') && product.stockQuantity > 0 && (
              <button 
                onClick={handleAddToCart}
                className="btn-primary"
              >
                <ShoppingCart className="w-4 h-4 ml-2" />
                أضف للسلة
              </button>
            )}

            {/* Chat with Supplier Button - Only for marketers and wholesalers */}
            {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
              <button 
                onClick={handleOpenChat}
                className="btn-secondary"
              >
                <MessageSquare className="w-4 h-4 ml-2" />
                تواصل مع المورد
              </button>
            )}

            {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
              <button 
                onClick={handleToggleFavorite}
                className={`p-2 rounded-full border flex items-center justify-center ${
                  isFavorite(product._id) 
                    ? 'bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-700 text-danger-600 dark:text-danger-400' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:text-danger-600 dark:hover:text-danger-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite(product._id) ? 'fill-current' : ''}`} />
              </button>
            )}

            {(user?.role === 'supplier' || user?.role === 'admin') && (
              <>
                <Link
                  href={`/dashboard/products/${product._id}/edit`}
                  className="btn-secondary"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل
                </Link>
                
                {/* Duplicate Product Button */}
                <button
                  onClick={() => {
                    // Prepare product data for duplication
                    const productData = {
                      name: `${product.name} (نسخة)`,
                      description: product.description || '',
                      marketingText: product.marketingText || '',
                      categoryId: product.categoryId || '',
                      marketerPrice: product.marketerPrice || 0,
                      wholesalerPrice: product.wholesalerPrice || undefined,
                      minimumSellingPrice: product.minimumSellingPrice || undefined,
                      isMinimumPriceMandatory: product.isMinimumPriceMandatory || false,
                      stockQuantity: product.stockQuantity || 0,
                      sku: '',
                      images: product.images || [],
                      tags: product.tags || [],
                      specifications: product.specifications || {},
                      hasVariants: (product as any).hasVariants || false,
                      variants: (product as any).variants || [],
                      variantOptions: (product as any).variantOptions || [],
                      selectedSupplierId: '',
                      primaryImageIndex: 0,
                      currentStep: 1
                    };
                    
                    // Save to localStorage and redirect
                    localStorage.setItem('product-duplicate', JSON.stringify(productData));
                    router.push('/dashboard/products/new');
                    toast.success('تم تحضير نسخة من المنتج');
                  }}
                  className="btn-secondary"
                  title="نسخ المنتج لإنشاء منتج جديد"
                >
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ المنتج
                </button>
                
                {/* Lock/Unlock Product Button */}
                {canLockProduct() && (
                  <button
                    onClick={() => handleLockProduct(product.isLocked ? 'unlock' : 'lock')}
                    className={`btn ${product.isLocked ? 'btn-success' : 'btn-warning'}`}
                  >
                    {product.isLocked ? (
                      <>
                        <Unlock className="w-4 h-4 ml-2" />
                        إلغاء القفل
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 ml-2" />
                        قفل المنتج
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleDeleteProduct}
                  className="btn-danger"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </button>
              </>
            )}

            {/* Admin Approval Actions */}
            {(() => {
              return user?.role === 'admin' && !product.isApproved && !product.isRejected ? (
                <>
                  <button
                    onClick={handleApproveProduct}
                    disabled={approving}
                    className="btn-success"
                  >
                    {approving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4 ml-2" />
                    )}
                    {approving ? 'جاري الموافقة...' : 'موافقة'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="btn-danger"
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    رفض
                  </button>
                </>
              ) : null;
            })()}

                        {/* Admin can reverse decisions */}
            {(() => {
              return user?.role === 'admin' && (product.isApproved || product.isRejected) ? (
                <button
                  onClick={() => {
                    setReviewAction(product.isApproved ? 'approve' : 'reject');
                    setShowReviewConfirm(true);
                  }}
                  className="btn-secondary"
                >
                  <Clock className="w-4 h-4 ml-2" />
                  إعادة النظر
                </button>
              ) : null;
            })()}

            {/* View Statistics Button - Only for admins */}
            {user?.role === 'admin' && (
              <Link
                href={`/dashboard/products/${product._id}/statistics`}
                className="btn-info"
              >
                <BarChart3 className="w-4 h-4 ml-2" />
                عرض الإحصائيات
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Media */}
          <MediaDisplay
            media={product.images || []}
            title="وسائط المنتج"
          />

          {/* Product Info */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                                 <div>
                   <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{product.name}</h2>
                 </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  {(() => {
                    // لا تظهر شارة "معتمد" للمسوق
                    if (user?.role === 'marketer') {
                      return null;
                    }
                    
                    if (product.isApproved) {
                      return (
                        <span className="badge badge-success">
                          <CheckCircle className="w-4 h-4 ml-1" />
                          معتمد
                        </span>
                      );
                    } else if (product.isRejected) {
                      return (
                        <span className="badge badge-danger">
                          <XCircle className="w-4 h-4 ml-1" />
                          مرفوض
                        </span>
                      );
                    } else {
                      return (
                        <span className="badge badge-warning">
                          <Clock className="w-4 h-4 ml-1" />
                          قيد المراجعة
                        </span>
                      );
                    }
                  })()}
                  {product.isFulfilled && (
                    <span className="badge badge-info">
                      <Package className="w-4 h-4 ml-1" />
                      مخزن
                    </span>
                  )}
                  {product.isLocked && (
                    <span className="badge badge-danger">
                      <Lock className="w-4 h-4 ml-1" />
                      مقفل
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm sm:text-base text-gray-700 dark:text-slate-300 leading-relaxed mb-4 text-wrap-long">{product.description}</p>

              {/* Marketing Text Section */}
              {product.marketingText && (
                <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400 ml-2" />
                      <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                        النص التسويقي
                      </h3>
                    </div>
                    <button
                      onClick={copyMarketingText}
                      className="flex items-center space-x-2 space-x-reverse px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
                      title="نسخ النص التسويقي"
                    >
                      <Copy className="w-4 h-4" />
                      <span>نسخ</span>
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded p-3 border border-primary-200 dark:border-primary-700">
                    <p className="text-sm sm:text-base text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-wrap-long">
                      {product.marketingText}
                    </p>
                  </div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                    يمكنك نسخ هذا النص واستخدامه في التسويق للمنتج
                  </p>
                </div>
              )}

              {/* Pricing - Role-based display */}
              {user?.role === 'marketer' ? (
                // Marketer sees only marketer price
                <div className="text-center p-3 rounded-lg bg-[#FF9800]/10 dark:bg-[#FF9800]/20">
                  <p className="text-sm text-[#FF9800] dark:text-[#FF9800]">سعر المسوق (الأساسي)</p>
                  <p className={`text-lg font-bold ${
                    product.isMinimumPriceMandatory && product.minimumSellingPrice
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-[#F57C00] dark:text-[#F57C00]'
                  }`}>
                    {new Intl.NumberFormat('en-US').format(product.marketerPrice)} ₪
                  </p>
                </div>
              ) : user?.role === 'wholesaler' ? (
                // Wholesaler sees only wholesaler price
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">سعر الجملة (للتجار)</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">{new Intl.NumberFormat('en-US').format(product.wholesalerPrice)} ₪</p>
                  <p className="text-xs text-green-600 dark:text-green-400">السعر الثابت للتجار</p>
                </div>
              ) : (
                // Supplier/Admin sees both prices
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
                      <p className="text-sm text-gray-600 dark:text-slate-400">سعر المسوق (الأساسي)</p>
                      <p className={`text-xl font-bold ${
                        product.isMinimumPriceMandatory && product.minimumSellingPrice
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-primary-600 dark:text-primary-400'
                      }`}>
                        {new Intl.NumberFormat('en-US').format(product.marketerPrice)} ₪
                      </p>
                      {product.minimumSellingPrice && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          السعر الأدنى: {new Intl.NumberFormat('en-US').format(product.minimumSellingPrice)} ₪
                        </p>
                      )}
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-slate-400">سعر الجملة (للتجار)</p>
                      <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{new Intl.NumberFormat('en-US').format(product.wholesalerPrice)} ₪</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Product Variants */}
            {product.hasVariants && product.variants && product.variants.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <ProductVariantSelector
                  variants={product.variants}
                  variantOptions={product.variantOptions || []}
                  onVariantChange={handleVariantChange}
                  selectedVariants={selectedVariants}
                  disabled={!product.isApproved || product.stockQuantity <= 0}
                />
              </div>
            )}

            {/* Variants Debug Info - Show when variants are not enabled */}
            {(!product.hasVariants || !product.variants || product.variants.length === 0) && (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">متغيرات المنتج</h3>
                <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                  <p>حالة المتغيرات: {product.hasVariants ? 'مفعلة' : 'غير مفعلة'}</p>
                  <p>عدد المتغيرات: {product.variants?.length || 0}</p>
                  <p>عدد خيارات المتغيرات: {product.variantOptions?.length || 0}</p>
                  {product.hasVariants && (!product.variants || product.variants.length === 0) && (
                    <p className="text-yellow-600 dark:text-yellow-400">⚠️ المتغيرات مفعلة ولكن لا توجد متغيرات محددة</p>
                  )}
                  
                  {/* Test button for admins to enable variants */}
                  {user?.role === 'admin' && !product.hasVariants && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">اختبار: إضافة متغيرات تجريبية</p>
                      <button
                        onClick={async () => {
                          try {
                            const testVariants = [
                              {
                                _id: `variant_${Date.now()}`,
                                name: 'اللون',
                                values: ['أحمر', 'أزرق', 'أخضر'],
                                isRequired: true,
                                order: 0
                              },
                              {
                                _id: `variant_${Date.now() + 1}`,
                                name: 'المقاس',
                                values: ['S', 'M', 'L'],
                                isRequired: true,
                                order: 1
                              }
                            ];
                            
                            const testVariantOptions = [
                              {
                                variantId: `option_${Date.now()}`,
                                variantName: 'اللون: أحمر - المقاس: S',
                                value: 'أحمر - S',
                                price: 0,
                                stockQuantity: 5,
                                sku: 'TEST-RED-S',
                                images: []
                              },
                              {
                                variantId: `option_${Date.now() + 1}`,
                                variantName: 'اللون: أحمر - المقاس: M',
                                value: 'أحمر - M',
                                price: 0,
                                stockQuantity: 3,
                                sku: 'TEST-RED-M',
                                images: []
                              },
                              {
                                variantId: `option_${Date.now() + 2}`,
                                variantName: 'اللون: أزرق - المقاس: S',
                                value: 'أزرق - S',
                                price: 2,
                                stockQuantity: 4,
                                sku: 'TEST-BLUE-S',
                                images: []
                              }
                            ];
                            
                            const response = await fetch(`/api/products/${product._id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                hasVariants: true,
                                variants: testVariants,
                                variantOptions: testVariantOptions
                              })
                            });
                            
                            if (response.ok) {
                              toast.success('تم إضافة متغيرات تجريبية بنجاح');
                              await fetchProduct(); // Refresh product data
                            } else {
                              toast.error('فشل في إضافة المتغيرات');
                            }
                          } catch (error) {
                            toast.error('حدث خطأ أثناء إضافة المتغيرات');
                          }
                        }}
                        className="px-3 py-1 bg-[#FF9800] text-white text-xs rounded hover:bg-[#F57C00]"
                      >
                        إضافة متغيرات تجريبية
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stock & Status */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">المخزون والحالة</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-400">الكمية المتوفرة</p>
                  <p className={`text-xl font-bold ${product.stockQuantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {new Intl.NumberFormat('en-US').format(product.stockQuantity)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-400">الحالة</p>
                  <p className={`text-sm font-semibold ${product.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {product.isActive ? 'نشط' : 'غير نشط'}
                  </p>
                </div>
              </div>
              
              {/* Rejection Reason */}
              {product.isRejected && product.rejectionReason && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 ml-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">سبب الرفض:</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">{product.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">تفاصيل المنتج</h3>
              <div className="space-y-3">
                {product.sku && (
                  <div className="flex items-center">
                    <Tag className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">SKU:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.sku}</span>
                  </div>
                )}
                
                {product.weight && (
                  <div className="flex items-center">
                    <Scale className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">الوزن:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.weight} كجم</span>
                  </div>
                )}

                {product.dimensions && (
                  <div className="flex items-center">
                    <Ruler className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">الأبعاد:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">
                      {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} سم
                    </span>
                  </div>
                )}

                <div className="flex items-center">
                  <Store className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">الفئة:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.categoryName}</span>
                </div>

                {/* Supplier Name - Only show for admin and supplier */}
                {(user?.role === 'admin' || user?.role === 'supplier') && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">المورد:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.supplierName}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">تاريخ الإضافة:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">
                    {new Date(product.createdAt).toLocaleDateString('en-US')}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">العلامات</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="badge badge-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">المواصفات</h3>
                <div className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                      <span className="text-sm text-gray-600 dark:text-slate-400">{key}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <CommentsSection 
                entityType="product" 
                entityId={product._id} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {user?.role === 'marketer' || user?.role === 'wholesaler' 
                      ? 'محادثة مع المورد'
                      : `محادثة مع ${product.supplierName}`
                    }
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    بخصوص: {product.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">
                    لا توجد رسائل بعد. ابدأ المحادثة الآن!
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.senderId._id === user?._id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId._id === user?._id
                          ? 'bg-[#FF9800] text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId._id === user?._id
                          ? 'text-blue-100'
                          : 'text-gray-500 dark:text-slate-400'
                      }`}>
                        {new Date(message.createdAt).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex space-x-3 space-x-reverse">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  disabled={sendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-[#FF9800] text-white rounded-lg hover:bg-[#F57C00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">رفض المنتج</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">يرجى إدخال سبب الرفض</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سبب الرفض *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب رفض المنتج هنا..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 resize-none"
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  disabled={rejecting}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleRejectProduct}
                  disabled={!rejectionReason.trim() || rejecting}
                  className="btn-danger flex items-center"
                >
                  {rejecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري الرفض...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 ml-2" />
                      رفض المنتج
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="حذف المنتج"
        message="هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={confirmApprove}
        title="موافقة على المنتج"
        message="هل أنت متأكد من الموافقة على هذا المنتج؟"
        confirmText="موافقة"
        cancelText="إلغاء"
        type="success"
        loading={approving}
      />

      <ConfirmationModal
        isOpen={showReviewConfirm}
        onClose={() => {
          setShowReviewConfirm(false);
          setReviewAction(null);
        }}
        onConfirm={confirmReview}
        title={reviewAction === 'approve' ? 'إلغاء الموافقة' : 'إعادة النظر'}
        message={reviewAction === 'approve' 
          ? 'هل تريد إلغاء الموافقة على هذا المنتج؟'
          : 'هل تريد إعادة النظر في هذا المنتج؟'
        }
        confirmText="تأكيد"
        cancelText="إلغاء"
        type="warning"
      />

      {/* Lock/Unlock Modal */}
      {showLockModal && (
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