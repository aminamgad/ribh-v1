# قائمة مهام إصلاح التكامل مع Easy Orders

هذا المستند يلخص **جميع** الإصلاحات المطلوبة لجعل التكامل مع Easy Orders يعمل بشكل سليم بعد الرفع على Vercel، مع تحقيق المتطلبات التالية:

- عند طلب العميل من متجر Easy Orders الخاص بالمسوق → الطلب يصل إلى داشبورد Easy Orders **ونظام ربح في نفس الوقت**.
- **عدم** تحديث حالة الطلب على متجر Easy Orders بناءً على حالته في ربح.
- **مزامنة مدن الشحن** بين حساب المسوق في ربح ومتجر Easy Orders عند الربط (مثل نظام سوقلي).

---

## 1. إصلاح الربط التلقائي (Callback / Authorized App Link) على Vercel

**المشكلة:** ظهور "An error occurred. Please try again later" عند الضغط على "Accept" في صفحة تثبيت التطبيق على Easy Orders (خصوصاً بعد النشر على Vercel).

### 1.1 ضمان Base URL صحيح على Vercel
- [ ] **إعداد المتغيرات في Vercel:** في Project Settings > Environment Variables إضافة:
  - `NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app` (أو الدومين المخصص)
  - إذا تُرك فارغاً، الكود يستخدم `VERCEL_URL` تلقائياً؛ يُفضّل تعيينه صراحة لتجنب أي التباس.
- [ ] **التحقق من authorized-link:** عند طلب الرابط من `/api/integrations/easy-orders/authorized-link` يجب أن تكون `callbackUrl` و `ordersWebhookUrl` و `redirect_url` تحت نفس الدومين العام (بدون localhost).
- **الملف:** `app/api/integrations/easy-orders/authorized-link/route.ts` — الكود يستخدم بالفعل `process.env.VERCEL_URL` كاحتياطي؛ التأكد من أن البيئة على Vercel تحتوي على القيمة الصحيحة.

### 1.2 تحسين endpoint الـ Callback (POST)
- [ ] **إرجاع 200 سريعاً:** Easy Orders يستدعي `callback_url` بـ POST بعد موافقة المستخدم. إذا استغرق الرد وقتاً طويلاً (مثلاً اتصال DB أو cold start)، قد يعتبر Easy Orders الطلب فاشلاً ويعرض "An error occurred".
- [ ] **خيار 1:** استلام الطلب، حفظ `api_key` و `store_id` في `EasyOrdersCallback` فوراً، ثم إرجاع `200` مع `success: true`، ومعالجة ربط التكامل إما في نفس الطلب (مع تحسين الأداء) أو عبر job لاحق. حالياً الكود يعالج التكامل في نفس الطلب؛ إذا كان DB أو الشبكة بطيئة على Vercel، قد نحتاج تقليل العمل قبل الرد.
- [ ] **خيار 2:** التأكد من أن `connectDB()` و `completeIntegration()` سريعين (اتصال DB دائم، indexes مناسبة).
- **الملف:** `app/api/integrations/easy-orders/callback/route.ts`.

### 1.3 التعامل مع عدم وجود user_id في الـ Callback
- التوثيق يذكر أن Easy Orders يرسل إلى `callback_url` فقط `{ "api_key", "store_id" }` ولا يذكر حفظ query params. الكود يتعامل بالفعل مع غياب `user_id` بحفظ البيانات في `EasyOrdersCallback` والاعتماد على `redirect_url` (يحتوي على `user_id`) عند إعادة توجيه المستخدم.
- [ ] **التحقق:** التأكد من أن `redirect_url` في رابط التثبيت يحتوي على `user_id` وأن Easy Orders يوجّه المستخدم إلى هذا الرابط بعد القبول. إذا كان Easy Orders لا يمرر المستخدم إلى `redirect_url` عند حدوث خطأ من جانبنا، فإصلاح 1.2 يقلل احتمال الخطأ.

### 1.4 CORS و Headers للـ Callback
- [ ] التأكد من أن استجابة POST للـ callback تسمح بأصل Easy Orders إذا لزم (الملف يضيف بالفعل `Access-Control-Allow-Origin: *`).
- [ ] التأكد من أن OPTIONS للـ callback يعيد الـ headers المناسبة إذا كان Easy Orders يرسل preflight.

### 1.5 توثيق استكشاف الأخطاء
- [ ] توثيق في المشروع: إذا استمر خطأ "An error occurred"، فحص:
  - Logs الـ callback على Vercel (هل الطلب وصل؟ هل تم 200؟).
  - هل Easy Orders يوصل الـ callback إلى نفس الـ URL المعروض في الرابط (بدون قص أو تغيير).
  - مهلة استجابة Vercel (مثلاً 10s) وهل يتم تجاوزها.

---

## 2. ضمان وصول الطلب إلى Easy Orders وربح في نفس الوقت (Webhook)

**المطلوب:** عندما يطلب العميل من متجر Easy Orders، الطلب يظهر في داشبورد Easy Orders (يحدث تلقائياً) وفي نظام ربح في نفس الوقت عبر Webhook.

### 2.1 تسجيل Webhook تلقائياً عند الربط
- عند استخدام "ربط تلقائي"، الرابط المصرح يمرر `orders_webhook` إلى Easy Orders، وعند القبول ينشئ Easy Orders الـ webhook تلقائياً.
- [ ] **التحقق:** بعد إصلاح الربط التلقائي (القسم 1)، التأكد من أن الطلبات تصل إلى `/api/integrations/easy-orders/webhook` وأن الـ webhook يعمل على Vercel (لا localhost).

### 2.2 معالجة Webhook بشكل موثوق
- [ ] **استجابة سريعة:** إذا كانت معالجة الطلب (إنشاء Order في DB) تستغرق وقتاً، يمكن التفكير في إرجاع 200 فوراً ثم معالجة الطلب في الخلفية (Queue/Job) حتى لا يعيد Easy Orders المحاولة أو يعتبر الطلب فاشلاً. حالياً المعالجة تتم في نفس الطلب.
- [ ] **التعرف على التكامل:** الكود يبحث عن التكامل بـ `webhookSecret` أو بـ `storeId` ويحفظ `webhookSecret` تلقائياً عند أول طلب. التأكد من أن هذا يعمل عندما ينشئ Easy Orders الـ webhook تلقائياً (بدون إدخال يدوي للـ secret في ربح).
- **الملف:** `app/api/integrations/easy-orders/webhook/route.ts`.

### 2.3 التحقق من عدم تكرار الطلبات
- الكود يتحقق من `metadata.easyOrdersOrderId` و `supplierId` قبل إنشاء الطلب. التأكد من استمرار هذا السلوك وتجنب إنشاء طلب مكرر عند إعادة إرسال Easy Orders للـ webhook.

### 2.4 واجهة المستخدم والتحقق
- [ ] في صفحة التكاملات: التأكد من أن "عرض معلومات Webhook" يعرض الـ URL الصحيح (دومين Vercel) وليس localhost بعد النشر.
- [ ] توثيق خطوات التحقق: بعد الربط، إنشاء طلب تجريبي من متجر Easy Orders والتحقق من ظهوره في ربح.

---

## 3. عدم تحديث حالة الطلب على Easy Orders من ربح

**المطلوب:** لا نريد تحديث حالة الطلب على متجر Easy Orders بناءً على حالته في ربح.

### 3.1 مراجعة الكود
- [ ] **التحقق:** عدم وجود أي استدعاء لـ `PATCH https://api.easy-orders.net/.../orders/:order_id/status` من تطبيق ربح. تم البحث في المشروع ولم يُعثر على استدعاء لتحديث حالة الطلب على Easy Orders؛ التأكيد مرة أخرى عند أي إضافة مستقبلية.
- [ ] **توثيق:** إضافة تعليق أو ملاحظة في الكود أو في المستندات: "لا نحدّث حالة الطلب على Easy Orders من ربح؛ التحديث يكون فقط داخل ربح (عند استقبال order-status-update من Easy Orders إذا رُغب بذلك)."

### 3.2 order_status_webhook (اختياري)
- الرابط المصرح يمرر حالياً `order_status_webhook` إلى نفس endpoint (مثل `/api/integrations/easy-orders/webhook/status` أو مشابه). إذا كان هذا الـ endpoint يستقبل تحديثات الحالة من Easy Orders ويحدّث الطلب **داخل ربح** فقط (بدون استدعاء Easy Orders)، فهذا متوافق مع المتطلب.
- [ ] التأكد من أن `webhook/route.ts` عند `event_type === 'order-status-update'` يحدّث فقط الطلب في ربح ولا يرسل أي طلب إلى Easy Orders.
- إذا رغبت بعدم استقبال تحديثات الحالة من Easy Orders أصلاً، يمكن إزالة `order_status_webhook` من رابط التثبيت في `authorized-link/route.ts`.

---

## 4. مزامنة مدن الشحن عند الربط (مثل سوقلي)

**المطلوب:** مزامنة مدن الشحن بين حساب المسوق في ربح ومتجر Easy Orders عند الربط.

### 4.1 استدعاء مزامنة الشحن تلقائياً بعد اكتمال الربط
- [ ] **بعد نجاح الـ callback:** في `completeIntegration()` (أو فور انتهائها بنجاح)، استدعاء منطق مزامنة الشحن لنفس التكامل (نفس الـ integration الذي تم إنشاؤه أو تحديثه).
- [ ] **الخيار الأبسط:** استيراد أو استدعاء الدالة/المنطق المستخدم في `POST /api/integrations/easy-orders/sync-shipping` من داخل `callback/route.ts` بعد `completeIntegration(userId, api_key, store_id)` (مع تمرير `integrationId` أو استرجاع التكامل من DB).
- [ ] **ملاحظة:** تجنب جعل الرد على الـ callback يعتمد على نتيجة مزامنة الشحن؛ الأفضل إما تنفيذ المزامنة بعد الرد (خلفية) أو تنفيذها بسرعة ثم الرد. الهدف عدم تأخير الرد لـ Easy Orders.
- **الملفات:** `app/api/integrations/easy-orders/callback/route.ts`, `app/api/integrations/easy-orders/sync-shipping/route.ts`.

### 4.2 مصدر بيانات مدن الشحن
- حالياً `sync-shipping` يستخدم `SystemSettings.shippingRegions` (مناطق شحن عامة للنظام).
- [ ] **التأكد من المتطلب:** هل مدن الشحن للمسوق يجب أن تكون خاصة بحسابه (مثلاً من جدول مرتبط بالمسوق) أم أن استخدام إعدادات النظام الحالية كافٍ؟ إذا كان المطلوب "حساب المسوق في ربح"، قد نحتاج إضافة دعم مناطق شحن خاصة بالمسوق لاحقاً.
- [ ] توثيق في الدليل: "مزامنة الشحن عند الربط تستخدم حالياً إعدادات مناطق الشحن العامة في النظام."

### 4.3 واجهة المستخدم
- [ ] إظهار رسالة أو حالة في صفحة التكاملات بعد الربط: "تمت مزامنة مدن الشحن مع متجرك على Easy Orders" أو "فشلت مزامنة الشحن — يمكنك تشغيلها يدوياً من الإعدادات".
- [ ] الإبقاء على إمكانية "مزامنة الشحن" يدوياً من واجهة التكامل (إن وُجدت) كاحتياطي.

---

## 5. إصلاحات وتوثيق إضافية

### 5.1 Environment Variables على Vercel
- [ ] توثيق قائمة المتغيرات المطلوبة للتكامل مع Easy Orders:
  - `NEXT_PUBLIC_BASE_URL` أو الاعتماد على `VERCEL_URL`
  - `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, وأي متغيرات أخرى للنشر.
- **المرجع:** `docs/easy-orders-vercel-deployment.md`.

### 5.2 CORS و Webhook
- [ ] التأكد من أن `/api/integrations/easy-orders/webhook` يرد على OPTIONS و POST مع الـ headers المناسبة (الملف الحالي يضيف CORS؛ التحقق على Vercel مع أصل Easy Orders إذا لزم).

### 5.3 Logging ومراقبة الأخطاء
- [ ] تحسين رسائل الـ log عند فشل الـ callback أو الـ webhook (مع عدم تسريب بيانات حساسة) لتسهيل التشخيص على Vercel.
- [ ] في حالة فشل إنشاء الطلب من الـ webhook، التأكد من إرجاع رمز حالة ورسالة مناسبة حتى يمكن تتبع المشكلة من لوحة Easy Orders إن وُجدت.

### 5.4 اختبار شامل بعد النشر
- [ ] على Vercel: ربط تلقائي → قبول التطبيق على Easy Orders → عدم ظهور "An error occurred".
- [ ] بعد الربط: إنشاء طلب تجريبي من متجر Easy Orders → ظهور الطلب في ربح وفي داشبورد Easy Orders.
- [ ] التحقق من أن مدن الشحن قد تمت مزامنتها (من إعدادات النظام أو المسوق حسب التصميم).
- [ ] التأكد من أن تغيير حالة الطلب في ربح لا يغيّر حالة الطلب على Easy Orders.

---

## ملخص الملفات المتأثرة

| الملف | التعديلات المقترحة |
|-------|---------------------|
| `app/api/integrations/easy-orders/authorized-link/route.ts` | التأكد من baseUrl على Vercel؛ اختياري: إزالة أو ضبط order_status_webhook |
| `app/api/integrations/easy-orders/callback/route.ts` | تحسين وقت الاستجابة؛ استدعاء مزامنة الشحن بعد اكتمال الربط |
| `app/api/integrations/easy-orders/webhook/route.ts` | التأكد من عدم استدعاء Easy Orders لتحديث الحالة؛ تحسين الموثوقية والـ logging |
| `app/api/integrations/easy-orders/sync-shipping/route.ts` | إمكانية استدعاء منطقها من الـ callback؛ توثيق مصدر البيانات |
| `docs/easy-orders-vercel-deployment.md` | تحديث بخطوات التحقق من Base URL والـ callback |
| Environment (Vercel) | تعيين NEXT_PUBLIC_BASE_URL أو التحقق من VERCEL_URL |

---

## ✅ تنفيذ تم (مرجع)

- **Base URL على Vercel:** دعم `VERCEL_URL` مع أو بدون بروتوكول في `authorized-link/route.ts`، وإزالة الشرطة الأخيرة من الـ baseUrl.
- **مزامنة الشحن عند الربط:** استدعاء مزامنة مدن الشحن تلقائياً في الخلفية بعد اكتمال الربط (POST و GET callback) عبر `lib/integrations/easy-orders/sync-shipping.ts` و `runShippingSyncInBackground`.
- **عدم تحديث حالة الطلب على Easy Orders:** توثيق في الكود (webhook + callback) وتمرير `order_status_webhook` لنفس endpoint الـ webhook؛ لا يوجد أي استدعاء PATCH لحالة الطلب على Easy Orders.
- **رسالة الواجهة:** عند الربط بنجاح تظهر رسالة "تمت مزامنة مدن الشحن مع متجرك تلقائياً".

---

**آخر تحديث:** وفق طلب المستخدم — قائمة شاملة دون تجاهل أي جانب من التكامل مع Easy Orders.
