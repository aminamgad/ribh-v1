import { NextRequest, NextResponse } from 'next/server';
import { withAuth, userHasAnyPermission } from '@/lib/auth';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { handleApiError } from '@/lib/error-handler';

// GET /api/chat/users - قائمة المستخدمين لاختيار المستلم في محادثة جديدة
// يتطلب messages.view أو messages.reply أو messages.moderate (بدلاً من users.view)
async function getChatUsers(req: NextRequest, user: any) {
  try {
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });
    }
    if (!userHasAnyPermission(user, ['messages.view', 'messages.reply', 'messages.moderate'])) {
      return NextResponse.json({ success: false, message: 'ليس لديك صلاحية الوصول للمستخدمين للتواصل' }, { status: 403 });
    }

    await connectDB();

    const users = await User.find({ isActive: true })
      .select('name email role')
      .sort({ name: 1 })
      .limit(500)
      .lean();

    const filtered = users.filter((u: any) => u._id.toString() !== user._id.toString());

    return NextResponse.json({
      success: true,
      users: filtered
    });
  } catch (error) {
    return handleApiError(error, 'حدث خطأ أثناء جلب المستخدمين');
  }
}

export const GET = withAuth(getChatUsers);
