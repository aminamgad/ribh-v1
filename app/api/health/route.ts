import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      message: 'Ribh API is working correctly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Ribh API is not working correctly',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 