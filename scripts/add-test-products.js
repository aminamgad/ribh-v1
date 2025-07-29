// سكريبت بسيط لإضافة منتجات تجريبية
// يمكن تشغيله مباشرة في MongoDB Compass أو Studio

// أولاً، تأكد من وجود فئة إلكترونيات
db.categories.insertOne({
  name: "إلكترونيات",
  nameEn: "Electronics", 
  description: "المنتجات الإلكترونية والكهربائية",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// إضافة منتجات تجريبية معتمدة
db.products.insertMany([
  {
    name: "هاتف ذكي سامسونج جالكسي S24",
    description: "هاتف ذكي حديث مع كاميرا متطورة وشاشة عالية الدقة",
    marketerPrice: 2500,
    wholesalePrice: 2200,
    costPrice: 1800,
    stockQuantity: 50,
    sku: "SAMSUNG-S24-001",
    images: ["https://via.placeholder.com/400x400?text=Samsung+S24"],
    tags: ["هاتف", "سامسونج", "جالكسي", "ذكي"],
    isActive: true,
    isApproved: true,
    isRejected: false,
    isFulfilled: true,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "لابتوب ديل إكس بي إس 13",
    description: "لابتوب خفيف وسريع مناسب للعمل والدراسة",
    marketerPrice: 3500,
    wholesalePrice: 3200,
    costPrice: 2800,
    stockQuantity: 25,
    sku: "DELL-XPS13-001",
    images: ["https://via.placeholder.com/400x400?text=Dell+XPS+13"],
    tags: ["لابتوب", "ديل", "إكس بي إس", "كمبيوتر"],
    isActive: true,
    isApproved: true,
    isRejected: false,
    isFulfilled: true,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "سماعات آبل إيربودس برو",
    description: "سماعات لاسلكية مع إلغاء الضوضاء النشط",
    marketerPrice: 800,
    wholesalePrice: 700,
    costPrice: 500,
    stockQuantity: 100,
    sku: "APPLE-AIRPODS-PRO-001",
    images: ["https://via.placeholder.com/400x400?text=AirPods+Pro"],
    tags: ["سماعات", "آبل", "إيربودس", "لاسلكية"],
    isActive: true,
    isApproved: true,
    isRejected: false,
    isFulfilled: true,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "ساعة آبل ووتش سيريس 9",
    description: "ساعة ذكية مع تتبع الصحة واللياقة البدنية",
    marketerPrice: 1200,
    wholesalePrice: 1100,
    costPrice: 900,
    stockQuantity: 30,
    sku: "APPLE-WATCH-S9-001",
    images: ["https://via.placeholder.com/400x400?text=Apple+Watch+Series+9"],
    tags: ["ساعة", "آبل", "ووتش", "ذكية"],
    isActive: true,
    isApproved: true,
    isRejected: false,
    isFulfilled: true,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "تابلت آيباد برو 12.9",
    description: "تابلت احترافي مع شاشة كبيرة وأداء عالي",
    marketerPrice: 2800,
    wholesalePrice: 2600,
    costPrice: 2200,
    stockQuantity: 15,
    sku: "APPLE-IPAD-PRO-001",
    images: ["https://via.placeholder.com/400x400?text=iPad+Pro+12.9"],
    tags: ["تابلت", "آبل", "آيباد", "برو"],
    isActive: true,
    isApproved: true,
    isRejected: false,
    isFulfilled: true,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// التحقق من المنتجات المعتمدة
print("المنتجات المعتمدة:");
db.products.find({ isApproved: true }).forEach(function(product) {
  print("- " + product.name + " (المخزون: " + product.stockQuantity + ")");
});

print("إجمالي المنتجات المعتمدة: " + db.products.countDocuments({ isApproved: true })); 