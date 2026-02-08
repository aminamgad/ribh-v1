# دليل التحقق من استقبال الطلبات من EasyOrders

هذا الدليل يوضح كيفية التحقق من أن الطلبات التي تأتي من EasyOrders (من موقع المسوق) تصل إلى إدارة الطلبات في منصة ربح بنجاح.

---

## 📋 قائمة التحقق الكاملة

### 1. ✅ Webhook Endpoint الأساسي

#### 1.1 التحقق من استقبال Webhook Secret
- [x] **الملف:** `app/api/integrations/easy-orders/webhook/route.ts`
- [x] **التحقق:** Webhook Secret يتم استقباله من header `secret`
- [x] **الخطأ:** إذا لم يكن موجوداً، يتم إرجاع 401

#### 1.2 التحقق من مطابقة Webhook Secret
- [x] **التحقق:** البحث عن integration باستخدام webhookSecret
- [x] **الخطأ:** إذا لم يتم العثور على integration، يتم إرجاع 401
- [x] **التحسين:** حفظ webhookSecret تلقائياً إذا لم يكن موجوداً

#### 1.3 التحقق من مطابقة Store ID
- [x] **التحقق:** store_id في webhook يجب أن يطابق storeId في integration
- [x] **الخطأ:** إذا لم يطابق، يتم إرجاع 400

---

### 2. ✅ معالجة Order Created Event

#### 2.1 استقبال البيانات الأساسية
- [x] **التحقق من الحقول المطلوبة:**
  - `id` (easyOrdersOrderId)
  - `store_id`
  - `cost`
  - `shipping_cost`
  - `total_cost`
  - `status`
  - `full_name`
  - `phone`
  - `government`
  - `address`
  - `payment_method`
  - `cart_items`
  - `created_at`
  - `updated_at`

#### 2.2 منع التكرار
- [x] **التحقق:** البحث عن طلب موجود باستخدام `metadata.easyOrdersOrderId`
- [x] **السلوك:** إذا كان موجوداً، يتم إرجاع success بدون إنشاء طلب جديد

#### 2.3 البحث عن المنتجات
- [x] **الطريقة 1:** البحث باستخدام `taager_code` (يجب أن يطابق SKU)
- [x] **الطريقة 2:** البحث باستخدام `metadata.easyOrdersProductId`
- [x] **الطريقة 3:** البحث باستخدام `sku` من productData
- [x] **Fallback:** إذا لم يتم العثور على المنتج، يتم إنشاء order item مع بيانات أساسية

#### 2.4 معالجة Variants
- [x] **التحقق:** استخراج `variant_props` من variantData
- [x] **التحويل:** تحويل إلى `variantOption` format
- [x] **الحقول:** variantId, variantName, value, price, stockQuantity, sku

#### 2.5 حساب الأسعار
- [x] **subtotal:** مجموع أسعار جميع المنتجات
- [x] **shippingCost:** من `shipping_cost` في webhook
- [x] **total:** subtotal + shippingCost
- [x] **commission:** 10% من subtotal (قابل للتعديل)
- [x] **marketerProfit:** يساوي commission

#### 2.6 تحويل حالات الطلب
- [x] **Status Mapping:**
  - `pending` → `pending`
  - `confirmed` → `confirmed`
  - `paid` → `confirmed`
  - `processing` → `processing`
  - `waiting_for_pickup` → `ready_for_shipping`
  - `in_delivery` → `out_for_delivery`
  - `delivered` → `delivered`
  - `canceled` → `cancelled`
  - `refunded` → `refunded`

#### 2.7 إنشاء الطلب في قاعدة البيانات
- [x] **customerId:** marketerId (صاحب التكامل)
- [x] **customerRole:** 'marketer'
- [x] **supplierId:** من المنتج الأول أو marketerId كـ fallback
- [x] **items:** جميع orderItems
- [x] **shippingAddress:** fullName, phone, street, governorate, city
- [x] **metadata:** easyOrdersOrderId, storeId, status, integrationId, source

---

### 3. ⚠️ معالجة Order Status Update Event

#### 3.1 التحقق من وجود endpoint
- [ ] **الملف:** `app/api/integrations/easy-orders/webhook/status/route.ts`
- [ ] **الوضع:** يجب إنشاء endpoint جديد لمعالجة status updates

#### 3.2 استقبال البيانات
- [ ] **التحقق من الحقول:**
  - `event_type`: 'order-status-update'
  - `order_id`: EasyOrders order ID
  - `old_status`: الحالة القديمة
  - `new_status`: الحالة الجديدة
  - `payment_ref_id`: (اختياري)

#### 3.3 البحث عن الطلب
- [ ] **التحقق:** البحث عن الطلب باستخدام `metadata.easyOrdersOrderId`
- [ ] **الخطأ:** إذا لم يتم العثور، يتم إرجاع 404

#### 3.4 تحديث حالة الطلب
- [ ] **التحقق:** تحديث `status` و `paymentStatus` في الطلب
- [ ] **التحقق:** تحديث `metadata.easyOrdersStatus`
- [ ] **التحقق:** تحديث `updatedAt`

---

### 4. ✅ معالجة الأخطاء

#### 4.1 أنواع الأخطاء
- [x] **401:** Missing/Invalid webhook secret
- [x] **400:** Store ID mismatch, Missing required fields
- [x] **500:** Internal server errors

#### 4.2 Logging
- [x] **Success:** تسجيل order created
- [x] **Warnings:** Product not found, Order already exists
- [x] **Errors:** جميع الأخطاء مع تفاصيل

---

### 5. ✅ CORS و Security

#### 5.1 CORS Headers
- [ ] **التحقق:** إضافة OPTIONS handler للسماح بـ CORS
- [ ] **Headers:** Access-Control-Allow-Origin, Methods, Headers

#### 5.2 Webhook Secret Validation
- [x] **التحقق:** Webhook secret يتم التحقق منه قبل معالجة الطلب
- [x] **Security:** لا يتم معالجة الطلبات بدون secret صحيح

---

### 6. ✅ عرض الطلبات في الواجهة

#### 6.1 صفحة الطلبات
- [x] **الملف:** `app/dashboard/orders/page.tsx`
- [x] **Badge:** Badge "EasyOrders" يظهر على الطلبات من EasyOrders
- [x] **التحقق:** `order.metadata?.source === 'easy_orders'`

#### 6.2 صفحة تفاصيل الطلب
- [x] **الملف:** `app/dashboard/orders/[id]/page.tsx`
- [x] **Badge:** Badge "EasyOrders" يظهر في تفاصيل الطلب
- [x] **Metadata:** عرض easyOrdersOrderId و easyOrdersStatus

---

### 7. ⚠️ الاختبار

#### 7.1 اختبار Webhook Endpoint
- [ ] **الأداة:** استخدام webhook.site أو أداة مشابهة
- [ ] **التحقق:** إرسال webhook test والتحقق من الاستجابة

#### 7.2 اختبار Order Created
- [ ] **الخطوات:**
  1. إنشاء طلب في EasyOrders
  2. التحقق من وصول webhook
  3. التحقق من إنشاء الطلب في قاعدة البيانات
  4. التحقق من ظهور الطلب في `/dashboard/orders`

#### 7.3 اختبار Order Status Update
- [ ] **الخطوات:**
  1. تحديث حالة طلب في EasyOrders
  2. التحقق من وصول webhook
  3. التحقق من تحديث حالة الطلب في قاعدة البيانات
  4. التحقق من تحديث العرض في الواجهة

#### 7.4 اختبار البيانات
- [ ] **التحقق من:**
  - المنتجات (الأسماء، الأسعار، الكميات)
  - العنوان (fullName, phone, address, government)
  - الأسعار (subtotal, shipping, total)
  - الحالة (status, paymentStatus)

---

## 🔧 المهام المطلوبة

### المهمة 1: إضافة معالجة Order Status Update
**الملف:** `app/api/integrations/easy-orders/webhook/status/route.ts`

```typescript
// يجب إنشاء endpoint جديد لمعالجة order-status-update events
```

### المهمة 2: إضافة CORS Headers
**الملف:** `app/api/integrations/easy-orders/webhook/route.ts`

```typescript
// إضافة OPTIONS handler
export const OPTIONS = async (req: NextRequest) => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, secret',
    },
  });
};
```

### المهمة 3: تحسين معالجة المنتجات غير الموجودة
**الملف:** `app/api/integrations/easy-orders/webhook/route.ts`

- [ ] إضافة إشعار للمسوق عند عدم العثور على منتج
- [ ] حفظ معلومات المنتج في metadata للرجوع إليها لاحقاً

### المهمة 4: تحسين حساب Commission
**الملف:** `app/api/integrations/easy-orders/webhook/route.ts`

- [ ] استخدام إعدادات النظام لحساب commission
- [ ] حساب commission بناءً على supplierPrice و marketerPrice

---

## 📝 ملاحظات مهمة

### Webhook URL
- يجب أن يكون Webhook URL عام (ليس localhost)
- في التطوير: استخدام ngrok أو Vercel
- في الإنتاج: استخدام domain ثابت

### Webhook Secret
- يتم إنشاؤه تلقائياً عند استخدام Authorized App Link
- يتم حفظه تلقائياً عند استقبال أول webhook
- يمكن إضافته من إعدادات التكامل عند التعديل

### Order Status Updates
- حالياً لا يوجد endpoint منفصل لـ status updates
- يجب إضافة endpoint جديد أو تعديل endpoint الحالي لمعالجة كلا النوعين

---

## ✅ قائمة التحقق النهائية

- [ ] Webhook endpoint يعمل بشكل صحيح
- [ ] Webhook Secret يتم التحقق منه
- [ ] Order Created Event يتم معالجته
- [ ] Order Status Update Event يتم معالجته (يجب إضافته)
- [ ] الطلبات تظهر في `/dashboard/orders`
- [ ] Badge EasyOrders يظهر على الطلبات
- [ ] جميع البيانات صحيحة (المنتجات، العنوان، الأسعار)
- [ ] Logging يعمل بشكل صحيح
- [ ] معالجة الأخطاء تعمل بشكل صحيح

---

**آخر تحديث:** 2024

