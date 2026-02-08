# نشر EasyOrders Integration على Vercel

## ✅ نعم، Vercel سيعمل بشكل صحيح!

عند رفع التطبيق على Vercel، سيتم حل مشكلة `localhost` تلقائياً لأن:

1. **Vercel يوفر URL عام** مثل `https://your-app.vercel.app`
2. **الكود يتحقق تلقائياً** من `VERCEL_URL` environment variable
3. **EasyOrders سيكون قادراً على الوصول** إلى Webhook URL

---

## 📋 خطوات النشر على Vercel

### 1. رفع المشروع على Vercel

```bash
# إذا لم تكن مثبت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# رفع المشروع
vercel

# للإنتاج
vercel --prod
```

### 2. إضافة Environment Variables في Vercel

اذهب إلى **Vercel Dashboard > Project Settings > Environment Variables** وأضف:

```env
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

**ملاحظة:** يمكنك ترك هذا فارغاً - Vercel سيستخدم `VERCEL_URL` تلقائياً، لكن من الأفضل تحديده صراحة.

### 3. إضافة Environment Variables الأخرى

تأكد من إضافة جميع المتغيرات المطلوبة:

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=https://your-app.vercel.app
# ... باقي المتغيرات
```

### 4. إعادة النشر

بعد إضافة Environment Variables:

```bash
vercel --prod
```

أو من Vercel Dashboard: **Deployments > Redeploy**

---

## 🔧 إعداد Webhook في EasyOrders

بعد النشر على Vercel:

### 1. الحصول على Webhook URL

بعد النشر، Webhook URL سيكون:
```
https://your-app.vercel.app/api/integrations/easy-orders/webhook
```

### 2. إضافة Webhook في EasyOrders Dashboard

1. اذهب إلى **EasyOrders Dashboard > Public API > Webhooks**
2. أضف Webhook URL:
   ```
   https://your-app.vercel.app/api/integrations/easy-orders/webhook
   ```
3. انسخ **Webhook Secret** الذي يعطيه EasyOrders

### 3. إضافة Webhook Secret في ربح

1. اذهب إلى **ربح > التكاملات**
2. اضغط **"الإعدادات"** على التكامل
3. أضف **Webhook Secret** في الحقل المخصص
4. احفظ التغييرات

---

## ✅ التحقق من الإعداد

بعد النشر والإعداد:

1. **تحقق من Webhook URL:**
   - اذهب إلى **التكاملات > عرض معلومات Webhook**
   - يجب أن يكون URL: `https://your-app.vercel.app/...`
   - ❌ **لا يجب** أن يكون `http://localhost:3000`

2. **تحقق من Webhook Secret:**
   - يجب أن يكون محفوظاً ✓

3. **اختبار Webhook:**
   - اضغط **"اختبار Webhook"**
   - يجب أن يعمل بنجاح

4. **التحقق الشامل:**
   - اضغط **"التحقق من Webhook"**
   - يجب ألا تظهر مشاكل

---

## 🎯 المشاكل التي سيتم حلها

بعد النشر على Vercel:

- ✅ **مشكلة localhost:** سيتم حلها تلقائياً
- ⚠️ **Webhook Secret:** يجب إضافته يدوياً من EasyOrders
- ⚠️ **الطلبات:** ستبدأ بالوصول بعد إعداد Webhook بشكل صحيح

---

## 📝 ملاحظات مهمة

1. **VERCEL_URL تلقائي:**
   - Vercel يضيف `VERCEL_URL` تلقائياً
   - الكود يستخدمه إذا لم يكن `NEXT_PUBLIC_BASE_URL` موجوداً

2. **Custom Domain:**
   - إذا كان لديك domain مخصص، استخدمه في `NEXT_PUBLIC_BASE_URL`
   - مثال: `NEXT_PUBLIC_BASE_URL=https://ribh.com`

3. **HTTPS مطلوب:**
   - EasyOrders يتطلب HTTPS
   - Vercel يوفر HTTPS تلقائياً ✓

4. **CORS:**
   - تم إعداد CORS headers في الكود
   - يجب أن يعمل تلقائياً على Vercel

---

## 🚀 بعد النشر

1. ✅ Webhook URL سيكون عام وقابل للوصول
2. ✅ EasyOrders سيكون قادراً على إرسال الطلبات
3. ⚠️ يجب إضافة Webhook Secret من EasyOrders
4. ⚠️ يجب إضافة Webhook URL في EasyOrders Dashboard

---

**آخر تحديث:** 2024

