# خطة عمل: ميزة Cross-Selling في Easy Orders وحساب الربح

> بناءً على [easy-order-documentation.md](../easy-order-documnation.md)

---

## المهام الرئيسية

### 1. إكمال ميزة Cross-Selling في Easy Orders

| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 1.1 | دعم cross-sell items في webhook الطلبات | ✅ | معالجة جميع `cart_items` بما فيها المنتجات المقترحة |
| 1.2 | ربط cross-sell items بالمنتجات في ربح | ✅ | البحث بـ taager_code، easyOrdersProductId، easyOrdersExports.easyOrdersProductId |
| 1.3 | حساب الربح للمنتجات غير الموجودة (cross-sell خارجي) | ✅ | estimatedSupplierPrice = 70% من سعر البيع، marketerProfit = (unitPrice - supplierPrice) × qty |
| 1.4 | استخدام `cost` و `total_cost` من Easy Orders | ✅ | إجمالي الطلب = total_cost من EO (ما دفعه العميل فعلياً) |

**ملاحظة:** Easy Orders API لا يوفر واجهة لتعريف cross-sell products. المنتجات المقترحة تصل كـ `cart_items` عادية في الطلب. المعالجة تتم في webhook.

---

### 2. إصلاح حساب الربح والإجمالي

| # | المهمة | الحالة | التفاصيل |
|---|--------|--------|----------|
| 2.1 | استخدام `total_cost` من EO كإجمالي الطلب | ✅ | order.total = total_cost (بدلاً من subtotal + shipping محسوب محلياً) |
| 2.2 | استخدام `cost` من EO للمجموع الفرعي | ✅ | subtotal = cost (مجموع المنتجات كما في EO) |
| 2.3 | استخدام سعر البند من EO للربح | ✅ | unitPrice = item.price من cart_item (السعر الفعلي للعميل) |
| 2.4 | حساب marketerProfit بشكل صحيح | ✅ | (unitPrice - supplierPrice) × quantity |
| 2.5 | حساب commission (ربح الإدارة) | ✅ | من supplierPrice عبر adminProfitMargins |

---

### 3. إصلاح تصدير المنتجات

| # | المهمة | الحالة | التفاصيل |
|---|--------|--------|----------|
| 3.1 | منع تكرار الصورة في Easy Orders | ✅ | عدم إدراج الصورة الأولى في `images` لأنها موجودة في `thumb` (product-converter.ts) |
| 3.2 | منع التصدير المتكرر (double POST) | ✅ | exportLockRef في الواجهة + API lock في export-product route |
| 3.3 | التأكد من PATCH عند التحديث | ✅ | استخدام existingEasyOrdersProductId لـ PATCH بدلاً من POST |

---

## هيكل الطلب من Easy Orders (مرجع)

```json
{
  "id": "order-uuid",
  "cost": 730,           // مجموع المنتجات
  "shipping_cost": 20,
  "total_cost": 750,     // cost + shipping_cost = ما دفعه العميل
  "cart_items": [
    {
      "price": 220,      // سعر البند كما دفعه العميل
      "quantity": 1,
      "product": { "taager_code": "SKU", "sku": "SKU" }
    }
  ]
}
```

- `cost` = مجموع (price × quantity) لكل cart_items
- `total_cost` = cost + shipping_cost
- الربح للمسوق = (price - supplierPrice) × quantity

---

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `lib/integrations/easy-orders/product-converter.ts` | إصلاح تكرار الصورة في images |
| `app/api/integrations/easy-orders/webhook/route.ts` | استخدام total_cost, cost, item.price |
| `app/dashboard/page.tsx` | تعطيل زر التصدير أثناء العملية |
| `app/dashboard/products/page.tsx` | تعطيل زر التصدير أثناء العملية |
| `app/dashboard/favorites/page.tsx` | تعطيل زر التصدير أثناء العملية |

---

## التحقق من النجاح

1. **الإجمالي:** order.total في ربح = total_cost من Easy Orders
2. **الربح:** marketerProfit + commission يطابق الفرق بين total_cost وتكلفة الموردين
3. **الصور:** لا تظهر الصورة الأولى مكررة في Easy Orders
4. **التصدير:** تصدير واحد للمنتج لا ينشئ نسخاً مكررة
