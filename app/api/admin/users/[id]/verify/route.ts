import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import User from '@/models/User';

// PUT /api/admin/users/[id]/verify - Verify user
async function verifyUser(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    if (targetUser.isVerified) {
      return NextResponse.json(
        { success: false, message: 'المستخدم محقق بالفعل' },
        { status: 400 }
      );
    }
    
    targetUser.isVerified = true;
    await targetUser.save();
    
    return NextResponse.json({
      success: true,
      message: 'تم التحقق من المستخدم بنجاح',
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isVerified: targetUser.isVerified
      }
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء التحقق من المستخدم' },
      { status: 500 }
    );
  }
}

export const PUT = withRole(['admin'])(verifyUser); 