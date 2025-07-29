# دليل النشر

## النشر على Vercel

### 1. المتغيرات البيئية
تأكد من تعيين هذه المتغيرات البيئية في مشروع Vercel:

```bash
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secret-jwt-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
NODE_ENV=production
```

### 2. إعدادات البناء
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. ملاحظات مهمة
- Socket.io **معطل** في بيئة Vercel للتوافق
- التطبيق سيعمل بدون ميزات الوقت الفعلي على Vercel
- للحصول على الوظائف الكاملة، فكر في استخدام مزود استضافة مختلف

### 4. قاعدة البيانات
تأكد من أن قاعدة بيانات MongoDB يمكن الوصول إليها من خوادم Vercel. يمكنك استخدام:
- MongoDB Atlas (موصى به)
- أي مثيل MongoDB مع وصول عام

### 5. المشاكل الشائعة

#### المشكلة: خطأ 500 Internal Server Error
**الحل**: 
1. تحقق من تعيين جميع المتغيرات البيئية
2. تأكد من صحة سلسلة اتصال MongoDB
3. تحقق من سجلات Vercel للأخطاء المحددة

#### المشكلة: فشل البناء
**الحل**: 
1. تأكد من صحة جميع الاستيرادات
2. تحقق من أخطاء TypeScript
3. تأكد من تثبيت جميع التبعيات

#### المشكلة: أخطاء Socket.io
**الحل**: Socket.io معطل تلقائياً في بيئة Vercel. هذا طبيعي.

### 6. اختبار محلي
قبل النشر، اختبر محلياً:
```bash
npm run build
npm start
```

### 7. خطوات النشر
1. ارفع الكود إلى GitHub
2. اربط المستودع بـ Vercel
3. عين المتغيرات البيئية
4. انشر

### 8. استضافة بديلة
للحصول على وظائف Socket.io كاملة، فكر في:
- Railway
- Render
- DigitalOcean
- AWS

### 9. هيكل المشروع
- **الفولدر الرئيسي**: `app/` (وليس `src/`)
- **API Routes**: `app/api/`
- **الصفحات**: `app/dashboard/`
- **المكونات**: `components/`

يجب أن ينشر المشروع بنجاح على Vercel الآن!

### 2. Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Important Notes
- Socket.io is **disabled** in Vercel environment for compatibility
- The app will work without real-time features on Vercel
- For full functionality, consider using a different hosting provider

### 4. Database
Make sure your MongoDB database is accessible from Vercel's servers. You can use:
- MongoDB Atlas (recommended)
- Any MongoDB instance with public access

### 5. Common Issues

#### Issue: 500 Internal Server Error
**Solution**: 
1. Check that all environment variables are set
2. Ensure MongoDB connection string is correct
3. Check Vercel logs for specific errors

#### Issue: Build fails
**Solution**: 
1. Make sure all imports are correct
2. Check TypeScript errors
3. Ensure all dependencies are installed

#### Issue: Socket.io errors
**Solution**: Socket.io is automatically disabled in Vercel environment. This is normal.

### 6. Local Testing
Before deploying, test locally:
```bash
npm run build
npm start
```

### 7. Deployment Steps
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables
4. Deploy

### 8. Alternative Hosting
For full Socket.io functionality, consider:
- Railway
- Render
- DigitalOcean
- AWS

The project should now deploy successfully on Vercel! 