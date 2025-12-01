import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'supplier': return 'المورد';
    case 'marketer': return 'المسوق';
    case 'wholesaler': return 'تاجر الجملة';
    case 'admin': return 'الإدارة';
    default: return role;
  }
};

// GET /api/admin/users - Get all users for admin
async function getUsers(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query: any = {};
    
    // Filters
    if (role) {
      query.role = role;
    }
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await User.countDocuments(query);
    
    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (userDoc) => {
        const productCount = await Product.countDocuments({ supplierId: userDoc._id });
        const orderCount = await Order.countDocuments({ 
          $or: [
            { customerId: userDoc._id },
            { supplierId: userDoc._id }
          ]
        });
        
        return {
          ...userDoc,
          productCount,
          orderCount
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
    logger.apiResponse('GET', '/api/admin/users', 200);
  } catch (error) {
    logger.error('Error fetching users', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب المستخدمين');
  }
}

// POST /api/admin/users - Create new user
async function createUser(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      );
    }

    // Prepare user data based on role
    const userData: any = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: body.password, // Don't hash here - let the model handle it
      role: body.role,
      isActive: body.isActive,
      isVerified: body.isVerified
    };

    // Auto-verify wholesaler accounts created by admin
    if (body.role === 'wholesaler') {
      userData.isVerified = true;
    }

    // Add marketing-specific fields
    if (body.role === 'marketer') {
      userData.country = body.country;
      userData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
      userData.gender = body.gender;
      userData.websiteLink = body.websiteLink || undefined;
    }

    // Add supplier-specific fields
    if (body.role === 'supplier') {
      userData.companyName = body.companyName;
      userData.commercialRegisterNumber = body.commercialRegisterNumber;
      userData.address = body.address;
    }

    // Add wholesaler-specific fields
    if (body.role === 'wholesaler') {
      userData.companyName = body.companyName;
      userData.wholesaleLicense = body.wholesaleLicense;
      userData.businessType = body.businessType;
      userData.address = body.address;
    }

    // Create user
    const newUser = new User(userData);
    await newUser.save();

    // Send notification to all admins about new user
    try {
      // Get all admin users (excluding the current admin who created the user)
      const adminUsers = await User.find({ 
        role: 'admin', 
        _id: { $ne: user._id } 
      }).select('_id name').lean();
      
      // Create notification for each admin
      const Notification = (await import('@/models/Notification')).default;
      const notificationPromises = adminUsers.map(admin => 
        Notification.create({
          userId: admin._id,
          title: 'مستخدم جديد',
          message: `تم إنشاء مستخدم جديد "${newUser.name}" بدور ${getRoleLabel(newUser.role)} من قبل ${user.name}`,
          type: 'info',
          actionUrl: '/dashboard/admin/users',
          metadata: { 
            userId: newUser._id, 
            userRole: newUser.role,
            createdBy: user._id,
            createdByName: user.name
          }
        })
      );
      
      await Promise.all(notificationPromises);
      logger.info('Notifications sent to admins for new user', {
        adminCount: adminUsers.length,
        newUserName: newUser.name,
        newUserRole: newUser.role
      });
      
    } catch (error) {
      logger.error('Error sending notifications to admins', error, { newUserId: newUser._id });
    }

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    logger.business('User created by admin', {
      newUserId: newUser._id.toString(),
      newUserRole: newUser.role,
      createdBy: user._id.toString()
    });
    logger.apiResponse('POST', '/api/admin/users', 201);

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      user: userResponse
    });
  } catch (error) {
    logger.error('Error creating user', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إنشاء المستخدم');
  }
}

export const GET = withRole(['admin'])(getUsers);
export const POST = withRole(['admin'])(createUser); 