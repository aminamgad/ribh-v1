import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

if (cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret) {
  cloudinary.config(cloudinaryConfig);
}

export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    const { timestamp, folder = 'ribh-files', public_id, resource_type } = await req.json();

    // Validate required parameters
    if (!timestamp) {
      return NextResponse.json(
        { success: false, message: 'Timestamp is required' },
        { status: 400 }
      );
    }

    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      return NextResponse.json(
        { success: false, message: 'Cloudinary not configured. Please set up Cloudinary environment variables.' },
        { status: 500 }
      );
    }

    // Generate the public_id if not provided
    const finalPublicId = public_id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Parameters to sign - must match exactly what will be sent to Cloudinary
    // Note: Parameters must be in alphabetical order for Cloudinary signature
    const paramsToSign: any = {};
    
    // Add parameters in alphabetical order
    if (folder) paramsToSign.folder = folder;
    if (finalPublicId) paramsToSign.public_id = finalPublicId;
    if (timestamp) paramsToSign.timestamp = timestamp;

    console.log('=== SIGNATURE GENERATION DEBUG ===');
    console.log('Signature generation params:', paramsToSign);
    console.log('API Secret (last 4 chars):', cloudinaryConfig.api_secret?.slice(-4));
    console.log('Cloudinary config:', {
      cloud_name: cloudinaryConfig.cloud_name,
      api_key: cloudinaryConfig.api_key ? '***' + cloudinaryConfig.api_key.slice(-4) : 'undefined'
    });

    // Generate signature for direct upload - include all parameters that will be sent
    // Use manual signature generation to ensure compatibility
    const stringToSign = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');
    
    const signature = require('crypto')
      .createHash('sha1')
      .update(stringToSign + cloudinaryConfig.api_secret)
      .digest('hex');

    console.log('Generated signature:', signature);
    console.log('String that was signed:', stringToSign);
    console.log('=== END SIGNATURE DEBUG ===');

    return NextResponse.json({
      success: true,
      signature,
      apiKey: cloudinaryConfig.api_key,
      cloudName: cloudinaryConfig.cloud_name,
      folder,
      public_id: finalPublicId,
    });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate upload signature' },
      { status: 500 }
    );
  }
});
