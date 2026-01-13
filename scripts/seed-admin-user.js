const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
let User;
try {
  User = require('../models/User').default;
} catch (e) {
  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');
  
  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    phone: String,
    password: String,
    role: { type: String, enum: ['admin', 'supplier', 'marketer', 'wholesaler'], default: 'marketer' },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLogin: Date
  }, { timestamps: true });

  // Pre-save middleware to hash password
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

  User = mongoose.models.User || mongoose.model('User', userSchema);
}

async function seedAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@ribh.com';
    const adminPassword = 'Admin123!';

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log(`⚠️  Admin user with email ${adminEmail} already exists.`);
      console.log('Updating password...');
      
      // Update password
      existingAdmin.password = adminPassword;
      existingAdmin.isActive = true;
      existingAdmin.isVerified = true;
      await existingAdmin.save();
      
      console.log('✅ Admin user password updated successfully!');
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'مدير النظام',
        email: adminEmail,
        phone: '+966500000000',
        password: adminPassword,
        role: 'admin',
        isActive: true,
        isVerified: true
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedAdminUser();

