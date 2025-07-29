# ربح (Ribh) - منصة التجارة الإلكترونية الذكية

منصة تجارة إلكترونية متعددة الأدوار تربط الموردين والمسوقين وتجار الجملة في نظام واحد متكامل لتحقيق الأرباح للجميع.

## 🌟 المميزات الرئيسية

### 👥 أدوار متعددة
- **الموردين**: رفع المنتجات وإدارة المخزون
- **المسوقين**: تسويق المنتجات للعملاء
- **تجار الجملة**: شراء بأسعار الجملة وإعادة البيع
- **الإدارة**: إدارة شاملة للمنصة

### 💰 نظام عمولات ذكي
- عمولات ديناميكية حسب نطاق الأسعار
- محافظ إلكترونية آمنة
- نظام دفع عند الاستلام (COD)

### 🚚 نظام توصيل متكامل
- طلبات تخزين في مستودع ربح
- تتبع الطلبات
- إدارة الشحنات

### 💬 نظام رسائل معتد
- رسائل بين المستخدمين
- مراجعة إدارية للرسائل
- نظام إشعارات

## 🛠️ التقنيات المستخدمة

- **Frontend**: Next.js 14 (App Router + Server Components)
- **Styling**: Tailwind CSS (RTL Support)
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with HTTP-only cookies
- **UI Components**: Lucide React Icons
- **Forms**: React Hook Form + Zod validation
- **Notifications**: React Hot Toast

## 📋 المتطلبات

- Node.js 18+ 
- MongoDB 6+
- npm أو yarn

## 🚀 التثبيت والإعداد

### 1. استنساخ المشروع
```bash
git clone <repository-url>
cd ribh-v7
```

### 2. تثبيت التبعيات
```bash
npm install
```

### 3. إعداد البيئة
```bash
cp .env.local.example .env.local
```

قم بتعديل ملف `.env.local` وإضافة القيم المناسبة:
```env
MONGODB_URI=mongodb://localhost:27017/ribh-ecommerce
JWT_SECRET=your-super-secret-jwt-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. تشغيل قاعدة البيانات
تأكد من تشغيل MongoDB على جهازك أو استخدم MongoDB Atlas.

### 5. تشغيل المشروع
```bash
npm run dev
```

افتح المتصفح على `http://localhost:3000`

## 📁 هيكل المشروع

```
ribh-v7/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── dashboard/         # Dashboard components
│   └── providers/         # Context providers
├── lib/                   # Utilities and configurations
├── models/                # MongoDB models
├── types/                 # TypeScript types
├── public/                # Static assets
└── package.json
```

## 🔐 نظام المصادقة

### الأدوار المدعومة
- `admin`: الإدارة الكاملة
- `supplier`: الموردين
- `marketer`: المسوقين  
- `wholesaler`: تجار الجملة

### تسجيل الدخول
- JWT tokens مع HTTP-only cookies
- حماية ضد هجمات CSRF
- تجديد تلقائي للجلسات

## 💳 نظام المحافظ

### المميزات
- رصيد إلكتروني آمن
- سجل المعاملات
- سحوبات وإيداعات
- حد أدنى للسحب (100 جنيه)

### أنواع المعاملات
- `credit`: إيداع (أرباح، مكافآت)
- `debit`: سحب (سحوبات، مشتريات)

## 🛍️ نظام المنتجات

### معلومات المنتج
- اسم ووصف بالعربية والإنجليزية
- صور متعددة
- أسعار مختلفة (مسوق، جملة، تكلفة)
- فئات وتصنيفات
- مواصفات تفصيلية

### حالة المنتج
- `pending`: قيد المراجعة
- `approved`: معتمد
- `rejected`: مرفوض

## 📦 نظام الطلبات

### مراحل الطلب
1. `pending`: في الانتظار
2. `confirmed`: مؤكد
3. `processing`: قيد المعالجة
4. `shipped`: تم الشحن
5. `delivered`: تم التوصيل
6. `cancelled`: ملغي
7. `returned`: مرتجع

### معلومات الطلب
- رقم الطلب الفريد
- تفاصيل العميل والمورد
- عناصر الطلب والأسعار
- عنوان التوصيل
- حالة الدفع والشحن

## 🚚 نظام التخزين

### طلبات التخزين
- المورد يطلب تخزين منتجاته
- مراجعة إدارية للطلب
- موافقة أو رفض مع ملاحظات
- تتبع المخزون

## 💬 نظام الرسائل

### المميزات
- رسائل بين المستخدمين
- مراجعة إدارية إجبارية
- ربط الرسائل بالمنتجات
- إشعارات فورية

## 📊 لوحة التحكم

### إحصائيات حسب الدور
- **الإدارة**: إحصائيات شاملة
- **المورد**: منتجاته وطلباته
- **المسوق/تاجر الجملة**: المنتجات المتاحة وطلباته

## 🔧 API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل حساب جديد
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/me` - بيانات المستخدم الحالي
- `POST /api/auth/logout` - تسجيل الخروج

### لوحة التحكم
- `GET /api/dashboard/stats` - إحصائيات لوحة التحكم

## 🎨 التصميم والواجهة

### المميزات
- تصميم RTL كامل للعربية
- خطوط عربية (Cairo, Tajawal)
- ألوان متناسقة ومتدرجة
- تأثيرات بصرية ناعمة
- واجهة متجاوبة

### المكونات
- بطاقات إحصائية
- جداول بيانات
- نماذج إدخال
- أزرار وأيقونات
- شريط جانبي قابل للطي

## 🔒 الأمان

### المميزات الأمنية
- تشفير كلمات المرور (bcrypt)
- JWT tokens آمنة
- حماية ضد SQL injection
- التحقق من المدخلات (Zod)
- CORS configuration
- Rate limiting

## 🚀 النشر

### Vercel (موصى به)
```bash
npm run build
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 المساهمة

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## 📝 الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

للدعم الفني أو الاستفسارات:
- البريد الإلكتروني: support@ribh.com
- الهاتف: +20 123 456 789

## 🔄 التحديثات القادمة

- [ ] تطبيق جوال (React Native)
- [ ] نظام تقييمات ومراجعات
- [ ] دفع إلكتروني (بطاقات ائتمان)
- [ ] نظام كوبونات وخصومات
- [ ] تقارير متقدمة
- [ ] نظام إشعارات push
- [ ] دعم متعدد اللغات
- [ ] نظام affiliate marketing

---

**ربح** - منصة التجارة الإلكترونية الذكية 🚀 