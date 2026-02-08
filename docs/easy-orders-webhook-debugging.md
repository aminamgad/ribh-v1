# دليل تشخيص مشكلة عدم وصول الطلبات من EasyOrders

هذا الدليل يوضح كيفية تشخيص وإصلاح مشكلة عدم وصول الطلبات من EasyOrders إلى منصة ربح.

---

## 🔍 خطوات التشخيص

### 1. التحقق من إعداد Webhook في EasyOrders

#### 1.1 فحص Webhook URL
- [ ] **انتقل إلى EasyOrders Dashboard**
- [ ] **اذهب إلى Public API > Webhooks**
- [ ] **تحقق من Webhook URL:**
  ```
  https://your-domain.com/api/integrations/easy-orders/webhook
  ```
- [ ] **تأكد من أن URL عام وليس localhost**

#### 1.2 فحص Webhook Secret
- [ ] **انسخ Webhook Secret من EasyOrders**
- [ ] **تحقق من أن Secret محفوظ في Integration في ربح**

#### 1.3 فحص Webhook Status
- [ ] **تحقق من أن Webhook نشط (Active)**
- [ ] **فحص Webhook Logs في EasyOrders Dashboard**
- [ ] **ابحث عن أخطاء في Logs**

---

### 2. التحقق من Webhook Endpoint

#### 2.1 اختبار Webhook مباشرة

استخدم curl أو Postman لإرسال webhook test:

```bash
curl -X POST https://your-domain.com/api/integrations/easy-orders/webhook \
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

### 3. فحص Server Logs

#### 3.1 البحث عن Webhook Logs

ابحث في server logs عن:
- `EasyOrders webhook request received`
- `EasyOrders webhook payload received`
- `EasyOrders webhook: Integration found`
- `EasyOrders order created from webhook`

#### 3.2 البحث عن الأخطاء

ابحث عن:
- `Missing webhook secret`
- `Invalid webhook secret`
- `Integration not found`
- `Store ID mismatch`
- `Error processing EasyOrders webhook`

---

### 4. التحقق من Integration في قاعدة البيانات

#### 4.1 فحص Integration

```javascript
// في MongoDB أو باستخدام API
const integration = await StoreIntegration.findOne({
  type: 'easy_orders',
  isActive: true
});

// تحقق من:
- integration.webhookSecret === webhookSecret من EasyOrders
- integration.storeId === store_id من webhook
- integration.isActive === true
```

#### 4.2 فحص Webhook Secret

```javascript
// تحقق من أن webhookSecret محفوظ
console.log(integration.webhookSecret);
// يجب أن يطابق Webhook Secret من EasyOrders
```

---

### 5. التحقق من Network/Firewall

#### 5.1 فحص الوصول إلى الخادم
- [ ] **تأكد من أن الخادم يمكن الوصول إليه من الإنترنت**
- [ ] **تحقق من Firewall rules**
- [ ] **تحقق من CORS settings**

#### 5.2 فحص SSL/HTTPS
- [ ] **تأكد من أن Webhook URL يستخدم HTTPS**
- [ ] **تحقق من SSL certificate**

---

## 🐛 المشاكل الشائعة والحلول

### المشكلة 1: Webhook لا يصل إلى الخادم

**الأعراض:**
- لا توجد logs في server
- Webhook logs في EasyOrders تظهر errors

**الحلول:**
1. **تحقق من Webhook URL:**
   - يجب أن يكون URL عام (ليس localhost)
   - استخدم ngrok للتطوير المحلي
   - أو استخدم Vercel/Netlify للإنتاج

2. **تحقق من Network:**
   - تأكد من أن الخادم يمكن الوصول إليه من الإنترنت
   - تحقق من Firewall rules

3. **تحقق من SSL:**
   - EasyOrders يتطلب HTTPS
   - تأكد من أن SSL certificate صحيح

---

### المشكلة 2: Webhook يصل لكن Integration غير موجود

**الأعراض:**
- Logs تظهر: `Integration not found for secret`
- أو: `Invalid webhook secret`

**الحلول:**
1. **تحقق من Webhook Secret:**
   ```javascript
   // في Integration
   integration.webhookSecret === webhookSecret من EasyOrders
   ```

2. **حفظ Webhook Secret:**
   - إذا كان Integration موجود لكن webhookSecret مفقود
   - سيتم حفظه تلقائياً عند استقبال أول webhook
   - أو يمكن حفظه من إعدادات Integration عند التعديل

3. **البحث بالـ storeId:**
   - إذا لم يتم العثور على Integration بالـ webhookSecret
   - سيتم البحث بالـ storeId تلقائياً
   - ثم حفظ webhookSecret

---

### المشكلة 3: Store ID Mismatch

**الأعراض:**
- Logs تظهر: `Store ID mismatch`
- Webhook يرفض الطلب

**الحلول:**
1. **تحقق من Store ID:**
   ```javascript
   integration.storeId === body.store_id
   ```

2. **تحديث Store ID:**
   - إذا كان Store ID مختلف
   - قم بتحديث Integration في قاعدة البيانات

---

### المشكلة 4: الطلب يُنشأ لكن لا يظهر في الواجهة

**الأعراض:**
- Logs تظهر: `Order created successfully`
- لكن الطلب لا يظهر في `/dashboard/orders`

**الحلول:**
1. **تحقق من supplierId:**
   ```javascript
   order.supplierId === integration.userId
   ```

2. **تحقق من metadata:**
   ```javascript
   order.metadata.source === 'easy_orders'
   order.metadata.easyOrdersOrderId === easyOrdersOrderId
   ```

3. **تحقق من الصلاحيات:**
   - تأكد من أن المستخدم لديه صلاحيات لعرض الطلبات
   - تحقق من role-based access control

---

## 📊 Logging المفصل

تم إضافة logging مفصل في Webhook handler:

### Request Logging
```javascript
logger.info('EasyOrders webhook request received', {
  requestId,
  url: req.url,
  method: req.method,
  headers: { ... }
});
```

### Payload Logging
```javascript
logger.info('EasyOrders webhook payload received', {
  requestId,
  hasBody: !!body,
  eventType: body.event_type,
  hasOrderId: !!body.id,
  hasStoreId: !!body.store_id
});
```

### Integration Search Logging
```javascript
logger.info('EasyOrders webhook: Searching for integration', {
  requestId,
  secretPrefix: webhookSecret.substring(0, 10) + '...'
});
```

### Order Creation Logging
```javascript
logger.business('EasyOrders order created from webhook', {
  requestId,
  orderId: order._id,
  orderNumber: order.orderNumber,
  easyOrdersOrderId,
  marketerId: marketerId.toString(),
  total,
  itemCount: orderItems.length
});
```

---

## ✅ قائمة التحقق النهائية

- [ ] Webhook URL صحيح ويمكن الوصول إليه
- [ ] Webhook Secret محفوظ في Integration
- [ ] Integration موجود ونشط
- [ ] Store ID يطابق
- [ ] Webhook يصل إلى الخادم (فحص Logs)
- [ ] Webhook يتم معالجته بنجاح (فحص Logs)
- [ ] الطلب يُنشأ في قاعدة البيانات
- [ ] الطلب يظهر في `/dashboard/orders`

---

## 🔧 أدوات مفيدة

### 1. Webhook.site
استخدم [webhook.site](https://webhook.site) لاختبار Webhook URL:
1. افتح webhook.site
2. انسخ Webhook URL
3. أضفه في EasyOrders مؤقتاً
4. أنشئ طلب في EasyOrders
5. تحقق من وصول Webhook

### 2. curl
استخدم curl لاختبار Webhook مباشرة:
```bash
curl -X POST https://your-domain.com/api/integrations/easy-orders/webhook \
  -H "Content-Type: application/json" \
  -H "secret: YOUR_WEBHOOK_SECRET" \
  -d @test-order.json
```

### 3. Server Logs
راقب server logs في الوقت الفعلي:
```bash
tail -f logs/app.log | grep "EasyOrders webhook"
```

---

## 📝 ملاحظات

1. **في التطوير:** استخدم ngrok للحصول على URL عام
2. **في الإنتاج:** استخدم domain ثابت مع SSL
3. **Webhook Secret:** احفظه بشكل آمن
4. **Logging:** راقب Logs دائماً للتحقق من عمل Webhook
5. **Testing:** اختبر Webhook قبل الإنتاج

---

**آخر تحديث:** 2024

