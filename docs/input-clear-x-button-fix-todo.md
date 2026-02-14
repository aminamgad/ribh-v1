# إصلاح زر X لحذف النص في حقول الإدخال

## المشكلة

زر الـ X الخاص بحذف النص الموجود في الحقل لا يعمل بشكل سليم. عند النقر عليه، قد يحدث أحد الأمور التالية:
- لا يُمسح الحقل
- يُغلق القائمة المنسدلة دون مسح المحتوى
- يبدو أن النقرة لا تُستقبل

## السبب المحتمل

عند النقر على زر X بجانب حقل إدخال:
1. **onBlur** يُستدعى على الـ input قبل وصول النقرة للزر (لأن التركيز ينتقل من الـ input إلى الزر)
2. الـ blur قد يغيّر الـ state أو يُغلق القائمة المنسدلة
3. نتيجة لذلك، قد لا يصل حدث **click** للزر أو قد يتأثر سلوكه

## الحل المقترح

استخدام **onMouseDown** بدلاً من **onClick** مع:
- `type="button"` — لمنع إرسال النموذج
- `e.preventDefault()` — لمنع سلوك المتصفح الافتراضي
- `e.stopPropagation()` — لمنع انتشار الحدث

السبب: **mousedown** يحدث قبل **blur**، لذا تُنفَّذ عملية المسح قبل أن يفقد الـ input التركيز.

---

## Todo List

### 1. صفحة تفاصيل الطلب — تعديل معلومات الشحن

- [x] **1.1** `app/dashboard/orders/[id]/page.tsx` — حقل المدينة/القرية (تحديث معلومات الشحن)
  - الموقع التقريبي: السطر ~3276
  - الزر الحالي: `onClick` + `aria-label="مسح"`
  - التعديل: استبدال `onClick` بـ `onMouseDown` وإضافة `type="button"` و `e.preventDefault()` و `e.stopPropagation()`

### 2. الإجراءات الجماعية للطلبات

- [x] **2.1** `components/orders/BulkOrdersActions.tsx` — الموضع 1: قسم تحديث الشحن (عرض القرية)
  - الموقع: ~السطر 1256
- [x] **2.2** نفس الملف — الموضع 2: قسم البحث عن القرية (استخدام عرض الكل)
  - الموقع: ~السطر 1514
- [x] **2.3** نفس الملف — الموضع 3: قسم تحديث الشحن لكل طلب
  - الموقع: ~السطر 1701

### 3. اختيار المحافظة والقرية

- [x] **3.1** `components/ui/GovernorateVillageSelect.tsx` — الموضع 1
  - الموقع: ~السطر 543
- [x] **3.2** نفس الملف — الموضع 2
  - الموقع: ~السطر 691

### 4. مكوّنات أخرى (مراجعة)

- [x] **4.1** `components/ui/CountrySelect.tsx` — يستخدم `onClick` مع `e.stopPropagation()` — قد يحتاج لنفس التعديل إن ظهرت المشكلة
- [x] **4.2** `components/ui/VillageSelect.tsx` — لا يوجد زر مسح مشابه — مراجعة إن وُجد زر مسح مشابه

---

## النمط الموحد للتعديل

```tsx
// قبل
<button
  onClick={() => {
    // ... clear logic
  }}
  className="absolute inset-y-0 left-0 pl-3 flex items-center ... z-10"
  aria-label="مسح"
>
  <X className="w-4 h-4 ..." />
</button>

// بعد
<button
  type="button"
  onMouseDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
    // ... clear logic
  }}
  className="absolute inset-y-0 left-0 pl-3 flex items-center ... z-10"
  aria-label="مسح"
>
  <X className="w-4 h-4 ..." />
</button>
```

---

## الملفات المتأثرة

| الملف | عدد المواضع | الوصف |
|-------|-------------|-------|
| `app/dashboard/orders/[id]/page.tsx` | 1 | حقل المدينة في modal تحديث الشحن |
| `components/orders/BulkOrdersActions.tsx` | 3 | حقول القرية في الإجراءات الجماعية |
| `components/ui/GovernorateVillageSelect.tsx` | 2 | حقول القرية في اختيار المحافظة والقرية |
