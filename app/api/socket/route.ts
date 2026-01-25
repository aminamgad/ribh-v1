import { NextRequest, NextResponse } from 'next/server';

// GET handler - Socket.io status
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Socket.io is disabled in Vercel environment',
      path: '/api/socket',
      timestamp: new Date().toISOString(),
      note: 'Real-time features are not available on Vercel'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Socket.io server error' },
      { status: 500 }
    );
  }
}

// POST handler - for manual socket events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, targetUserId, targetRole } = body;

    return NextResponse.json({
      success: true,
      message: 'Event logged (Socket.io disabled in Vercel)',
      note: 'Real-time features are not available on Vercel'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process event' },
      { status: 500 }
    );
  }
} 