const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// User Schema (simplified for script)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'supplier', 'marketer', 'wholesaler'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  companyName: String,
  address: String,
  taxId: String
}, {
  timestamps: true
});

// Wallet Schema (simplified for script)
const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  minimumWithdrawal: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add comparePassword method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    console.log('🔗 جاري الاتصال بقاعدة البيانات...');
    await mongoose.connect("mongodb+srv://ribh:HY7m3naAOhSvTIhJ@cluster0.imwab6h.mongodb.net/claudeei?retryWrites=true&w=majority&appName=Cluster0"
);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'admin@ribh.com' },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  يوجد مستخدم admin بالفعل:');
      console.log(`   البريد الإلكتروني: ${existingAdmin.email}`);
      console.log(`   الاسم: ${existingAdmin.name}`);
      console.log(`   تم الإنشاء في: ${existingAdmin.createdAt}`);
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('هل تريد إنشاء admin جديد؟ (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ تم إلغاء العملية');
        process.exit(0);
      }
    }

    // Get admin details from command line arguments or use defaults
    const adminData = {
      name: process.argv[2] || 'مدير النظام',
      email: process.argv[3] || 'admin@ribh.com',
      phone: process.argv[4] || '01234567890',
      password: process.argv[5] || 'Admin123!',
      role: 'admin',
      isActive: true,
      isVerified: true,
      companyName: 'شركة ربح للتجارة الإلكترونية',
      address: 'الرياض، المملكة العربية السعودية',
      taxId: '1234567890'
    };

    console.log('📝 جاري إنشاء مستخدم الإدارة...');
    console.log(`   الاسم: ${adminData.name}`);
    console.log(`   البريد الإلكتروني: ${adminData.email}`);
    console.log(`   الهاتف: ${adminData.phone}`);
    console.log(`   كلمة المرور: ${adminData.password}`);

    // Create admin user
    const admin = new User(adminData);
    await admin.save();
    console.log('✅ تم إنشاء مستخدم الإدارة بنجاح');

    // Create wallet for admin
    console.log('💰 جاري إنشاء محفظة الإدارة...');
    const wallet = new Wallet({
      userId: admin._id,
      balance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
      isActive: true,
      minimumWithdrawal: 0 // Admin can withdraw any amount
    });
    await wallet.save();
    console.log('✅ تم إنشاء محفظة الإدارة بنجاح');

    console.log('\n🎉 تم إنشاء حساب الإدارة بنجاح!');
    console.log('\n📋 بيانات تسجيل الدخول:');
    console.log(`   البريد الإلكتروني: ${adminData.email}`);
    console.log(`   كلمة المرور: ${adminData.password}`);
    console.log(`   الرابط: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login`);

  } catch (error) {
    console.error('❌ حدث خطأ أثناء إنشاء مستخدم الإدارة:');
    console.error(error.message);
    
    if (error.code === 11000) {
      console.error('💡 السبب: البريد الإلكتروني مستخدم بالفعل');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 تم قطع الاتصال بقاعدة البيانات');
    process.exit(0);
  }
}

// Handle script arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 سكريبت إنشاء مستخدم الإدارة

الاستخدام:
  node scripts/create-admin.js [الاسم] [البريد الإلكتروني] [الهاتف] [كلمة المرور]

أمثلة:
  node scripts/create-admin.js
  node scripts/create-admin.js "أحمد محمد" "ahmed@ribh.com" "01234567890" "MyPassword123!"

القيم الافتراضية:
  الاسم: مدير النظام
  البريد الإلكتروني: admin@ribh.com
  الهاتف: 01234567890
  كلمة المرور: Admin123!

متطلبات كلمة المرور:
  - 8 أحرف على الأقل
  - تحتوي على أحرف كبيرة وصغيرة
  - تحتوي على أرقام
  - تحتوي على رموز خاصة
`);
  process.exit(0);
}

// Validate password strength
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);

  if (password.length < minLength) {
    throw new Error(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`);
  }
  
  if (!hasUpperCase) {
    throw new Error('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
  }
  
  if (!hasLowerCase) {
    throw new Error('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
  }
  
  if (!hasNumbers) {
    throw new Error('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
  }
  
  if (!hasNonalphas) {
    throw new Error('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');
  }
}

// Validate email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('البريد الإلكتروني غير صالح');
  }
}

// Validate phone
function validatePhone(phone) {
  const phoneRegex = /^(\+20|0)?1[0125][0-9]{8}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('رقم الهاتف غير صالح (يجب أن يكون رقم مصري صالح)');
  }
}

// Validate inputs if provided
try {
  if (process.argv[3]) validateEmail(process.argv[3]);
  if (process.argv[4]) validatePhone(process.argv[4]);
  if (process.argv[5]) validatePassword(process.argv[5]);
} catch (error) {
  console.error('❌ خطأ في البيانات المدخلة:');
  console.error(error.message);
  console.log('\n💡 استخدم --help لمعرفة كيفية الاستخدام');
  process.exit(1);
}

// Run the script
createAdmin(); 