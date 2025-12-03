# 📍 أين يتم إرسال الطلب لشركة الشحن؟

## 📂 الملفات الرئيسية:

### 1️⃣ **`lib/order-to-package.ts`** ⭐ (الملف الرئيسي)

**هذا هو الملف الذي ينشئ Package من Order:**

```typescript
export async function createPackageFromOrder(orderId: string): Promise<number | null>
```

**ما يفعله:**
- ✅ يحصل على Order من قاعدة البيانات
- ✅ يتحقق من وجود شركة شحن خارجية
- ✅ ينشئ Package في قاعدة البيانات
- ❌ **لا يستدعي API خارجي**
- ❌ **لا يرسل HTTP request**

**السطر الذي ينشئ Package:**
```typescript
// السطر 125-141
const newPackage = new Package({ ... });
await newPackage.save();
```

---

### 2️⃣ **`app/api/orders/route.ts`** (عند إنشاء Order)

**يستدعي `createPackageFromOrder`:**

```typescript
// السطر 246-247
const { createPackageFromOrder } = await import('@/lib/order-to-package');
const packageId = await createPackageFromOrder(order._id.toString());
```

**المكان:** السطر 242-281

---

### 3️⃣ **`app/api/orders/[id]/route.ts`** (عند تغيير حالة الطلب)

**يستدعي `createPackageFromOrder` عندما تصبح الحالة `ready_for_shipping`:**

```typescript
// السطر 114-115
const { createPackageFromOrder } = await import('@/lib/order-to-package');
const packageId = await createPackageFromOrder(order._id.toString());
```

**المكان:** السطر 109-140

---

### 4️⃣ **`app/api/external_company/create-package/route.ts`** (للشركة الخارجية)

**هذا endpoint للشركة الخارجية لاستدعائه:**

```typescript
POST /api/external_company/create-package
Authorization: Bearer <API_KEY>
```

**هذا مختلف:** الشركة الخارجية تستدعي هذا الـ endpoint، وليس النظام.

---

## 🔍 الخلاصة:

### **الملف الرئيسي:** `lib/order-to-package.ts`

**الدالة:** `createPackageFromOrder()`

**ما يحدث:**
1. يحصل على Order
2. يتحقق من شركة الشحن
3. ينشئ Package في قاعدة البيانات
4. **لا يرسل HTTP request**

---

## ⚠️ ملاحظة مهمة:

**النظام الحالي:**
- ✅ ينشئ Package في قاعدة البيانات
- ❌ لا يستدعي API خارجي
- ❌ لا يرسل HTTP request لشركة الشحن

**إذا كنت تريد إرسال HTTP request:**
- يجب إضافة webhook URL في ExternalCompany
- يجب إضافة كود لاستدعاء API بعد إنشاء Package

---

## 📍 الملفات بالترتيب:

1. **`lib/order-to-package.ts`** ⭐ - الملف الرئيسي
2. **`app/api/orders/route.ts`** - يستدعي الملف الرئيسي عند إنشاء Order
3. **`app/api/orders/[id]/route.ts`** - يستدعي الملف الرئيسي عند تغيير الحالة
4. **`app/api/external_company/create-package/route.ts`** - للشركة الخارجية

---

**الملف الرئيسي:** `lib/order-to-package.ts` - السطر 14-180

