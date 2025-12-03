# 🔍 استكشاف الأخطاء: لماذا لا يصل الطلب لشركة الشحن؟

## 📋 الأسباب المحتملة

### ❌ السبب 1: لا توجد شركة شحن خارجية

**الخطأ في الـ Logs:**
```
❌ [ERROR] No external company found. Please create an external company first.
⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY
```

**الحل:**
```bash
node scripts/create-external-company.js "شركة الشحن السريع"
```

**التحقق:**
- تأكد من أن الشركة تم إنشاؤها بنجاح
- احفظ API Key و API Secret
- تأكد من أن `isActive: true` في قاعدة البيانات

---

### ❌ السبب 2: الشركة غير نشطة (isActive: false)

**الخطأ في الـ Logs:**
```
❌ [ERROR] External company not found or inactive
```

**الحل:**
1. اذهب إلى قاعدة البيانات
2. ابحث عن `ExternalCompany` collection
3. تأكد من أن `isActive: true`
4. إذا كان `false`، قم بتحديثه:
   ```javascript
   db.externalcompanies.updateOne(
     { companyName: "اسم الشركة" },
     { $set: { isActive: true } }
   )
   ```

---

### ❌ السبب 3: الطلب لا يحتوي على villageId

**الخطأ في الـ Logs:**
```
❌ [ERROR] Order missing villageId in shipping address
```

**الحل:**
- تأكد من أن الطلب يحتوي على `shippingAddress.villageId`
- تأكد من أن `villageId` موجود في قاعدة البيانات
- استورد القرى إذا لم تكن موجودة:
  ```bash
  node scripts/import-villages.js
  ```

---

### ❌ السبب 4: القرية غير موجودة أو غير نشطة

**الخطأ في الـ Logs:**
```
❌ [ERROR] Village not found or inactive for shipping address
```

**الحل:**
1. تحقق من أن القرية موجودة في قاعدة البيانات:
   ```javascript
   db.villages.findOne({ villageId: YOUR_VILLAGE_ID })
   ```
2. تأكد من أن `isActive: true`
3. إذا لم تكن موجودة، قم باستيراد القرى:
   ```bash
   node scripts/import-villages.js
   ```

---

### ❌ السبب 5: autoCreatePackages معطل

**الخطأ في الـ Logs:**
- لا يوجد خطأ، لكن Package لا يتم إنشاؤه تلقائياً

**الحل:**
1. اذهب إلى `/dashboard/admin/settings` → Shipping Settings
2. فعّل **"إنشاء طرود الشحن تلقائياً عند إنشاء الطلب"**
3. احفظ التغييرات

**أو من قاعدة البيانات:**
```javascript
db.systemsettings.updateOne(
  {},
  { $set: { autoCreatePackages: true } },
  { upsert: true }
)
```

---

### ❌ السبب 6: defaultExternalCompanyId غير صحيح

**الخطأ في الـ Logs:**
```
❌ [ERROR] External company not found or inactive
```

**الحل:**
1. اذهب إلى `/dashboard/admin/settings` → Shipping Settings
2. اختر الشركة الصحيحة في **"شركة الشحن الافتراضية"**
3. احفظ التغييرات

**أو من قاعدة البيانات:**
```javascript
// احصل على ID الشركة أولاً
const company = db.externalcompanies.findOne({ isActive: true });
const companyId = company._id;

// قم بتعيينها كافتراضية
db.systemsettings.updateOne(
  {},
  { $set: { defaultExternalCompanyId: companyId } },
  { upsert: true }
)
```

---

## 🔍 خطوات التشخيص

### 1. تحقق من وجود شركة شحن

```bash
# في MongoDB shell أو Compass
db.externalcompanies.find({ isActive: true })
```

**يجب أن ترى:**
- شركة واحدة على الأقل
- `isActive: true`
- `apiKey` و `apiSecret` موجودين

---

### 2. تحقق من إعدادات النظام

```bash
# في MongoDB shell أو Compass
db.systemsettings.findOne()
```

**يجب أن ترى:**
- `autoCreatePackages: true` (أو غير موجود = true افتراضياً)
- `defaultExternalCompanyId` (اختياري، لكن يُفضل)

---

### 3. تحقق من بيانات الطلب

```bash
# في MongoDB shell أو Compass
db.orders.findOne({ orderNumber: "YOUR_ORDER_NUMBER" })
```

**يجب أن ترى:**
- `shippingAddress.villageId` موجود
- `shippingAddress.fullName` موجود
- `shippingAddress.phone` موجود

---

### 4. تحقق من وجود القرية

```bash
# في MongoDB shell أو Compass
db.villages.findOne({ villageId: YOUR_VILLAGE_ID, isActive: true })
```

**يجب أن ترى:**
- القرية موجودة
- `isActive: true`
- `deliveryCost` موجود

---

## ✅ الحل السريع

إذا كنت تريد حل سريع، قم بتنفيذ الخطوات التالية بالترتيب:

### الخطوة 1: إنشاء شركة شحن
```bash
node scripts/create-external-company.js "شركة الشحن السريع"
```

### الخطوة 2: استيراد القرى
```bash
node scripts/import-villages.js
```

### الخطوة 3: تعيين الشركة الافتراضية
1. اذهب إلى `/dashboard/admin/settings` → Shipping Settings
2. اختر الشركة في **"شركة الشحن الافتراضية"**
3. فعّل **"إنشاء طرود الشحن تلقائياً"**
4. احفظ

### الخطوة 4: اختبار
1. أنشئ طلب جديد
2. تأكد من وجود `villageId` في `shippingAddress`
3. تحقق من الـ logs:
   ```
   ✅ ORDER SENT TO SHIPPING COMPANY - Package created from order automatically
   ```

---

## 📊 جدول التحقق السريع

| العنصر | الحالة | الإجراء |
|--------|--------|---------|
| شركة شحن موجودة | ❓ | `node scripts/create-external-company.js "اسم"` |
| الشركة نشطة | ❓ | تحقق من `isActive: true` |
| القرى مستوردة | ❓ | `node scripts/import-villages.js` |
| autoCreatePackages مفعل | ❓ | تحقق من Settings |
| defaultExternalCompanyId معين | ❓ | اختر من Settings |
| الطلب يحتوي على villageId | ❓ | تحقق من بيانات الطلب |

---

## 🎯 الخلاصة

**السبب الأكثر شيوعاً:** عدم وجود شركة شحن خارجية في قاعدة البيانات.

**الحل:** 
1. إنشاء شركة شحن
2. تعيينها كافتراضية
3. تفعيل autoCreatePackages

**بعد ذلك، سيتم إرسال الطلبات تلقائياً لشركة الشحن! ✅**

---

**تم التحديث:** 2025-12-02

