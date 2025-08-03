# Vercel Deployment Guide - ربح Platform

## متطلبات النشر على Vercel

### 1. متغيرات البيئة المطلوبة

يجب إضافة المتغيرات التالية في إعدادات Vercel:

#### متغيرات قاعدة البيانات
```
MONGODB_URI=your_mongodb_connection_string
```

#### متغيرات Cloudinary (لرفع الملفات)
```
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

#### متغيرات JWT
```
JWT_SECRET=your_jwt_secret_key
```

### 2. كيفية إضافة متغيرات البيئة في Vercel

1. اذهب إلى مشروعك في Vercel Dashboard
2. اذهب إلى Settings > Environment Variables
3. أضف كل متغير من المتغيرات المذكورة أعلاه
4. تأكد من تحديد Production و Preview environments

### 3. إعدادات Cloudinary

1. أنشئ حساب على [Cloudinary](https://cloudinary.com)
2. احصل على Cloud Name, API Key, و API Secret
3. أضف هذه المعلومات كمتغيرات بيئة في Vercel

### 4. مشاكل شائعة وحلولها

#### مشكلة رفع الملفات
- تأكد من إعداد متغيرات Cloudinary بشكل صحيح
- تأكد من أن حجم الملف لا يتجاوز 5MB
- تأكد من نوع الملف المدعوم

#### مشكلة قاعدة البيانات
- تأكد من أن MongoDB URI صحيح
- تأكد من أن IP Vercel مسموح في MongoDB Atlas

#### مشكلة المصادقة
- تأكد من إعداد JWT_SECRET بشكل صحيح
- تأكد من أن الكوكيز تعمل بشكل صحيح

### 5. اختبار النشر

بعد النشر، اختبر:
1. تسجيل الدخول
2. رفع ملف صغير
3. إنشاء منتج جديد
4. إرسال رسالة

### 6. مراقبة الأخطاء

راقب logs في Vercel Dashboard للكشف عن أي مشاكل.

## ملاحظات مهمة

- الحد الأقصى لحجم الملف: 5MB
- أنواع الملفات المدعومة: JPG, PNG, WebP, GIF, MP4, PDF
- مهلة الطلب: 30 ثانية
- التخزين المؤقت: 5 دقائق للإعدادات 