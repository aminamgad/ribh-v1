# إصلاح أخطاء مزامنة المنتجات مع Easy Orders

## الأخطاء التي كانت تظهر
- **رابط المنتج محجوز** (Product link reserved) عند تصدير عدة منتجات.
- **خطأ غير معروف** (Unknown error) لبعض المنتجات.

## الإصلاحات المطبقة

### 1. تحسين استخراج رسالة الخطأ من API (تفادي "خطأ غير معروف")
- **الملف:** `lib/integrations/easy-orders/product-converter.ts`
- عند استلام **400** من Easy Orders يتم الآن قراءة الرسالة من حقول متعددة في الـ JSON:
  - `message`, `error`, `errors[0].message`, `errors[0]`, `detail`, `msg`
- في حالة فشل التحقق النهائي يُستخدم نص الاستجابة (حتى 300 حرف) بدلاً من "بيانات غير صالحة".
- عند أخطاء الشبكة أو الاستثناءات يتم استخدام `lastError?.message` أو تحويل الخطأ إلى نص حتى لا تظهر "خطأ غير معروف".

### 2. إعادة المحاولة تلقائياً عند "رابط المنتج محجوز"
- عند اكتشاف أن الخطأ بسبب **رابط محجوز** (النص يحتوي على "محجوز" أو "reserved" أو "رابط المنتج") يُرجَع من الدالة حقل **`slugReserved: true`**.
- في **المزامنة** و**التصدير الفردي** و**التصدير الجماعي**:
  - عند `slugReserved` يتم إعادة بناء الـ payload بسلوق جديد باستخدام **`extraSlugSuffix: Date.now()`** ثم إعادة استدعاء التصدير مرة واحدة.
- بهذا يتم تقليل فشل التصدير بسبب تعارض الرابط.

### 3. استخدام رابط (slug) محفوظ عند التحديث (PATCH)
- في **`convertProductToEasyOrders`** تمت إضافة خيارين:
  - **`existingSlug`**: إن وُجد (من `product.metadata.easyOrdersSlug`) يُستخدم كرابط المنتج عند التحديث بدلاً من توليد رابط جديد، لتجنب تغيير الرابط على Easy Orders وتفادي "رابط المنتج محجوز".
  - **`extraSlugSuffix`**: يُستخدم عند إعادة المحاولة بعد خطأ محجوز (مثلاً إلحاق timestamp).
- بعد كل تصدير ناجح يتم حفظ الرابط المستخدم في **`product.metadata.easyOrdersSlug`**.
- عند إلغاء الربط (404 أو unlink) يتم حذف **`easyOrdersSlug`** مع باقي حقول Easy Orders.

### 4. الملفات المُحدَّثة
- `lib/integrations/easy-orders/product-converter.ts`: تحسين رسالة الخطأ، إرجاع `slugReserved`، ودعم `existingSlug` و `extraSlugSuffix`.
- `app/api/integrations/[id]/sync/route.ts`: استخدام `existingSlug`، حفظ `easyOrdersSlug`، وإعادة المحاولة عند `slugReserved`.
- `app/api/integrations/easy-orders/export-product/route.ts`: نفس المنطق.
- `app/api/integrations/easy-orders/export-bulk/route.ts`: نفس المنطق.
- `types/index.ts`: إضافة `easyOrdersSlug` إلى `Product.metadata`.

## قائمة التحقق (Todo)
- [x] تحسين استخراج رسالة الخطأ من API
- [x] إعادة المحاولة عند "رابط المنتج محجوز" بسلوق إضافي
- [x] استخدام slug محفوظ عند التحديث وحفظه بعد النجاح
- [x] توثيق الإصلاحات

## ماذا تفعل بعد التحديث
- إعادة تشغيل **مزامنة المنتجات** أو **مزامنة الكل**؛ يفترض أن تقل أخطاء "رابط المنتج محجوز" بفضل الرابط المحفوظ وإعادة المحاولة بسلوق فريد.
- إن ظهر خطأ لمنتج معيّن، ستظهر رسالة الخطأ الحقيقية من Easy Orders بدلاً من "خطأ غير معروف" في أغلب الحالات.
