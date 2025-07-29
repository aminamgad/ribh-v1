const { MongoClient } = require('mongodb');

// MongoDB Atlas connection string
const uri = "mongodb+srv://ribh:HY7m3naAOhSvTIhJ@cluster0.imwab6h.mongodb.net/claudei?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function checkRealProducts() {
  try {
    await client.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات');

    const db = client.db('claudei');
    const productsCollection = db.collection('products');
    
    // التحقق من جميع المنتجات
    console.log('\n📊 جميع المنتجات في قاعدة البيانات:');
    const allProducts = await productsCollection.find({}).toArray();
    
    console.log(`إجمالي المنتجات: ${allProducts.length}`);
    
    allProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   - isApproved: ${product.isApproved}`);
      console.log(`   - isRejected: ${product.isRejected}`);
      console.log(`   - isActive: ${product.isActive}`);
      console.log(`   - stockQuantity: ${product.stockQuantity}`);
      console.log(`   - supplierId: ${product.supplierId}`);
      console.log(`   - createdAt: ${product.createdAt}`);
      console.log(`   - approvedAt: ${product.approvedAt}`);
    });

    // التحقق من المنتجات المعتمدة فقط
    console.log('\n✅ المنتجات المعتمدة:');
    const approvedProducts = await productsCollection.find({ 
      isApproved: true, 
      isRejected: false 
    }).toArray();
    
    console.log(`عدد المنتجات المعتمدة: ${approvedProducts.length}`);
    approvedProducts.forEach(product => {
      console.log(`- ${product.name} (المخزون: ${product.stockQuantity}, نشط: ${product.isActive})`);
    });

    // التحقق من المنتجات التي أضافها الموردون
    console.log('\n👤 المنتجات التي أضافها الموردون:');
    const supplierProducts = await productsCollection.find({ 
      supplierId: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`عدد منتجات الموردين: ${supplierProducts.length}`);
    supplierProducts.forEach(product => {
      console.log(`- ${product.name} (المورد: ${product.supplierId}, معتمد: ${product.isApproved})`);
    });

    // التحقق من المنتجات المعتمدة للموردين
    console.log('\n✅ المنتجات المعتمدة للموردين:');
    const approvedSupplierProducts = await productsCollection.find({ 
      supplierId: { $exists: true, $ne: null },
      isApproved: true,
      isRejected: false
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

checkRealProducts(); 