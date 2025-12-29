/**
 * Profile Picture Upload API
 * 
 * Handles profile picture uploads to Cloudinary and updates user profile.
 * Generates multiple sizes: thumbnail (200x200), medium (400x400), large (800x800).
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import cloudinary, { isCloudinaryConfigured, UPLOAD_PRESETS } from '@/lib/cloudinary';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    console.log('=== PROFILE PICTURE UPLOAD START ===');
    
    // 1. Check session
    console.log('[1/6] Checking session...');
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[ERROR] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[1/6] ✓ Session OK:', session.user.id);

    // 2. Check Cloudinary configuration
    console.log('[2/6] Checking Cloudinary configuration...');
    if (!isCloudinaryConfigured()) {
      console.error('[2/6] ✗ Cloudinary not configured');
      return NextResponse.json(
        { 
          error: 'File upload is not configured. Please contact your administrator.',
          code: 'CLOUDINARY_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }
    console.log('[2/6] ✓ Cloudinary configured');

    // 3. Parse form data
    console.log('[3/6] Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('[3/6] ✗ No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('[3/6] ✗ Invalid file type:', file.type);
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (5MB limit for profile pictures)
    if (file.size > 5 * 1024 * 1024) {
      console.error('[3/6] ✗ File too large:', file.size);
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }
    console.log('[3/6] ✓ File OK:', { fileName: file.name, fileSize: file.size, fileType: file.type });

    // 4. Get current user data
    console.log('[4/6] Fetching user data...');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        profileImageUrl: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      console.error('[4/6] ✗ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('[4/6] ✓ User found:', user.id);

    // 5. Upload to Cloudinary (base upload)
    console.log('[5/6] Uploading to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `${UPLOAD_PRESETS.PROFILE_PHOTOS.folder}/${session.user.id}`,
            public_id: `profile-${Date.now()}`,
            resource_type: 'image',
            transformation: [
              { width: 800, height: 800, crop: 'fill', gravity: 'face', quality: 'auto' },
            ],
            overwrite: true,
          },
          (error, result) => {
            if (error) {
              console.error('[5/6] ✗ Cloudinary upload failed:', error);
              reject(error);
            } else {
              console.log('[5/6] ✓ Cloudinary upload OK:', result.secure_url);
              resolve(result);
            }
          }
        )
        .end(buffer);
    });

    // Generate different sizes using Cloudinary transformations
    const publicId = uploadResult.public_id;
    const profileImageUrl = {
      thumbnail: cloudinary.url(publicId, {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto',
        secure: true,
      }),
      medium: cloudinary.url(publicId, {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto',
        secure: true,
      }),
      large: cloudinary.url(publicId, {
        width: 800,
        height: 800,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto',
        secure: true,
      }),
      original: uploadResult.secure_url,
      cloudinaryPublicId: publicId,
    };

    console.log('[5/6] ✓ Profile images generated:', profileImageUrl);

    // 6. Update user profile
    console.log('[6/6] Updating user profile...');
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        profileImageUrl: profileImageUrl as any,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
      },
    });
    console.log('[6/6] ✓ User profile updated');

    // Create audit log
    console.log('[6/6] Creating audit log...');
    await createAuditLogFromRequest(

      request,

      AuditAction.UPDATE,

      'USER_PROFILE',

      null,

      `Updated profile picture`,

      undefined

    );
    console.log('[6/6] ✓ Audit log created');

    console.log('=== PROFILE PICTURE UPLOAD SUCCESS ===');
    return NextResponse.json({ 
      user: updatedUser,
      profileImageUrl,
    });
  } catch (error: any) {
    console.error('=== PROFILE PICTURE UPLOAD ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Delete profile picture endpoint
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('=== PROFILE PICTURE DELETE START ===');
    
    // Check session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileImageUrl: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete from Cloudinary if exists
    if (user.profileImageUrl && typeof user.profileImageUrl === 'object') {
      const imageData = user.profileImageUrl as any;
      if (imageData.cloudinaryPublicId && isCloudinaryConfigured()) {
        try {
          await cloudinary.uploader.destroy(imageData.cloudinaryPublicId);
          console.log('✓ Deleted from Cloudinary:', imageData.cloudinaryPublicId);
        } catch (error) {
          console.error('Failed to delete from Cloudinary:', error);
          // Continue anyway - we'll null the DB reference
        }
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        profileImageUrl: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(

      request,

      AuditAction.UPDATE,

      'USER_PROFILE',

      null,

      `Removed profile picture`,

      undefined

    );

    console.log('=== PROFILE PICTURE DELETE SUCCESS ===');
    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('=== PROFILE PICTURE DELETE ERROR ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
