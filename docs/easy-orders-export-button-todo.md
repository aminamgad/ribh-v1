# قائمة مهام: تصدير المنتجات إلى Easy Orders – إخفاء زر التصدير للمُصدَّر وإظهاره بعد الحذف

## الهدف
- **المنتج الذي تم تصديره من قبل** → لا يظهر له زر "تصدير" (لأنه موجود فعلاً في Easy Orders).
- **إذا حذف المستخدم المنتج من حسابه على Easy Orders** → يظهر زر "تصدير" مرة أخرى (أو نسمح له بـ "إزالة من التصدير" يدوياً ثم يظهر الزر).

## الاعتماديات الحالية
- التصدير يحفظ في المنتج: `metadata.easyOrdersProductId`, `metadata.easyOrdersStoreId`, `metadata.easyOrdersIntegrationId`.
- نموذج `Product` **لا يضم حقل `metadata` في الـ schema** → قد لا يُحفظ أو لا يُرجع من الـ API.
- `GET /api/products` يستخدم `.select(...)` **بدون `metadata`** → الواجهة لا تعرف إن كان المنتج مُصدَّراً.
- زر التصدير يظهر حالياً لجميع المنتجات المعتمدة بدون التحقق من حالة التصدير.

---

## قائمة المهام (Todo)

### 1. إضافة حقل `metadata` لنموذج Product
- **الملف:** `models/Product.ts`
- **الإجراء:** إضافة:
  ```ts
  metadata: {
    type: Schema.Types.Mixed,
    default: undefined
  }
  ```
  أو كـ sub-document مع الحقول: `easyOrdersProductId`, `easyOrdersStoreId`, `easyOrdersIntegrationId`.
- **السبب:** حتى يُحفظ ويُرجع من قاعدة البيانات بشكل صريح.

### 2. إضافة `metadata` لنوع Product في TypeScript
- **الملف:** `types/index.ts` (واجهة `Product`)
- **الإجراء:** إضافة:
  ```ts
  metadata?: {
    easyOrdersProductId?: string;
    easyOrdersStoreId?: string;
    easyOrdersIntegrationId?: string;
    [key: string]: unknown;
  };
  ```

### 3. إرجاع `metadata` من GET /api/products
- **الملف:** `app/api/products/route.ts`
- **الإجراء:** إضافة `metadata` إلى `.select()` في استعلام المنتجات (على الأقل للمسوق/تاجر الجملة)، أو إرجاعه دون استثناءه في الـ response.
- **السبب:** حتى تعرف الواجهة أي منتج مُصدَّر وأي منتج غير مُصدَّر.

### 4. إخفاء زر التصدير للمنتج المُصدَّر
- **المنطق:** عرض زر "تصدير" فقط عندما:
  - المنتج معتمد (`isApproved`) ونشط (`isActive`)،
  - **ولا** يوجد `product.metadata?.easyOrdersProductId` (أو نعرض زر "إزالة من التصدير" بدلاً منه).
- **الملفات المتأثرة:**
  - `components/products/ProductSection.tsx` (واجهة المنتج + زر التصدير)
  - `app/dashboard/products/page.tsx` (قائمة المنتجات + زر التصدير في الجدول/البطاقات)
  - `app/dashboard/page.tsx` (قسم المنتجات في الداشبورد)
  - `app/dashboard/favorites/page.tsx` (صفحة المفضلة)

### 5. إنشاء API لإلغاء ربط التصدير (Unlink)
- **الغرض:** عندما يحذف المستخدم المنتج من Easy Orders، يمكنه الضغط على "حذفته من Easy Orders" (أو "إزالة من التصدير") لمسح `metadata` الخاصة بـ Easy Orders من المنتج في ربح، فيظهر زر "تصدير" مرة أخرى.
- **الاقتراح:** `POST /api/integrations/easy-orders/unlink-product` أو `DELETE .../export-product` مع `productId` و`integrationId`.
- **الإجراء:** التحقق من أن المنتج يخص المستخدم والتكامل يخصه، ثم مسح `metadata.easyOrdersProductId`, `metadata.easyOrdersStoreId`, `metadata.easyOrdersIntegrationId` من المنتج (أو تعيين `metadata` إلى `{}` إذا لم يبق شيء آخر).

### 6. معالجة 404 في تصدير المنتج
- **الملف:** `app/api/integrations/easy-orders/export-product/route.ts` (وربما `export-bulk` و sync).
- **السيناريو:** المنتج لديه `metadata.easyOrdersProductId` لكن المستخدم حذفه من Easy Orders. عند التصدير نرسل PATCH → Easy Orders يرجع 404.
- **الإجراء:** عند استلام 404:
  - مسح حقول Easy Orders من `metadata` في المنتج (unlink).
  - إعادة المحاولة كإنشاء منتج جديد (POST بدون `productId`) ثم حفظ الـ `productId` الجديد في `metadata`.
- **بديل:** عدم إعادة المحاولة تلقائياً، وإرجاع رسالة واضحة: "المنتج غير موجود في Easy Orders. تمت إزالة الربط. يمكنك الضغط على تصدير مرة أخرى لإنشائه من جديد."

### 7. تطبيق إخفاء زر التصدير في كل الصفحات
- التأكد من أن **نفس الشرط** يُطبَّق في:
  - `ProductSection.tsx`: `showExport && onExport && product.isApproved && !product.metadata?.easyOrdersProductId`
  - `dashboard/products/page.tsx`: نفس الشرط لأزرار التصدير (قائمة + جدول).
  - `dashboard/page.tsx`: نفس الشرط لقسم المنتجات.
  - `dashboard/favorites/page.tsx`: نفس الشرط لصفحة المفضلة.
- التأكد من أن كائن `product` في كل هذه الصفحات يحتوي على `metadata` (يأتي من الـ API أو من الـ cache).

### 8. عرض حالة "مُصدّر" وزر "حذفته من Easy Orders"
- للمنتجات التي لديها `metadata.easyOrdersProductId`:
  - إظهار نص أو شارة مثل "مُصدّر إلى Easy Orders" بدلاً من زر "تصدير".
  - إظهار زر صغير "حذفته من Easy Orders" (أو "إزالة من التصدير") يستدعي API الإلغاء (unlink)، ثم يحدّث الواجهة ليظهر زر "تصدير" مرة أخرى.
- تطبيق هذا في نفس المواضع التي فيها زر التصدير (products, dashboard, favorites, ProductSection).

---

## ملخص التحقق النهائي
- [x] نموذج Product يضم `metadata` ويحفظه.
- [x] نوع Product في TypeScript يضم `metadata`.
- [x] GET /api/products يرجع `metadata` للمسوق/تاجر الجملة.
- [x] زر "تصدير" يظهر فقط عندما لا يوجد `easyOrdersProductId`.
- [x] وجود API unlink (`POST /api/integrations/easy-orders/unlink-product`) وربطه بزر "مُصدّر" (إلغاء الربط).
- [x] معالجة 404 في export (unlink تلقائي + إعادة تصدير كمنتج جديد) في export-product، export-bulk، و sync.
- [x] جميع الصفحات (products, dashboard, favorites, ProductSection) تستخدم نفس المنطق وتعرض "مُصدّر" + زر الإلغاء حيث يناسب.
