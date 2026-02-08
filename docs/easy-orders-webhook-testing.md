# دليل اختبار Webhook EasyOrders

هذا الدليل يوضح كيفية اختبار استقبال الطلبات وتحديثات الحالة من EasyOrders.

---

## 🧪 1. اختبار Webhook Endpoint الأساسي

### 1.1 استخدام webhook.site

1. **افتح [webhook.site](https://webhook.site)**
2. **انسخ Webhook URL** (مثل: `https://webhook.site/unique-id`)
3. **استخدم هذا URL مؤقتاً للاختبار**

### 1.2 اختبار استقبال Webhook

```bash
# اختبار Order Created Event
curl -X POST https://your-webhook-url.com/api/integrations/easy-orders/webhook \
  -H "Content-Type: application/json" \
  -H "secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "id": "test-order-123",
    "store_id": "your-store-id",
    "cost": 100,
    "shipping_cost": 20,
    "total_cost": 120,
    "status": "pending",
    "full_name": "أحمد محمد",
    "phone": "0501234567",
    "government": "الرياض",
    "address": "شارع الملك فهد",
    "payment_method": "cod",
    "cart_items": [
      {
        "id": "item-1",
        "product_id": "prod-123",
        "variant_id": null,
        "price": 100,
        "quantity": 1,
        "product": {
          "id": "prod-123",
          "name": "منتج تجريبي",
          "price": 100,
          "sku": "SKU-123",
          "taager_code": "SKU-123"
        },
        "variant": null
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }'
```

### 1.3 التحقق من الاستجابة

**الاستجابة المتوقعة:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "orderId": "...",
  "orderNumber": "ORD-..."
}
```

---

## 🧪 2. اختبار Order Status Update

### 2.1 اختبار تحديث الحالة

```bash
curl -X POST https://your-webhook-url.com/api/integrations/easy-orders/webhook \
  -H "Content-Type: application/json" \
  -H "secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "event_type": "order-status-update",
    "order_id": "test-order-123",
    "old_status": "pending",
    "new_status": "paid",
    "payment_ref_id": "TX1234567890"
  }'
```

### 2.2 التحقق من الاستجابة

**الاستجابة المتوقعة:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "orderId": "...",
  "orderNumber": "ORD-...",
  "oldStatus": "pending",
  "newStatus": "confirmed"
}
```

---

## 🧪 3. اختبار في EasyOrders Dashboard

### 3.1 إعداد Webhook في EasyOrders

1. **انتقل إلى EasyOrders Dashboard**
2. **اذهب إلى Public API > Webhooks**
3. **أضف Webhook URL:**
   ```
   https://your-domain.com/api/integrations/easy-orders/webhook
   ```
4. **انسخ Webhook Secret**
5. **أضف Webhook Secret في إعدادات التكامل في ربح**

### 3.2 اختبار Order Created

1. **أنشئ منتج في EasyOrders** (أو استخدم منتج موجود)
2. **أنشئ طلب تجريبي** من موقع EasyOrders
3. **تحقق من:**
   - وصول webhook إلى الخادم
   - إنشاء الطلب في قاعدة البيانات
   - ظهور الطلب في `/dashboard/orders`
   - ظهور Badge "EasyOrders" على الطلب

### 3.3 اختبار Order Status Update

1. **افتح طلب موجود من EasyOrders**
2. **غيّر حالة الطلب** (مثلاً: pending → paid)
3. **تحقق من:**
   - وصول webhook update
   - تحديث حالة الطلب في قاعدة البيانات
   - تحديث العرض في الواجهة

---

## 🔍 4. التحقق من البيانات

### 4.1 التحقق من بيانات الطلب

**في قاعدة البيانات:**
```javascript
// البحث عن الطلب
const order = await Order.findOne({
  'metadata.easyOrdersOrderId': 'test-order-123'
});

// التحقق من:
- order.customerId === marketerId
- order.supplierId === supplierId
- order.items.length === cartItems.length
- order.subtotal === 100
- order.shippingCost === 20
- order.total === 120
- order.status === 'pending'
- order.metadata.source === 'easy_orders'
- order.metadata.easyOrdersOrderId === 'test-order-123'
```

### 4.2 التحقق من بيانات العنوان

```javascript
// التحقق من shippingAddress
- order.shippingAddress.fullName === 'أحمد محمد'
- order.shippingAddress.phone === '0501234567'
- order.shippingAddress.street === 'شارع الملك فهد'
- order.shippingAddress.governorate === 'الرياض'
```

### 4.3 التحقق من بيانات المنتجات

```javascript
// التحقق من items
- order.items[0].productName === 'منتج تجريبي'
- order.items[0].quantity === 1
- order.items[0].unitPrice === 100
- order.items[0].totalPrice === 100
```

---

## 🐛 5. استكشاف الأخطاء

### 5.1 Webhook لا يصل

**التحقق:**
- [ ] Webhook URL صحيح ويمكن الوصول إليه
- [ ] Webhook Secret صحيح
- [ ] CORS headers موجودة
- [ ] الخادم يعمل

**الحل:**
```bash
# تحقق من الـ logs
tail -f logs/app.log | grep "EasyOrders webhook"

# تحقق من الـ network requests
# في EasyOrders Dashboard > Webhooks > View Logs
```

### 5.2 الطلب لا يظهر في الواجهة

**التحقق:**
- [ ] الطلب موجود في قاعدة البيانات
- [ ] `metadata.source === 'easy_orders'`
- [ ] `supplierId` صحيح
- [ ] المستخدم لديه صلاحيات لعرض الطلب

**الحل:**
```javascript
// البحث عن الطلب
const order = await Order.findOne({
  'metadata.easyOrdersOrderId': 'ORDER_ID'
});

// التحقق من البيانات
console.log(order);
```

### 5.3 المنتج غير موجود

**التحقق:**
- [ ] المنتج مصدر من ربح إلى EasyOrders
- [ ] `metadata.easyOrdersProductId` محفوظ
- [ ] `sku` يطابق `taager_code`

**الحل:**
- تصدير المنتج مرة أخرى من ربح
- التحقق من `metadata.easyOrdersProductId` في المنتج

### 5.4 حالة الطلب لا تتحدث

**التحقق:**
- [ ] Order Status Update webhook يصل
- [ ] `order_id` صحيح
- [ ] الطلب موجود في قاعدة البيانات

**الحل:**
```javascript
// التحقق من webhook logs
logger.info('EasyOrders status update received', { body });

// التحقق من تحديث الطلب
const order = await Order.findById(orderId);
console.log(order.status, order.metadata.easyOrdersStatus);
```

---

## 📊 6. سيناريوهات الاختبار

### السيناريو 1: طلب بمنتج واحد

**البيانات:**
- منتج واحد
- بدون variants
- حالة: pending
- طريقة الدفع: cod

**التحقق:**
- [ ] الطلب يُنشأ بنجاح
- [ ] المنتج موجود
- [ ] الأسعار صحيحة
- [ ] العنوان صحيح

### السيناريو 2: طلب بمنتجات متعددة

**البيانات:**
- 3 منتجات
- كميات مختلفة
- حالة: pending

**التحقق:**
- [ ] جميع المنتجات موجودة
- [ ] subtotal صحيح
- [ ] total صحيح

### السيناريو 3: طلب بvariants

**البيانات:**
- منتج مع variant (لون، مقاس)
- variant_props موجودة

**التحقق:**
- [ ] variantOption محفوظ بشكل صحيح
- [ ] variantName صحيح
- [ ] selectedVariants صحيح

### السيناريو 4: تحديث الحالة

**البيانات:**
- pending → paid
- payment_ref_id موجود

**التحقق:**
- [ ] status يتحدث إلى 'confirmed'
- [ ] paymentStatus يتحدث إلى 'paid'
- [ ] paymentRefId محفوظ في metadata

### السيناريو 5: منتج غير موجود

**البيانات:**
- منتج غير مصدر من ربح

**التحقق:**
- [ ] الطلب يُنشأ بنجاح
- [ ] order item يحتوي على بيانات أساسية
- [ ] warning في logs

---

## ✅ قائمة التحقق النهائية

- [ ] Webhook endpoint يستقبل الطلبات
- [ ] Order Created Event يتم معالجته
- [ ] Order Status Update Event يتم معالجته
- [ ] الطلبات تظهر في `/dashboard/orders`
- [ ] Badge EasyOrders يظهر
- [ ] جميع البيانات صحيحة
- [ ] تحديثات الحالة تعمل
- [ ] معالجة الأخطاء تعمل
- [ ] Logging يعمل

---

## 📝 ملاحظات

1. **في التطوير:** استخدم ngrok أو Vercel للحصول على URL عام
2. **في الإنتاج:** استخدم domain ثابت
3. **Webhook Secret:** احفظه بشكل آمن
4. **Testing:** استخدم webhook.site للاختبار الأولي
5. **Logs:** راقب الـ logs دائماً للتحقق من عمل Webhook

---

**آخر تحديث:** 2024

