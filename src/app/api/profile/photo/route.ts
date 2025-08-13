/**
 * Profile Photo Upload API for CareLinkAI
 * 
 * This API handles secure profile photo operations:
 * - POST: Upload and process a new profile photo
 * - DELETE: Remove the current profile photo
 * 
 * Features:
 * - Secure file upload with validation
 * - Image processing (resizing, optimization)
 * - Multiple storage options (local, S3)
 * - Old photo cleanup
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";
import { mkdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Initialize Prisma client
const prisma = new PrismaClient();

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Use bracket notation for env access to satisfy noPropertyAccessFromIndexSignature
const UPLOAD_DIR =
  process.env["UPLOAD_DIR"] || "public/uploads/profiles";
const PUBLIC_URL_PATH =
  process.env["NEXT_PUBLIC_URL"] || "http://localhost:5002";
const PHOTO_SIZES = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 600, height: 600 }
};

/**
 * Ensure the upload directory exists
 */
async function ensureUploadDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Process and save an image with multiple sizes
 */
async function processAndSaveImage(
  buffer: Buffer,
  userId: string,
  mimeType: string
): Promise<{ urls: Record<string, string>, filePaths: string[] }> {
  // Create unique filename based on userId and timestamp
  const timestamp = Date.now();
  const fileId = uuidv4().split("-")[0];
  const baseFilename = `${userId}_${timestamp}_${fileId}`;
  
  // Ensure upload directory exists
  const userUploadDir = join(UPLOAD_DIR, userId);
  await ensureUploadDir(userUploadDir);
  
  // Determine output format based on mime type
  const outputFormat = mimeType === "image/png" ? "png" : 
                      mimeType === "image/webp" ? "webp" : "jpeg";
  
  const urls: Record<string, string> = {};
  const filePaths: string[] = [];
  
  // Process each size
  for (const [size, dimensions] of Object.entries(PHOTO_SIZES)) {
    const filename = `${baseFilename}_${size}.${outputFormat}`;
    const filePath = join(userUploadDir, filename);
    
    // Process image with sharp
    await sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: "cover",
        position: "center"
      })
      .toFormat(outputFormat as keyof sharp.FormatEnum, {
        quality: 80,
        progressive: true
      })
      .toFile(filePath);
    
    // Generate public URL
    const publicPath = `/uploads/profiles/${userId}/${filename}`;
    urls[size] = publicPath;
    filePaths.push(filePath);
  }
  
  return { urls, filePaths };
}

/**
 * Delete old profile photos for a user
 */
async function deleteOldProfilePhotos(userId: string, excludeFilenames: string[] = []): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true }
    });
    
    if (!user?.profileImageUrl) return;
    
    // Extract old filenames from the URLs
    const oldProfileData = typeof user.profileImageUrl === 'string' 
      ? { thumbnail: user.profileImageUrl } 
      : user.profileImageUrl as Record<string, string>;
    
    const oldFilePaths = Object.values(oldProfileData)
      .filter(url => url && typeof url === 'string')
      .map(url => {
        const filename = url.split('/').pop();
        if (!filename) return null;
        return join(UPLOAD_DIR, userId, filename);
      })
      .filter(path => path !== null && !excludeFilenames.includes(path as string)) as string[];
    
    // Delete old files
    for (const filePath of oldFilePaths) {
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
          console.log(`Deleted old profile photo: ${filePath}`);
        }
      } catch (err) {
        console.error(`Failed to delete old profile photo: ${filePath}`, err);
      }
    }
  } catch (err) {
    console.error(`Error cleaning up old profile photos for user ${userId}:`, err);
  }
}

/**
 * Validate file before processing
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
    };
  }
  
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}` 
    };
  }
  
  return { valid: true };
}

/**
 * POST handler for uploading a profile photo
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Parse form data with file
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: "No photo file provided" },
        { status: 400 }
      );
    }
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }
    
    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Process and save the image
    const { urls, filePaths } = await processAndSaveImage(buffer, userId, file.type);
    
    // Update user profile with new photo URLs
    await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: urls }
    });
    
    // Delete old profile photos
    await deleteOldProfilePhotos(userId, filePaths);
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "USER_PROFILE_PHOTO",
        resourceId: userId,
        description: "User updated their profile photo",
        ipAddress: request.headers.get("x-forwarded-for") || 
                  // @ts-ignore - `ip` exists only in Node runtime requests
                  (request as any).ip || 
                  "unknown",
        userId: userId,
        actionedBy: userId
      }
    });
    
    // Return success response with photo URLs
    return NextResponse.json({
      success: true,
      message: "Profile photo uploaded successfully",
      data: {
        photoUrls: urls
      }
    });
    
  } catch (error: any) {
    console.error("Profile photo upload error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to upload profile photo", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE handler for removing a profile photo
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated via session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Delete all profile photos
    await deleteOldProfilePhotos(userId);
    
    // Update user profile to remove photo URLs
    await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: null }
    });
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        resourceType: "USER_PROFILE_PHOTO",
        resourceId: userId,
        description: "User removed their profile photo",
        ipAddress: request.headers.get("x-forwarded-for") || 
                  // @ts-ignore - `ip` exists only in Node runtime requests
                  (request as any).ip || 
                  "unknown",
        userId: userId,
        actionedBy: userId
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Profile photo removed successfully"
    });
    
  } catch (error: any) {
    console.error("Profile photo deletion error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to remove profile photo", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
