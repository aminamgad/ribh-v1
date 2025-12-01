# منصة ربح - Ribh Platform

منصة تجارة إلكترونية شاملة تدعم الموردين والمسوقين وتجار الجملة.

## 🚀 المميزات

- **إدارة المنتجات**: إضافة وإدارة المنتجات مع دعم المتغيرات
- **إدارة الطلبات**: نظام طلبات كامل مع تتبع الحالة
- **المحفظة الإلكترونية**: إدارة الأرباح والسحوبات
- **نظام الدردشة**: تواصل مباشر بين المستخدمين
- **الإشعارات**: إشعارات فورية للمستخدمين
- **لوحة تحكم متقدمة**: إحصائيات وتقارير شاملة

## 🛠️ التقنيات المستخدمة

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT
- **File Storage**: Cloudinary
- **Real-time**: REST API Polling (متوافق مع Vercel)

## 📦 التثبيت

```bash
# تثبيت المتطلبات
npm install

# تشغيل في وضع التطوير
npm run dev

# بناء للإنتاج
npm run build

# تشغيل في وضع الإنتاج
npm start
```

## ⚙️ الإعدادات

قم بإنشاء ملف `.env.local` وأضف المتغيرات التالية:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 📁 بنية المشروع

```
ribh-v1/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # صفحات Dashboard
│   └── auth/              # صفحات المصادقة
├── components/            # React Components
│   ├── ui/               # مكونات UI
│   ├── providers/        # Context Providers
│   └── dashboard/        # مكونات Dashboard
├── lib/                   # Utilities و Helpers
├── models/                # Mongoose Models
├── types/                 # TypeScript Types
└── public/                # ملفات ثابتة
```

## 🔐 الأدوار

- **Admin**: إدارة كاملة للنظام
- **Supplier**: الموردين - إضافة وإدارة المنتجات
- **Marketer**: المسوقين - عرض المنتجات والطلبات
- **Wholesaler**: تجار الجملة - طلبات بالجملة

## 📝 ملاحظات

- النظام متوافق مع Vercel Serverless Functions
- يستخدم REST API Polling بدلاً من Socket.io للتوافق مع Vercel
- جميع البيانات محمية بـ JWT Authentication
- نظام Rate Limiting مطبق على جميع Routes الحرجة

## 📄 الترخيص

MIT License
