'use client';

import { useState, useEffect } from 'react';
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
import { Trash2, ShoppingCart, Truck, MapPin, Package, Calculator } from 'lucide-react';
import { ProductVariant, ProductVariantOption } from '@/types';
import VillageSelect from '@/components/ui/VillageSelect';

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
  villageId?: number;
  villageName?: string;
  deliveryCost?: number;
  postalCode?: string;
}

export default function CartPage() {
  const { user } = useAuth();
  const { items, removeFromCart, clearCart, updateQuantity } = useCart();
  const { settings } = useSettings();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [marketerPrices, setMarketerPrices] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState(''); // ملاحظات موحدة للطلب والتوصيل
  
  // Shipping address fields (includes customer info)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '', phone: '', street: '', postalCode: ''
  });
  const [shippingCalculation, setShippingCalculation] = useState<any>(null);

  useEffect(() => {
    if (user) {
      // Initialize shipping address with user data (only on first load)
      setShippingAddress(prev => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    // Initialize marketer prices with default values
    const initialPrices: Record<string, number> = {};
    items.forEach(item => {
      initialPrices[item.product._id] = item.price;
    });
    setMarketerPrices(initialPrices);
  }, [items]);

  // Calculate shipping cost when village or subtotal changes
  useEffect(() => {
    if (shippingAddress.villageId && shippingAddress.deliveryCost !== undefined) {
      const subtotal = items.reduce((total, item) => {
        const marketerPrice = marketerPrices[item.product._id] ?? item.price;
        return total + (marketerPrice * item.quantity);
      }, 0);

      // Use delivery cost from selected village
      const villageDeliveryCost = shippingAddress.deliveryCost || 0;
      const finalShippingCost = subtotal >= (settings?.defaultFreeShippingThreshold || 0) 
        ? 0 
        : villageDeliveryCost;

      setShippingCalculation({
        shippingCost: finalShippingCost,
        shippingMethod: 'الشحن الأساسي',
        shippingZone: shippingAddress.villageName || 'غير محدد',
        villageId: shippingAddress.villageId,
        villageName: shippingAddress.villageName
      });
    } else {
      setShippingCalculation(null);
    }
  }, [items, marketerPrices, shippingAddress, settings]);

  // Calculate totals and profits
  const subtotal = items.reduce((total, item) => {
    const marketerPrice = marketerPrices[item.product._id] ?? item.price;
    return total + (marketerPrice * item.quantity);
  }, 0);

  const shippingCost = shippingCalculation?.shippingCost || 0;
  const total = subtotal + shippingCost;

  // Calculate total marketer profit
  const totalMarketerProfit = items.reduce((profit, item) => {
    const marketerPrice = marketerPrices[item.product._id] ?? item.price;
    const basePrice = item.product.marketerPrice || item.price;
    return profit + ((marketerPrice - basePrice) * item.quantity);
  }, 0);

  // Handle village selection
  const handleVillageChange = (villageId: number, villageName: string, deliveryCost: number) => {
    setShippingAddress(prev => ({
      ...prev,
      villageId,
      villageName,
      deliveryCost
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
      if (!shippingAddress.villageId) { toast.error('القرية مطلوبة'); return; }

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
            villageId: shippingAddress.villageId,
            villageName: shippingAddress.villageName,
            deliveryCost: shippingAddress.deliveryCost
          },
          items: orderItems,
          notes: orderNotes, // Unified notes field
          shippingCost,
          shippingMethod: shippingCalculation?.shippingMethod || 'الشحن الأساسي',
          shippingZone: shippingCalculation?.villageName || shippingCalculation?.shippingZone || 'المنطقة الافتراضية',
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
      console.error('خطأ في إنشاء الطلب:', error);
      toast.error('حدث خطأ في إنشاء الطلب');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">سلة التسوق فارغة</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">لم تقم بإضافة أي منتجات إلى سلة التسوق بعد</p>
          <Button onClick={() => router.push('/dashboard/products')} className="btn-primary">
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 ml-2" />
                سلة التسوق ({items.length} منتج)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.product._id} className="flex items-center space-x-4 space-x-reverse p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                  <div className="flex-shrink-0">
                    <MediaThumbnail 
                      media={item.product.images} 
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {item.product.name}
                    </h3>
                    {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {Object.entries(item.selectedVariants).map(([name, value]) => `${name}: ${value}`).join(' - ')}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      المخزون: {item.variantOption ? item.variantOption.stockQuantity : item.product.stockQuantity} قطعة
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.product._id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.product._id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stockQuantity}
                    >
                      +
                    </Button>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 space-x-reverse mb-1">
                      <Input
                        type="number"
                        value={marketerPrices[item.product._id] ?? item.price}
                        onChange={(e) => handlePriceChange(item.product._id, parseFloat(e.target.value) || 0)}
                        className="w-20 text-sm"
                        min={item.product.minimumSellingPrice || 0}
                      />
                      <span className="text-sm text-gray-500">₪</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      المجموع: {(marketerPrices[item.product._id] ?? item.price) * item.quantity}₪
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item.product._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 ml-2" />
                عنوان الشحن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings?.shippingEnabled && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ نظام الشحن غير مفعل حالياً. يرجى التواصل مع الإدارة.
                  </p>
                </div>
              )}
              
              {settings?.shippingEnabled && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    اختر المنطقة والقرية لحساب تكلفة الشحن تلقائياً
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">اسم العميل *</Label>
                  <Input
                    id="fullName"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="اسم العميل الكامل"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <Input
                    id="phone"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="رقم الهاتف"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="street">عنوان الشارع *</Label>
                  <Input
                    id="street"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="عنوان الشارع أو المبنى"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <VillageSelect
                    value={shippingAddress.villageId}
                    onChange={handleVillageChange}
                    required
                    disabled={!settings?.shippingEnabled}
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">الرمز البريدي (اختياري)</Label>
                  <Input
                    id="postalCode"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="الرمز البريدي"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="orderNotes">الملاحظات (اختياري)</Label>
                  <Textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="ملاحظات عامة للطلب والتوصيل (مثل: موعد التوصيل المفضل، الطابق، رقم الشقة، تعليمات خاصة...)"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Cost Display */}
          {settings?.shippingEnabled && shippingCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="w-5 h-5 ml-2" />
                  تكلفة الشحن
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>تكلفة الشحن:</span>
                    <span className={shippingCalculation.shippingCost === 0 ? 'text-green-600' : ''}>
                      {shippingCalculation.shippingCost === 0 ? 'مجاني' : `${shippingCalculation.shippingCost}₪`}
                    </span>
                  </div>
                  {shippingCalculation.shippingCost === 0 && (
                    <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      ✓ الشحن مجاني للطلبات التي تتجاوز {settings.defaultFreeShippingThreshold}₪
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    القرية: {shippingCalculation.villageName || shippingCalculation.shippingZone}
                  </div>
                  {shippingCalculation.villageId && (
                    <div className="text-xs text-gray-400">
                      معرف القرية: {shippingCalculation.villageId}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="w-5 h-5 ml-2" />
                ملخص الطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{subtotal}₪</span>
                </div>
                
                {shippingCalculation && (
                  <>
                    <div className="flex justify-between">
                      <span>الشحن ({shippingCalculation.shippingMethod}):</span>
                      <span className={shippingCalculation.isFreeShipping ? 'text-green-600' : ''}>
                        {shippingCalculation.isFreeShipping ? 'مجاني' : `${shippingCalculation.shippingCost}₪`}
                      </span>
                    </div>
                    {shippingCalculation.isFreeShipping && (
                      <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        ✓ الشحن مجاني للطلبات التي تتجاوز {shippingCalculation.breakdown.freeShippingDiscount > 0 ? 'الحد المطلوب' : 'الحد المطلوب'}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      المنطقة: {shippingCalculation.shippingZone} | الوقت المتوقع: {shippingCalculation.estimatedDays}
                    </div>
                  </>
                )}
                
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع الكلي:</span>
                    <span>{total}₪</span>
                  </div>
                </div>
                
                {user?.role === 'marketer' && (
                  <div className="bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20 p-3 rounded-lg border border-[#4CAF50]/20 dark:border-[#4CAF50]/30">
                    <div className="text-sm font-medium text-[#2E7D32] dark:text-[#4CAF50] mb-1">ربح المسوق</div>
                    <div className="text-lg font-bold text-[#2E7D32] dark:text-[#4CAF50]">{totalMarketerProfit}₪</div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleCheckout}
                disabled={isLoading || items.length === 0}
                className="w-full btn-primary"
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