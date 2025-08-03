'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  costPrice: number;
  image: string;
  quantity: number;
}

interface SystemSettings {
  minimumOrderValue: number;
  maximumOrderValue: number;
  shippingCost: number;
  freeShippingThreshold: number;
}

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [marketerPrices, setMarketerPrices] = useState<{[key: string]: number}>({});
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    fetchCartItems();
    fetchSystemSettings();
  }, []);

  const fetchCartItems = async () => {
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      
      if (data.success) {
        setCartItems(data.items);
      }
    } catch (error) {
      console.error('خطأ في جلب عناصر السلة:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSystemSettings(data.settings);
      }
    } catch (error) {
      console.error('خطأ في جلب إعدادات النظام:', error);
    }
  };

  const updateMarketerPrice = (productId: string, price: number) => {
    setMarketerPrices(prev => ({
      ...prev,
      [productId]: price
    }));
  };

  const removeFromCart = async (productId: string) => {
    try {
      const response = await fetch(`/api/cart/${productId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setCartItems(prev => prev.filter(item => item._id !== productId));
        toast.success('تم إزالة المنتج من السلة');
      }
    } catch (error) {
      console.error('خطأ في إزالة المنتج:', error);
      toast.error('حدث خطأ في إزالة المنتج');
    }
  };

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      
      // Validate form data
      if (!customerName.trim()) {
        toast.error('اسم العميل مطلوب');
        return;
      }
      
      if (!customerPhone.trim()) {
        toast.error('رقم الهاتف مطلوب');
        return;
      }
      
      if (!customerAddress.trim()) {
        toast.error('العنوان مطلوب');
        return;
      }
      
      if (customerAddress.trim().length < 10) {
        toast.error('العنوان يجب أن يكون 10 أحرف على الأقل');
        return;
      }
      
      // Calculate order total with marketer prices
      const subtotal = cartItems.reduce((total, item) => {
        const marketerPrice = marketerPrices[item._id] || item.price;
        return total + (marketerPrice * item.quantity);
      }, 0);
      
      // Apply system settings validation
      if (systemSettings) {
        if (subtotal < systemSettings.minimumOrderValue) {
          toast.error(`الحد الأدنى للطلب هو ${systemSettings.minimumOrderValue}₪`);
          return;
        }
        
        if (subtotal > systemSettings.maximumOrderValue) {
          toast.error(`الحد الأقصى للطلب هو ${systemSettings.maximumOrderValue}₪`);
          return;
        }
      }
      
      // Calculate shipping cost
      let shippingCost = 0;
      if (systemSettings) {
        if (subtotal >= systemSettings.freeShippingThreshold) {
          shippingCost = 0; // Free shipping
        } else {
          shippingCost = systemSettings.shippingCost;
        }
      }
      
      const orderTotal = subtotal + shippingCost;
      
      // Prepare order items with custom prices
      const orderItems = cartItems.map(item => {
        const marketerPrice = marketerPrices[item._id] || item.price;
        const marketerProfit = (marketerPrice - item.costPrice) * item.quantity;
        
        return {
          productId: item._id,
          quantity: item.quantity,
          customPrice: marketerPrice,
          marketerProfit: marketerProfit
        };
      });
      
      // Create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          items: orderItems,
          notes: orderNotes,
          shippingCost: shippingCost,
          orderTotal: orderTotal
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('تم إنشاء الطلب بنجاح');
        setCartItems([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setOrderNotes('');
        setMarketerPrices({});
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

  const subtotal = cartItems.reduce((total, item) => {
    const marketerPrice = marketerPrices[item._id] || item.price;
    return total + (marketerPrice * item.quantity);
  }, 0);

  const shippingCost = systemSettings ? 
    (subtotal >= systemSettings.freeShippingThreshold ? 0 : systemSettings.shippingCost) : 0;

  const total = subtotal + shippingCost;

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">السلة فارغة</h1>
          <p className="text-gray-600 mb-4">لا توجد منتجات في السلة</p>
          <Button onClick={() => router.push('/dashboard/products')}>
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">سلة التسوق</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>المنتجات في السلة</CardTitle>
            </CardHeader>
            <CardContent>
              {cartItems.map((item) => (
                <div key={item._id} className="border-b py-4 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-600">الكمية: {item.quantity}</p>
                      <div className="mt-2">
                        <Label htmlFor={`price-${item._id}`}>سعر البيع:</Label>
                        <Input
                          id={`price-${item._id}`}
                          type="number"
                          value={marketerPrices[item._id] || item.price}
                          onChange={(e) => updateMarketerPrice(item._id, parseFloat(e.target.value))}
                          className="w-32"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {(marketerPrices[item._id] || item.price) * item.quantity}₪
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFromCart(item._id)}
                      >
                        إزالة
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName">اسم العميل</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="أدخل اسم العميل"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerPhone">رقم الهاتف</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="أدخل رقم الهاتف"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerAddress">العنوان</Label>
                  <Textarea
                    id="customerAddress"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="أدخل العنوان الكامل"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="orderNotes">ملاحظات</Label>
                  <Textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="ملاحظات إضافية (اختياري)"
                    rows={2}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span>المجموع الفرعي:</span>
                    <span>{subtotal}₪</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>الشحن:</span>
                    <span>{shippingCost}₪</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>الإجمالي:</span>
                    <span>{total}₪</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'جاري إنشاء الطلب...' : 'إنشاء الطلب'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}