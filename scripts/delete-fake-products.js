const { MongoClient } = require('mongodb');

// MongoDB Atlas connection string
const uri = "mongodb+srv://ribh:HY7m3naAOhSvTIhJ@cluster0.imwab6h.mongodb.net/claudei?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function deleteFakeProducts() {
  try {
    await client.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات');

    const db = client.db('claudei');
    const productsCollection = db.collection('products');
    
    // المنتجات الوهمية التي أضفتها بالسكريبت
    const fakeProductNames = [
      'هاتف ذكي سامسونج جالكسي S24',
      'لابتوب ديل إكس بي إس 13',
      'سماعات آبل إيربودس برو',
      'ساعة آبل ووتش سيريس 9',
      'تابلت آيباد برو 12.9'
    ];
    
    console.log('🗑️ حذف المنتجات الوهمية...');
    
    for (const productName of fakeProductNames) {
      console.log(`🗑️ حذف منتج: ${productName}`);
      const result = await productsCollection.deleteOne({ name: productName });
      
      if (result.deletedCount > 0) {
        console.log(`✅ تم حذف: ${productName}`);
      } else {
        console.log(`⚠️ لم يتم العثور على: ${productName}`);
      }
    }

    // التحقق من المنتجات المتبقية
    console.log('\n📊 المنتجات المتبقية بعد الحذف:');
    const remainingProducts = await productsCollection.find({}).toArray();
    
    console.log(`إجمالي المنتجات المتبقية: ${remainingProducts.length}`);
    
    remainingProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (معتمد: ${product.isApproved})`);
    });

    // التحقق من المنتجات المعتمدة للموردين
    console.log('\n✅ المنتجات المعتمدة للموردين الحقيقيين:');
    const approvedSupplierProducts = await productsCollection.find({ 
      supplierId: { $exists: true, $ne: null },
      isApproved: true,
      $or: [
        { isRejected: false },
        { isRejected: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`عدد المنتجات المعتمدة للموردين: ${approvedSupplierProducts.length}`);
    approvedSupplierProducts.forEach(product => {
      console.log(`- ${product.name} (المخزون: ${product.stockQuantity})`);
    });

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
    console.log('🔌 تم إغلاق الاتصال بقاعدة البيانات');
  }
}

deleteFakeProducts(); 