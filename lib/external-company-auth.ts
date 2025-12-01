import { NextRequest, NextResponse } from 'next/server';
import connectDB from './database';
import ExternalCompany from '@/models/ExternalCompany';
import { logger } from './logger';

/**
 * Get API Key from Authorization header
 */
export function getApiKeyFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

/**
 * Verify External Company API Key
 */
export async function verifyExternalCompanyApiKey(apiKey: string): Promise<ExternalCompanyDocument | null> {
  try {
    await connectDB();
    
    const company = await ExternalCompany.findOne({ 
      apiKey: apiKey,
      isActive: true 
    }).lean();
    
    if (!company) {
      logger.warn('Invalid or inactive API key attempted', { apiKeyLength: apiKey.length });
      return null;
    }
    
    // Update last used timestamp
    await ExternalCompany.findByIdAndUpdate((company as any)._id, {
      lastUsed: new Date()
    });
    
    logger.debug('External company API key verified', { companyId: (company as any)._id, companyName: (company as any).companyName });
    return company as unknown as ExternalCompanyDocument;
  } catch (error) {
    logger.error('Error verifying external company API key', error);
    return null;
  }
}

/**
 * Middleware for external company authentication
 */
export function requireExternalCompanyAuth(
  handler: (req: NextRequest, company: ExternalCompanyDocument) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const apiKey = getApiKeyFromRequest(req);
      
      if (!apiKey) {
        return NextResponse.json(
          {
            code: 401,
            state: 'false',
            message: 'Authorization required. Please provide Bearer token in Authorization header.'
          },
          { status: 401 }
        );
      }
      
      const company = await verifyExternalCompanyApiKey(apiKey);
      
      if (!company) {
        return NextResponse.json(
          {
            code: 401,
            state: 'false',
            message: 'Invalid or expired API key. Please contact support.'
          },
          { status: 401 }
        );
      }
      
      return handler(req, company);
    } catch (error) {
      logger.error('External company auth middleware error', error);
      return NextResponse.json(
        {
          code: 500,
          state: 'false',
          message: 'Internal server error during authentication'
        },
        { status: 500 }
      );
    }
  };
}

import type { ExternalCompanyDocument } from '@/models/ExternalCompany';

