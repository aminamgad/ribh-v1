# 📋 دليل التحقق من Logs - هل الطلب وصل لشركة الشحن؟

## 🔍 Logs المتاحة للتحقق

### ✅ Logs التي تؤكد وصول الطلب للشركة:

#### 1. **عند إنشاء Order فوراً:**
```
✅ ORDER SENT TO SHIPPING COMPANY IMMEDIATELY - Package created automatically upon order creation
```
**المعلومات المسجلة:**
- `orderId`: معرف الطلب
- `orderNumber`: رقم الطلب
- `packageId`: رقم الطرد (Package)
- `orderStatus`: حالة الطلب (عادة `pending`)
- `timestamp`: وقت الإنشاء

#### 2. **عند تغيير حالة الطلب إلى ready_for_shipping:**
```
✅ ORDER SENT TO SHIPPING COMPANY - Package created automatically when order status changed to ready_for_shipping
```
**المعلومات المسجلة:**
- `orderId`: معرف الطلب
- `orderNumber`: رقم الطلب
- `packageId`: رقم الطرد
- `previousStatus`: الحالة السابقة
- `newStatus`: الحالة الجديدة (`ready_for_shipping`)
- `timestamp`: وقت التغيير

#### 3. **Log عام لإنشاء Package:**
```
✅ ORDER SENT TO SHIPPING COMPANY - Package created from order automatically
```
**المعلومات المسجلة:**
- `orderId`: معرف الطلب
- `orderNumber`: رقم الطلب
- `packageId`: رقم الطرد
- `externalCompanyId`: معرف شركة الشحن
- `externalCompanyName`: اسم شركة الشحن
- `barcode`: الباركود
- `villageId`: معرف القرية
- `villageName`: اسم القرية
- `toName`: اسم المستلم
- `toPhone`: رقم الهاتف
- `totalCost`: التكلفة الإجمالية
- `status`: حالة الطرد (`pending`)
- `timestamp`: الوقت

---

## 🔎 كيفية البحث في Logs

### الطريقة 1: البحث في Console/Logs

#### في Development:
```bash
# البحث عن logs التي تؤكد وصول الطلب
grep "ORDER SENT TO SHIPPING COMPANY" logs/*.log

# أو في console
# ابحث عن:
"✅ ORDER SENT TO SHIPPING COMPANY"
```

#### في Production (Vercel):
1. اذهب إلى Vercel Dashboard
2. اختر المشروع
3. اذهب إلى **Logs**
4. ابحث عن:
   - `"ORDER SENT TO SHIPPING COMPANY"`
   - `"Package created automatically"`
   - `"Package created successfully"`

### الطريقة 2: البحث في قاعدة البيانات

```javascript
// MongoDB
// البحث عن Package مرتبط بالطلب
db.packages.find({ orderId: ObjectId("ORDER_ID") })

// البحث عن جميع Packages المرسلة لشركة معينة
db.packages.find({ 
  externalCompanyId: ObjectId("COMPANY_ID"),
  status: "pending"
})

// البحث عن Packages تم إنشاؤها في آخر 24 ساعة
db.packages.find({
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
})
```

### الطريقة 3: من API Response

```javascript
// GET /api/orders/[ORDER_ID]
{
  "orderNumber": "ORD-12345",
  "packageId": 1234,  // ✅ إذا كان موجوداً، يعني Package تم إنشاؤه
  "status": "pending"
}
```

---

## ⚠️ Logs التي تشير إلى فشل الإرسال

### 1. **فشل إنشاء Package عند إنشاء Order:**
```
⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY - Failed to create package automatically upon order creation
```
**الأسباب المحتملة:**
- لا توجد شركة شحن نشطة
- Order لا يحتوي على `villageId`
- خطأ في الاتصال بقاعدة البيانات

### 2. **فشل إنشاء Package عند تغيير الحالة:**
```
⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY - Failed to create package automatically for order
```
**الأسباب المحتملة:**
- نفس الأسباب أعلاه
- Package موجود مسبقاً

### 3. **خطأ في إنشاء Package:**
```
❌ Error creating package from order
```
**الأسباب المحتملة:**
- خطأ في قاعدة البيانات
- بيانات غير صحيحة
- مشكلة في الاتصال

---

## 📊 Logs حسب السيناريو

### السيناريو 1: Order يتم إنشاؤه → Package يتم إنشاؤه فوراً

**Logs المتوقعة:**
```
1. [INFO] POST /api/orders - Order creation request
2. [BUSINESS] Order Created - { orderId, userId, total }
3. [BUSINESS] ✅ ORDER SENT TO SHIPPING COMPANY IMMEDIATELY - Package created automatically upon order creation
   - orderId: "..."
   - orderNumber: "ORD-12345"
   - packageId: 1234
4. [INFO] ✅ Package created automatically and sent to shipping company upon order creation
```

### السيناريو 2: Order يتم إنشاؤه → Package يتم إنشاؤه عند ready_for_shipping

**Logs المتوقعة:**
```
1. [INFO] POST /api/orders - Order creation request
2. [BUSINESS] Order Created - { orderId, userId, total }
3. [INFO] PUT /api/orders/[id] - Order status update
4. [BUSINESS] ✅ ORDER SENT TO SHIPPING COMPANY - Package created automatically when order status changed to ready_for_shipping
   - orderId: "..."
   - orderNumber: "ORD-12345"
   - packageId: 1234
   - previousStatus: "processing"
   - newStatus: "ready_for_shipping"
5. [INFO] ✅ Package created automatically and sent to shipping company
```

### السيناريو 3: فشل إنشاء Package

**Logs المتوقعة:**
```
1. [INFO] POST /api/orders - Order creation request
2. [BUSINESS] Order Created - { orderId, userId, total }
3. [WARN] ⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY - Failed to create package automatically upon order creation
   - orderId: "..."
   - orderNumber: "ORD-12345"
   - reason: "Check if external company exists and is active..."
4. [ERROR] Error creating package from order - { error details }
```

---

## 🔧 كيفية إضافة Logs مخصصة

إذا أردت إضافة logs إضافية، يمكنك استخدام:

```typescript
import { logger } from '@/lib/logger';

// Log معلوماتي
logger.info('Custom log message', {
  orderId: order._id.toString(),
  customData: 'value'
});

// Log للأعمال المهمة
logger.business('Important business event', {
  orderId: order._id.toString(),
  action: 'package_created'
});

// Log للتحذيرات
logger.warn('Warning message', {
  orderId: order._id.toString(),
  issue: 'description'
});

// Log للأخطاء
logger.error('Error message', error, {
  orderId: order._id.toString(),
  context: 'additional info'
});
```

---

## 📝 ملخص Logs المهمة

### ✅ Logs الناجحة (الطلب وصل للشركة):
- `✅ ORDER SENT TO SHIPPING COMPANY IMMEDIATELY`
- `✅ ORDER SENT TO SHIPPING COMPANY`
- `✅ Package created successfully and sent to shipping company`
- `Package created from order automatically`

### ⚠️ Logs التحذيرية (فشل الإرسال):
- `⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY`
- `Failed to create package automatically`
- `No external company found`
- `Order missing villageId`

### ❌ Logs الأخطاء:
- `Error creating package from order`
- `External company not found or inactive`
- `Order missing shipping address`

---

## 🎯 نصائح للتحقق السريع

1. **ابحث عن `✅ ORDER SENT TO SHIPPING COMPANY`** - هذا يؤكد وصول الطلب
2. **تحقق من `packageId` في Order** - إذا كان موجوداً، Package تم إنشاؤه
3. **تحقق من Package في قاعدة البيانات** - `db.packages.find({ orderId: ... })`
4. **راقب Logs في الوقت الفعلي** - أثناء إنشاء Order

---

**تم التحديث:** 2024
**الإصدار:** 1.0

