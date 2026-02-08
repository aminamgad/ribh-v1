# قائمة التحقق من مشاكل Webhook EasyOrders

استخدم هذه القائمة خطوة بخطوة لتشخيص وإصلاح مشكلة عدم وصول الطلبات من EasyOrders.

---

## ✅ الخطوة 1: التحقق من Webhook URL

### 1.1 فحص Webhook URL في النظام
- [ ] اذهب إلى `/dashboard/integrations`
- [ ] اضغط على "عرض معلومات Webhook" على التكامل
- [ ] تحقق من Webhook URL المعروض

### 1.2 التحقق من أن URL عام
- [ ] **يجب أن يكون URL عام (ليس localhost)**
- [ ] إذا كان `http://localhost:3000` → **استخدم ngrok أو Vercel**
- [ ] إذا كان `https://your-domain.com` → ✓ صحيح

### 1.3 اختبار الوصول إلى URL
```bash
# اختبر الوصول إلى Webhook URL
curl -X OPTIONS https://your-domain.com/api/integrations/easy-orders/webhook

# يجب أن تحصل على 204 No Content
```

---

## ✅ الخطوة 2: التحقق من Webhook في EasyOrders Dashboard

### 2.1 فحص Webhook في EasyOrders
- [ ] اذهب إلى EasyOrders Dashboard
- [ ] اذهب إلى **Public API > Webhooks**
- [ ] تحقق من وجود Webhook URL

### 2.2 التحقق من Webhook URL في EasyOrders
- [ ] **يجب أن يطابق Webhook URL في ربح**
- [ ] مثال: `https://your-domain.com/api/integrations/easy-orders/webhook`
- [ ] إذا كان مختلف → **قم بتحديثه**

### 2.3 فحص Webhook Status
- [ ] تحقق من أن Webhook **نشط (Active)**
- [ ] إذا كان غير نشط → **فعّله**

---

## ✅ الخطوة 3: التحقق من Webhook Secret

### 3.1 فحص Webhook Secret في EasyOrders
- [ ] في EasyOrders Dashboard > Webhooks
- [ ] انسخ **Webhook Secret**

### 3.2 فحص Webhook Secret في ربح
- [ ] اذهب إلى `/dashboard/integrations`
- [ ] اضغط "عرض معلومات Webhook"
- [ ] تحقق من **Webhook Secret: محفوظ ✓** أو **غير محفوظ ✗**

### 3.3 حفظ Webhook Secret (إذا لم يكن محفوظاً)
- [ ] إذا كان **غير محفوظ**:
  1. انسخ Webhook Secret من EasyOrders
  2. اذهب إلى إعدادات التكامل
  3. أضف Webhook Secret من إعدادات التكامل
  4. أو انتظر حتى يتم حفظه تلقائياً عند استقبال أول webhook

---

## ✅ الخطوة 4: اختبار Webhook

### 4.1 اختبار من الواجهة
- [ ] اذهب إلى `/dashboard/integrations`
- [ ] اضغط **"اختبار Webhook"** على التكامل
- [ ] تحقق من النتيجة:
  - ✓ **نجح** → Webhook يعمل
  - ✗ **فشل** → راجع الخطوات التالية

### 4.2 اختبار مباشر باستخدام curl
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
          "sku": "TEST-SKU-123",
          "taager_code": "TEST-SKU-123"
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

## ✅ الخطوة 5: فحص Server Logs

### 5.1 البحث عن Webhook Logs
```bash
# في server logs، ابحث عن:
grep "EasyOrders webhook" logs/app.log

# أو في الوقت الفعلي:
tail -f logs/app.log | grep "EasyOrders webhook"
```

### 5.2 Logs المتوقعة
- [ ] `EasyOrders webhook request received` → Webhook وصل
- [ ] `EasyOrders webhook: Integration found` → Integration موجود
- [ ] `EasyOrders order created from webhook` → الطلب تم إنشاؤه

### 5.3 Logs الأخطاء
- [ ] `Missing webhook secret` → Webhook Secret مفقود
- [ ] `Invalid webhook secret` → Webhook Secret غير صحيح
- [ ] `Integration not found` → Integration غير موجود
- [ ] `Store ID mismatch` → Store ID لا يطابق

---

## ✅ الخطوة 6: التحقق من Integration

### 6.1 فحص Integration في قاعدة البيانات
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

### 6.2 فحص Integration من الواجهة
- [ ] اذهب إلى `/dashboard/integrations`
- [ ] تحقق من أن التكامل **نشط (Active)**
- [ ] تحقق من Store ID يطابق

---

## ✅ الخطوة 7: التحقق من CORS

### 7.1 فحص CORS Headers
```bash
# اختبر OPTIONS request
curl -X OPTIONS https://your-domain.com/api/integrations/easy-orders/webhook \
  -H "Origin: https://app.easy-orders.net" \
  -H "Access-Control-Request-Method: POST" \
  -v

# يجب أن تحصل على:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: POST, OPTIONS
```

### 7.2 CORS Headers موجودة
- [ ] `Access-Control-Allow-Origin: *` ✓
- [ ] `Access-Control-Allow-Methods: POST, OPTIONS` ✓
- [ ] `Access-Control-Allow-Headers: Content-Type, secret` ✓

---

## ✅ الخطوة 8: التحقق من Network/Firewall

### 8.1 فحص الوصول إلى الخادم
- [ ] تأكد من أن الخادم **يمكن الوصول إليه من الإنترنت**
- [ ] اختبر من خارج الشبكة المحلية

### 8.2 فحص Firewall
- [ ] تحقق من Firewall rules
- [ ] تأكد من أن Port 443 (HTTPS) مفتوح
- [ ] أو Port 80 (HTTP) إذا لم تستخدم SSL

### 8.3 فحص SSL
- [ ] تأكد من أن SSL certificate **صحيح**
- [ ] EasyOrders يتطلب HTTPS

---

## ✅ الخطوة 9: فحص Webhook Logs في EasyOrders

### 9.1 فحص Webhook Logs
- [ ] اذهب إلى EasyOrders Dashboard > Webhooks
- [ ] اضغط على **"View Logs"** أو **"Webhook Logs"**
- [ ] ابحث عن محاولات إرسال Webhook

### 9.2 تحليل Logs
- [ ] **200 OK** → Webhook تم استقباله بنجاح
- [ ] **401 Unauthorized** → Webhook Secret غير صحيح
- [ ] **404 Not Found** → Webhook URL غير صحيح
- [ ] **500 Internal Server Error** → خطأ في معالجة Webhook
- [ ] **Timeout** → الخادم لا يستجيب

---

## ✅ الخطوة 10: التحقق من إنشاء الطلب

### 10.1 فحص الطلبات في قاعدة البيانات
```javascript
// البحث عن طلبات EasyOrders
const orders = await Order.find({
  'metadata.source': 'easy_orders'
}).sort({ createdAt: -1 }).limit(10);

// تحقق من:
- orders.length > 0
- orders[0].metadata.easyOrdersOrderId موجود
- orders[0].metadata.source === 'easy_orders'
```

### 10.2 فحص الطلبات في الواجهة
- [ ] اذهب إلى `/dashboard/orders`
- [ ] ابحث عن طلبات مع Badge "EasyOrders"
- [ ] تحقق من أن الطلبات تظهر

---

## 🔧 حلول المشاكل الشائعة

### المشكلة: Webhook لا يصل إلى الخادم
**الحل:**
1. استخدم ngrok للتطوير المحلي
2. أو استخدم Vercel/Netlify للإنتاج
3. تأكد من أن URL عام وليس localhost

### المشكلة: Webhook Secret غير صحيح
**الحل:**
1. انسخ Webhook Secret من EasyOrders
2. أضفه في إعدادات التكامل في ربح
3. أو انتظر حتى يتم حفظه تلقائياً

### المشكلة: Integration غير موجود
**الحل:**
1. تحقق من أن Integration موجود ونشط
2. تحقق من Store ID يطابق
3. أعد إنشاء Integration إذا لزم الأمر

### المشكلة: Store ID Mismatch
**الحل:**
1. تحقق من Store ID في Integration
2. تحقق من store_id في Webhook payload
3. قم بتحديث Store ID إذا لزم الأمر

---

## 📊 ملخص التحقق

- [ ] Webhook URL صحيح ويمكن الوصول إليه
- [ ] Webhook URL في EasyOrders يطابق
- [ ] Webhook Secret محفوظ في Integration
- [ ] Integration موجود ونشط
- [ ] Store ID يطابق
- [ ] Webhook يصل إلى الخادم (فحص Logs)
- [ ] Webhook يتم معالجته بنجاح (فحص Logs)
- [ ] CORS Headers موجودة
- [ ] الخادم يمكن الوصول إليه من الإنترنت
- [ ] SSL certificate صحيح
- [ ] الطلب يُنشأ في قاعدة البيانات
- [ ] الطلب يظهر في `/dashboard/orders`

---

**آخر تحديث:** 2024

