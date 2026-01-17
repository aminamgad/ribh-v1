# اختبار التدفق الكامل - من المسوق إلى شركة الشحن

## ✅ الخطوة 1: إنشاء الطلب من المسوق (cart/page.tsx)

**التحقق:**
- ✅ المسوق لا يرى معلومات عن شركات الشحن
- ✅ المسوق يدخل اسم القرية يدوياً فقط (`manualVillageName`)
- ✅ الطلب يُحفظ بحالة `pending`
- ✅ لا يوجد `villageId` أو `shippingCompany` في الطلب

**الكود:**
```typescript
// cart/page.tsx - السطر 185-189
shippingAddress: {
  ...shippingAddress,
  manualVillageName: shippingAddress.manualVillageName,
  // villageId and villageName will be set by admin after review
}
```

---

## ✅ الخطوة 2: حفظ الطلب في قاعدة البيانات (api/orders/route.ts)

**التحقق:**
- ✅ الطلب يُحفظ بحالة `pending`
- ✅ `shippingAddress.manualVillageName` موجود
- ✅ `shippingAddress.villageId` غير موجود (null)
- ✅ `shippingCompany` غير موجود (null)

**الكود:**
```typescript
// api/orders/route.ts - السطر 272-286
const order = await Order.create({
  customerId: user._id,
  customerRole: user.role,
  status: 'pending', // ✅
  shippingAddress: orderData.shippingAddress, // ✅ manualVillageName فقط
  // shippingCompany: غير موجود
  // villageId: غير موجود
});
```

---

## ✅ الخطوة 3: عرض الطلب في لوحة الإدارة (orders/[id]/page.tsx)

**التحقق:**
- ✅ Modal المراجعة يظهر للإدمن
- ✅ قائمة شركات الشحن تُعرض (التي لديها `apiEndpointUrl` و `apiToken`)
- ✅ عند اختيار الشركة، تظهر قائمة المدن
- ✅ حقل اختيار القرية من القائمة

**الكود:**
```typescript
// orders/[id]/page.tsx - السطر 287-308
const fetchShippingCompanies = async () => {
  // Filter: Only companies with integration
  const companiesWithIntegration = data.companies.filter((c: any) => 
    c.isActive && c.apiEndpointUrl && c.apiToken
  );
}
```

---

## ✅ الخطوة 4: الإدمن يختار شركة الشحن والقرية (orders/[id]/page.tsx)

**التحقق:**
- ✅ الإدمن يختار `shippingCompany` (مثل "Ultra Pal")
- ✅ الإدمن يختار `selectedVillageId` من القائمة
- ✅ عند اختيار القرية، يتم تحديث `shippingCity` تلقائياً

**الكود:**
```typescript
// orders/[id]/page.tsx - السطر 1989-1992
onChange={(e) => {
  const villageId = parseInt(e.target.value);
  setSelectedVillageId(villageId);
  const selectedVillage = villages.find(v => v.villageId === villageId);
  if (selectedVillage) {
    setShippingCity(selectedVillage.villageName);
  }
}}
```

---

## ✅ الخطوة 5: الإدمن يضغط "شحن إلى شركة الشحن" (orders/[id]/page.tsx)

**التحقق:**
- ✅ `handleShipToCompany` يتم استدعاؤه
- ✅ يتم التحقق من وجود `shippingCompany` و `selectedVillageId`
- ✅ يتم تحديث معلومات الشحن أولاً (`updateShippingOnly: true`)
- ✅ ثم يتم تغيير الحالة إلى `shipped`

**الكود:**
```typescript
// orders/[id]/page.tsx - السطر 456-489
// First, update shipping info
const updateResponse = await fetch(`/api/orders/${order._id}`, {
  method: 'PUT',
  body: JSON.stringify({
    shippingCompany: shippingCompany.trim(),
    shippingCity: finalShippingCity.trim(),
    villageId: finalVillageId,
    updateShippingOnly: true
  }),
});

// Then, ship the order
const shipResponse = await fetch(`/api/orders/${order._id}`, {
  method: 'PUT',
  body: JSON.stringify({
    status: 'shipped',
    shippingCompany: shippingCompany.trim(),
    shippingCity: finalShippingCity.trim(),
    villageId: finalVillageId
  }),
});
```

---

## ✅ الخطوة 6: حفظ البيانات في قاعدة البيانات (api/orders/[id]/route.ts)

**التحقق:**
- ✅ عند `updateShippingOnly: true` - يتم حفظ `shippingCompany` و `villageId`
- ✅ عند `status: 'shipped'` - يتم حفظ `shippingCompany` و `villageId` أولاً
- ✅ يتم إعادة قراءة الطلب من قاعدة البيانات قبل استدعاء `createPackageFromOrder`

**الكود:**
```typescript
// api/orders/[id]/route.ts - السطر 234-271
// IMPORTANT: Save shippingCompany AND villageId to database FIRST
if (Object.keys(shippingUpdateData).length > 0) {
  await Order.findByIdAndUpdate(order._id, { $set: shippingUpdateData });
  // Reload order from database
  const refreshedOrder = await Order.findById(order._id).lean() as any;
  if (refreshedOrder) {
    Object.assign(order, refreshedOrder);
  }
}

// IMPORTANT: Reload order from database before creating package
const refreshedOrderForPackage = await Order.findById(order._id).lean() as any;
```

---

## ✅ الخطوة 7: إنشاء الحزمة وإرسالها (lib/order-to-package.ts)

**التحقق:**
- ✅ `createPackageFromOrder` يقرأ الطلب من قاعدة البيانات (`.lean()`)
- ✅ يجد `order.shippingCompany` ويبحث عن الشركة في قاعدة البيانات
- ✅ يجد `order.shippingAddress.villageId` ويستخدمه
- ✅ يتحقق من وجود `externalCompany.apiEndpointUrl` و `externalCompany.apiToken`
- ✅ يرسل البيانات بنفس تنسيق السكريبت

**الكود:**
```typescript
// lib/order-to-package.ts - السطر 106-128
const order = await Order.findById(orderId).lean() as any; // ✅ يقرأ من قاعدة البيانات

if (order.shippingCompany) {
  externalCompany = await ExternalCompany.findOne({ 
    companyName: order.shippingCompany, // ✅ يبحث بالاسم
    isActive: true 
  }).lean() as any;
}

// السطر 203-209
if (!shippingAddress.villageId) {
  logger.error('Order missing villageId'); // ✅ يتحقق من وجود villageId
  return null;
}
```

---

## ✅ الخطوة 8: إرسال البيانات إلى API (lib/order-to-package.ts)

**التحقق:**
- ✅ البيانات المرسلة مطابقة للسكريبت تماماً
- ✅ `village_id` كـ string
- ✅ `total_cost` كـ string
- ✅ `Authorization: Bearer ${apiToken}`
- ✅ نفس URL: `https://ultra-pal.net/api/external_company/create-package`

**الكود:**
```typescript
// lib/order-to-package.ts - السطر 353-364
const packageData = {
  to_name: shippingAddress.fullName || 'غير محدد',
  to_phone: shippingAddress.phone || '',
  alter_phone: shippingAddress.phone || '',
  description: description,
  package_type: 'normal',
  village_id: shippingAddress.villageId.toString(), // ✅ string
  street: shippingAddress.street || '',
  total_cost: (order.total || 0).toString(), // ✅ string
  note: order.deliveryNotes || shippingAddress.notes || `طلب رقم ${orderNumber}`,
  barcode: barcode
};

// السطر 43-50
const response = await fetch(apiEndpointUrl, {
  method: 'POST',
  headers: {
    'Authorization': token, // ✅ Bearer ${apiToken}
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(packageData)
});
```

---

## ✅ الخطوة 9: التحقق من الاستجابة (lib/order-to-package.ts)

**التحقق:**
- ✅ يتحقق من `response.ok && responseData.code === 200 && responseData.state === 'success'`
- ✅ يحصل على `package_id` من `responseData.data?.package_id`
- ✅ يسجل النجاح أو الفشل

**الكود:**
```typescript
// lib/order-to-package.ts - السطر 60-64
if (response.ok && responseData.code === 200 && responseData.state === 'success') {
  return {
    success: true,
    packageId: responseData.data?.package_id // ✅
  };
}
```

---

## 📋 ملخص التحقق:

### ✅ **البيانات المرسلة:**
- `to_name`: ✅ من `shippingAddress.fullName`
- `to_phone`: ✅ من `shippingAddress.phone`
- `alter_phone`: ✅ من `shippingAddress.phone`
- `description`: ✅ من `order.items`
- `package_type`: ✅ `'normal'`
- `village_id`: ✅ من `shippingAddress.villageId.toString()`
- `street`: ✅ من `shippingAddress.street`
- `total_cost`: ✅ من `order.total.toString()`
- `note`: ✅ من `order.deliveryNotes`
- `barcode`: ✅ `"ربح - ribh | ${orderNumber} | ${marketerName}"`

### ✅ **Headers:**
- `Authorization`: ✅ `Bearer ${apiToken}`
- `Content-Type`: ✅ `application/json`

### ✅ **API Endpoint:**
- URL: ✅ من `externalCompany.apiEndpointUrl` (يجب أن يكون: `https://ultra-pal.net/api/external_company/create-package`)
- Method: ✅ `POST`

---

## 🔍 نقاط التحقق النهائية:

1. ✅ المسوق لا يرى معلومات الشحن
2. ✅ الطلب يُحفظ بدون `villageId` أو `shippingCompany`
3. ✅ الإدمن يختار الشركة والقرية
4. ✅ البيانات تُحفظ في قاعدة البيانات قبل الإرسال
5. ✅ `createPackageFromOrder` يقرأ البيانات المحدثة
6. ✅ البيانات المرسلة مطابقة للسكريبت
7. ✅ API Token يُستخدم بشكل صحيح
8. ✅ API Endpoint صحيح

**النتيجة: التدفق الكامل صحيح ومتكامل! ✅**

