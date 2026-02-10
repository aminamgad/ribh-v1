# مزامنة مدن الشحن تلقائياً مع Easy Orders لجميع المسوقين

## الهدف
عندما تقوم **الإدارة** بإضافة أو تعديل أو حذف **منطقة/مدينة شحن** في النظام، أن تتم **مزامنة تلقائية** لجميع المسوقين المرتبطين بـ Easy Orders بحيث يظهر لدى كل مسوق في متجره على Easy Orders أحدث مدن الشحن والتكاليف دون الحاجة إلى إعادة ربط الحساب أو تشغيل المزامنة يدوياً.

---

## مرجع التكامل (Easy Orders)

- **الوثيقة:** `easy-order-documnation.md`
- **Shipping API:**  
  `PATCH https://api.easy-orders.net/api/v1/external-apps/shipping`  
  - الصلاحية المطلوبة: `shipping_areas`
  - الـ Body: `{ "is_active": true, "cities": "city:cost,city:cost" }`
- **المصدر الحالي لبيانات الشحن في ربح:** `SystemSettings.shippingRegions` (يُدار عبر `GET/POST/PUT/DELETE` على `/api/admin/settings/shipping`).

---

## Todo List

### 1. دالة مزامنة الشحن لجميع تكاملات Easy Orders

- [x] **1.1** إنشاء دالة في `lib/integrations/easy-orders/` (مثلاً `sync-shipping-all.ts` أو توسيع `sync-shipping.ts`) مثل:
  - `syncShippingForAllEasyOrdersIntegrations(): Promise<{ total: number; succeeded: number; failed: number; errors: Array<{ integrationId: string; error: string }> }>`
- [x] **1.2** داخل الدالة: جلب جميع التكاملات النشطة من نوع Easy Orders التي تملك `apiKey` (من `StoreIntegration`: `type === 'easy_orders'`, `isActive === true`, `apiKey` موجود).
- [x] **1.3** لكل تكامل استدعاء `syncShippingForIntegration(integration)` (الموجودة في `lib/integrations/easy-orders/sync-shipping.ts`).
- [x] **1.4** تنفيذ المزامنة بشكل لا يحجب الاستجابة: إما تشغيل المزامنات **بالتسلسل** مع تأخير بسيط (مثلاً 200–500 ms) بين كل طلب لتقليل احتمال تجاوز حد الطلبات (Rate Limit) لـ Easy Orders، أو تشغيلها **بالتوازي** بعدد محدود (مثلاً 3–5 في نفس الوقت) ثم تجميع النتائج.
- [x] **1.5** تسجيل النتائج في الـ logger (عدد الناجح/الفاشل، ومعرف التكامل ورسالة الخطأ عند الفشل) دون تسريب بيانات حساسة.

### 2. ربط المزامنة التلقائية بتعديلات الإدارة على مدن الشحن

- [x] **2.1** في **POST** `/api/admin/settings/shipping` (إضافة منطقة شحن): بعد حفظ المنطقة بنجاح، استدعاء مزامنة الشحن لجميع التكاملات **في الخلفية** (بدون انتظار النتيجة قبل إرجاع الرد للأدمن)، مثلاً:
  - `import { syncShippingForAllEasyOrdersIntegrations } from '@/lib/integrations/easy-orders/sync-shipping-all';`
  - بعد `await settings.save()`: `syncShippingForAllEasyOrdersIntegrations().catch(err => logger.error('Background shipping sync failed', err));`
- [x] **2.2** في **PUT** `/api/admin/settings/shipping` (تعديل منطقة شحن): نفس المنطق — بعد `await settings.save()` تشغيل المزامنة لجميع المسوقين في الخلفية.
- [x] **2.3** في **DELETE** `/api/admin/settings/shipping` (حذف منطقة شحن): نفس المنطق — بعد `await settings.save()` تشغيل المزامنة لجميع المسوقين في الخلفية.
- [x] **2.4** التأكد من أن رد الـ API للأدمن **لا يعتمد** على نتيجة المزامنة (لا انتظار انتهاء المزامنة قبل إرجاع 200)، حتى لا يتأخر حفظ الإعدادات أو يحصل timeout.

### 3. التعامل مع الأخطاء وحد الطلبات (Rate Limit)

- [ ] **3.1** في حال فشل مزامنة تكامل معين: تسجيل الخطأ في الـ logger وعدم إيقاف مزامنة باقي التكاملات.
- [ ] **3.2** مراعاة حد الطلبات لـ Easy Orders (المرجع في الوثيقة إن وُجد): اختيار تأخير أو حد توازي مناسب (انظر 1.4).
- [ ] **3.3** (اختياري) تحديث حقل مثل `lastShippingSync` أو `shippingSynced` في `StoreIntegration` عند النجاح/الفشل إذا كان ذلك مفيداً للواجهة أو التقارير.

### 4. التوثيق والواجهة

- [ ] **4.1** توثيق في الكود أو في دليل التكامل: "عند إضافة/تعديل/حذف منطقة شحن من إعدادات الأدمن، تتم مزامنة مدن الشحن تلقائياً لجميع متاجر المسوقين المرتبطين بـ Easy Orders."
- [ ] **4.2** (اختياري) إظهار رسالة للأدمن بعد الحفظ: "تم حفظ منطقة الشحن. جاري مزامنة مدن الشحن مع متاجر Easy Orders للمسوقين." دون انتظار اكتمال المزامنة.
- [ ] **4.3** الإبقاء على زر "مزامنة الشحن" في صفحة التكاملات للمسوق كاحتياطي للمزامنة اليدوية عند الحاجة.

### 5. التحقق

- [ ] **5.1** إضافة منطقة شحن جديدة من إعدادات الأدمن → التحقق (بعد ثوانٍ) من ظهور المدينة/التكلفة في متجر مسوق مرتبط بـ Easy Orders.
- [ ] **5.2** تعديل تكلفة أو اسم منطقة شحن → التحقق من تحديث البيانات في Easy Orders لجميع المسوقين المرتبطين.
- [ ] **5.3** حذف منطقة شحن → التحقق من اختفاء المنطقة من إعدادات الشحن في Easy Orders للمسوقين.
- [ ] **5.4** التأكد من أن استجابة الأدمن (200) سريعة ولا تتأخر حتى مع وجود عدد كبير من التكاملات.

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `lib/integrations/easy-orders/sync-shipping.ts` | (بدون تغيير منطق المزامنة) — يُستدعى من الدالة الجديدة. |
| `lib/integrations/easy-orders/sync-shipping-all.ts` (جديد) | دالة `syncShippingForAllEasyOrdersIntegrations()`: جلب كل تكاملات Easy Orders النشطة، استدعاء `syncShippingForIntegration` لكل منها مع تأخير/توازي مناسب، إرجاع إحصائيات وتسجيل الأخطاء. |
| `app/api/admin/settings/shipping/route.ts` | بعد نجاح الحفظ في POST و PUT و DELETE، استدعاء المزامنة لجميع التكاملات في الخلفية (بدون await قبل الرد). |
| `docs/easy-orders-shipping-auto-sync-todo.md` | هذا المستند — قائمة المهام والتحقق. |

---

## ملاحظات

- مصدر بيانات الشحن للمزامنة هو **نفس المصدر الحالي**: `SystemSettings.shippingRegions` (مناطق الشحن في إعدادات النظام)، وليس إعدادات خاصة بكل مسوق.
- إذا كانت هناك لاحقاً حاجة لمزامنة عند تغيير **إعدادات الشحن العامة** (مثل تبويب "الشحن" في إعدادات النظام الذي يعدّل `governorates` فقط)، يمكن إضافة نقطة استدعاء مماثلة هناك بعد توحيد مصدر البيانات مع `shippingRegions` إن لزم.
