# ✅ تكامل API شركة الشحن الخارجية - مكتمل

## 📋 ما تم إنجازه:

### 1️⃣ **إضافة حقول API في ExternalCompany Model**
- ✅ `apiEndpointUrl` - رابط API الخاص بشركة الشحن
- ✅ `apiToken` - Token للمصادقة مع API

### 2️⃣ **إضافة دالة استدعاء API**
- ✅ `callExternalShippingCompanyAPI()` في `lib/order-to-package.ts`
- ✅ تستدعي API الخاص بشركة الشحن بعد إنشاء Package
- ✅ معالجة الأخطاء والـ logging

### 3️⃣ **تحديث createPackageFromOrder**
- ✅ يستدعي API الخاص بشركة الشحن إذا كان `apiEndpointUrl` و `apiToken` موجودين
- ✅ إذا لم يكن API موجوداً، ينشئ Package في قاعدة البيانات فقط
- ✅ Logging مفصل للنجاح والفشل

### 4️⃣ **API Endpoint لإدارة External Companies**
- ✅ `GET /api/admin/external-companies` - جلب جميع الشركات
- ✅ `PUT /api/admin/external-companies` - تحديث الشركة (بما في ذلك apiEndpointUrl و apiToken)

---

## 🚀 كيفية الاستخدام:

### 1. إنشاء شركة شحن:
```bash
node scripts/create-external-company.js "اسم الشركة"
```

### 2. إضافة API Endpoint و Token:

#### الطريقة الأولى: من MongoDB مباشرة
```javascript
db.externalcompanies.updateOne(
  { companyName: "اسم الشركة" },
  { 
    $set: { 
      apiEndpointUrl: "https://shipping-company.com/api/create-package",
      apiToken: "your-bearer-token-here"
    } 
  }
);
```

#### الطريقة الثانية: من Admin Settings (قريباً)
- سيتم إضافة UI في `/dashboard/admin/settings` لإدارة External Companies

---

## 📡 كيف يعمل النظام:

### عند إنشاء Order:

1. **إنشاء Package في قاعدة البيانات:**
   ```typescript
   const newPackage = new Package({ ... });
   await newPackage.save();
   ```

2. **استدعاء API الخاص بشركة الشحن (إذا كان موجوداً):**
   ```typescript
   if (externalCompany.apiEndpointUrl && externalCompany.apiToken) {
     const apiResponse = await callExternalShippingCompanyAPI(
       externalCompany.apiEndpointUrl,
       externalCompany.apiToken,
       packageData
     );
   }
   ```

3. **Logging:**
   - ✅ نجاح: `✅ ORDER SENT TO SHIPPING COMPANY API - Package sent successfully via external API`
   - ⚠️ فشل: `⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY API - API call failed`
   - ℹ️ بدون API: `✅ ORDER SENT TO SHIPPING COMPANY - Package created in database (no external API configured)`

---

## 🔍 التحقق من الـ Logs:

### نجاح:
```
✅ ORDER SENT TO SHIPPING COMPANY API - Package sent successfully via external API
{
  orderId: "...",
  packageId: 123,
  externalPackageId: 456,
  apiEndpoint: "https://shipping-company.com/api/create-package",
  ...
}
```

### فشل:
```
⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY API - API call failed
{
  orderId: "...",
  packageId: 123,
  error: "API returned status 401",
  note: "Package was created in database but API call to shipping company failed"
}
```

---

## 📝 ملاحظات:

1. **إذا لم يكن `apiEndpointUrl` و `apiToken` موجودين:**
   - النظام ينشئ Package في قاعدة البيانات فقط
   - لا يتم استدعاء API خارجي
   - هذا السلوك متوافق مع النظام القديم

2. **إذا فشل استدعاء API:**
   - Package يتم إنشاؤه في قاعدة البيانات
   - يتم تسجيل الخطأ في الـ logs
   - النظام يستمر في العمل بشكل طبيعي

3. **Format البيانات المرسلة:**
   ```json
   {
     "to_name": "اسم المستلم",
     "to_phone": "رقم الهاتف",
     "alter_phone": "رقم الهاتف البديل",
     "description": "وصف الطرد",
     "package_type": "normal",
     "village_id": "123",
     "street": "عنوان الشارع",
     "total_cost": "200",
     "note": "ملاحظات",
     "barcode": "PKG-ORD-123-..."
   }
   ```

4. **Format الاستجابة المتوقعة:**
   ```json
   {
     "code": 200,
     "state": "success",
     "data": {
       "package_id": 1234
     },
     "message": "Operation Successful"
   }
   ```

---

## ✅ الخلاصة:

النظام الآن:
- ✅ ينشئ Package في قاعدة البيانات
- ✅ يستدعي API الخاص بشركة الشحن (إذا كان موجوداً)
- ✅ يسجل جميع العمليات في الـ logs
- ✅ يتعامل مع الأخطاء بشكل صحيح

**الخطوة التالية:** إضافة UI في Admin Settings لإدارة External Companies و إدخال `apiEndpointUrl` و `apiToken`.

