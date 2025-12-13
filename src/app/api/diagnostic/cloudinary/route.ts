import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isCloudinaryConfigured, getCloudinaryConfig } from '@/lib/cloudinary';

/**
 * Diagnostic endpoint for Cloudinary configuration
 * This helps diagnose upload issues by checking environment variables
 * 
 * IMPORTANT: This should be removed or restricted in production
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Cloudinary configuration status
    const config = getCloudinaryConfig();
    
    // Check each environment variable
    const diagnostics = {
      timestamp: new Date().toISOString(),
      isConfigured: isCloudinaryConfigured(),
      environmentVariables: {
        CLOUDINARY_CLOUD_NAME: {
          exists: !!process.env.CLOUDINARY_CLOUD_NAME,
          value: process.env.CLOUDINARY_CLOUD_NAME ? '***SET***' : 'NOT SET',
          length: process.env.CLOUDINARY_CLOUD_NAME?.length || 0,
        },
        CLOUDINARY_API_KEY: {
          exists: !!process.env.CLOUDINARY_API_KEY,
          value: process.env.CLOUDINARY_API_KEY ? '***SET***' : 'NOT SET',
          length: process.env.CLOUDINARY_API_KEY?.length || 0,
        },
        CLOUDINARY_API_SECRET: {
          exists: !!process.env.CLOUDINARY_API_SECRET,
          value: process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'NOT SET',
          length: process.env.CLOUDINARY_API_SECRET?.length || 0,
        },
      },
      cloudinaryConfig: config,
      allEnvVars: Object.keys(process.env)
        .filter(key => key.includes('CLOUDINARY') || key.includes('CLOUD'))
        .map(key => ({
          name: key,
          exists: true,
          length: process.env[key]?.length || 0,
        })),
    };

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    console.error('Error in Cloudinary diagnostics:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
