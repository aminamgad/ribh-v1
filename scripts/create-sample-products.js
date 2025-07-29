const mongoose = require('mongoose');
const Product = require('../models/Product.ts');
const Category = require('../models/Category.ts');
const User = require('../models/User.ts');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-v7', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sampleProducts = [
  {
    name: 'هاتف ذكي سامسونج جالكسي S24',
    description: 'هاتف ذكي حديث مع كاميرا متطورة وشاشة عالية الدقة',
    marketerPrice: 2500,
    wholesalePrice: 2200,
    costPrice: 1800,
    stockQuantity: 50,
    sku: 'SAMSUNG-S24-001',
    images: ['https://via.placeholder.com/400x400?text=Samsung+S24'],
    tags: ['هاتف', 'سامسونج', 'جالكسي', 'ذكي']
  },
  {
    name: 'لابتوب ديل إكس بي إس 13',
    description: 'لابتوب خفيف وسريع مناسب للعمل والدراسة',
    marketerPrice: 3500,
    wholesalePrice: 3200,
    costPrice: 2800,
    stockQuantity: 25,
    sku: 'DELL-XPS13-001',
    images: ['https://via.placeholder.com/400x400?text=Dell+XPS+13'],
    tags: ['لابتوب', 'ديل', 'إكس بي إس', 'كمبيوتر']
  },
  {
    name: 'سماعات آبل إيربودس برو',
    description: 'سماعات لاسلكية مع إلغاء الضوضاء النشط',
    marketerPrice: 800,
    wholesalePrice: 700,
    costPrice: 500,
    stockQuantity: 100,
    sku: 'APPLE-AIRPODS-PRO-001',
    images: ['https://via.placeholder.com/400x400?text=AirPods+Pro'],
    tags: ['سماعات', 'آبل', 'إيربودس', 'لاسلكية']
  },
  {
    name: 'ساعة آبل ووتش سيريس 9',
    description: 'ساعة ذكية مع تتبع الصحة واللياقة البدنية',
    marketerPrice: 1200,
    wholesalePrice: 1100,
    costPrice: 900,
    stockQuantity: 30,
    sku: 'APPLE-WATCH-S9-001',
    images: ['https://via.placeholder.com/400x400?text=Apple+Watch+Series+9'],
    tags: ['ساعة', 'آبل', 'ووتش', 'ذكية']
  },
  {
    name: 'تابلت آيباد برو 12.9',
    description: 'تابلت احترافي مع شاشة كبيرة وأداء عالي',
    marketerPrice: 2800,
    wholesalePrice: 2600,
    costPrice: 2200,
    stockQuantity: 15,
    sku: 'APPLE-IPAD-PRO-001',
    images: ['https://via.placeholder.com/400x400?text=iPad+Pro+12.9'],
    tags: ['تابلت', 'آبل', 'آيباد', 'برو']
  }
];

async function createSampleProducts() {
  try {
    console.log('🔍 البحث عن فئة إلكترونيات...');
    
    // البحث عن فئة إلكترونيات أو إنشاؤها
    let electronicsCategory = await Category.findOne({ name: 'إلكترونيات' });
    if (!electronicsCategory) {
      console.log('📝 إنشاء فئة إلكترونيات...');
      electronicsCategory = await Category.create({
        name: 'إلكترونيات',
        nameEn: 'Electronics',
        description: 'المنتجات الإلكترونية والكهربائية',
        isActive: true
      });
    }

    // البحث عن مستخدم admin أو supplier
    const adminUser = await User.findOne({ role: 'admin' });
    const supplierUser = await User.findOne({ role: 'supplier' });
    const creatorUser = adminUser || supplierUser;

    if (!creatorUser) {
      console.error('❌ لم يتم العثور على مستخدم admin أو supplier');
      return;
    }

    console.log(`👤 استخدام المستخدم: ${creatorUser.name} (${creatorUser.role})`);

    // إنشاء المنتجات
    for (const productData of sampleProducts) {
      console.log(`📦 إنشاء منتج: ${productData.name}`);
      
      const product = await Product.create({
        ...productData,
        categoryId: electronicsCategory._id,
        supplierId: creatorUser._id,
        isApproved: true,
        isActive: true,
        isFulfilled: true,
        isRejected: false,
        approvedAt: new Date(),
        approvedBy: creatorUser._id
      });

      console.log(`✅ تم إنشاء المنتج: ${product.name} (ID: ${product._id})`);
    }

    console.log('🎉 تم إنشاء جميع المنتجات التجريبية بنجاح!');
    console.log('📊 إحصائيات المنتجات:');
    console.log(`- إجمالي المنتجات: ${await Product.countDocuments()}`);
    console.log(`- المنتجات المعتمدة: ${await Product.countDocuments({ isApproved: true })}`);
    console.log(`- المنتجات النشطة: ${await Product.countDocuments({ isActive: true })}`);

  } catch (error) {
    console.error('❌ خطأ في إنشاء المنتجات التجريبية:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSampleProducts(); 