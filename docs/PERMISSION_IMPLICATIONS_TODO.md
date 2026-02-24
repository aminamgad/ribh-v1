# TODO: فلترة أدق تفاصيل الصلاحيات (تبعيات الصلاحيات)

> **المشكلة**: مستخدم له صلاحية `products.manage` لكن لا يظهر له شيء لأن صفحة المنتجات تشترط `products.view` فقط — والمسار والقائمة الجانبية وواجهات API لا تسمح بالوصول لمن لديه manage دون view.
>
> **الحل المقترح**: تعريف **تبعيات الصلاحيات** (permission implications) — صلاحيات أعلى تُعطي تلقائياً صلاحيات أقل مرتبطة بها.

---

## 1. تبعيات الصلاحيات (Permission Implications)

| الصلاحية الأعلى | تُعطي تلقائياً |
|-----------------|----------------|
| `products.manage` | `products.view` |
| `products.approve` | `products.view` |
| `orders.manage` | `orders.view` |
| `withdrawals.process` | `withdrawals.view` |
| `users.create` | `users.view` |
| `users.update` | `users.view` |
| `users.toggle_status` | `users.view` |
| `earnings.export` | `earnings.view` |
| `product_stats.view` | قد تُعطي وصولاً لصفحة المنتجات (حسب التصميم) |

- [ ] **`lib/permissions.ts`**: إضافة خريطة `PERMISSION_IMPLICATIONS` وتعريف دالة `hasAccessToPermission(user, permission)` التي ترجع `true` إذا كان لدى المستخدم الصلاحية أو أي صلاحية أعلى تُعطيها.
- [ ] **`lib/auth.ts`**: تحديث `userHasPermission` أو إضافة `userHasAccessToPermission` لاستخدام التبعيات عند التحقق.

---

## 2. المسارات والقائمة الجانبية

- [ ] **`lib/permissions.ts`**: تحديث `ROUTE_PERMISSIONS` لدعم مصفوفة صلاحيات لكل مسار (بدلاً من صلاحية واحدة)، بحيث يُسمح بالوصول عند امتلاك **أي** صلاحية منها:

| المسار | الصلاحيات المسموحة (أي منها يكفي) |
|--------|-----------------------------------|
| `/dashboard/products` | `products.view` أو `products.approve` أو `products.manage` أو `product_stats.view` |
| `/dashboard/orders` | `orders.view` أو `orders.manage` |
| `/dashboard/admin/withdrawals` | `withdrawals.view` أو `withdrawals.process` |
| `/dashboard/users` | `users.view` أو `users.create` أو `users.update` أو `users.toggle_status` |
| `/dashboard/admin/earnings` | `earnings.view` أو `earnings.export` |
| `/dashboard/admin/categories` | `categories.manage` أو `products.view` |
| `/dashboard/analytics` | `analytics.view` أو `product_stats.view` |
| `/dashboard/admin/product-stats` | `product_stats.view` أو `products.view` أو `products.manage` |

- [ ] **`canAccessPath`**: تعديل المنطق ليتحقق من "أي صلاحية من المسموح بها" بدلاً من صلاحية واحدة.

---

## 3. واجهات API

### المنتجات
- [ ] **GET `/api/products`** (للأدمن): السماح بالوصول لـ `products.view` **أو** `products.approve` **أو** `products.manage` — استخدام `withAnyPermission`.
- [ ] **GET `/api/admin/products`** (إن وجد): نفس المنطق.
- [ ] التأكد أن طلبات عرض المنتجات من لوحة الأدمن لا تُرجع فارغة لمَن لديه `products.manage` فقط.

### الطلبات
- [ ] **GET `/api/orders`** (للأدمن): السماح لـ `orders.view` أو `orders.manage`.
- [ ] **GET `/api/admin/orders`**: نفس المنطق.

### السحوبات
- [ ] **GET `/api/admin/withdrawals`**: السماح لـ `withdrawals.view` أو `withdrawals.process` (معالجة تتطلب عرض الطلبات).

### المستخدمون
- [ ] **GET `/api/admin/users`**: السماح لـ `users.view` أو `users.create` أو `users.update` (لأن من يعدّل يحتاج أن يرى القائمة).

### إحصائيات لوحة التحكم
- [ ] **GET `/api/dashboard/stats`**: تحديث الفلترة بحيث:
  - من لديه `products.manage` أو `products.approve` يرى إحصائيات المنتجات.
  - من لديه `orders.manage` يرى إحصائيات الطلبات.
  - من لديه `withdrawals.process` يرى إحصائيات السحوبات.

---

## 4. الصفحات والواجهة

### صفحة المنتجات `/dashboard/products`
- [ ] التحقق من أن جلب البيانات (React Query / SWR) يعمل لمن لديه `products.view` **أو** `products.approve` **أو** `products.manage`.
- [ ] التأكد أن صفحة المنتجات لا تُعيد توجيه من لديه `products.manage` فقط.

### صفحة الطلبات `/dashboard/orders`
- [ ] نفس المنطق: السماح بالوصول مع `orders.view` أو `orders.manage`.
- [ ] التأكد أن الأعمدة والأزرار تظهر حسب الصلاحية الصحيحة (مثلاً إجراءات إدارة تظهر مع `orders.manage` فقط).

### صفحة المنتج الواحد `/dashboard/products/[id]`
- [ ] السماح بالوصول لمن لديه `products.view` أو `products.approve` أو `products.manage` أو `product_stats.view`.
- [ ] إخفاء/إظهار الأزرار (تعديل، اعتماد، إحصائيات، قفل) حسب الصلاحيات الدقيقة.

### صفحة تعديل منتج `/dashboard/products/[id]/edit`
- [ ] السماح بالدخول مع `products.manage` فقط (لا حاجة لـ `products.view` إن تم استخدام التبعيات).

### صفحة طلبات السحب `/dashboard/admin/withdrawals`
- [ ] السماح بالوصول مع `withdrawals.view` أو `withdrawals.process`.
- [ ] أزرار الموافقة/الرفض تظهر مع `withdrawals.process` فقط.

### صفحة المستخدمين `/dashboard/users` و `/dashboard/admin/users`
- [ ] السماح بالوصول مع أي صلاحية مستخدمين (`users.view`, `users.create`, `users.update`, `users.toggle_status`).
- [ ] إظهار أزرار الإنشاء/التعديل/التفعيل حسب الصلاحية المعطاة.

### لوحة التحكم `/dashboard`
- [ ] مراجعة جميع البطاقات والأقسام (الطلبات، المنتجات، الأرباح، المستخدمين، الرسائل، إلخ) لتستخدم `hasAccessToPermission` أو `hasPermission` مع التبعيات.
- [ ] بطاقة "أفضل المنتجات" ورابط إضافة منتج: تظهر مع `products.manage` أو `products.view`.
- [ ] بطاقة "الطلبات الأخيرة": تظهر مع `orders.view` أو `orders.manage`.
- [ ] إحصائيات السحوبات: تظهر مع `withdrawals.view` أو `withdrawals.process`.
- [ ] بطاقة المستخدمين: تظهر مع أي صلاحية مستخدمين.
- [ ] بطاقة الرسائل: تظهر مع `messages.moderate`.
- [ ] بطاقة الدور في الصفحة الرئيسية: عرض "موظف إدارة" بدلاً من "الإدارة" بشكل متسق (حسب `getRoleDisplayLabel`).

### الهيدر
- [ ] شريط البحث: يظهر مع `products.view` أو `products.approve` أو `products.manage`.
- [ ] أيقونة الرسائل: حسب `messages.moderate` كما هو حالياً.

### القائمة الجانبية
- [ ] التأكد أن `canAccessPath` (بعد التحديث) يُظهر رابط المنتجات لمن لديه `products.manage` أو `products.approve` دون `products.view`.
- [ ] نفس المنطق للطلبات، السحوبات، المستخدمين، إلخ.

---

## 5. صفحات أخرى

### الفئات `/dashboard/admin/categories`
- [ ] مدير الفئات يحتاج `categories.manage` — الـ preset يعطيه أيضاً `products.view`. التأكد أن من لديه `categories.manage` فقط يصل للصفحة.
- [ ] تحديث `ROUTE_PERMISSIONS` إذا لزم.

### الأرباح `/dashboard/admin/earnings`
- [ ] السماح بـ `earnings.view` أو `earnings.export`.
- [ ] زر التصدير: `earnings.export` فقط.

### التحليلات `/dashboard/analytics`
- [ ] السماح بـ `analytics.view` أو `product_stats.view` إذا كانت الصفحة تعرض إحصائيات منتجات أيضاً.

### إحصائيات المنتج `/dashboard/admin/product-stats`
- [ ] السماح بـ `product_stats.view` أو `products.view` أو `products.manage`.

### الإعدادات `/dashboard/admin/settings`
- [ ] تبقى محصورة بـ `settings.manage` فقط (لا تبعيات).

### الرسائل `/dashboard/messages`
- [ ] تبقى محصورة بـ `messages.moderate` فقط.

---

## 6. ملخص الأولويات

| الأولوية | المهمة |
|----------|--------|
| 1 | إضافة تبعيات الصلاحيات في `lib/permissions.ts` ودالة `hasAccessToPermission` |
| 2 | تحديث `ROUTE_PERMISSIONS` و `canAccessPath` لدعم صلاحيات متعددة |
| 3 | تحديث API المنتجات والطلبات والسحوبات والمستخدمين و `/api/dashboard/stats` |
| 4 | مراجعة صفحات المنتجات والطلبات والمستخدمين والسحوبات |
| 5 | مراجعة لوحة التحكم والهيدر والقائمة الجانبية |
| 6 | مراجعة صفحات الفئات، الأرباح، التحليلات، إحصائيات المنتج |

---

## 7. ملاحظات

- **الـ presets**: الـ presets الحالية (مثل `products_manager`) تعطي `products.view` و `products.manage` معاً، لذلك لن تتأثر. الهدف هو دعم موظفين مخصصين لديهم `products.manage` فقط.
- **الأمان**: التحقق في الـ API يظل صارماً؛ التبعيات تُستخدم لتوسيع الوصول لمن له صلاحيات أعلى، وليس لتضييقه.
- **الاتساق**: التأكد أن جميع الصفحات والـ API تستخدم نفس المنطق (إما `hasPermission` المحدّث أو `hasAccessToPermission`).
