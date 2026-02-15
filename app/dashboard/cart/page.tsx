'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import GovernorateVillageSelect from '@/components/ui/GovernorateVillageSelect';
import { Trash2, ShoppingCart, Truck, MapPin, Package, Calculator, Check } from 'lucide-react';
import { ProductVariant, ProductVariantOption } from '@/types';

interface CartItem {
  product: {
    _id: string;
    name: string;
    images: string[];
    marketerPrice: number;
    wholesalerPrice: number;
    minimumSellingPrice?: number;
    isMinimumPriceMandatory?: boolean;
    stockQuantity: number;
    hasVariants?: boolean;
    variants?: ProductVariant[];
    variantOptions?: ProductVariantOption[];
  };
  quantity: number;
  price: number;
  selectedVariants?: Record<string, string>;
  variantOption?: ProductVariantOption;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  governorate?: string; // Governorate selected by marketer
  villageId?: number; // Village ID selected by marketer
  villageName?: string; // Village name selected by marketer
  deliveryCost?: number; // Delivery cost from village
  postalCode?: string;
  shippingRegionCode?: string; // Shipping region code from new system
}

export default function CartPage() {
  const { user } = useAuth();
  const { items, removeFromCart, clearCart, updateQuantity } = useCart();
  const { settings } = useSettings();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [marketerPrices, setMarketerPrices] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState(''); // ملاحظات موحدة للطلب والتوصيل
  const [shippingRegions, setShippingRegions] = useState<any[]>([]); // Store shipping regions for cost calculation
  
  // Shipping address fields (includes customer info)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '', phone: '', street: '', postalCode: '', governorate: '', villageId: undefined, villageName: '', deliveryCost: 0
  });

  // Fetch shipping regions on mount
  useEffect(() => {
    fetchShippingRegions();
  }, []);

  const fetchShippingRegions = async () => {
    try {
      // Add cache-busting with timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/settings/shipping?t=${timestamp}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.regions)) {
        setShippingRegions(data.regions);
      }
    } catch (error) {
      // Silently handle errors
      console.error('Error fetching shipping regions:', error);
    }
  };


  useEffect(() => {
    // Initialize marketer prices with default values
    // Use minimumSellingPrice as default if available, otherwise use item.price
    const initialPrices: Record<string, number> = {};
    items.forEach(item => {
      // Use minimumSellingPrice as suggested price if available
      if (item.product.minimumSellingPrice && item.product.minimumSellingPrice > 0) {
        initialPrices[item.product._id] = item.product.minimumSellingPrice;
      } else {
        initialPrices[item.product._id] = item.price;
      }
    });
    setMarketerPrices(initialPrices);
  }, [items]);


  // Calculate totals and profits
  const subtotal = items.reduce((total, item) => {
    const marketerPrice = marketerPrices[item.product._id] ?? item.price;
    return total + (marketerPrice * item.quantity);
  }, 0);

  // Calculate shipping cost from selected region
  const calculateShippingCostFromRegion = (regionName?: string, orderTotal: number = subtotal) => {
    if (!regionName || shippingRegions.length === 0) return 0;
    
    const region = shippingRegions.find((r: any) => r.regionName === regionName && r.isActive !== false);
    if (!region) return 0;
    
    // Check free shipping threshold
    const freeShippingThreshold = region.freeShippingThreshold || settings?.defaultFreeShippingThreshold || 500;
    if (orderTotal >= freeShippingThreshold) {
      return 0; // Free shipping
    }
    
    return region.shippingCost || 0;
  };

  // Recalculate shipping cost when subtotal or region changes (for free shipping threshold)
  const shippingCost = useMemo(() => {
    if (shippingAddress.shippingRegionCode) {
      return calculateShippingCostFromRegion(shippingAddress.shippingRegionCode, subtotal);
    }
    return shippingAddress.deliveryCost || 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddress.shippingRegionCode, shippingAddress.deliveryCost, subtotal, shippingRegions, settings]);
  
  const total = subtotal + shippingCost;

  // Calculate total marketer profit
  const totalMarketerProfit = items.reduce((profit, item) => {
    const marketerPrice = marketerPrices[item.product._id] ?? item.price;
    const basePrice = item.product.marketerPrice || item.price;
    return profit + ((marketerPrice - basePrice) * item.quantity);
  }, 0);

  // Handle governorate and village selection
  const handleGovernorateChange = (governorate: string, regionName?: string) => {
    const calculatedCost = calculateShippingCostFromRegion(regionName, subtotal);
    setShippingAddress(prev => ({
      ...prev,
      governorate,
      shippingRegionCode: regionName,
      deliveryCost: calculatedCost
    }));
  };

  const handleVillageChange = (villageId: number, villageName: string, deliveryCost: number, governorate: string, regionName?: string) => {
    // This function is called even when hideVillageSelect is true, but villageId will be 0
    // Only update region info - village will be selected by admin when shipping
    setShippingAddress(prev => ({
      ...prev,
      governorate,
      shippingRegionCode: regionName
      // Don't set villageId for marketers - admin will select it
      // villageId,
      // villageName,
      // deliveryCost
    }));
  };

  const handleRemove = (productId: string) => {
    removeFromCart(productId);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateQuantity(productId, newQuantity);
    }
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    setMarketerPrices(prev => ({
      ...prev,
      [productId]: newPrice
    }));
  };

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      // Validate customer information (from shipping address)
      if (!shippingAddress.fullName.trim()) { toast.error('اسم العميل مطلوب'); return; }
      if (!shippingAddress.phone.trim()) { toast.error('رقم الهاتف مطلوب'); return; }
      
      // Validate shipping address
      if (!shippingAddress.street.trim()) { toast.error('عنوان الشارع مطلوب'); return; }
      if (!shippingAddress.governorate || !shippingAddress.governorate.trim()) { 
        toast.error('المنطقة مطلوبة'); 
        return; 
      }
      // Village selection is not required for marketers - admin will select it when shipping
      // if (!shippingAddress.villageId) { 
      //   toast.error('القرية مطلوبة'); 
      //   return; 
      // }

      // Validate minimum selling prices
      for (const item of items) {
        const marketerPrice = marketerPrices[item.product._id] ?? item.price;
        if (item.product.minimumSellingPrice && item.product.isMinimumPriceMandatory) {
          if (marketerPrice < item.product.minimumSellingPrice) {
            toast.error(`السعر الأدنى المطلوب للمنتج "${item.product.name}" هو ${item.product.minimumSellingPrice}₪`);
            return;
          }
        }
      }

      if (settings) {
        if (subtotal < settings.minimumOrderValue) {
          toast.error(`الحد الأدنى للطلب هو ${settings.minimumOrderValue}₪`);
          return;
        }
        if (subtotal > settings.maximumOrderValue) {
          toast.error(`الحد الأقصى للطلب هو ${settings.maximumOrderValue}₪`);
          return;
        }
      }

      const orderItems = items.map(item => {
        const marketerPrice = marketerPrices[item.product._id] ?? item.price;
        const basePrice = item.product.marketerPrice || item.price;
        const marketerProfit = (marketerPrice - basePrice) * item.quantity;
        return {
          productId: item.product._id,
          quantity: item.quantity,
          customPrice: marketerPrice,
          marketerProfit,
          selectedVariants: item.selectedVariants,
          variantOption: item.variantOption
        };
      });

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: shippingAddress.fullName, // Use from shipping address
          customerPhone: shippingAddress.phone, // Use from shipping address
          shippingAddress: {
            ...shippingAddress,
            governorate: shippingAddress.governorate,
            villageId: shippingAddress.villageId,
            villageName: shippingAddress.villageName,
            deliveryCost: shippingAddress.deliveryCost,
            shippingRegionCode: shippingAddress.shippingRegionCode
          },
          items: orderItems,
          notes: orderNotes, // Unified notes field
          shippingCost: shippingCost,
          shippingMethod: 'الشحن الأساسي',
          shippingZone: shippingAddress.governorate || '',
          orderTotal: total
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('تم إنشاء الطلب بنجاح');
        clearCart();
        router.push('/dashboard/orders');
      } else {
        toast.error(data.message || 'حدث خطأ في إنشاء الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ في إنشاء الطلب');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">سلة التسوق فارغة</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mb-4 sm:mb-6">لم تقم بإضافة أي منتجات إلى سلة التسوق بعد</p>
          <Button onClick={() => router.push('/dashboard/products')} className="btn-primary min-h-[44px] text-sm sm:text-base px-4 sm:px-6">
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  // خطوات إتمام الطلب
  const step1Complete = items.length > 0;
  const step2Complete = !!(
    shippingAddress.fullName?.trim() &&
    shippingAddress.phone?.trim() &&
    shippingAddress.street?.trim() &&
    shippingAddress.governorate?.trim()
  );

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      {/* مؤشر الخطوات */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto" role="list" aria-label="خطوات إتمام الطلب">
          <div className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step1Complete ? 'bg-[#4CAF50] text-white' : 'bg-[#FF9800] text-white'
            }`}>
              {step1Complete ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : '1'}
            </div>
            <span className="mt-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">المنتجات</span>
          </div>
          <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 ${step1Complete ? 'bg-[#4CAF50]' : 'bg-gray-200 dark:bg-slate-600'}`} aria-hidden />
          <div className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step2Complete ? 'bg-[#4CAF50] text-white' : step1Complete ? 'bg-[#FF9800] text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
            }`}>
              {step2Complete ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : '2'}
            </div>
            <span className="mt-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">العناوين</span>
          </div>
          <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 ${step2Complete ? 'bg-[#4CAF50]' : 'bg-gray-200 dark:bg-slate-600'}`} aria-hidden />
          <div className="flex flex-col items-center flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400">
              3
            </div>
            <span className="mt-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">التأكيد</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card className="p-3 sm:p-4 md:p-6">
            <CardHeader className="p-0 pb-3 sm:pb-4">
              <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                سلة التسوق ({items.length} منتج)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-0">
              {items.map((item) => (
                <div key={item.product._id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl">
                  {/* Product Image and Info */}
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <MediaThumbnail 
                        media={item.product.images} 
                        alt={item.product.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover"
                        width={64}
                        height={64}
                        priority={items.indexOf(item) < 3}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 truncate mb-1">
                        {item.product.name}
                      </h3>
                      {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                        <div className="mb-1">
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {Object.entries(item.selectedVariants).map(([name, value]) => `${name}: ${value}`).join(' - ')}
                          </p>
                        </div>
                      )}
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                        المخزون: {item.variantOption ? item.variantOption.stockQuantity : item.product.stockQuantity} قطعة
                      </p>
                    </div>
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 sm:gap-2">
                    <div className="flex items-center space-x-2 space-x-reverse bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.product._id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-0"
                      >
                        -
                      </Button>
                      <span className="w-8 sm:w-10 text-center text-sm sm:text-base font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.product._id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stockQuantity}
                        className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-0"
                      >
                        +
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(item.product._id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 min-w-[44px] min-h-[44px] p-0"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                  
                  {/* Price and Total */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-slate-700">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="relative">
                          <Input
                            type="number"
                            value={marketerPrices[item.product._id] ?? item.price}
                            onChange={(e) => handlePriceChange(item.product._id, parseFloat(e.target.value) || 0)}
                            className={`w-20 sm:w-24 text-sm sm:text-base min-h-[44px] ${
                              item.product.isMinimumPriceMandatory && item.product.minimumSellingPrice
                                ? 'border-orange-500 dark:border-orange-500 focus:ring-orange-500 dark:focus:ring-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                : ''
                            }`}
                            min={item.product.minimumSellingPrice || 0}
                          />
                          {item.product.isMinimumPriceMandatory && item.product.minimumSellingPrice && (
                            <span className="absolute -top-2 -right-2 text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full border border-orange-300 dark:border-orange-700">
                              إلزامي
                            </span>
                          )}
                        </div>
                        <span className={`text-sm sm:text-base font-medium ${
                          item.product.isMinimumPriceMandatory && item.product.minimumSellingPrice
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-500 dark:text-slate-400'
                        }`}>₪</span>
                      </div>
                      {item.product.minimumSellingPrice && item.product.minimumSellingPrice > 0 && (
                        <p className={`text-xs text-right ${
                          item.product.isMinimumPriceMandatory && item.product.minimumSellingPrice
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          السعر المقترح: {item.product.minimumSellingPrice} ₪
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-0.5">المجموع:</p>
                      <p className={`text-sm sm:text-base font-semibold ${
                        item.product.isMinimumPriceMandatory && item.product.minimumSellingPrice
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-900 dark:text-slate-100'
                      }`}>
                        {(marketerPrices[item.product._id] ?? item.price) * item.quantity}₪
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="p-3 sm:p-4 md:p-6">
            <CardHeader className="p-0 pb-3 sm:pb-4">
              <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                عنوان الشحن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-0">
              {!settings?.shippingEnabled && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2.5 sm:p-3 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-xs sm:text-sm">
                    ⚠️ نظام الشحن غير مفعل حالياً. يرجى التواصل مع الإدارة.
                  </p>
                </div>
              )}
              
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="fullName" className="text-xs sm:text-sm mb-1.5 sm:mb-2">اسم العميل *</Label>
                  <Input
                    id="fullName"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="اسم العميل الكامل"
                    required
                    className="text-sm sm:text-base min-h-[44px]"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs sm:text-sm mb-1.5 sm:mb-2">رقم الهاتف *</Label>
                  <Input
                    id="phone"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="رقم الهاتف"
                    required
                    className="text-sm sm:text-base min-h-[44px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="street" className="text-xs sm:text-sm mb-1.5 sm:mb-2">عنوان الشارع *</Label>
                  <Input
                    id="street"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="عنوان الشارع أو المبنى"
                    required
                    className="text-sm sm:text-base min-h-[44px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <GovernorateVillageSelect
                    governorate={shippingAddress.governorate}
                    villageId={shippingAddress.villageId}
                    onGovernorateChange={handleGovernorateChange}
                    onVillageChange={handleVillageChange}
                    required
                    disabled={!settings?.shippingEnabled}
                    label="المنطقة"
                    hideVillageSelect={true}
                  />
                  {shippingAddress.shippingRegionCode && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-green-600 dark:text-green-400">
                        المنطقة المحددة: {shippingAddress.governorate}
                      </p>
                      {shippingCost > 0 ? (
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">
                          تكلفة الشحن: {shippingCost}₪
                        </p>
                      ) : subtotal >= (settings?.defaultFreeShippingThreshold || 500) ? (
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">
                          الشحن مجاني (المجموع يتجاوز الحد الأدنى)
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="postalCode" className="text-xs sm:text-sm mb-1.5 sm:mb-2">الرمز البريدي (اختياري)</Label>
                  <Input
                    id="postalCode"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="الرمز البريدي"
                    className="text-sm sm:text-base min-h-[44px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="orderNotes" className="text-xs sm:text-sm mb-1.5 sm:mb-2">الملاحظات (اختياري)</Label>
                  <Textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="ملاحظات عامة للطلب والتوصيل (مثل: موعد التوصيل المفضل، الطابق، رقم الشقة، تعليمات خاصة...)"
                    rows={3}
                    className="text-sm sm:text-base min-h-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Cost Notice */}
          {settings?.shippingEnabled && (
            <Card className="p-3 sm:p-4 md:p-6">
              <CardHeader className="p-0 pb-3 sm:pb-4">
                <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  معلومات الشحن
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 sm:p-3">
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {(shippingAddress.deliveryCost && shippingAddress.deliveryCost > 0)
                      ? `ⓘ تكلفة الشحن: ${shippingAddress.deliveryCost}₪`
                      : 'ⓘ يرجى اختيار المحافظة والقرية لحساب تكلفة الشحن'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-3 sm:p-4 md:p-6 sticky top-4">
            <CardHeader className="p-0 pb-3 sm:pb-4">
              <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                ملخص الطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-0">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-slate-400">المجموع الفرعي:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">{subtotal}₪</span>
                </div>
                
                <div className="flex justify-between text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                  <span>الشحن:</span>
                  {shippingAddress.shippingRegionCode ? (
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {shippingCost > 0 ? `${shippingCost}₪` : 'مجاني'}
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs">سيتم الحساب بعد مراجعة الإدارة</span>
                  )}
                </div>
                
                <div className="border-t border-gray-200 dark:border-slate-700 pt-2 sm:pt-3">
                  <div className="flex justify-between font-bold text-base sm:text-lg md:text-xl">
                    <span className="text-gray-900 dark:text-slate-100">المجموع الكلي:</span>
                    <span className="text-[#FF9800] dark:text-[#FF9800]">{total}₪</span>
                  </div>
                </div>
                
                {user?.role === 'marketer' && (
                  <div className="bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20 p-2.5 sm:p-3 rounded-lg border border-[#4CAF50]/20 dark:border-[#4CAF50]/30">
                    <div className="text-xs sm:text-sm font-medium text-[#2E7D32] dark:text-[#4CAF50] mb-1">ربح المسوق</div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-[#2E7D32] dark:text-[#4CAF50]">{totalMarketerProfit}₪</div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleCheckout}
                disabled={isLoading || items.length === 0}
                className="w-full btn-primary min-h-[44px] text-sm sm:text-base font-medium mt-4 sm:mt-6"
              >
                {isLoading ? 'جاري إنشاء الطلب...' : 'إنشاء الطلب'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}