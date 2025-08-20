import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const GET = async (req: NextRequest) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'ribh-files';
    const public_id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const api_secret = process.env.CLOUDINARY_API_SECRET;
    
    if (!api_secret) {
      return NextResponse.json({ error: 'API secret not configured' }, { status: 500 });
    }
    
    const params = {
      folder,
      public_id,
      timestamp
    };
    
    const stringToSign = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key as keyof typeof params]}`)
      .join('&');
    
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign + api_secret)
      .digest('hex');
    
    return NextResponse.json({
      success: true,
      params,
      stringToSign,
      signature,
      timestamp,
      public_id
    });
  } catch (error) {
    console.error('Test signature error:', error);
    return NextResponse.json({ error: 'Failed to generate test signature' }, { status: 500 });
  }
};
