'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { ArrowLeft, Phone, Mail, MapPin, Package, Truck, CheckCircle, Clock, AlertCircle, MessageSquare, ExternalLink, MessageCircle, Edit, CheckCircle2, DollarSign, User, Calendar, Printer, X, Save, Copy, Check, Search, Trash2, ShoppingCart, Plus } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import OrderInvoice from '@/components/ui/OrderInvoice';
import CommentsSection from '@/components/ui/CommentsSection';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { hasPermission, hasAnyOfPermissions, PERMISSIONS } from '@/lib/permissions';

interface OrderItem {
  productId: {
    _id: string;
    name: string;
    images: string[];
  };
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  priceType: 'marketer' | 'wholesale';
}

interface Order {
  _id: string;
  orderNumber: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
  };
  customerRole: string;
  supplierId: {
    _id: string;
    name: string;
    companyName?: string;
  };
  items: OrderItem[];
  subtotal: number;
  commission: number;
  total: number;
  marketerProfit?: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    governorate: string;
    postalCode?: string;
    notes?: string;
    manualVillageName?: string; // Village name entered manually by marketer
    villageId?: number; // Village ID selected by admin
    villageName?: string; // Village name from database
  };
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  actualDelivery?: string;
  shippingCompany?: string;
  packageId?: number;
  adminNotes?: string;
  confirmedAt?: string;
  processingAt?: string;
  readyForShippingAt?: string;
  shippedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  returnedAt?: string;
  metadata?: {
    source?: string;
    easyOrdersOrderId?: string;
    easyOrdersStoreId?: string;
    easyOrdersStatus?: string;
    integrationId?: string;
  };
}

const statusConfig = {
  pending: {
    label: 'معلق',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    icon: Clock,
    description: 'الطلب في انتظار التأكيد'
  },
  confirmed: {
    label: 'مؤكد',
    color: 'bg-[#FF9800]/20 text-[#FF9800] dark:bg-[#FF9800]/30 dark:text-[#FF9800]',
    icon: CheckCircle,
    description: 'تم تأكيد الطلب'
  },
  processing: {
    label: 'قيد المعالجة',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    icon: Package,
    description: 'الطلب قيد التحضير'
  },
  ready_for_shipping: {
    label: 'جاهز للشحن',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
    icon: Package,
    description: 'الطلب جاهز للشحن'
  },
  shipped: {
    label: 'تم الشحن',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
    icon: Truck,
    description: 'تم شحن الطلب'
  },
  out_for_delivery: {
    label: 'خارج للتوصيل',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    icon: Truck,
    description: 'الطلب خارج للتوصيل'
  },
  delivered: {
    label: 'تم التسليم',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    icon: CheckCircle,
    description: 'تم تسليم الطلب بنجاح'
  },
  cancelled: {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    icon: AlertCircle,
    description: 'تم إلغاء الطلب'
  },
  returned: {
    label: 'مرتجع',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    icon: ExternalLink,
    description: 'تم إرجاع الطلب'
  },
  refunded: {
    label: 'مسترد',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: ExternalLink,
    description: 'تم استرداد المبلغ'
  }
};

// Available status options for order updates
const availableStatuses = [
  'pending',
  'confirmed', 
  'processing',
  'ready_for_shipping',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded'
];

export default function OrderDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true); // Default to true for backward compatibility
  const [showInvoice, setShowInvoice] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [updatingShipping, setUpdatingShipping] = useState(false);
  const [showShipConfirmModal, setShowShipConfirmModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shippingCompanies, setShippingCompanies] = useState<Array<{
    _id: string; 
    companyName: string;
    apiEndpointUrl?: string;
    apiToken?: string;
    shippingCities?: Array<{cityName: string; cityCode?: string; isActive: boolean}>;
    shippingRegions?: Array<{regionName: string; regionCode?: string; cities: string[]; isActive: boolean}>;
  }>>([]);
  const [villages, setVillages] = useState<Array<{villageId: number; villageName: string; deliveryCost?: number; areaId?: number}>>([]);
  const [companyCities, setCompanyCities] = useState<string[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<number | null>(null);
  const [filteredVillages, setFilteredVillages] = useState<Array<{villageId: number; villageName: string; deliveryCost?: number; areaId?: number}>>([]);
  const [loadingVillages, setLoadingVillages] = useState(false); // Loading state for villages
  const [shippingStatus, setShippingStatus] = useState<{type: 'success' | 'error' | 'info' | null; message: string}>({type: null, message: ''});
  const [packageStatus, setPackageStatus] = useState<'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | null>(null);
  const [resendingPackage, setResendingPackage] = useState(false);
  const [packageInfo, setPackageInfo] = useState<{
    externalPackageId?: number;
    deliveryCost?: number;
    qrCode?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeNotesTab, setActiveNotesTab] = useState<'order' | 'delivery' | 'admin'>('order');
  const [villageSearchQuery, setVillageSearchQuery] = useState<string>('');
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number>(-1);
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const villagesLoadedRef = useRef(false);
  const villageInputContainerRef = useRef<HTMLDivElement>(null);
  const [villageDropdownPos, setVillageDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  const searchParams = useSearchParams();
  const showRecommended = searchParams.get('showRecommended') === '1';
  const { addToCart } = useCart();

  // حارس الوصول: الأدمن يحتاج orders.view أو orders.manage لعرض تفاصيل الطلب
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const canAccess = hasAnyOfPermissions(user, [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE]);
    if (!canAccess) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Check for print parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get('print');
    if (shouldPrint === 'true' && order) {
      setShowInvoice(true);
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [order]);

  // WhatsApp communication functions
  const openWhatsApp = (phone: string, message: string) => {
    const formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '970'); // Convert to international format
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateOrderConfirmationMessage = () => {
    if (!order) return '';
    
    const customerName = order.shippingAddress?.fullName || 'العميل';
    const orderNumber = order.orderNumber;
    const totalAmount = order.total;
    const productNames = order.items.map(item => item.productName).join('، ');
    
    return `مرحباً ${customerName} 👋

تم تأكيد طلبك بنجاح! ✅

📋 رقم الطلب: ${orderNumber}
🛍️ المنتجات: ${productNames}
💰 المبلغ الإجمالي: ${totalAmount} ₪

سيتم التواصل معك قريباً لتأكيد التفاصيل النهائية.

شكراً لثقتك بنا 🙏`;
  };

  const generateOrderUpdateMessage = (newStatus: string) => {
    if (!order) return '';
    
    const customerName = order.shippingAddress?.fullName || 'العميل';
    const orderNumber = order.orderNumber;
    const statusLabel = statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus;
    
    return `مرحباً ${customerName} 👋

تم تحديث حالة طلبك 📦

📋 رقم الطلب: ${orderNumber}
🔄 الحالة الجديدة: ${statusLabel}

سنواصل إعلامك بأي تحديثات جديدة.

شكراً لصبرك 🙏`;
  };

  const handleWhatsAppConfirmation = () => {
    const message = generateOrderConfirmationMessage();
    const phone = order?.shippingAddress?.phone || '';
    if (phone) {
      openWhatsApp(phone, message);
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

  const handleWhatsAppUpdate = (newStatus: string) => {
    const message = generateOrderUpdateMessage(newStatus);
    const phone = order?.shippingAddress?.phone || '';
    if (phone) {
      openWhatsApp(phone, message);
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

  // Fetch package status and details
  const fetchPackageStatus = useCallback(async (packageId: number): Promise<string | null> => {
    try {
      const response = await fetch(`/api/packages?packageId=${packageId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.package) {
          setPackageStatus(data.package.status);
          // Store package info (externalPackageId, deliveryCost, qrCode)
          const info = {
            externalPackageId: data.package.externalPackageId,
            deliveryCost: data.package.deliveryCost,
            qrCode: data.package.qrCode
          };
          console.log('Package info fetched:', info); // Debug log
          setPackageInfo(info);
          return data.package.status;
        }
      }
    } catch (error) {
      console.error('Error fetching package status:', error);
    }
    return null;
  }, []);

  const fetchOrder = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        
        // Fetch package status if packageId exists
        if (data.order?.packageId) {
          fetchPackageStatus(data.order.packageId);
        } else {
          setPackageStatus(null);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'الطلب غير موجود');
        router.push('/dashboard/orders');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  }, [router, fetchPackageStatus]);

  // Smart search function - removes diacritics and normalizes text
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
      .replace(/[أإآ]/g, 'ا') // Normalize Alef variations
      .replace(/[ى]/g, 'ي') // Normalize Yeh variations
      .replace(/[ة]/g, 'ه') // Normalize Teh Marbuta
      .trim();
  }, []);

  // Smart village search function
  const searchVillages = useCallback((query: string, villagesList: typeof villages): typeof villages => {
    if (!query || query.trim() === '') {
      return villagesList;
    }

    const normalizedQuery = normalizeText(query.trim());
    
    return villagesList.filter((village) => {
      const villageName = village.villageName || '';
      const villageId = village.villageId?.toString() || '';
      
      // Normalize village name
      const normalizedName = normalizeText(villageName);
      
      // Check multiple search criteria:
      // 1. Exact match in village name
      // 2. Partial match in village name
      // 3. ID match
      // 4. Match in governorate (if village name contains " - ")
      const nameMatch = normalizedName.includes(normalizedQuery);
      const idMatch = villageId.includes(normalizedQuery);
      
      // Extract governorate if format is "المحافظة - اسم القرية"
      const parts = villageName.split(' - ');
      const governorateMatch = parts.length > 1 ? normalizeText(parts[0]).includes(normalizedQuery) : false;
      const villageOnlyMatch = parts.length > 1 ? normalizeText(parts[1]).includes(normalizedQuery) : false;
      
      return nameMatch || idMatch || governorateMatch || villageOnlyMatch;
    }).sort((a, b) => {
      // Sort by relevance: exact matches first, then partial matches
      const aName = normalizeText(a.villageName || '');
      const bName = normalizeText(b.villageName || '');
      const aStartsWith = aName.startsWith(normalizedQuery);
      const bStartsWith = bName.startsWith(normalizedQuery);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Then sort by exact match position
      const aIndex = aName.indexOf(normalizedQuery);
      const bIndex = bName.indexOf(normalizedQuery);
      if (aIndex !== bIndex) return aIndex - bIndex;
      
      return 0;
    });
  }, [normalizeText]);

  // Filter villages based on company's supported cities/regions
  const filterVillagesForCompany = useCallback((company: typeof shippingCompanies[0]) => {
    if (!company || villages.length === 0) {
      setFilteredVillages(villages);
      return;
    }

    // If company has no specific cities/regions, show all villages
    const hasCities = company.shippingCities && company.shippingCities.length > 0;
    const hasRegions = company.shippingRegions && company.shippingRegions.length > 0;
    
    if (!hasCities && !hasRegions) {
      setFilteredVillages(villages);
      return;
    }

    // Collect all city names from company
    const companyCityNames: string[] = [];
    
    // From shippingCities
    if (company.shippingCities) {
      company.shippingCities
        .filter((c: any) => c.isActive !== false)
        .forEach((c: any) => {
          if (c.cityName) companyCityNames.push(c.cityName);
        });
    }
    
    // From shippingRegions
    if (company.shippingRegions) {
      company.shippingRegions
        .filter((r: any) => r.isActive !== false)
        .forEach((r: any) => {
          if (r.cities && Array.isArray(r.cities)) {
            r.cities.forEach((city: string) => {
              if (city && !companyCityNames.includes(city)) companyCityNames.push(city);
            });
          }
        });
    }

    // Filter villages: village name format is usually "المحافظة - اسم القرية"
    // We'll match by checking if any part of the village name matches company cities
    const filtered = villages.filter((village) => {
      const villageName = village.villageName || '';
      // Check if village name contains any of the company city names
      return companyCityNames.some((cityName) => {
        // Try exact match or partial match
        return villageName.includes(cityName) || cityName.includes(villageName.split('-')[0]?.trim() || '');
      });
    });

    // If filtering resulted in empty list, show all villages (company might support all)
    setFilteredVillages(filtered.length > 0 ? filtered : villages);
  }, [villages]);

  const updateCitiesForCompany = useCallback((companyName: string, companies?: typeof shippingCompanies) => {
    const companiesList = companies || shippingCompanies;
    const selectedCompany = companiesList.find(c => c.companyName === companyName);
    
    if (selectedCompany) {
      const cities: string[] = [];
      // Add cities from shippingCities
      if (selectedCompany.shippingCities && Array.isArray(selectedCompany.shippingCities)) {
        selectedCompany.shippingCities
          .filter((c: any) => c.isActive !== false)
          .forEach((c: any) => {
            if (c.cityName) cities.push(c.cityName);
          });
      }
      // Add cities from shippingRegions
      if (selectedCompany.shippingRegions && Array.isArray(selectedCompany.shippingRegions)) {
        selectedCompany.shippingRegions
          .filter((r: any) => r.isActive !== false)
          .forEach((r: any) => {
            if (r.cities && Array.isArray(r.cities)) {
              r.cities.forEach((city: string) => {
                if (city && !cities.includes(city)) cities.push(city);
              });
            }
          });
      }
      setCompanyCities(cities);
      
      // Filter villages based on company cities/regions
      filterVillagesForCompany(selectedCompany);
    } else {
      setCompanyCities([]);
      // If no company selected, show all villages
      setFilteredVillages(villages);
    }
  }, [shippingCompanies, villages, filterVillagesForCompany]);

  const fetchShippingCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/external-companies');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.companies) {
          // Currently only UltraPal is supported, but structure is ready for multiple companies
          // Each company will have its own villages/cities configuration
          const activeCompanies = data.companies.filter((c: any) => 
            c.isActive && 
            c.apiEndpointUrl && 
            c.apiToken && 
            c.apiEndpointUrl.trim() !== '' && 
            c.apiToken.trim() !== ''
          );
          
          // For now, prioritize UltraPal but keep structure flexible
          const ultraPalCompany = activeCompanies.filter((c: any) => 
            c.companyName === 'UltraPal' || c.companyName === 'Ultra Pal'
          );
          
          const companies = ultraPalCompany.length > 0 ? ultraPalCompany : activeCompanies;
          setShippingCompanies(companies);
          
          // Load cities for UltraPal (current default company)
          if (companies.length > 0) {
            const defaultCompany = companies.find((c: { companyName: string }) => 
              c.companyName === 'UltraPal' || c.companyName === 'Ultra Pal'
            ) || companies[0];
            updateCitiesForCompany(defaultCompany.companyName, companies);
          }
          
          return companies;
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [updateCitiesForCompany]);

  const fetchVillages = useCallback(async () => {
    // Avoid reloading if villages are already loaded
    if (villagesLoadedRef.current) {
      return;
    }
    
    // Also check if villages are already loaded in state
    if (villages.length > 0) {
      villagesLoadedRef.current = true;
      return;
    }
    
    try {
      setLoadingVillages(true);
      const response = await fetch('/api/villages?limit=1000');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const sortedVillages = data.data
            .filter((v: any) => v.isActive !== false)
            .sort((a: any, b: any) => a.villageName.localeCompare(b.villageName, 'ar'))
            .map((v: any) => ({ 
              villageId: v.villageId, 
              villageName: v.villageName,
              deliveryCost: v.deliveryCost,
              areaId: v.areaId
            }));
          setVillages(sortedVillages);
          villagesLoadedRef.current = true;
        }
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب القرى');
    } finally {
      setLoadingVillages(false);
    }
  }, [villages.length]);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
    }
  }, [params.id, fetchOrder]);

  // Fetch recommended products when showRecommended=1 (after checkout success)
  useEffect(() => {
    if (!showRecommended || !order?._id || !user) return;
    const fetchRecommended = async () => {
      setLoadingRecommended(true);
      try {
        const res = await fetch(`/api/orders/${order._id}/recommended-products`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setRecommendedProducts(data.products);
        }
      } catch {
        setRecommendedProducts([]);
      } finally {
        setLoadingRecommended(false);
      }
    };
    fetchRecommended();
  }, [showRecommended, order?._id, user]);

  useEffect(() => {
    if (showShippingModal && user?.role === 'admin') {
      fetchShippingCompanies().then((loadedCompanies) => {
        // Auto-select company if:
        // 1. Order already has a shipping company, OR
        // 2. No company is set and there's only one company available
        // Always use UltraPal as the default shipping company
        // This prepares the structure for future multi-company support
        const defaultCompany = loadedCompanies.find((c: { companyName: string }) => 
          c.companyName === 'UltraPal' || c.companyName === 'Ultra Pal'
        ) || loadedCompanies[0];
        
        if (defaultCompany) {
          setShippingCompany('UltraPal'); // Standardized name
          updateCitiesForCompany(defaultCompany.companyName, loadedCompanies);
        }
      });
      fetchVillages();
    }
  }, [showShippingModal, user?.role, fetchShippingCompanies, updateCitiesForCompany, fetchVillages]);

  useEffect(() => {
    if (order) {
      // Always set shipping company to UltraPal as it's the only supported company
      setShippingCompany('UltraPal');
      setShippingCity(order.shippingAddress?.villageName || order.shippingAddress?.governorate || '');
    }
  }, [order]);

  // Update cities and filter villages when shippingCompany changes (after companies are loaded)
  useEffect(() => {
    if (shippingCompany && shippingCompanies.length > 0) {
      updateCitiesForCompany(shippingCompany);
    } else if (villages.length > 0) {
      // If no company selected, show all villages
      setFilteredVillages(villages);
    }
  }, [shippingCompany, shippingCompanies, villages, updateCitiesForCompany]);

  // Update filtered villages when villages are loaded
  useEffect(() => {
    if (villages.length > 0) {
      if (shippingCompany && shippingCompanies.length > 0) {
        const selectedCompany = shippingCompanies.find(c => c.companyName === shippingCompany);
        if (selectedCompany) {
          filterVillagesForCompany(selectedCompany);
        } else {
          setFilteredVillages(villages);
        }
      } else {
        setFilteredVillages(villages);
      }
    }
  }, [villages, shippingCompany, shippingCompanies, filterVillagesForCompany]);

  // Initialize selected village when order loads or when modal opens for this order.
  // Use stable deps (order id + village id) so we don't overwrite user's intentional clear on re-render.
  const orderId = order?._id?.toString();
  const orderVillageId = order?.shippingAddress?.villageId;
  const orderVillageName = order?.shippingAddress?.villageName;
  useEffect(() => {
    if (order?.shippingAddress?.villageId) {
      setSelectedVillageId(order.shippingAddress.villageId);
      // Set village name in search query to display it in the input field
      // Priority: order village name > villages list > empty
      if (order.shippingAddress?.villageName) {
        setVillageSearchQuery(order.shippingAddress.villageName);
      } else if (villages.length > 0) {
        // Try to find village name from villages list
        const village = villages.find(v => v.villageId === order.shippingAddress?.villageId);
        if (village?.villageName) {
          setVillageSearchQuery(village.villageName);
        }
      }
    } else {
      // Clear village selection if order doesn't have one
      setSelectedVillageId(null);
      setVillageSearchQuery('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- use stable deps to avoid overwriting user's clear on re-render
  }, [orderId, orderVillageId, orderVillageName, villages.length]);


  // Sync villageSearchQuery with selectedVillageId - ensures selected village name is always displayed
  // This effect only runs when selectedVillageId changes (not when user types)
  const prevSelectedVillageIdRef = useRef<number | null>(null);
  const isUserTypingRef = useRef(false);
  const userClearedVillageRef = useRef(false); // Prevents onFocus from repopulating after X clear

  // Update dropdown position for portal (prevents clipping by modal overflow)
  const updateVillageDropdownPosition = useCallback(() => {
    if (villageInputContainerRef.current && showVillageDropdown) {
      const rect = villageInputContainerRef.current.getBoundingClientRect();
      setVillageDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setVillageDropdownPos(null);
    }
  }, [showVillageDropdown]);

  useEffect(() => {
    if (showVillageDropdown && villageInputContainerRef.current) {
      const run = () => requestAnimationFrame(updateVillageDropdownPosition);
      run();
      const modalEl = document.querySelector('[data-shipping-modal]');
      const ro = new ResizeObserver(run);
      if (modalEl) ro.observe(modalEl);
      window.addEventListener('scroll', run, true);
      window.addEventListener('resize', run);
      return () => {
        ro.disconnect();
        window.removeEventListener('scroll', run, true);
        window.removeEventListener('resize', run);
        setVillageDropdownPos(null);
      };
    } else {
      setVillageDropdownPos(null);
    }
  }, [showVillageDropdown, updateVillageDropdownPosition]);
  
  useEffect(() => {
    // Only update if selectedVillageId actually changed (not just on every render) and user is not typing
    if (selectedVillageId && selectedVillageId !== prevSelectedVillageIdRef.current && !isUserTypingRef.current) {
      const selectedVillage = filteredVillages.find(v => v.villageId === selectedVillageId) || villages.find(v => v.villageId === selectedVillageId);
      if (selectedVillage?.villageName) {
        // Update the search query to show the selected village name
        setVillageSearchQuery(selectedVillage.villageName);
      }
      prevSelectedVillageIdRef.current = selectedVillageId;
    } else if (!selectedVillageId) {
      prevSelectedVillageIdRef.current = null;
    }
  }, [selectedVillageId, filteredVillages, villages]);

  // Apply search filter to villages - Real-time filtering
  useEffect(() => {
    if (villages.length === 0) return;
    
    let baseFiltered: typeof villages = [];
    
    // First apply company filter
    if (shippingCompany && shippingCompanies.length > 0) {
      const company = shippingCompanies.find((c: any) => c.companyName === shippingCompany);
      if (company) {
        const companyCityNames: string[] = [];
        
        if (company.shippingCities) {
          company.shippingCities
            .filter((c: any) => c.isActive !== false)
            .forEach((c: any) => {
              if (c.cityName) companyCityNames.push(c.cityName);
            });
        }
        
        if (company.shippingRegions) {
          company.shippingRegions
            .filter((r: any) => r.isActive !== false)
            .forEach((r: any) => {
              if (r.cities && Array.isArray(r.cities)) {
                r.cities.forEach((city: string) => {
                  if (city && !companyCityNames.includes(city)) companyCityNames.push(city);
                });
              }
            });
        }
        
        if (companyCityNames.length > 0) {
          baseFiltered = villages.filter((village) => {
            const villageName = village.villageName || '';
            return companyCityNames.some((cityName) => {
              return villageName.includes(cityName) || cityName.includes(villageName.split('-')[0]?.trim() || '');
            });
          });
          
          if (baseFiltered.length === 0) {
            baseFiltered = villages;
          }
        } else {
          baseFiltered = villages;
        }
      } else {
        baseFiltered = villages;
      }
    } else {
      baseFiltered = villages;
    }
    
    // Then apply search filter - Real-time
    if (villageSearchQuery.trim()) {
      const searchResults = searchVillages(villageSearchQuery, baseFiltered);
      setFilteredVillages(searchResults);
    } else {
      setFilteredVillages(baseFiltered);
    }
  }, [villageSearchQuery, villages, shippingCompany, shippingCompanies, searchVillages]);

  // Extract governorate from village name (format: "المحافظة - اسم القرية")
  const getGovernorateFromVillageName = (villageName: string): string => {
    if (!villageName) return '';
    const parts = villageName.split('-');
    return parts.length > 0 ? parts[0].trim() : '';
  };

  // Close village dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.village-search-container')) {
        setShowVillageDropdown(false);
      }
    };

    if (showVillageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showVillageDropdown]);


  const handleUpdateShipping = async () => {
    if (!order) return;
    
    // Check if shipping can be edited
    if (!canEditShipping()) {
      toast.error('لا يمكن تعديل معلومات الشحن بعد أن تم شحن الطلب إلى شركة الشحن');
      setShowShippingModal(false);
      return;
    }
    
    if (!shippingCompany || !shippingCompany.trim()) {
      toast.error('يرجى اختيار شركة الشحن');
      return;
    }
    
    // Use selectedVillageId if changed, otherwise use villageId from order
    const finalVillageId = selectedVillageId || order.shippingAddress?.villageId;
    
    if (!finalVillageId) {
      toast.error('يرجى اختيار القرية. القرية مطلوبة لإتمام عملية الشحن.');
      return;
    }

    // Validate village exists in filtered list (if company has restrictions)
    if (shippingCompany && filteredVillages.length > 0) {
      const villageExists = filteredVillages.some(v => v.villageId === finalVillageId);
      if (!villageExists) {
        toast.error('القرية المختارة غير متاحة لشركة الشحن المحددة. يرجى اختيار قرية أخرى.');
        return;
      }
    }

    try {
      setUpdatingShipping(true);
      
      // Get village name for update
      const selectedVillage = villages.find(v => v.villageId === finalVillageId);
      const villageName = selectedVillage?.villageName || order.shippingAddress?.villageName || '';
      
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shippingCompany: shippingCompany.trim(),
          shippingCity: shippingCity.trim(),
          villageId: finalVillageId,
          villageName: villageName,
          updateShippingOnly: true // Flag to update shipping without changing status
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShippingStatus({
          type: 'success',
          message: '✅ تم حفظ معلومات الشحن بنجاح'
        });
        toast.success('تم تحديث معلومات الشحن بنجاح');
        // Don't close modal after updating - allow user to ship immediately
        fetchOrder(order._id);
      } else {
        const error = await response.json();
        const errorMessage = error.error || error.message || 'حدث خطأ أثناء تحديث معلومات الشحن';
        setShippingStatus({
          type: 'error',
          message: `❌ ${errorMessage}`
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث معلومات الشحن';
      setShippingStatus({
        type: 'error',
        message: `❌ ${errorMessage}`
      });
      toast.error('حدث خطأ أثناء تحديث معلومات الشحن');
    } finally {
      setUpdatingShipping(false);
    }
  };

  const handleShipToCompany = async () => {
    if (!order) return;
    
    // Validate required fields
    if (!shippingCompany || !shippingCompany.trim()) {
      toast.error('يرجى اختيار شركة الشحن');
      setShippingStatus({
        type: 'error',
        message: '❌ يرجى اختيار شركة الشحن أولاً'
      });
      return;
    }
    
    // Use selectedVillageId if changed, otherwise use villageId from order
    const finalVillageId = selectedVillageId || order.shippingAddress?.villageId;
    
    if (!finalVillageId) {
      toast.error('يرجى اختيار القرية. القرية مطلوبة لإتمام عملية الشحن.');
      setShippingStatus({
        type: 'error',
        message: '❌ يرجى اختيار القرية أولاً'
      });
      return;
    }

    // Validate village exists in filtered list (if company has restrictions)
    if (shippingCompany && filteredVillages.length > 0) {
      const villageExists = filteredVillages.some(v => v.villageId === finalVillageId);
      if (!villageExists) {
        toast.error('القرية المختارة غير متاحة لشركة الشحن المحددة. يرجى اختيار قرية أخرى.');
        setShippingStatus({
          type: 'error',
          message: '❌ القرية المختارة غير متاحة لشركة الشحن المحددة'
        });
        return;
      }
    }

    // Get village name
    const selectedVillage = villages.find(v => v.villageId === finalVillageId);
    const villageName = selectedVillage?.villageName || order.shippingAddress?.villageName || '';
    let finalShippingCity = shippingCity.trim() || villageName || order.shippingAddress?.governorate || 'غير محدد';

    try {
      setUpdatingShipping(true);
      
      // First, update shipping info with selected village
      const updateResponse = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shippingCompany: shippingCompany.trim(),
          shippingCity: finalShippingCity.trim(),
          villageId: finalVillageId,
          villageName: villageName,
          updateShippingOnly: true
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        toast.error(error.error || 'حدث خطأ أثناء تحديث معلومات الشحن');
        return;
      }

      // Then, ship the order (this will create package and send to shipping company)
      // Ensure villageId is a number
      const villageIdToSend = finalVillageId ? parseInt(String(finalVillageId), 10) : undefined;
      
      setShippingStatus({type: 'info', message: 'جاري إرسال الطلب إلى شركة الشحن...'});
      
      const shipResponse = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'shipped',
          shippingCompany: shippingCompany.trim(),
          shippingCity: finalShippingCity.trim(),
          villageId: villageIdToSend
        }),
      });

      if (shipResponse.ok) {
        const shipData = await shipResponse.json();
        
        // Check if order was successfully shipped (apiSuccess field indicates if package was sent to shipping company)
        const apiSuccess = shipData.apiSuccess !== false; // Default to true if not specified (for backward compatibility)
        const packageId = shipData.order?.packageId;
        const selectedCompany = shippingCompanies.find(c => c.companyName === shippingCompany);
        const hasApiIntegration = selectedCompany?.apiEndpointUrl;
        
        if (!apiSuccess) {
          // Package was created but failed to send to shipping company
          const errorMessage = shipData.error || 'فشل إرسال الطرد إلى شركة الشحن';
          setShippingStatus({
            type: 'error',
            message: `⚠️ ${errorMessage}${packageId ? ` (رقم الطرد: ${packageId})` : ''}. يرجى المحاولة مرة أخرى أو استخدام زر "إعادة إرسال الطرد".`
          });
          
          toast.error(errorMessage, {
            duration: 5000
          });
          
          // Don't refresh order data - keep it in current state (order status should remain unchanged)
          return;
        }
        
        // Check if response indicates failure
        if (!shipData.success) {
          const errorMessage = shipData.error || 'فشل شحن الطلب';
          setShippingStatus({
            type: 'error',
            message: `⚠️ ${errorMessage}`
          });
          
          toast.error(errorMessage, {
            duration: 5000
          });
          
          return;
        }
        
        if (packageId) {
          // Fetch package status to verify it was sent successfully
          const statusResponse = await fetch(`/api/packages?packageId=${packageId}`);
          let currentStatus = 'pending';
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.package) {
              currentStatus = statusData.package.status;
              setPackageStatus(currentStatus as any);
              // Update package info with latest data
              setPackageInfo({
                externalPackageId: statusData.package.externalPackageId,
                deliveryCost: statusData.package.deliveryCost,
                qrCode: statusData.package.qrCode
              });
            }
          }
          
          // Only show success if package status is confirmed (successfully sent to API)
          // or if there's no API integration (package created in database only)
          const isSuccess = currentStatus === 'confirmed' || !hasApiIntegration;
          
          const statusMessage = isSuccess
            ? `✅ تم شحن الطلب بنجاح! رقم الطرد: ${packageId}${hasApiIntegration ? ' - تم إرساله إلى شركة الشحن' : ''}`
            : `⚠️ تم إنشاء الطرد (${packageId}) لكن فشل إرساله إلى شركة الشحن. يمكنك إعادة المحاولة.`;
          
          setShippingStatus({
            type: isSuccess ? 'success' : 'error',
            message: statusMessage
          });
          
          if (!isSuccess) {
            toast(`⚠️ تم إنشاء الطرد (${packageId}) لكن فشل إرساله. يمكنك إعادة المحاولة.`, {
              icon: '⚠️',
              duration: 5000
            });
            // Don't refresh order data - keep it in current state
            return;
          } else {
            toast.success(`✅ تم شحن الطلب بنجاح! رقم الطرد: ${packageId}`);
            
            // Refresh order data to get updated status
            await fetchOrder(order._id);
            
            // Close modal after short delay to show success message (only if successful)
            setTimeout(() => {
              setShowShippingModal(false);
              setShippingCompany('');
              setShippingCity('');
              setSelectedVillageId(null);
              setShippingStatus({type: null, message: ''});
            }, 2000);
          }
        } else {
          // No packageId but apiSuccess is true - this shouldn't happen, but handle gracefully
          if (apiSuccess) {
            setShippingStatus({
              type: 'success',
              message: '✅ تم تحديث حالة الطلب إلى "تم الشحن"'
            });
            toast.success('✅ تم تحديث حالة الطلب إلى "تم الشحن"');
            
            // Refresh order data to get updated status
            await fetchOrder(order._id);
          
            // Close modal after short delay
            setTimeout(() => {
              setShowShippingModal(false);
              setShippingCompany('');
              setShippingCity('');
              setSelectedVillageId(null);
              setShippingStatus({type: null, message: ''});
            }, 2000);
          } else {
            // apiSuccess is false but no packageId - this is an error state
            setShippingStatus({
              type: 'error',
              message: '⚠️ فشل شحن الطلب'
            });
            toast.error('فشل شحن الطلب');
          }
        }
      } else {
        const errorData = await shipResponse.json().catch(() => ({ error: 'خطأ غير معروف' }));
        
        // Parse error message for better user experience
        let userFriendlyMessage = errorData.error || errorData.message || 'حدث خطأ أثناء شحن الطلب';
        if (userFriendlyMessage.includes('villageId') || userFriendlyMessage.includes('village')) {
          userFriendlyMessage = 'خطأ في بيانات القرية. يرجى التأكد من اختيار قرية صحيحة.';
        } else if (userFriendlyMessage.includes('API') || userFriendlyMessage.includes('api')) {
          userFriendlyMessage = 'فشل الاتصال بشركة الشحن. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.';
        }
        
        setShippingStatus({
          type: 'error',
          message: `❌ ${userFriendlyMessage}`
        });
        toast.error(userFriendlyMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      
      setShippingStatus({
        type: 'error',
        message: `❌ خطأ في الاتصال: ${errorMessage}`
      });
      toast.error('حدث خطأ أثناء شحن الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setUpdatingShipping(false);
    }
  };

  const handleShipOrder = () => {
    if (!order) return;
    
    // Check if shipping data is available
    if (!order.shippingCompany || !order.shippingAddress?.city) {
      // Open shipping modal to add missing data
      setShowShippingModal(true);
      toast.error('يرجى إضافة بيانات الشحن أولاً');
      return;
    }

    // Show confirmation modal
    setShowShipConfirmModal(true);
  };

  const confirmShipOrder = async () => {
    if (!order) return;

    // Validate required fields
    const finalVillageId = order.shippingAddress?.villageId;
    if (!finalVillageId) {
      toast.error('يرجى تحديد القرية من بيانات الشحن أولاً');
      // Open shipping modal to add village
      setShowShippingModal(true);
      setShowShipConfirmModal(false);
      return;
    }

    try {
      setUpdating(true);
      setShowShipConfirmModal(false);
      
      // Ensure villageId is included (required for package creation)
      const villageIdToSend = parseInt(String(finalVillageId), 10);
      
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'shipped',
          shippingCompany: order.shippingCompany || (shippingCompany ? shippingCompany.trim() : '') || '',
          shippingCity: order.shippingAddress?.city || (shippingCity ? shippingCity.trim() : '') || '',
          villageId: villageIdToSend
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('تم شحن الطلب بنجاح');
        fetchOrder(order._id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'حدث خطأ أثناء شحن الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء شحن الطلب');
    } finally {
      setUpdating(false);
    }
  };

  // Resend package to shipping company
  const handleResendPackage = async () => {
    if (!order?._id) return;
    
    try {
      setResendingPackage(true);
      setShippingStatus({type: 'info', message: 'جاري إعادة إرسال الطرد...'});
      
      const response = await fetch(`/api/orders/${order._id}/resend-package`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPackageStatus('confirmed');
        // Update package info with latest data from resend response
        if (data.externalPackageId || data.deliveryCost !== undefined) {
          setPackageInfo({
            externalPackageId: data.externalPackageId,
            deliveryCost: data.deliveryCost,
            qrCode: data.qrCode
          });
        }
        setShippingStatus({
          type: 'success',
          message: `✅ تم إعادة إرسال الطرد بنجاح! رقم الطرد: ${data.packageId}`
        });
        toast.success(`✅ تم إعادة إرسال الطرد بنجاح! رقم الطرد: ${data.packageId}`);
        fetchOrder(order._id);
      } else {
        // Check if it's a retryable error (503, 502, 504, or other 5xx errors)
        const isRetryable = data.canRetry || (data.statusCode && data.statusCode >= 500);
        const errorMessage = data.message || 'خطأ غير معروف';
        
        setShippingStatus({
          type: 'error',
          message: `❌ ${errorMessage}${isRetryable ? ' يمكنك المحاولة مرة أخرى.' : ''}`
        });
        
        if (isRetryable) {
          toast(errorMessage + ' يمكنك المحاولة مرة أخرى بعد قليل.', {
            icon: '⚠️',
            duration: 5000
          });
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setShippingStatus({
        type: 'error',
        message: `❌ خطأ في الاتصال: ${errorMessage}`
      });
      toast.error('حدث خطأ أثناء إعادة إرسال الطرد');
    } finally {
      setResendingPackage(false);
    }
  };

  const updateOrderStatus = async () => {
    if (!order || !newStatus) {
      toast.error('يرجى اختيار حالة جديدة');
      return;
    }
    
    // Don't allow updating to the same status
    if (newStatus === order.status) {
      toast.error('الحالة المحددة هي نفس الحالة الحالية');
      return;
    }
    
    try {
      setUpdating(true);
      
      const updateData: any = {
        status: newStatus
      };
      
             // Add shipping company for shipped status (optional)
       if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
         if (shippingCompany.trim()) {
           updateData.shippingCompany = shippingCompany.trim();
         }
       }
      
      // Add notes if provided
      if (notes.trim()) {
        updateData.notes = notes.trim();
      }
      
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم تحديث حالة الطلب بنجاح');
        setShowStatusModal(false);
        setNewStatus('');
        setShippingCompany('');
        setNotes('');
        fetchOrder(order._id); // Refresh order data

        // Send WhatsApp notification if phone number is available and user opted in
        if (sendWhatsApp && order.shippingAddress?.phone) {
          // Small delay to ensure the order is updated first
          setTimeout(() => {
            handleWhatsAppUpdate(newStatus);
          }, 1000);
        }
        
        // Reset WhatsApp option for next time
        setSendWhatsApp(true);
      } else {
        const error = await response.json();
        toast.error(error.error || 'حدث خطأ أثناء تحديث الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الطلب');
    } finally {
      setUpdating(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!order?._id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${order._id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(data.message || 'تم حذف الطلب بنجاح');
        router.push('/dashboard/orders');
        return;
      }
      toast.error(data.error || 'فشل في حذف الطلب');
    } catch {
      toast.error('حدث خطأ أثناء حذف الطلب');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`تم نسخ ${fieldName} بنجاح`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('فشل نسخ النص');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date with relative time (e.g., "منذ 3 ساعات")
  const formatDateWithRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let relativeTime = '';
    if (diffMins < 1) {
      relativeTime = 'الآن';
    } else if (diffMins < 60) {
      relativeTime = `منذ ${diffMins} دقيقة`;
    } else if (diffHours < 24) {
      relativeTime = `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
      relativeTime = `منذ ${diffDays} يوم`;
    } else {
      relativeTime = formatDate(dateString);
    }
    
    return {
      full: formatDate(dateString),
      relative: relativeTime,
      date: date
    };
  };

  const canUpdateOrder = () => {
    if (!order || !user) return false;
    
    // Admin يحتاج orders.manage لتحديث الطلب
    if (user.role === 'admin') return hasPermission(user, PERMISSIONS.ORDERS_MANAGE);
    
    // Supplier can only update their own orders
    const actualSupplierId = order.supplierId._id || order.supplierId;
    return user.role === 'supplier' && actualSupplierId.toString() === user._id.toString();
  };

  // Check if shipping can be edited (not allowed after order is shipped)
  const canEditShipping = () => {
    if (!order) return false;
    
    // Cannot edit shipping if order is already shipped, out for delivery, or delivered
    const lockedStatuses = ['shipped', 'out_for_delivery', 'delivered'];
    return !lockedStatuses.includes(order.status);
  };

  const getAvailableStatuses = () => {
    if (!order) return [];
    
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['ready_for_shipping', 'cancelled'],
      'ready_for_shipping': ['shipped', 'cancelled'],
      'shipped': ['out_for_delivery', 'returned'],
      'out_for_delivery': ['delivered', 'returned'],
      'delivered': ['returned'],
      'cancelled': [],
      'returned': [],
      'refunded': []
    };
    
    return validTransitions[order.status] || [];
  };

  const openStatusModal = (status: string) => {
    setNewStatus(status);
    setShippingCompany('UltraPal'); // Always use UltraPal as default
    setNotes(order?.adminNotes || '');
    setShowStatusModal(true);
  };

  const getProcessingSteps = () => {
    const steps = [
      {
        id: 'pending',
        title: 'الطلب معلق',
        description: 'الطلب في انتظار التأكيد من الإدارة',
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        actions: ['confirmed', 'cancelled']
      },
      {
        id: 'confirmed',
        title: 'تم تأكيد الطلب',
        description: 'تم تأكيد الطلب وبدء المعالجة',
        icon: CheckCircle,
        color: 'text-[#FF9800]',
        bgColor: 'bg-[#FF9800]/10',
        actions: ['processing', 'cancelled']
      },
      {
        id: 'processing',
        title: 'قيد المعالجة',
        description: 'الطلب قيد التحضير والتجهيز',
        icon: Package,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        actions: ['ready_for_shipping', 'cancelled']
      },
      {
        id: 'ready_for_shipping',
        title: 'جاهز للشحن',
        description: 'الطلب جاهز للشحن والتوصيل',
        icon: Package,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        actions: ['shipped', 'cancelled']
      },
      {
        id: 'shipped',
        title: 'تم الشحن',
        description: 'تم شحن الطلب وتم إرساله',
        icon: Truck,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        actions: ['out_for_delivery', 'returned']
      },
      {
        id: 'out_for_delivery',
        title: 'خارج للتوصيل',
        description: 'الطلب خارج للتوصيل للعميل',
        icon: Truck,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        actions: ['delivered', 'returned']
      },
      {
        id: 'delivered',
        title: 'تم التسليم',
        description: 'تم تسليم الطلب بنجاح للعميل',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        actions: ['returned']
      }
    ];

    return steps.map(step => ({
      ...step,
      isCompleted: getStepCompletionStatus(step.id),
      isCurrent: order?.status === step.id,
      isUpcoming: getStepUpcomingStatus(step.id)
    }));
  };

  const getStepCompletionStatus = (stepId: string) => {
    const stepOrder = ['pending', 'confirmed', 'processing', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered'];
    const currentStepIndex = stepOrder.indexOf(order?.status || 'pending');
    const stepIndex = stepOrder.indexOf(stepId);
    return stepIndex < currentStepIndex;
  };

  const getStepUpcomingStatus = (stepId: string) => {
    const stepOrder = ['pending', 'confirmed', 'processing', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered'];
    const currentStepIndex = stepOrder.indexOf(order?.status || 'pending');
    const stepIndex = stepOrder.indexOf(stepId);
    return stepIndex > currentStepIndex;
  };

  const getProcessingTimeline = () => {
    const timeline = [];
    
    if (order?.confirmedAt) {
      timeline.push({
        date: order.confirmedAt,
        title: 'تم تأكيد الطلب',
        description: 'تم تأكيد الطلب من قبل الإدارة',
        icon: CheckCircle,
        color: 'text-green-600'
      });
    }
    
    if (order?.processingAt) {
      timeline.push({
        date: order.processingAt,
        title: 'بدء المعالجة',
        description: 'تم بدء معالجة وتجهيز الطلب',
        icon: Package,
        color: 'text-purple-600'
      });
    }
    
    if (order?.readyForShippingAt) {
      timeline.push({
        date: order.readyForShippingAt,
        title: 'جاهز للشحن',
        description: 'تم تجهيز الطلب للشحن',
        icon: Package,
        color: 'text-cyan-600'
      });
    }
    
    if (order?.shippedAt) {
      timeline.push({
        date: order.shippedAt,
        title: 'تم الشحن',
        description: `تم شحن الطلب عبر ${order.shippingCompany || 'شركة الشحن'}`,
        icon: Truck,
        color: 'text-indigo-600'
      });
    }
    
    if (order?.outForDeliveryAt) {
      timeline.push({
        date: order.outForDeliveryAt,
        title: 'خارج للتوصيل',
        description: 'الطلب خارج للتوصيل للعميل',
        icon: Truck,
        color: 'text-orange-600'
      });
    }
    
    if (order?.deliveredAt) {
      timeline.push({
        date: order.deliveredAt,
        title: 'تم التسليم',
        description: 'تم تسليم الطلب بنجاح للعميل',
        icon: CheckCircle,
        color: 'text-green-600'
      });
    }
    
    if (order?.cancelledAt) {
      timeline.push({
        date: order.cancelledAt,
        title: 'تم الإلغاء',
        description: 'تم إلغاء الطلب',
        icon: AlertCircle,
        color: 'text-red-600'
      });
    }
    
    if (order?.returnedAt) {
      timeline.push({
        date: order.returnedAt,
        title: 'تم الإرجاع',
        description: 'تم إرجاع الطلب',
        icon: ExternalLink,
        color: 'text-orange-600'
      });
    }
    
    return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9800] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل تفاصيل الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">الطلب غير موجود</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">الطلب الذي تبحث عنه غير موجود أو تم حذفه</p>
          <Link href="/dashboard/orders" className="btn-primary">
            العودة للطلبات
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const availableStatuses = getAvailableStatuses();

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 print:hidden">
      {/* Back Button + Delete (admin only) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link 
          href="/dashboard/orders" 
          className="btn-secondary min-h-[44px] text-sm sm:text-base px-3 sm:px-4 w-fit"
          aria-label="العودة إلى صفحة الطلبات"
        >
          <ArrowLeft className="w-4 h-4 ml-1.5 sm:ml-2" aria-hidden="true" />
          العودة للطلبات
        </Link>
        {user?.role === 'admin' && hasPermission(user, PERMISSIONS.ORDERS_MANAGE) && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger min-h-[44px] text-sm sm:text-base px-3 sm:px-4 flex items-center gap-1.5"
            aria-label="حذف الطلب"
          >
            <Trash2 className="w-4 h-4" />
            حذف الطلب
          </button>
        )}
      </div>

      {/* بطاقة الطلب الموحدة - رقم، حالة، إجمالي، تواريخ، دفع، إجراءات (بدون تكرار) */}
      <div className="card p-4 sm:p-5 mb-4 sm:mb-6 bg-gradient-to-br from-[#FF9800]/5 via-white to-[#FF9800]/5 dark:from-[#FF9800]/10 dark:via-gray-800 dark:to-[#FF9800]/10 border-2 border-[#FF9800]/20 dark:border-[#FF9800]/30">
        {/* صف أول: رقم الطلب + شارات + إجمالي */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${status.color}`}>
              <StatusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">الطلب #{order.orderNumber}</h1>
                <button onClick={() => copyToClipboard(`#${order.orderNumber}`, 'رقم الطلب')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="نسخ رقم الطلب" aria-label="نسخ رقم الطلب">
                  {copiedField === 'رقم الطلب' ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                </button>
                {order.metadata?.source === 'easy_orders' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[#FF9800]/10 text-[#FF9800] dark:bg-[#FF9800]/20 dark:text-[#FF9800] border border-[#FF9800]/20">
                    <span className="w-1 h-1 bg-[#FF9800] rounded-full" /> EasyOrders
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">{status.description}</p>
              {order.metadata?.easyOrdersOrderId && (
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                  EasyOrders: <code className="font-mono">{order.metadata.easyOrdersOrderId.substring(0, 12)}...</code>
                  {order.metadata.easyOrdersStatus && <span> ({order.metadata.easyOrdersStatus})</span>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">الإجمالي</p>
              <p className="text-base sm:text-lg font-bold text-[#FF9800] dark:text-[#FF9800]">{formatCurrency(order.total)}</p>
            </div>
          </div>
        </div>

        {/* صف واحد: تاريخ الإنشاء · طريقة الدفع · حالة الدفع · الشحن/التسليم */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="p-2 sm:p-2.5 bg-white/80 dark:bg-slate-700/80 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">تاريخ الإنشاء</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatDate(order.createdAt)}</p>
          </div>
          <div className="p-2 sm:p-2.5 bg-white/80 dark:bg-slate-700/80 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">طريقة الدفع</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : order.paymentMethod}</p>
          </div>
          <div className="p-2 sm:p-2.5 bg-white/80 dark:bg-slate-700/80 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">حالة الدفع</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{order.paymentStatus === 'pending' ? 'معلق' : order.paymentStatus === 'paid' ? 'مدفوع' : order.paymentStatus}</p>
          </div>
          <div className={`p-2 sm:p-2.5 rounded-lg border ${
            order.actualDelivery || order.deliveredAt
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : order.shippedAt
              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
              : 'bg-white/80 dark:bg-slate-700/80 border-gray-200 dark:border-slate-600'
          }`}>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">الشحن / التسليم</p>
            {order.actualDelivery ? (
              <p className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-200">✓ تم التسليم · {formatDateWithRelative(order.actualDelivery).relative}</p>
            ) : order.deliveredAt ? (
              <p className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-200">✓ تم التسليم · {formatDateWithRelative(order.deliveredAt).relative}</p>
            ) : order.shippedAt ? (
              <p className="text-xs sm:text-sm font-semibold text-indigo-800 dark:text-indigo-200">تم الشحن · {formatDateWithRelative(order.shippedAt).relative}</p>
            ) : (
              <p className="text-xs sm:text-sm font-semibold text-yellow-700 dark:text-yellow-300">⏳ قيد الانتظار</p>
            )}
          </div>
        </div>

        {/* إجراءات: أزرار الحالة + طباعة + اتصال + واتساب */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-600">
          {(() => {
            const steps = getProcessingSteps();
            const currentStep = steps.find(s => s.isCurrent);
            const hasStepActions = currentStep && canUpdateOrder() && currentStep.actions.length > 0;
            return (
              <>
                {hasStepActions && (
                  <div className="flex flex-wrap gap-1.5">
                    {currentStep!.actions.map(action => (
                      <button
                        key={action}
                        onClick={() => openStatusModal(action)}
                        className={`px-2.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                          action === 'cancelled' || action === 'returned'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-[#FF9800]/10 text-[#F57C00] hover:bg-[#FF9800]/20 dark:bg-[#FF9800]/20 dark:text-[#FFB74D] border border-[#FF9800]/30 dark:border-[#FF9800]/40'
                        }`}
                      >
                        {statusConfig[action as keyof typeof statusConfig]?.label || action}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowInvoice(true)} className="btn-secondary-solid flex items-center justify-center px-3 py-2 rounded-lg min-h-[36px] text-sm" title="طباعة الفاتورة">
                  <Printer className="w-4 h-4 ml-1" /> طباعة
                </button>
                {order.shippingAddress?.phone && (
                  <>
                    <a href={`tel:${order.shippingAddress.phone}`} className="btn-primary flex items-center justify-center px-3 py-2 rounded-lg min-h-[36px] text-sm">
                      <Phone className="w-4 h-4 ml-1" /> اتصال
                    </a>
                    <button onClick={handleWhatsAppConfirmation} className="flex items-center justify-center px-3 py-2 rounded-lg min-h-[36px] text-sm bg-[#25D366] hover:bg-[#20BD5A] text-white">
                      <MessageCircle className="w-4 h-4 ml-1" /> واتساب
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* قائمة المهام + سجل الأحداث - عرض أفقي مضغوط */}
          <div className="card p-4 sm:p-5">
            {/* صف واحد: قائمة المهام (أفقي) + التقدم */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-[#FF9800]" />
                قائمة المهام
              </h3>
              {(() => {
                const steps = getProcessingSteps();
                const completed = steps.filter(s => s.isCompleted).length;
                const pct = steps.length ? Math.round((completed / steps.length) * 100) : 0;
                return <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">{completed}/{steps.length} · {pct}%</span>;
              })()}
            </div>
            {/* شريط تقدم + خطوات أفقية */}
            {(() => {
              const steps = getProcessingSteps();
              const completedCount = steps.filter(s => s.isCompleted).length;
              const totalSteps = steps.length;
              const progressPercentage = totalSteps ? (completedCount / totalSteps) * 100 : 0;
              const currentStepIndex = steps.findIndex(s => s.isCurrent);
              const stepShortLabels: Record<string, string> = {
                pending: 'معلق',
                confirmed: 'تأكيد',
                processing: 'معالجة',
                ready_for_shipping: 'جاهز',
                shipped: 'شحن',
                out_for_delivery: 'توصيل',
                delivered: 'تسليم'
              };
              return (
                <>
                  <div className="mb-3">
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#FF9800] to-[#F57C00] rounded-full transition-all duration-500 relative" style={{ width: `${progressPercentage}%` }}>
                        {currentStepIndex >= 0 && <div className="absolute right-0 top-0 w-2 h-full bg-white dark:bg-slate-800 opacity-60 rounded-full animate-pulse" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
                    {steps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isLast = index === steps.length - 1;
                      const shortLabel = stepShortLabels[step.id] || step.title;
                      return (
                        <div key={step.id} className="flex items-center flex-shrink-0">
                          <div
                            title={step.title}
                            className={`flex flex-col items-center gap-1 min-w-[52px] sm:min-w-[56px] ${
                              step.isCurrent && canUpdateOrder() && step.actions.length > 0 ? 'pb-5' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                              step.isCompleted ? 'bg-green-500 text-white dark:bg-green-600' :
                              step.isCurrent ? 'bg-[#FF9800] text-white ring-2 ring-[#FF9800]/40 dark:ring-[#FF9800]/50' :
                              'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                            }`}>
                              {step.isCompleted ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[64px] truncate ${
                              step.isCompleted ? 'text-green-600 dark:text-green-400' : step.isCurrent ? 'text-[#F57C00] dark:text-[#FF9800]' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {step.isCurrent ? 'الحالية' : shortLabel}
                            </span>
                          </div>
                          {!isLast && (
                            <div className={`flex-shrink-0 w-3 sm:w-4 h-0.5 mx-0.5 rounded ${
                              step.isCompleted ? 'bg-green-400 dark:bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const currentStep = steps.find(s => s.isCurrent);
                    if (currentStep && canUpdateOrder() && currentStep.actions.length > 0) {
                      return <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">↑ الإجراءات في الشريط أعلاه</p>;
                    }
                    return null;
                  })()}
                </>
              );
            })()}

            {/* سجل الأحداث - عرض أفقي (حبوب/كروت صغيرة) */}
            {(() => {
              const timeline = getProcessingTimeline();
              if (order?.createdAt) {
                timeline.push({
                  date: order.createdAt,
                  title: 'إنشاء الطلب',
                  description: `تم إنشاء الطلب برقم #${order.orderNumber}`,
                  icon: Clock,
                  color: 'text-blue-600'
                });
              }
              const sortedTimeline = timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              return sortedTimeline.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#FF9800]" />
                    سجل الأحداث
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin flex-wrap">
                    {sortedTimeline.map((event, index) => {
                      const EventIcon = event.icon;
                      const iconBg = event.color?.includes('green') ? 'bg-green-500 dark:bg-green-600' :
                        event.color?.includes('blue') || event.color?.includes('indigo') ? 'bg-blue-500 dark:bg-blue-600' :
                        event.color?.includes('orange') ? 'bg-orange-500 dark:bg-orange-600' :
                        event.color?.includes('red') ? 'bg-red-500 dark:bg-red-600' : 'bg-gray-500 dark:bg-gray-600';
                      return (
                        <div
                          key={index}
                          title={`${event.title}\n${event.description}\n${formatDateWithRelative(event.date).full}`}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 flex-shrink-0 min-w-0 max-w-full sm:max-w-[220px]"
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 ${iconBg}`}>
                            <EventIcon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400" title={formatDateWithRelative(event.date).full}>
                              {formatDateWithRelative(event.date).relative}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* منتجات الطلب - مضغوط مع الحفاظ على المعلومات */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#FF9800]" />
                منتجات الطلب ({order.items.length})
              </h3>
              {order.items.length > 0 && (
                <span className="text-sm font-medium text-[#FF9800] dark:text-[#FF9800]">
                  إجمالي: {formatCurrency(order.subtotal)}
                </span>
              )}
            </div>
            {order.items.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="inline-flex justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                  <Package className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">لا توجد منتجات</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">التحقق من تفاصيل الطلب</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {order.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 hover:border-[#FF9800]/50 dark:hover:border-[#FF9800]/50 transition-colors">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-600">
                      {item.productId?.images?.length > 0 ? (
                        <MediaThumbnail
                          media={item.productId.images}
                          alt={item.productId.name || item.productName}
                          className="w-full h-full object-cover"
                          showTypeBadge={false}
                          width={56}
                          height={56}
                          fallbackIcon={<Package className="w-6 h-6 text-gray-400" />}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                            {item.productId?.name || item.productName}
                          </span>
                          {item.productId?._id && (
                            <Link
                              href={`/dashboard/products/${item.productId._id}`}
                              className="text-xs text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] flex items-center gap-0.5 flex-shrink-0"
                              title="عرض المنتج"
                            >
                              <ExternalLink className="w-3 h-3" />
                              عرض
                            </Link>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[#FF9800] dark:text-[#FF9800] flex-shrink-0">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        <span title="الكمية">الكمية: {item.quantity}</span>
                        <span className="text-gray-400 dark:text-gray-500">·</span>
                        <span title="سعر الوحدة">الوحدة: {formatCurrency(item.unitPrice)}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 ${
                          item.priceType === 'wholesale'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}>
                          {item.priceType === 'wholesale' ? 'جملة' : 'مسوق'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Unified Notes Section */}
          {(order.notes || (order as any).deliveryNotes || order.adminNotes) && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 ml-2 text-[#FF9800]" />
                الملاحظات
              </h3>
              
              {/* Notes Tabs */}
              <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                {order.notes && (
                  <button
                    onClick={() => setActiveNotesTab('order')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      activeNotesTab === 'order'
                        ? 'bg-[#FF9800] text-white dark:bg-[#FF9800] dark:text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    ملاحظات الطلب
                  </button>
                )}
                {(order as any).deliveryNotes && (
                  <button
                    onClick={() => setActiveNotesTab('delivery')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
                      activeNotesTab === 'delivery'
                        ? 'bg-[#FF9800] text-white dark:bg-[#FF9800] dark:text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    ملاحظات التوصيل
                  </button>
                )}
                {order.adminNotes && (
                  <button
                    onClick={() => setActiveNotesTab('admin')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      activeNotesTab === 'admin'
                        ? 'bg-[#FF9800] text-white dark:bg-[#FF9800] dark:text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    ملاحظات الإدارة
                  </button>
                )}
              </div>

              {/* Notes Content */}
              <div className="min-h-[60px]">
                {activeNotesTab === 'order' && order.notes && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {order.notes}
                    </p>
                  </div>
                )}
                {activeNotesTab === 'delivery' && (order as any).deliveryNotes && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">من المسوق</span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {(order as any).deliveryNotes}
                    </p>
                  </div>
                )}
                {activeNotesTab === 'admin' && order.adminNotes && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">من الإدارة</span>
                    </div>
                    <p className="text-sm sm:text-base text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                      {order.adminNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* معلومات الشحن والتوصيل - مضغوط مع الحفاظ على كافة المعلومات */}
            <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#FF9800]" />
                معلومات الشحن والتوصيل
              </h3>
              {user?.role === 'admin' && hasPermission(user, PERMISSIONS.ORDERS_MANAGE) && (
                <>
                  {canEditShipping() ? (
                    <button onClick={() => setShowShippingModal(true)} className="btn-secondary text-sm px-2.5 py-1 flex items-center" aria-label="تعديل معلومات الشحن">
                      <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" title="الطلب مُرسل لشركة الشحن">
                        <Truck className="w-3 h-3 ml-1" /> عند شركة الشحن
                      </span>
                      <button disabled className="btn-secondary text-sm px-2.5 py-1 flex items-center opacity-50 cursor-not-allowed" aria-label="تعديل مقفل"
                        title="لا يمكن تعديل معلومات الشحن بعد الشحن إلى شركة الشحن. للتعديل تواصل مع الشركة مباشرة.">
                        <Edit className="w-3.5 h-3.5 ml-1" /> تعديل
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            {!canEditShipping() && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/15 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                معلومات الشحن مقفلة. للتعديل تواصل مع شركة الشحن مباشرة.
              </p>
            )}

            {/* معلومات الشحن + التواريخ في كتلة واحدة مضغوطة */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {order.shippingCompany && (
                  <span className="text-blue-700 dark:text-blue-300">شركة الشحن: <strong className="text-blue-900 dark:text-blue-100">{order.shippingCompany}</strong></span>
                )}
                {(order.shippingAddress?.governorate || order.shippingAddress?.villageName) && (
                  <span className="text-gray-600 dark:text-gray-400">
                    {[order.shippingAddress?.governorate, order.shippingAddress?.villageName].filter(Boolean).join(' · ')}
                    {order.shippingAddress?.villageId && <span className="text-gray-500 dark:text-gray-500 mr-1">(ID: {order.shippingAddress.villageId})</span>}
                  </span>
                )}
                {order.shippingAddress?.manualVillageName && !order.shippingAddress?.villageName && (
                  <span className="text-yellow-700 dark:text-yellow-300">القرية (يدوي): {order.shippingAddress.manualVillageName}</span>
                )}
                {!order.shippingCompany && !order.shippingAddress?.governorate && !order.shippingAddress?.villageName && (
                  <span className="text-gray-500 dark:text-gray-400">لم يتم تحديد معلومات الشحن</span>
                )}
              </div>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> تاريخ الطلب</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(order.createdAt)}</span>
                </li>
                {order.shippedAt && (
                  <li className="flex items-center justify-between py-1 text-indigo-700 dark:text-indigo-300">
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> تاريخ الشحن</span>
                    <span className="font-medium">{formatDate(order.shippedAt)}</span>
                  </li>
                )}
                {order.deliveredAt && (
                  <li className="flex items-center justify-between py-1 text-green-700 dark:text-green-300">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> تاريخ التسليم</span>
                    <span className="font-medium">{formatDate(order.deliveredAt)}</span>
                  </li>
                )}
                {order.actualDelivery && (
                  <li className="flex items-center justify-between py-1 text-emerald-700 dark:text-emerald-300">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> التسليم الفعلي</span>
                    <span className="font-medium">{formatDate(order.actualDelivery)}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* معلومات الطرد - صفوف مضغوطة */}
            {order?.packageId && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#FF9800]" /> معلومات الطرد
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">رقم الطرد:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{order.packageId}</span>
                    <button onClick={() => copyToClipboard(order.packageId?.toString() || '', 'رقم الطرد')} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="نسخ رقم الطرد">
                      {copiedField === 'رقم الطرد' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />}
                    </button>
                  </span>
                  {packageInfo?.externalPackageId && (
                    <span className="flex items-center gap-1">
                      <span className="text-blue-600 dark:text-blue-400">Package ID:</span>
                      <span className="font-mono font-medium text-blue-900 dark:text-blue-100">{packageInfo.externalPackageId}</span>
                      <button onClick={() => copyToClipboard(packageInfo.externalPackageId!.toString(), 'Package ID')} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="نسخ Package ID">
                        {copiedField === 'Package ID' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                      </button>
                    </span>
                  )}
                  {packageInfo?.deliveryCost !== undefined && packageInfo.deliveryCost !== null && (
                    <span className="text-green-700 dark:text-green-300 font-medium">{packageInfo.deliveryCost}₪ تكلفة التوصيل</span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    packageStatus === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    packageStatus === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    packageStatus === 'shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    packageStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                  }`}>
                    {packageStatus === 'pending' ? '⏳ في انتظار الإرسال' : packageStatus === 'confirmed' ? '✅ تم الإرسال بنجاح' : packageStatus === 'processing' ? '🔄 قيد المعالجة' : packageStatus === 'shipped' ? '📦 تم الشحن' : packageStatus === 'delivered' ? '✓ تم التسليم' : packageStatus === 'cancelled' ? '❌ ملغي' : 'غير محدد'}
                  </span>
                </div>
                {packageInfo?.qrCode && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-purple-600 dark:text-purple-400">QR:</span>
                    <span className="text-xs font-mono text-purple-900 dark:text-purple-100 break-all">{packageInfo.qrCode}</span>
                    <button onClick={() => copyToClipboard(packageInfo.qrCode!, 'QR Code')} className="p-0.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded" title="نسخ QR Code">
                      {copiedField === 'QR Code' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
                    </button>
                  </div>
                )}
                {packageStatus === 'pending' && (
                  <button onClick={handleResendPackage} disabled={resendingPackage} className="mt-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 relative overflow-hidden">
                    {resendingPackage ? (<><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>جاري الإرسال...</span></>) : (<><Package className="w-3.5 h-3.5" /> إعادة الإرسال</>)}
                  </button>
                )}
              </div>
            )}
                  
            {/* إجراءات الإدارة - مضغوط */}
            {user?.role === 'admin' && hasPermission(user, PERMISSIONS.ORDERS_MANAGE) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#FF9800]" />
                  إجراءات الإدارة
                </h4>
                <div className="space-y-2">
                  {(order.status === 'ready_for_shipping' || order.status === 'processing' || order.status === 'confirmed') && 
                   (order.shippingCompany && (order.shippingAddress?.city || order.shippingAddress?.villageId)) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <h5 className="text-xs font-semibold text-gray-900 dark:text-white">إجراءات الشحن</h5>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={handleShipOrder}
                          disabled={updating}
                          className="btn-primary flex-1 flex items-center justify-center relative overflow-hidden min-h-[44px] shadow-md hover:shadow-lg transition-all"
                        >
                          {updating ? (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                              <div className="relative flex items-center">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2"></div>
                                <span className="animate-pulse">جاري الشحن...</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <Truck className="w-4 h-4 ml-2" />
                              شحن الطلب مباشرة
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowShippingModal(true)}
                          className="btn-secondary-solid flex items-center justify-center min-h-[44px] shadow-md hover:shadow-lg transition-all"
                        >
                          <Edit className="w-4 h-4 ml-2" />
                          إدارة الشحن
                        </button>
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - مضغوط */}
        <div className="space-y-4">
          {/* العميل والعنوان - كتلة واحدة مضغوطة */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#FF9800]" />
              العميل والعنوان
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">الاسم</span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{order.shippingAddress?.fullName || '—'}</span>
                  {order.shippingAddress?.fullName && (
                    <button onClick={() => copyToClipboard(order.shippingAddress!.fullName!, 'اسم العميل')} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="نسخ الاسم">
                      {copiedField === 'اسم العميل' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">الهاتف</span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{order.shippingAddress?.phone || '—'}</span>
                  {order.shippingAddress?.phone && (
                    <button onClick={() => copyToClipboard(order.shippingAddress!.phone!, 'رقم الهاتف')} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="نسخ رقم الهاتف">
                      {copiedField === 'رقم الهاتف' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />}
                    </button>
                  )}
                </div>
              </div>
              {order.shippingAddress && (
                <div className="pt-1.5">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> العنوان</span>
                    <button
                      onClick={() => {
                        const v = order.shippingAddress?.villageName;
                        const g = order.shippingAddress?.governorate;
                        const loc = (v && g && v === g) ? v : [v, g].filter(Boolean).join(' · ');
                        const parts = [order.shippingAddress?.street, loc, order.shippingAddress?.postalCode && `الرمز: ${order.shippingAddress.postalCode}`].filter(Boolean);
                        copyToClipboard(parts.join(' · '), 'العنوان');
                      }}
                      className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                      title="نسخ العنوان"
                    >
                      {copiedField === 'العنوان' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                    {(() => {
                      const v = order.shippingAddress?.villageName;
                      const g = order.shippingAddress?.governorate;
                      const loc = (v && g && v === g) ? v : [v, g].filter(Boolean).join(' · ');
                      return [order.shippingAddress?.street, loc, order.shippingAddress?.postalCode && `الرمز: ${order.shippingAddress.postalCode}`].filter(Boolean).join(' · ');
                    })()}
                    {order.shippingAddress?.villageId && <span className="text-gray-500 dark:text-gray-500"> (قرية #{order.shippingAddress.villageId})</span>}
                  </p>
                  {order.shippingAddress?.manualVillageName && !order.shippingAddress?.villageName && (
                    <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️ {order.shippingAddress.manualVillageName} (يدوي)</p>
                  )}
                </div>
              )}
              {order.shippingAddress?.notes && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 pt-1 border-t border-amber-100 dark:border-amber-900/30">ملاحظات: {order.shippingAddress.notes}</p>
              )}
            </div>
          </div>

          {/* الملخص المالي والأرباح - مضغوط بدون تكرار */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#FF9800]" />
              الملخص المالي
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">المجموع الفرعي</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">عمولة المنصة</span>
                <span className="font-medium text-[#4CAF50] dark:text-[#4CAF50]">{formatCurrency(order.commission)}</span>
              </div>
              {order.marketerProfit != null && order.marketerProfit > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500 dark:text-gray-400">ربح المسوق</span>
                  <span className="font-medium text-[#FF9800] dark:text-[#FF9800]">{formatCurrency(order.marketerProfit)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="font-bold text-gray-900 dark:text-white">الإجمالي</span>
                <span className="text-base font-bold text-[#FF9800] dark:text-[#FF9800]">{formatCurrency(order.total)}</span>
              </div>
            </div>
            {/* ربح المسوق / عمولة الإدارة - سطر واحد لكل منهما */}
            {user?.role === 'marketer' && order.customerRole === 'marketer' && order.marketerProfit != null && order.marketerProfit > 0 && (
              <div className={`mt-3 p-2 rounded-lg flex items-center justify-between gap-2 ${order.status === 'delivered' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-[#FF9800]/10 dark:bg-[#FF9800]/20'}`}>
                <span className="text-xs font-medium text-gray-900 dark:text-white">ربحك</span>
                <span className="text-sm font-bold text-[#FF9800] dark:text-[#FF9800]">{formatCurrency(order.marketerProfit)}</span>
                <span className={`text-[10px] flex items-center gap-1 ${order.status === 'delivered' ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                  {order.status === 'delivered' ? <><CheckCircle className="w-3 h-3" /> مُضاف لمحفظتك</> : <><Clock className="w-3 h-3" /> بانتظار اكتمال الطلب</>}
                </span>
              </div>
            )}
            {user?.role === 'admin' && (
              <div className={`mt-2 p-2 rounded-lg flex items-center justify-between gap-2 ${order.status === 'delivered' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20'}`}>
                <span className="text-xs font-medium text-gray-900 dark:text-white">عمولة الإدارة</span>
                <span className="text-sm font-bold text-[#4CAF50] dark:text-[#4CAF50]">{formatCurrency(order.commission)}</span>
                <span className={`text-[10px] flex items-center gap-1 ${order.status === 'delivered' ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                  {order.status === 'delivered' ? <><CheckCircle className="w-3 h-3" /> مُضافة</> : <><Clock className="w-3 h-3" /> بانتظار اكتمال الطلب</>}
                </span>
              </div>
            )}
          </div>


          {/* Comments Section */}
          <div className="card">
            <CommentsSection 
              entityType="order" 
              entityId={order._id} 
            />
          </div>
        </div>
      </div>

      {/* Recommended Products - Cross-sell بعد إتمام الطلب (Easy Orders Sync) */}
      {showRecommended && (user?.role === 'marketer' || user?.role === 'wholesaler') && (
        <div className="card mt-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-[#FF9800]" />
              منتجات مقترحة - أكمل طلبك
            </h3>
            <Link
              href="/dashboard/cart"
              className="btn-primary text-sm py-2 px-4 flex items-center gap-1"
            >
              <ShoppingCart className="w-4 h-4" />
              عرض السلة
            </Link>
          </div>
          {loadingRecommended ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF9800]"></div>
            </div>
          ) : recommendedProducts.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">
              لا توجد منتجات مقترحة حالياً
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendedProducts.map((product: any) => (
                <div
                  key={product._id}
                  className="group rounded-xl border-2 border-gray-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800 hover:border-[#FF9800]/50 transition-all"
                >
                  <Link href={`/dashboard/products/${product._id}`} className="block">
                    <div className="aspect-square relative bg-gray-100 dark:bg-slate-700">
                      <MediaThumbnail
                        media={product.images || []}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        width={200}
                        height={200}
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-[#FF9800] font-bold">
                        {(product.marketerPrice || product.wholesalerPrice || 0)} ₪
                      </p>
                    </div>
                  </Link>
                  <div className="p-3 pt-0">
                    {product.hasVariants ? (
                      <Link
                        href={`/dashboard/products/${product._id}`}
                        className="block w-full btn-secondary text-sm py-2 flex items-center justify-center gap-1 text-center"
                      >
                        اختر المتغير
                      </Link>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          addToCart(product as any, 1);
                          toast.success(`تم إضافة ${product.name} إلى السلة`);
                        }}
                        className="w-full btn-primary text-sm py-2 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        أضف للسلة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal - Enhanced */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#FF9800]/10 dark:bg-[#FF9800]/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-[#FF9800]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    تحديث حالة الطلب
                  </h3>
                </div>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="إغلاق النافذة"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
                             <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                   الحالة الجديدة
                 </label>
                 <select
                   value={newStatus}
                   onChange={(e) => setNewStatus(e.target.value)}
                   className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent"
                 >
                   <option value="">اختر الحالة</option>
                   {availableStatuses.map((status) => (
                     <option key={status} value={status}>
                       {statusConfig[status as keyof typeof statusConfig]?.label || status}
                     </option>
                   ))}
                 </select>
               </div>

               {/* Shipping Company - Required for shipped and out_for_delivery statuses */}
               {(newStatus === 'shipped' || newStatus === 'out_for_delivery') && (
                 <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                     شركة الشحن
                   </label>
                   <div className="relative">
                     <input
                       type="text"
                       value="UltraPal"
                       readOnly
                       className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                       title="شركة الشحن الحالية - UltraPal"
                     />
                     <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                       <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                       </svg>
                     </div>
                   </div>
                   <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                     شركة الشحن الافتراضية. يمكن إضافة شركات أخرى لاحقاً مع قرى مختلفة.
                   </p>
                 </div>
               )}

               {/* Notes Field */}
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                   ملاحظات إضافية
                 </label>
                 <textarea
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder="أدخل أي ملاحظات إضافية (اختياري)"
                   rows={3}
                   className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent resize-none"
                 />
               </div>
              
              {/* WhatsApp Notification Option */}
              {newStatus && order?.shippingAddress?.phone && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="sendWhatsApp"
                      checked={sendWhatsApp}
                      onChange={(e) => setSendWhatsApp(e.target.checked)}
                      className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="sendWhatsApp" className="mr-3 flex-1 cursor-pointer">
                      <div className="flex items-center mb-1">
                        <MessageCircle className="w-5 h-5 text-green-600 ml-2" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          إرسال إشعار للعميل عبر واتساب
                        </span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        سيتم إرسال رسالة تلقائية للعميل عبر واتساب لإعلامه بتحديث حالة الطلب
                      </p>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="btn-secondary-solid"
                >
                  إلغاء
                </button>
                <button
                  onClick={updateOrderStatus}
                  disabled={!newStatus || updating}
                  className="btn-primary flex items-center"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      تحديث الحالة
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Management Modal - Enhanced */}
      {showShippingModal && order && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200" data-shipping-modal>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    إدارة الشحن
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowShippingModal(false);
                    setShippingCompany(order.shippingCompany || '');
                    setShippingCity(order.shippingAddress?.city || order.shippingAddress?.villageName || '');
                    setSelectedVillageId(order.shippingAddress?.villageId || null);
                    setShippingStatus({type: null, message: ''});
                    // Don't reset villagesLoadedRef - keep villages loaded for next time
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="إغلاق النافذة"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Warning if Shipping is Locked */}
              {!canEditShipping() && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                        لا يمكن تعديل معلومات الشحن
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-300">
                        هذا الطلب قد تم شحنه إلى شركة الشحن ({order.shippingCompany || 'غير محدد'}). لا يمكن تعديل معلومات الشحن بعد الشحن. إذا كنت بحاجة إلى تعديل، يرجى التواصل مع شركة الشحن مباشرة.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    شركة الشحن
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="UltraPal"
                      readOnly
                      className="input-field bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      title="شركة الشحن الحالية - UltraPal"
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    شركة الشحن الافتراضية. يمكن إضافة شركات أخرى لاحقاً مع قرى مختلفة.
                  </p>
                </div>

                {/* Village Selection - Admin can select/change village */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    القرية <span className="text-red-500">*</span>
                  </label>
                  
                  {loadingVillages ? (
                    // Show loader while villages are loading
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="جاري تحميل القرى..."
                        disabled
                        className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-wait"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <div className="loading-spinner w-4 h-4"></div>
                      </div>
                    </div>
                  ) : filteredVillages.length > 0 ? (
                    <div className="village-search-container">
                      <div className="border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-[#FF9800] focus-within:border-transparent transition-all flex items-stretch min-h-[42px]" ref={villageInputContainerRef}>
                        {/* Clear (X) - fixed width slot, responsive with field height */}
                        <div className="flex-shrink-0 w-10 flex items-center justify-center min-w-[2.5rem]">
                          {(villageSearchQuery || selectedVillageId) ? (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                isUserTypingRef.current = false;
                                userClearedVillageRef.current = true;
                                setVillageSearchQuery('');
                                setSelectedVillageId(null);
                                setSelectedVillageIndex(-1);
                                setShowVillageDropdown(false);
                              }}
                              className="w-10 h-full min-h-[2.5rem] flex items-center justify-center rounded-l-lg hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-manipulation"
                              aria-label="مسح"
                            >
                              <X className="w-4 h-4 flex-shrink-0" />
                            </button>
                          ) : (
                            <span className="w-10 min-w-[2.5rem] flex-shrink-0" aria-hidden />
                          )}
                        </div>
                        <input
                          type="text"
                          value={villageSearchQuery}
                          onChange={(e) => {
                          const newValue = e.target.value;
                          isUserTypingRef.current = true;
                          setVillageSearchQuery(newValue);
                          setSelectedVillageIndex(-1);
                          // Clear selected village ID when user starts typing a different value
                          if (newValue && selectedVillageId) {
                            const currentVillageName = filteredVillages.find(v => v.villageId === selectedVillageId)?.villageName || villages.find(v => v.villageId === selectedVillageId)?.villageName;
                            if (newValue !== currentVillageName) {
                              setSelectedVillageId(null);
                            }
                          } else if (!newValue) {
                            // If user clears the field, clear selection
                            setSelectedVillageId(null);
                          }
                          // Reset typing flag after a delay
                          setTimeout(() => {
                            isUserTypingRef.current = false;
                          }, 100);
                          }}
                          onFocus={() => {
                          if (filteredVillages.length > 0) {
                            if (userClearedVillageRef.current) {
                              userClearedVillageRef.current = false;
                            } else if (selectedVillageId && !villageSearchQuery) {
                              const selectedVillage = filteredVillages.find(v => v.villageId === selectedVillageId) || villages.find(v => v.villageId === selectedVillageId);
                              if (selectedVillage) {
                                setVillageSearchQuery(selectedVillage.villageName);
                              }
                            }
                            setShowVillageDropdown(true);
                          }
                          }}
                          onClick={() => {
                          if (filteredVillages.length > 0) {
                            if (userClearedVillageRef.current) {
                              userClearedVillageRef.current = false;
                            } else if (selectedVillageId && !villageSearchQuery) {
                              const selectedVillage = filteredVillages.find(v => v.villageId === selectedVillageId) || villages.find(v => v.villageId === selectedVillageId);
                              if (selectedVillage) {
                                setVillageSearchQuery(selectedVillage.villageName);
                              }
                            }
                            setShowVillageDropdown(true);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Open dropdown on any key press if not already open
                          if (filteredVillages.length > 0 && !showVillageDropdown && e.key !== 'Escape' && e.key !== 'Enter') {
                            setShowVillageDropdown(true);
                          }
                          
                          // Escape: Clear search and close dropdown
                          if (e.key === 'Escape') {
                            setVillageSearchQuery('');
                            setSelectedVillageIndex(-1);
                            setShowVillageDropdown(false);
                            e.preventDefault();
                          }
                          // Enter: Select first result if only one, or selected one
                          else if (e.key === 'Enter') {
                            e.preventDefault();
                            const searchQuery = villageSearchQuery || '';
                            const displayVillages = searchQuery.trim() 
                              ? searchVillages(searchQuery, filteredVillages)
                              : filteredVillages;
                            
                            if (displayVillages.length > 0) {
                              const indexToSelect = selectedVillageIndex >= 0 ? selectedVillageIndex : 0;
                              if (displayVillages[indexToSelect]) {
                                const village = displayVillages[indexToSelect];
                                isUserTypingRef.current = false;
                                // مسح القديم واستبداله فوراً بالقيمة الجديدة
                                setSelectedVillageId(village.villageId);
                                setVillageSearchQuery(village.villageName);
                                setShippingCity(village.villageName);
                                setSelectedVillageIndex(-1);
                                setShowVillageDropdown(false);
                                toast.success(`تم اختيار: ${village.villageName}`);
                              }
                            }
                          }
                          // Arrow Down: Navigate down
                          else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const searchQuery = villageSearchQuery || '';
                            const displayVillages = searchQuery.trim() 
                              ? searchVillages(searchQuery, filteredVillages)
                              : filteredVillages;
                            
                            if (displayVillages.length > 0) {
                              setSelectedVillageIndex((prev) => 
                                prev < displayVillages.length - 1 ? prev + 1 : 0
                              );
                              setShowVillageDropdown(true);
                            }
                          }
                          // Arrow Up: Navigate up
                          else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const searchQuery = villageSearchQuery || '';
                            const displayVillages = searchQuery.trim() 
                              ? searchVillages(searchQuery, filteredVillages)
                              : filteredVillages;
                            
                            if (displayVillages.length > 0) {
                              setSelectedVillageIndex((prev) => 
                                prev > 0 ? prev - 1 : displayVillages.length - 1
                              );
                              setShowVillageDropdown(true);
                            }
                          }
                        }}
                        placeholder={
                          (villageSearchQuery || selectedVillageId)
                            ? undefined
                            : "ابحث عن القرية أو المحافظة أو ID..."
                        }
                        className="flex-1 min-w-0 py-2.5 px-2 border-0 bg-transparent text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-none focus:ring-0 focus:outline-none"
                        disabled={!canEditShipping()}
                        required
                        aria-label={canEditShipping() ? "بحث عن القرية" : "اختيار القرية غير متاح - الطلب عند شركة الشحن"}
                      />
                        {/* Search icon - fixed width slot, responsive with field height */}
                        <div className="flex-shrink-0 w-10 flex items-center justify-center min-w-[2.5rem] pointer-events-none text-gray-400 dark:text-gray-500 rounded-r-lg">
                          <Search className="w-4 h-4 flex-shrink-0" />
                        </div>
                      </div>
                      
                      {/* Dropdown List - Rendered via Portal to prevent modal overflow clipping */}
                      {showVillageDropdown && filteredVillages.length > 0 && villageDropdownPos && typeof document !== 'undefined' && createPortal(
                        <div
                          className="fixed z-[100] bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl shadow-xl ring-2 ring-[#FF9800]/20 max-h-60 overflow-y-auto"
                          style={{
                            top: villageDropdownPos.top,
                            left: villageDropdownPos.left,
                            width: villageDropdownPos.width,
                          }}
                        >
                          {(() => {
                            const searchQuery = villageSearchQuery || '';
                            const displayVillages = searchQuery.trim() 
                              ? searchVillages(searchQuery, filteredVillages)
                              : filteredVillages;
                            
                            if (displayVillages.length === 0) {
                              return (
                                <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                  لا توجد نتائج
                                </div>
                              );
                            }
                            
                            return displayVillages.map((village, index) => (
                              <button
                                key={village.villageId}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  isUserTypingRef.current = false;
                                  setSelectedVillageId(village.villageId);
                                  setVillageSearchQuery(village.villageName);
                                  setShippingCity(village.villageName);
                                  setSelectedVillageIndex(-1);
                                  setShowVillageDropdown(false);
                                  toast.success(`تم اختيار: ${village.villageName}`);
                                }}
                                className={`w-full text-right px-4 py-3 min-h-[44px] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                                    selectedVillageIndex === index && villageSearchQuery
                                    ? 'bg-[#FF9800] text-white hover:bg-[#F57C00]'
                                    : selectedVillageId === village.villageId || order.shippingAddress?.villageId === village.villageId
                                    ? 'bg-slate-100 dark:bg-slate-700/50 font-medium'
                                    : ''
                                }`}
                                onMouseEnter={() => setSelectedVillageIndex(index)}
                              >
                                <div className="text-sm text-gray-900 dark:text-slate-100">
                                  {village.villageName} (ID: {village.villageId})
                                </div>
                              </button>
                            ));
                          })()}
                        </div>,
                        document.body
                      )}
                      
                      {/* Hidden select for form validation */}
                      <select
                        value={selectedVillageId || order.shippingAddress?.villageId || ''}
                        onChange={() => {}}
                        className="hidden"
                        required
                        disabled={!canEditShipping()}
                      >
                        <option value=""></option>
                        {filteredVillages.map((village) => (
                          <option key={village.villageId} value={village.villageId}>
                            {village.villageName} (ID: {village.villageId})
                          </option>
                        ))}
                      </select>
                      {order.shippingAddress?.villageId && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          ℹ️ القرية الحالية محددة من قبل المسوق. يمكنك تغييرها إذا لزم الأمر.
                        </p>
                      )}
                      {villageSearchQuery ? (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          🔍 عرض {filteredVillages.length} من {villages.length} قرية بناءً على البحث
                        </p>
                      ) : shippingCompany && filteredVillages.length < villages.length && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ تم تصفية القرى حسب شركة الشحن المختارة ({filteredVillages.length} قرية متاحة)
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          {villageSearchQuery ? (
                            <>
                              لا توجد نتائج للبحث "<strong>{villageSearchQuery}</strong>". 
                              <button
                                onClick={() => setVillageSearchQuery('')}
                                className="text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] font-medium mr-1"
                              >
                                امسح البحث
                              </button>
                              لعرض جميع القرى.
                            </>
                          ) : villages.length === 0 ? (
                            'لا توجد قرى متاحة'
                          ) : shippingCompany ? (
                            'لا توجد قرى متاحة لشركة الشحن المختارة. سيتم عرض جميع القرى.'
                          ) : (
                            'يرجى اختيار شركة الشحن أولاً'
                          )}
                        </p>
                      </div>
                      {order.shippingAddress?.villageId && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            القرية الحالية: {order.shippingAddress?.villageName || 'غير محدد'} (ID: {order.shippingAddress.villageId})
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {order.shippingAddress?.manualVillageName && !order.shippingAddress?.villageId && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-800 dark:text-yellow-300">
                        ⚠️ تم إدخال اسم القرية يدوياً: {order.shippingAddress.manualVillageName}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        يرجى اختيار القرية الصحيحة من القائمة أعلاه.
                      </p>
                    </div>
                  )}
                </div>

                {/* City/Village Name - Show company cities when company is selected (optional) */}
                {shippingCompany && companyCities.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      المدينة/القرية (لشركة الشحن) <span className="text-xs text-gray-500">(اختياري)</span>
                    </label>
                    <select
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="input-field"
                    >
                      <option value="">اختر المدينة أو القرية من قائمة شركة الشحن (اختياري)</option>
                      {companyCities.map((city, idx) => (
                        <option key={idx} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      ⓘ اختياري: يمكنك اختيار المدينة من قائمة المدن المتاحة لشركة الشحن. القرية المحفوظة في الطلب: {order.shippingAddress?.villageName || 'غير محدد'}
                    </p>
                  </div>
                )}

                {/* Package Status Display */}
                {order?.packageId && (
                  <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                          رقم الطرد: {order.packageId}
                        </p>
                        {packageInfo?.externalPackageId && (
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                            Package ID: {packageInfo.externalPackageId}
                          </p>
                        )}
                        {packageInfo?.deliveryCost !== undefined && packageInfo.deliveryCost !== null && (
                          <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                            تكلفة التوصيل: {packageInfo.deliveryCost}₪
                          </p>
                        )}
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          الحالة: {
                            packageStatus === 'pending' ? '⏳ في انتظار الإرسال' :
                            packageStatus === 'confirmed' ? '✅ تم الإرسال بنجاح' :
                            packageStatus === 'processing' ? '🔄 قيد المعالجة' :
                            packageStatus === 'shipped' ? '📦 تم الشحن' :
                            packageStatus === 'delivered' ? '✓ تم التسليم' :
                            packageStatus === 'cancelled' ? '❌ ملغي' :
                            'غير محدد'
                          }
                        </p>
                        {packageInfo?.qrCode && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            QR Code: {packageInfo.qrCode}
                          </p>
                        )}
                      </div>
                      {packageStatus === 'pending' && (
                        <button
                          onClick={handleResendPackage}
                          disabled={resendingPackage}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center relative overflow-hidden min-w-[140px]"
                        >
                          {resendingPackage ? (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                              <div className="relative flex items-center">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2"></div>
                                <span className="animate-pulse">جاري الإرسال...</span>
                              </div>
                            </>
                          ) : (
                            'إعادة الإرسال'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Shipping Status Display */}
                {shippingStatus.type && shippingStatus.message && (
                  <div className={`p-3 rounded-lg border ${
                    shippingStatus.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : shippingStatus.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                  }`}>
                    <p className={`text-sm ${
                      shippingStatus.type === 'success'
                        ? 'text-green-800 dark:text-green-200'
                        : shippingStatus.type === 'error'
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-blue-800 dark:text-blue-200'
                    }`}>
                      {shippingStatus.message}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowShippingModal(false);
                      setShippingCompany(order.shippingCompany || '');
                      setShippingCity(order.shippingAddress?.city || order.shippingAddress?.villageName || '');
                    }}
                    disabled={updatingShipping}
                    className="btn-secondary"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleUpdateShipping}
                    disabled={!canEditShipping() || updatingShipping || !shippingCompany || !shippingCompany.trim() || !(selectedVillageId || order.shippingAddress?.villageId)}
                    className="btn-secondary flex items-center justify-center relative overflow-hidden min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={canEditShipping() ? "حفظ معلومات الشحن" : "حفظ معلومات الشحن غير متاح - الطلب عند شركة الشحن"}
                  >
                    {updatingShipping ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/30 dark:via-slate-600/30 to-transparent animate-shimmer"></div>
                        <div className="relative flex items-center">
                          <div className="w-4 h-4 border-2 border-gray-400/30 dark:border-slate-400/30 border-t-gray-600 dark:border-t-slate-200 rounded-full animate-spin ml-2"></div>
                          <span className="animate-pulse">جاري الحفظ...</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        حفظ معلومات الشحن
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleShipToCompany}
                    disabled={!canEditShipping() || updatingShipping || !shippingCompany || !shippingCompany.trim() || !(selectedVillageId || order.shippingAddress?.villageId)}
                    className="btn-primary flex items-center justify-center relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={canEditShipping() ? "شحن إلى شركة الشحن" : "شحن إلى شركة الشحن غير متاح - الطلب عند شركة الشحن"}
                  >
                    {updatingShipping ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        <div className="relative flex items-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2"></div>
                          <span className="animate-pulse">جاري الإرسال...</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 ml-2" />
                        شحن إلى شركة الشحن
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ship Order Confirmation Modal - Enhanced */}
      {showShipConfirmModal && order && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#FF9800]/10 dark:bg-[#FF9800]/20 rounded-lg">
                    <Truck className="w-5 h-5 text-[#FF9800]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    تأكيد شحن الطلب
                  </h3>
                </div>
                <button
                  onClick={() => setShowShipConfirmModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="إغلاق النافذة"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                        هل أنت متأكد من شحن هذا الطلب؟
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        سيتم تغيير حالة الطلب إلى "تم الشحن" ولن يمكن التراجع عن هذا الإجراء.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded">
                    <span className="text-gray-600 dark:text-gray-400">رقم الطلب:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">#{order.orderNumber}</span>
                  </div>
                  {order.shippingCompany && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded">
                      <span className="text-gray-600 dark:text-gray-400">شركة الشحن:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{order.shippingCompany}</span>
                    </div>
                  )}
                  {order.shippingAddress?.city && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded">
                      <span className="text-gray-600 dark:text-gray-400">المدينة:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {order.shippingAddress.city}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setShowShipConfirmModal(false)}
                  disabled={updating}
                  className="btn-secondary min-h-[44px] order-2 sm:order-1"
                  aria-label="إلغاء الشحن"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmShipOrder}
                  disabled={updating}
                  className="btn-primary flex items-center justify-center relative overflow-hidden min-h-[44px] min-w-[140px] order-1 sm:order-2"
                  aria-label="تأكيد شحن الطلب"
                >
                  {updating ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                      <div className="relative flex items-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2"></div>
                        <span className="animate-pulse">جاري الشحن...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 ml-2" />
                      تأكيد الشحن
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirm Modal (admin only) */}
      {showDeleteConfirm && order && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">حذف الطلب</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              هل أنت متأكد من حذف الطلب <strong className="text-gray-900 dark:text-slate-100">#{order.orderNumber}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteOrder}
                disabled={deleting}
                className="btn-danger flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    حذف الطلب
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Invoice Modal */}
      {order && (
        <OrderInvoice
          order={order}
          isVisible={showInvoice}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
} 