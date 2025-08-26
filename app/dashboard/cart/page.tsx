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
    variants?: any[];
    variantOptions?: any[];
  };
  quantity: number;
  price: number;
  selectedVariants?: Record<string, string>;
  variantOption?: any;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorate: string;
  postalCode?: string;
  notes?: string;
}

export default function CartPage() {
  const { user } = useAuth();
  const { items, removeFromCart, clearCart, updateQuantity } = useCart();
  const { settings } = useSettings();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [marketerPrices, setMarketerPrices] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Shipping address fields
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '', phone: '', street: '', city: '', governorate: '', postalCode: '', notes: ''
  });
  const [shippingCalculation, setShippingCalculation] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');
      setShippingAddress(prev => ({
        ...prev,
        fullName: user.name || '',
        phone: user.phone || ''
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

  // Calculate shipping cost when address or subtotal changes
  useEffect(() => {
    if (settings && shippingAddress.city && shippingAddress.governorate) {
      const subtotal = items.reduce((total, item) => {
        const marketerPrice = marketerPrices[item.product._id] ?? item.price;
        return total + (marketerPrice * item.quantity);
      }, 0);

      // Simple shipping calculation based on governorate
      const shippingCost = getShippingCost(shippingAddress.governorate);
      const finalShippingCost = subtotal >= (settings.defaultFreeShippingThreshold || 0) ? 0 : shippingCost;

      setShippingCalculation({
        shippingCost: finalShippingCost,
        shippingMethod: 'الشحن الأساسي',
        shippingZone: shippingAddress.governorate
      });
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

  // Extract cities and governorates from admin's shipping settings
  const getAvailableGovernorates = () => {
    if (!settings?.governorates || settings.governorates.length === 0) {
      console.log('No governorates found in settings');
      return [];
    }
    const governorates = settings.governorates
      .filter(governorate => governorate.isActive)
      .map(governorate => governorate.name)
      .sort();
    console.log('Available governorates:', governorates);
    return governorates;
  };

  // Get cities for a specific governorate
  const getCitiesForGovernorate = (governorateName: string) => {
    if (!settings?.governorates || settings.governorates.length === 0) {
      console.log('No governorates found in settings');
      return [];
    }
    const governorate = settings.governorates.find(g => g.name === governorateName && g.isActive);
    if (!governorate) {
      console.log('Governorate not found:', governorateName);
      return [];
    }
    const cities = governorate.cities || [];
    console.log(`Cities for governorate "${governorateName}":`, cities);
    return cities.sort();
  };

  const availableGovernorates = getAvailableGovernorates();
  const availableCities = getCitiesForGovernorate(shippingAddress.governorate);

  // Update available cities when governorate changes and clear selected city if it's not in the new governorate
  useEffect(() => {
    const citiesForSelectedGovernorate = getCitiesForGovernorate(shippingAddress.governorate);
    if (shippingAddress.city && !citiesForSelectedGovernorate.includes(shippingAddress.city)) {
      setShippingAddress(prev => ({ ...prev, city: '' }));
      console.log('Cleared city selection because it\'s not available in the selected governorate');
    }
  }, [shippingAddress.governorate, settings]);

  // Get shipping cost for selected governorate
  const getShippingCost = (governorateName: string) => {
    if (!settings?.governorates || settings.governorates.length === 0) {
      return settings?.defaultShippingCost || 0;
    }
    const governorate = settings.governorates.find(g => g.name === governorateName && g.isActive);
    return governorate ? governorate.shippingCost : (settings.defaultShippingCost || 0);
  };

  // Debug: Log settings and governorates
  useEffect(() => {
    console.log('Settings loaded:', settings);
    console.log('Governorates:', settings?.governorates);
    console.log('Selected governorate:', shippingAddress.governorate);
    console.log('Available cities for selected governorate:', availableCities);
    console.log('Available governorates:', availableGovernorates);
  }, [settings, availableCities, availableGovernorates, shippingAddress.governorate]);

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

      // Validate customer information
      if (!customerName.trim()) { toast.error('اسم العميل مطلوب'); return; }
      if (!customerPhone.trim()) { toast.error('رقم الهاتف مطلوب'); return; }
      
      // Validate shipping address
      if (!shippingAddress.street.trim()) { toast.error('عنوان الشارع مطلوب'); return; }
      if (!shippingAddress.city.trim()) { toast.error('المدينة مطلوبة'); return; }
      if (!shippingAddress.governorate.trim()) { toast.error('المحافظة مطلوبة'); return; }

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
          customerName,
          customerPhone,
          shippingAddress,
          items: orderItems,
          notes: orderNotes,
          shippingCost,
          shippingMethod: shippingCalculation?.shippingMethod || 'الشحن الأساسي',
          shippingZone: shippingCalculation?.shippingZone || 'المنطقة الافتراضية',
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
              
              {settings?.shippingEnabled && availableGovernorates.length === 0 && (
                <div className="bg-[#FF9800]/10 dark:bg-[#FF9800]/20 p-3 rounded-lg border border-[#FF9800]/20 dark:border-[#FF9800]/30">
                  <p className="text-[#E65100] dark:text-[#FF9800] text-sm">
                    ℹ️ لم يتم تكوين مناطق الشحن بعد. سيتم استخدام التكلفة الافتراضية.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="رقم الهاتف"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="street">عنوان الشارع</Label>
                  <Input
                    id="street"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="عنوان الشارع"
                  />
                </div>
                <div>
                  <Label htmlFor="city">المدينة</Label>
                  <select
                    id="city"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2"
                    disabled={!settings?.shippingEnabled || availableCities.length === 0}
                  >
                    <option value="">
                      {availableCities.length === 0 
                        ? (shippingAddress.governorate ? 'لا توجد مدن متاحة في هذه المحافظة' : 'اختر المحافظة أولاً')
                        : 'اختر المدينة'
                      }
                    </option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {shippingAddress.governorate && availableCities.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      المدن المتاحة في محافظة {shippingAddress.governorate}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="governorate">المحافظة</Label>
                  <select
                    id="governorate"
                    value={shippingAddress.governorate}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, governorate: e.target.value }))}
                    className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2"
                    disabled={!settings?.shippingEnabled || availableGovernorates.length === 0}
                  >
                    <option value="">
                      {availableGovernorates.length === 0 ? 'لا توجد محافظات متاحة' : 'اختر المحافظة'}
                    </option>
                    {availableGovernorates.map((governorate) => (
                      <option key={governorate} value={governorate}>
                        {governorate}
                      </option>
                    ))}
                  </select>
                  {!shippingAddress.governorate && availableGovernorates.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      اختر المحافظة أولاً لعرض المدن المتاحة
                    </p>
                  )}
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
                <div>
                  <Label htmlFor="notes">ملاحظات التوصيل (اختياري)</Label>
                  <Input
                    id="notes"
                    value={shippingAddress.notes}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="ملاحظات التوصيل"
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
                    المنطقة: {shippingCalculation.shippingZone}
                  </div>
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
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customerName">اسم العميل</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اسم العميل"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">رقم الهاتف</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="رقم الهاتف"
                  />
                </div>
                <div>
                  <Label htmlFor="orderNotes">ملاحظات الطلب (اختياري)</Label>
                  <Textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="ملاحظات إضافية للطلب"
                    rows={3}
                  />
                </div>
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