# قائمة مهام نظام صلاحيات الإدارة والموظفين

نظام احترافي يسمح للإدارة بإضافة موظفين للعمل على الموقع مع دعم:
- **أدوار جاهزة** (مثل: مدير منتجات، مدير طلبات، مدير سحوبات)
- **صلاحيات مخصصة (Custom)** حيث تحدد أنت كل صلاحية يدوياً للموظف

---

## المرحلة 1: نموذج البيانات والصلاحيات

### 1.1 تعريف ثوابت الصلاحيات
- [ ] إنشاء ملف `lib/permissions.ts`:
  - تعريف كل الصلاحيات كـ enum أو object (مثال: `users.view`, `users.create`, `products.approve`, `orders.manage`, `withdrawals.process`, `settings.manage`, `categories.manage`, `earnings.view`, `messages.moderate`, `analytics.view`, إلخ).
  - تجميعها حسب الوحدة (مستخدمون، منتجات، طلبات، سحوبات، إعدادات، فئات، أرباح، رسائل، تحليلات).
  - دوال مساعدة: `getAllPermissions()`, `getPermissionsByModule()`, `isValidPermission(key)`.

### 1.2 توسيع نموذج User أو إنشاء Staff
- [ ] **الخيار أ (موصى به):** إبقاء `User` مع إضافة حقول للصلاحيات:
  - `role` يبقى (admin, supplier, marketer, wholesaler).
  - إضافة حقل `isStaff: boolean` (موظف إدارة = مستخدم بصلاحيات إدارية محددة).
  - إضافة `staffRole?: 'full_admin' | 'custom'`:
    - `full_admin`: يملك كل الصلاحيات (مثل admin الحالي).
    - `custom`: صلاحيات من قائمة مخصصة.
  - إضافة `permissions: string[]` (قائمة مفاتيح صلاحيات عند `staffRole === 'custom'`).
- [ ] **الخيار ب:** إنشاء Collection منفصل `Staff` مرتبط بـ `User` (أكثر تعقيداً، يمكن تأجيله).
- [ ] تحديث `types/index.ts`: إضافة `isStaff`, `staffRole`, `permissions` للـ User إن لزم.
- [ ] تحديث `models/User.ts`: إضافة الحقول الجديدة مع قيم افتراضية مناسبة.

### 1.3 ربط الصلاحيات بالمسارات والعمليات
- [ ] إنشاء `lib/permission-routes.ts` أو داخل `lib/permissions.ts`:
  - خريطة من كل مسار/عملية (مثل `/dashboard/admin/users`, `GET /api/admin/users`) إلى الصلاحية المطلوبة (مثل `users.view`).
  - استخدامها لاحقاً في الـ middleware وواجهة اختيار الصلاحيات.

---

## المرحلة 2: التحقق من الصلاحيات في الباكند

### 2.1 دوال التحقق من الصلاحية
- [ ] في `lib/auth.ts` (أو `lib/permissions.ts`):
  - دالة `userHasPermission(user, permission: string): boolean`:
    - إذا `user.role === 'admin'` وليس موظفاً مخصصاً → يعامل كـ full access (أو نحدد أن الـ admin الحقيقي فقط من له كل الصلاحيات).
    - إذا `user.isStaff && user.staffRole === 'full_admin'` → true لكل صلاحية.
    - إذا `user.isStaff && user.staffRole === 'custom'` → التحقق من وجود `permission` في `user.permissions`.
  - دالة `userHasAnyPermission(user, permissions: string[]): boolean`.
  - دالة `userHasAllPermissions(user, permissions: string[]): boolean`.

### 2.2 Middleware للـ API
- [ ] إنشاء `withPermission(permission: string)` و `withAnyPermission(permissions: string[])` في `lib/auth.ts`:
  - بعد `requireAuth` و (اختياري) التحقق من أن المستخدم admin أو staff.
  - استدعاء `userHasPermission(user, permission)`؛ إذا فشل → 403 مع رسالة مناسبة.
- [ ] استبدال أو دمج `withRole(['admin'])` في routes الإدارة بـ `withPermission(...)` بحيث:
  - مدير النظام الكامل (admin بدون staff أو staffRole full_admin) يمر دائماً.
  - الموظف بصلاحيات custom يمر فقط إذا كانت الصلاحية المطلوبة ضمن `permissions`.

### 2.3 تطبيق الصلاحيات على API الإدارة
- [ ] مراجعة كل route في `app/api/admin/**` وتحديد الصلاحية المطلوبة (مثل `users.view`, `users.create`, `products.approve`).
- [ ] استبدال `withRole(['admin'])` بـ `withPermission('...')` أو wrapper يجمع بين التحقق من admin/staff والصلاحية.
- [ ] التأكد من أن أي route يعدل بيانات حساسة (مثل إعدادات النظام، سحوبات) محمي بالصلاحية المناسبة.

---

## المرحلة 3: واجهات API الإدارة

### 3.1 API الصلاحيات
- [ ] `GET /api/admin/permissions` (للمستخدمين الذين يملكون صلاحية إدارة الصلاحيات أو إدارة الموظفين):
  - إرجاع قائمة كل الصلاحيات مجمعة حسب الوحدة (لاستخدامها في نموذج اختيار صلاحيات مخصصة).
- [ ] اختياري: `GET /api/admin/roles/presets` لإرجاع أدوار جاهزة مع مجموعات صلاحيات (مثل "مدير منتجات" = [products.*]) لتسريع إضافة موظف.

### 3.2 API الموظفين (مستخدمي الإدارة)
- [ ] التأكد من أن `GET/POST /api/admin/users` يعملان مع الحقول الجديدة:
  - عند إنشاء مستخدم بدور "موظف إدارة": إرسال `isStaff`, `staffRole`, `permissions` (إن كان custom).
- [ ] `PATCH /api/admin/users/[id]`: تحديث صلاحيات الموظف (تعديل `staffRole`, `permissions`).
- [ ] التحقق في الـ API أن من ينشئ/يعدل موظفاً يملك صلاحية مثل `users.create` / `users.update` (أو صلاحية "إدارة الموظفين").

### 3.3 JWT والجلسة
- [ ] التأكد من أن الـ JWT (أو استجابة `/api/auth/me`) يتضمن `isStaff`, `staffRole`, `permissions` حتى الواجهة الأمامية تستطيع إخفاء/إظهار القوائم والأزرار حسب الصلاحيات.

---

## المرحلة 4: الواجهة الأمامية (الإدارة)

### 4.1 صفحة إدارة موظفي الإدارة
- [ ] تحسين أو إعادة استخدام صفحة `app/dashboard/admin/users`:
  - فلترة أو تبويب لعرض "موظفي الإدارة" فقط (مستخدمين بـ `isStaff === true` أو role معين).
  - عرض صلاحيات كل موظف (full_admin أو قائمة الصلاحيات المخصصة).

### 4.2 نموذج إضافة موظف جديد
- [ ] في `app/dashboard/admin/users/new/page.tsx`:
  - إضافة خيار "موظف إدارة" (أو نوع حساب: عميل عادي / موظف إدارة).
  - عند اختيار "موظف إدارة":
    - اختيار نوع الصلاحيات: **كامل (full_admin)** أو **مخصص (custom)**.
    - إن كان مخصص: عرض قائمة الصلاحيات (من `GET /api/admin/permissions`) بشكل مجموعات (checkboxes أو tree) مع إمكانية "تحديد الكل" لكل مجموعة.
  - إرسال الحقول الجديدة مع نموذج الإنشاء.

### 4.3 نموذج تعديل موظف
- [ ] في `app/dashboard/admin/users/[id]/edit/page.tsx`:
  - نفس خيارات الصلاحيات (full_admin / custom + قائمة الصلاحيات) لتعديل صلاحيات الموظف الحالي.

### 4.4 مكونات مشتركة
- [ ] مكون لاختيار الصلاحيات (مثل `PermissionSelector.tsx`):
  - يستقبل القيمة الحالية `permissions: string[]` ويدعم التعديل.
  - يعرض الصلاحيات مجمعة حسب الوحدة مع ترجمة عربية للعنوان والوصف إن أمكن.

---

## المرحلة 5: تطبيق الصلاحيات على الواجهة والتنقل

### 5.1 القائمة الجانبية (Sidebar)
- [ ] في `components/dashboard/DashboardSidebar.tsx`:
  - بدلاً من الاعتماد فقط على `user.role === 'admin'`، استخدام دالة مثل `canAccessRoute(user, path)` تعتمد على خريطة المسار → صلاحية.
  - إظهار عناصر القائمة فقط إذا كان المستخدم يملك الصلاحية المناسبة (مثل إظهار "إدارة المستخدمين" فقط إذا كان يملك `users.view` أو full_admin).

### 5.2 حماية الصفحات (الـ Dashboard)
- [ ] إنشاء HOC أو مكون `RequirePermission({ permission, children })`:
  - يستخدم `useAuth()` ويتحقق من `userHasPermission(user, permission)`.
  - إذا لم يملك الصلاحية: إما إعادة توجيه لـ `/dashboard` أو عرض رسالة "غير مصرح".
- [ ] تطبيق `RequirePermission` على صفحات الإدارة الفرعية (مثل `admin/users`, `admin/withdrawals`, `admin/settings`) حسب الصلاحية المطلوبة لكل صفحة.

### 5.3 إخفاء أزرار/عمليات حسب الصلاحية
- [ ] في الصفحات التي تحتوي على أزرار (حذف، موافقة، رفض، تعديل إعدادات): التحقق من الصلاحية قبل إظهار الزر أو قبل تنفيذ الإجراء، واستدعاء API محمي بالصلاحية نفسها.

---

## المرحلة 6: الأمان والاختبار

### 6.1 قواعد أمان
- [ ] عدم السماح لموظف بـ custom بمنح صلاحيات أعلى من صلاحياته (إن أردت تفعيل ذلك لاحقاً).
- [ ] تسجيل (logging) عند إنشاء/تعديل صلاحيات موظف ومن قبل من.
- [ ] التأكد من أن تغيير صلاحيات المستخدم الحالي (مثل سحب صلاحية `users.manage`) لا يطبق إلا بعد إعادة تسجيل الدخول أو انتهاء الجلسة؛ أو تحديث الجلسة فوراً بعد التعديل.

### 6.2 اختبار الصلاحيات
- [ ] إنشاء موظف بصلاحيات مخصصة (مثلاً منتجات فقط) والتحقق من:
  - وصوله لصفحات المنتجات فقط وعدم وصوله لصفحات المستخدمين أو السحوبات.
  - استجابة APIs المنتجات 200 وAPIs المستخدمين/السحوبات 403.
- [ ] اختبار موظف full_admin: يصل لكل شيء مثل admin.
- [ ] اختبار أن المستخدم العادي (marketer/supplier/wholesaler) لا يصل لمسارات الإدارة.

---

## ملخص الصلاحيات المقترحة (للبدء)

| المفتاح | الوصف |
|--------|--------|
| `users.view` | عرض قائمة المستخدمين وتفاصيلهم |
| `users.create` | إنشاء مستخدم/موظف |
| `users.update` | تعديل مستخدم/موظف |
| `users.toggle_status` | تفعيل/إيقاف حساب |
| `products.view` | عرض المنتجات والإحصائيات |
| `products.approve` | الموافقة/الرفض على المنتجات |
| `products.manage` | تعديل إعدادات منتجات (أسعار، قفل، إلخ) |
| `orders.view` | عرض الطلبات |
| `orders.manage` | إدارة وتوزيع الطلبات والأرباح |
| `withdrawals.view` | عرض طلبات السحب |
| `withdrawals.process` | معالجة طلبات السحب |
| `categories.manage` | إدارة الفئات |
| `earnings.view` | تقارير الأرباح |
| `earnings.export` | تصدير الأرباح |
| `settings.manage` | إعدادات النظام (شحن، هوامش، إلخ) |
| `messages.moderate` | الموافقة على الرسائل والردود |
| `analytics.view` | عرض التحليلات |

يمكن لاحقاً إضافة صلاحيات أدق (مثل `settings.shipping_only`) حسب احتياجك.

---

بعد إكمال هذه المراحل سيكون لديك نظام صلاحيات يعمل بشكل سليم مع إمكانية إضافة موظف بصلاحيات custom محددة منك.
