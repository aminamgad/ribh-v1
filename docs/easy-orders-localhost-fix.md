# حل مشكلة الربط التلقائي مع EasyOrders في بيئة التطوير المحلية

## المشكلة

عند استخدام `localhost:3000` في بيئة التطوير، EasyOrders لا يستطيع الوصول إلى callback URL لأن:
- EasyOrders يعمل على الإنترنت
- `localhost` غير قابل للوصول من الإنترنت
- يجب أن يكون callback URL عنوان IP عام أو domain

## الحلول

### الحل 1: استخدام ngrok (موصى به للتطوير)

1. **تثبيت ngrok:**
   ```bash
   npm install -g ngrok
   # أو
   brew install ngrok  # على macOS
   ```

2. **تشغيل ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **نسخ الـ URL الذي يعطيه ngrok:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **إضافة في `.env.local`:**
   ```env
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   ```

5. **إعادة تشغيل الخادم:**
   ```bash
   npm run dev
   ```

### الحل 2: استخدام Vercel أو خدمة استضافة أخرى

1. **نشر المشروع على Vercel:**
   ```bash
   vercel
   ```

2. **إضافة في `.env.local`:**
   ```env
   NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
   ```

### الحل 3: استخدام Cloudflare Tunnel

1. **تثبيت cloudflared:**
   ```bash
   brew install cloudflared  # على macOS
   ```

2. **تشغيل tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **نسخ الـ URL وإضافته في `.env.local`**

## التحقق من الإعداد

بعد إضافة `NEXT_PUBLIC_BASE_URL`:

1. **تحقق من الـ logs عند إنشاء Authorized App Link:**
   ```
   callbackUrl: 'https://your-public-url.com/api/integrations/easy-orders/callback?user_id=...'
   ```

2. **تأكد أن URL ليس localhost:**
   - ✅ `https://abc123.ngrok.io`
   - ✅ `https://your-app.vercel.app`
   - ❌ `http://localhost:3000`

## ملاحظات مهمة

- **ngrok URL يتغير في كل مرة** (في النسخة المجانية)
- **يجب تحديث `NEXT_PUBLIC_BASE_URL`** عند تغيير ngrok URL
- **في الإنتاج:** استخدم domain ثابت
- **CORS headers:** تم إضافتها تلقائياً في الكود

## اختبار

1. افتح `/dashboard/integrations`
2. اضغط "ربط تلقائي مع EasyOrders"
3. تحقق من الـ logs - يجب أن يكون callbackUrl هو URL عام وليس localhost
4. قم بالموافقة في EasyOrders
5. يجب أن يعمل الربط بنجاح

---

**آخر تحديث:** 2024

