# 🔗 دليل التكامل مع الشركات الخارجية - External Company Integration

## 📋 نظرة عامة

هذا الدليل يشرح كيفية إعداد واستخدام API للشركات الخارجية لإنشاء طلبات شحن (Packages) في النظام.

---

## 🚀 البدء السريع

### 1. استيراد بيانات القرى

قبل البدء، يجب استيراد بيانات القرى والمناطق:

```bash
node scripts/import-villages.js
```

هذا الأمر يستورد جميع القرى من ملف `villages (1).json` (741 قرية).

### 2. إضافة أنواع الطرود

إضافة الأنواع الأساسية للطرود:

```bash
node scripts/seed-package-types.js
```

هذا الأمر يضيف الأنواع التالية:
- `normal` - عادي
- `express` - سريع
- `fragile` - هش
- `heavy` - ثقيل
- `document` - مستندات

### 3. إنشاء شركة خارجية

لإنشاء شركة خارجية جديدة والحصول على API Key:

```bash
node scripts/create-external-company.js "اسم الشركة"
```

**مثال:**
```bash
node scripts/create-external-company.js "شركة الشحن السريع"
```

**النتيجة:**
```
✅ External Company Created Successfully!

📋 Company Details:
   Company Name: شركة الشحن السريع
   API Key: ribh_abc123...
   API Secret: xyz789...
   Active: true

⚠️  IMPORTANT: Save the API Key and Secret securely!
   The API Secret will not be shown again.
```

**⚠️ مهم جداً:** احفظ API Key و API Secret في مكان آمن. لن يتم عرض API Secret مرة أخرى.

---

## 📡 API Endpoint

### إنشاء طرد جديد

**Endpoint:** `POST /api/external_company/create-package`

**Headers:**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
    "to_name": "أحمد محمد علي",
    "to_phone": "01234567890",
    "alter_phone": "09876543210",
    "description": "جهاز إلكتروني - هاتف ذكي",
    "package_type": "normal",
    "village_id": "1",
    "street": "شارع النصر، عمارة 15، الدور الثالث",
    "total_cost": "200",
    "note": "تسليم في الصباح فقط",
    "barcode": "PKG-2024-001234"
}
```

**Success Response (201 Created):**
```json
{
    "code": 200,
    "state": "success",
    "data": {
        "package_id": 1234
    },
    "message": "Operation Successful"
}
```

**Error Response (400 Bad Request):**
```json
{
    "code": 302,
    "state": "false",
    "data": {
        "street": [
            "The street field is required."
        ]
    },
    "errors": {
        "street": [
            "The street field is required."
        ]
    }
}
```

---

## 📝 الحقول المطلوبة

| الحقل | النوع | مطلوب | الوصف |
|------|------|-------|-------|
| `to_name` | string | ✅ | اسم المستلم |
| `to_phone` | string | ✅ | رقم الهاتف الأساسي |
| `alter_phone` | string | ✅ | رقم الهاتف البديل |
| `description` | string | ✅ | وصف الطرد |
| `package_type` | string | ✅ | نوع الطرد (normal, express, fragile, heavy, document) |
| `village_id` | string/number | ✅ | معرف القرية (من 1 إلى 741) |
| `street` | string | ✅ | عنوان الشارع |
| `total_cost` | string/number | ✅ | التكلفة الإجمالية |
| `barcode` | string | ✅ | الباركود (يجب أن يكون فريداً) |
| `note` | string | ❌ | ملاحظات إضافية |

---

## 🔍 التحقق من البيانات

### معرفات القرى (village_id)

يمكن استخدام أي معرف من **1 إلى 741**. يجب أن تكون القرية موجودة ونشطة في قاعدة البيانات.

**للتحقق من معرف القرية:**
- استخدم `scripts/import-villages.js` لاستيراد جميع القرى
- يمكن الاستعلام من قاعدة البيانات للتحقق من معرف معين

### أنواع الطرود (package_type)

القيم المسموحة (يتم التحويل إلى lowercase):
- `normal` - عادي
- `express` - سريع
- `fragile` - هش
- `heavy` - ثقيل
- `document` - مستندات

**ملاحظة:** يمكن إضافة أنواع جديدة عبر قاعدة البيانات.

---

## 🔐 المصادقة

### Bearer Token Authentication

يجب إرسال API Key في header `Authorization` كالتالي:

```
Authorization: Bearer ribh_abc123...
```

### أخطاء المصادقة

**401 Unauthorized - No Token:**
```json
{
    "code": 401,
    "state": "false",
    "message": "Authorization required. Please provide Bearer token in Authorization header."
}
```

**401 Unauthorized - Invalid Token:**
```json
{
    "code": 401,
    "state": "false",
    "message": "Invalid or expired API key. Please contact support."
}
```

---

## ⚠️ الأخطاء الشائعة

### 1. معرف القرية غير صالح

```json
{
    "code": 302,
    "state": "false",
    "data": {
        "village_id": ["The village_id is invalid or not active."]
    },
    "errors": {
        "village_id": ["The village_id is invalid or not active."]
    }
}
```

**الحل:** تأكد من أن `village_id` موجود في قاعدة البيانات (1-741).

### 2. الباركود مكرر

```json
{
    "code": 302,
    "state": "false",
    "data": {
        "barcode": ["The barcode already exists. Each package must have a unique barcode."]
    },
    "errors": {
        "barcode": ["The barcode already exists. Each package must have a unique barcode."]
    }
}
```

**الحل:** استخدم باركود فريد لكل طرد.

### 3. حقول مطلوبة مفقودة

```json
{
    "code": 302,
    "state": "false",
    "data": {
        "street": ["The street field is required."]
    },
    "errors": {
        "street": ["The street field is required."]
    }
}
```

**الحل:** تأكد من إرسال جميع الحقول المطلوبة.

---

## 📊 حالة الطرد (Package Status)

بعد إنشاء الطرد، تكون حالته `pending` افتراضياً. الحالات المتاحة:

- `pending` - قيد الانتظار
- `confirmed` - مؤكد
- `processing` - قيد المعالجة
- `shipped` - تم الشحن
- `delivered` - تم التسليم
- `cancelled` - ملغي

---

## 🔧 الإعداد التقني

### الملفات المهمة

1. **Models:**
   - `models/ExternalCompany.ts` - نموذج الشركات الخارجية
   - `models/Package.ts` - نموذج الطرود
   - `models/Village.ts` - نموذج القرى
   - `models/PackageType.ts` - نموذج أنواع الطرود

2. **API:**
   - `app/api/external_company/create-package/route.ts` - Endpoint لإنشاء الطرد

3. **Authentication:**
   - `lib/external-company-auth.ts` - نظام المصادقة للشركات الخارجية

4. **Validation:**
   - `lib/validations/package.validation.ts` - Validation schema

5. **Scripts:**
   - `scripts/import-villages.js` - استيراد القرى
   - `scripts/seed-package-types.js` - إضافة أنواع الطرود
   - `scripts/create-external-company.js` - إنشاء شركة خارجية

---

## 📝 أمثلة الاستخدام

### cURL Example

```bash
curl -X POST https://your-domain.com/api/external_company/create-package \
  -H "Authorization: Bearer ribh_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "to_name": "أحمد محمد علي",
    "to_phone": "01234567890",
    "alter_phone": "09876543210",
    "description": "جهاز إلكتروني",
    "package_type": "normal",
    "village_id": "1",
    "street": "شارع النصر",
    "total_cost": "200",
    "barcode": "PKG-2024-001234"
  }'
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function createPackage() {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/external_company/create-package',
      {
        to_name: 'أحمد محمد علي',
        to_phone: '01234567890',
        alter_phone: '09876543210',
        description: 'جهاز إلكتروني',
        package_type: 'normal',
        village_id: '1',
        street: 'شارع النصر',
        total_cost: '200',
        barcode: 'PKG-2024-001234'
      },
      {
        headers: {
          'Authorization': 'Bearer ribh_abc123...',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Package created:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

createPackage();
```

### Python Example

```python
import requests

url = "https://your-domain.com/api/external_company/create-package"
headers = {
    "Authorization": "Bearer ribh_abc123...",
    "Content-Type": "application/json"
}
data = {
    "to_name": "أحمد محمد علي",
    "to_phone": "01234567890",
    "alter_phone": "09876543210",
    "description": "جهاز إلكتروني",
    "package_type": "normal",
    "village_id": "1",
    "street": "شارع النصر",
    "total_cost": "200",
    "barcode": "PKG-2024-001234"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

---

## ✅ Checklist قبل الإنتاج

- [ ] استيراد بيانات القرى (`import-villages.js`)
- [ ] إضافة أنواع الطرود (`seed-package-types.js`)
- [ ] إنشاء شركة خارجية والحصول على API Key
- [ ] حفظ API Key و Secret بشكل آمن
- [ ] اختبار API endpoint
- [ ] إعداد Rate Limiting (اختياري)
- [ ] إعداد Monitoring و Logging
- [ ] توثيق API للفريق

---

## 🔒 الأمان

- ✅ API Keys مشفرة ومخزنة بشكل آمن
- ✅ Bearer Token Authentication
- ✅ Validation شامل لجميع الحقول
- ✅ التحقق من صحة البيانات قبل الحفظ
- ✅ Logging لجميع الطلبات
- ✅ Rate Limiting (يمكن إضافته)

---

## 📞 الدعم

في حالة وجود أي مشاكل أو استفسارات:
1. راجع ملف `API_EXTERNAL_COMPANY_ANALYSIS.md` للتحليل التفصيلي
2. تحقق من Logs في النظام
3. تأكد من صحة API Key
4. تحقق من صحة جميع الحقول المطلوبة

---

**تاريخ الإنشاء:** 2024  
**الإصدار:** 1.0

