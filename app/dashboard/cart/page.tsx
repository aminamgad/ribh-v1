'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { ShoppingCart, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  notes?: string;
}

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { items, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marketerPrices, setMarketerPrices] = useState<Record<string, number>>({});
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: user?.name || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    notes: ''
  });

  // Initialize marketer prices
  React.useEffect(() => {
    const initialPrices: Record<string, number> = {};
    items.forEach(item => {
      if (!marketerPrices[item.product._id]) {
        initialPrices[item.product._id] = item.price;
      }
    });
    if (Object.keys(initialPrices).length > 0) {
      setMarketerPrices(prev => ({ ...prev, ...initialPrices }));
    }
  }, [items]);

  const shippingCost = totalPrice > 500 ? 0 : 30; // Free shipping over 500
  const finalTotal = totalPrice + shippingCost;

  // Calculate marketer profit - using cost price
  const calculateMarketerProfit = () => {
    return items.reduce((total, item) => {
      const currentPrice = marketerPrices[item.product._id] || item.product.marketerPrice;
      const costPrice = item.product.costPrice; // سعر التكلفة للمورد
      
      // الربح = السعر الحالي - سعر التكلفة
      const profit = (currentPrice - costPrice) * item.quantity;
      
      console.log('Product:', item.product.name, {
        costPrice,
        marketerPrice: item.product.marketerPrice,
        currentPrice,
        profit,
        quantity: item.quantity
      });
      
      return total + profit;
    }, 0);
  };

  const marketerProfit = calculateMarketerProfit();
  const totalWithProfit = finalTotal + marketerProfit;

  // Helper function to format prices
  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return '0';
    return price.toFixed(2);
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    setMarketerPrices(prev => ({
      ...prev,
      [productId]: newPrice
    }));
  };

  const handleCheckout = async () => {
    // Validate address
    if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address || 
        !shippingAddress.city || !shippingAddress.region) {
      toast.error('يرجى ملء جميع حقول العنوان المطلوبة');
      return;
    }

    setLoading(true);
    try {
      // Create order for each supplier
      const ordersBySupplier = items.reduce((acc, item) => {
        const supplierId = item.product.supplierId;
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      }, {} as Record<string, typeof items>);

      const orderPromises = Object.entries(ordersBySupplier).map(async ([supplierId, supplierItems]) => {
        const subtotal = supplierItems.reduce((sum, item) => {
          const itemTotal = (item.price || 0) * (item.quantity || 0);
          return sum + (isNaN(itemTotal) ? 0 : itemTotal);
        }, 0);
        const supplierShipping = subtotal > 500 ? 0 : 30;
        
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: supplierItems.map(item => ({
              productId: item.product._id,
              quantity: item.quantity
            })),
            shippingAddress: {
              fullName: shippingAddress.fullName,
              phone: shippingAddress.phone,
              street: shippingAddress.address,
              city: shippingAddress.city,
              governorate: shippingAddress.region,
              postalCode: shippingAddress.postalCode || '',
              notes: shippingAddress.notes || ''
            },
            customerName: shippingAddress.fullName,
            customerPhone: shippingAddress.phone,
            notes: shippingAddress.notes
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'فشل في إنشاء الطلب');
        }

        return response.json();
      });

      await Promise.all(orderPromises);
      
      clearCart();
      toast.success('تم إنشاء الطلب بنجاح');
      router.push('/dashboard/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-24 h-24 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">السلة فارغة</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">لم تقم بإضافة أي منتجات إلى السلة بعد</p>
          <Link href="/dashboard/products" className="btn-primary">
            <ShoppingBag className="w-5 h-5 ml-2" />
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">سلة التسوق</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">{items.length} منتج في السلة</p>
        </div>
        <button
          onClick={clearCart}
          className="text-danger-600 hover:text-danger-700 text-sm font-medium"
        >
          تفريغ السلة
        </button>
      </div>

      {!showCheckout ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.product._id} className="card">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">{item.product.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{item.product.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-sm font-medium text-gray-900 dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product._id)}
                        className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{formatPrice(item.price)} ₪</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">المجموع: {formatPrice(item.price * item.quantity)} ₪</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">ملخص الطلب</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400">المجموع الفرعي</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">{formatPrice(totalPrice)} ₪</span>
                </div>
                
                {/* Marketer Profit Section */}
                {user?.role === 'marketer' && (
                  <>
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">أرباح المسوق</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-3">
                        <p className="text-xs text-green-700 dark:text-green-300">
                          💰 <strong>نظام الأرباح البسيط:</strong><br/>
                          • <strong>الربح = السعر الحالي - سعر التكلفة</strong><br/>
                          • <strong>المورد يحدد سعر المسوق</strong><br/>
                          • <strong>يمكنك زيادة السعر لزيادة الأرباح</strong>
                        </p>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const currentPrice = marketerPrices[item.product._id] || item.product.marketerPrice;
                          const costPrice = item.product.costPrice; // سعر التكلفة
                          const profit = (currentPrice - costPrice) * item.quantity;
                          
                          return (
                            <div key={item.product._id} className="text-xs border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 dark:text-slate-400 font-medium">{item.product.name}</span>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                  <input
                                    type="number"
                                    value={currentPrice}
                                    onChange={(e) => handlePriceChange(item.product._id, parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    min={costPrice}
                                    step="0.01"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-slate-500">₪</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-slate-500">سعر التكلفة:</span>
                                  <span className="text-gray-600 dark:text-slate-400">{formatPrice(costPrice)} ₪</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-slate-500">سعر المسوق:</span>
                                  <span className="text-gray-600 dark:text-slate-400">{formatPrice(item.product.marketerPrice)} ₪</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-slate-500">السعر الحالي:</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">{formatPrice(currentPrice)} ₪</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-slate-500">الربح:</span>
                                  <span className={`font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {formatPrice(profit)} ₪
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-900 dark:text-slate-100">إجمالي الأرباح</span>
                      <span className={`${marketerProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPrice(marketerProfit)} ₪
                      </span>
                    </div>
                  </>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400">الشحن</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {shippingCost === 0 ? 'مجاني' : `${formatPrice(shippingCost)} ₪`}
                  </span>
                </div>
                {shippingCost > 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    شحن مجاني للطلبات أكثر من 500 ₪
                  </p>
                )}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-slate-100">المجموع النهائي</span>
                    <span className="font-bold text-xl text-primary-600 dark:text-primary-400">
                      {user?.role === 'marketer' ? formatPrice(totalWithProfit) : formatPrice(finalTotal)} ₪
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCheckout(true)}
                className="btn-primary w-full mt-6"
              >
                المتابعة للدفع
                <ArrowRight className="w-5 h-5 mr-2" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">معلومات الشحن</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    رقم الهاتف *
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  العنوان *
                </label>
                <input
                  type="text"
                  value={shippingAddress.address}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                  className="input-field"
                  placeholder="الشارع، رقم المبنى، الشقة"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    المدينة *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    المنطقة *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.region}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, region: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    الرمز البريدي
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  ملاحظات إضافية
                </label>
                <textarea
                  value={shippingAddress.notes}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="أي ملاحظات إضافية للتوصيل..."
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowCheckout(false)}
                className="btn-secondary"
              >
                العودة للسلة
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}