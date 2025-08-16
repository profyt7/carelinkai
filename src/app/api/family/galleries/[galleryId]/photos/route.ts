import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { 
  checkFamilyMembership,
  createActivityRecord
} from "@/lib/services/family";
import { publish } from "@/lib/server/sse";
import { ActivityType } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate route parameters
 */
const paramsSchema = z.object({
  galleryId: z.string().cuid()
});

/**
 * Maximum file size (20MB)
 */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Thumbnail size (max width/height)
 */
const THUMBNAIL_SIZE = 400;

/**
 * Generate a random filename while preserving the extension
 */
function generateRandomFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const randomName = crypto.randomBytes(16).toString('hex');
  return `${randomName}${ext}`;
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Validate query parameters for listing photos
 */
const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

/**
 * GET handler – list photos in a gallery (paginated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    // Session check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate params
    const paramRes = paramsSchema.safeParse(params);
    if (!paramRes.success) {
      return NextResponse.json(
        { error: 'Invalid gallery ID', details: paramRes.error.format() },
        { status: 400 },
      );
    }
    const { galleryId } = paramRes.data;

    // Parse query
    const url = new URL(request.url);
    const queryRes = listQuerySchema.safeParse({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    if (!queryRes.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: queryRes.error.format() },
        { status: 400 },
      );
    }
    const { cursor, limit } = queryRes.data;

    // Fetch gallery & family
    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { familyId: true },
    });
    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Membership check
    const isMember = await checkFamilyMembership(
      session.user.id,
      gallery.familyId,
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query photos
    const photos = await prisma.galleryPhoto.findMany({
      where: { galleryId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    const nextCursor =
      photos.length === limit ? photos[photos.length - 1].id : null;

    return NextResponse.json({ photos, nextCursor });
  } catch (err) {
    console.error('Error listing gallery photos:', err);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 },
    );
  }
}

/**
 * POST handler for uploading photos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate route parameters
    const validatedParams = paramsSchema.safeParse(params);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid gallery ID", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { galleryId } = validatedParams.data;

    // Parse form data
    const formData = await request.formData();
    
    // Get form fields
    const familyIdFromForm = formData.get("familyId") as string | null;
    const setAsCover = formData.get("setAsCover") === "true";
    
    // Get captions if provided
    const captionsData = formData.getAll("captions[]").map(item => item as string);
    
    // Get files
    const files = formData.getAll("photos").filter(file => file instanceof File) as File[];
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No photos provided" },
        { status: 400 }
      );
    }

    // Find the gallery to get familyId if not provided in form
    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { 
        id: true,
        familyId: true,
        title: true,
        coverPhotoUrl: true
      }
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Use familyId from form or from gallery
    const familyId = familyIdFromForm || gallery.familyId;

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }

    // Create upload directory path
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "families",
      familyId,
      "galleries",
      galleryId
    );

    // Ensure directory exists
    await ensureDirectoryExists(uploadDir);

    // Process each file
    const createdPhotos = [];
    let firstPhotoUrl = null;
    let firstThumbnailUrl = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        continue; // Skip non-image files
      }
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        continue; // Skip files that are too large
      }
      
      // Generate random filename
      const filename = generateRandomFilename(file.name);
      const filePath = path.join(uploadDir, filename);
      
      // Generate thumbnail filename
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(uploadDir, thumbnailFilename);
      
      // Get file buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Save original file
      await writeFile(filePath, buffer);
      
      // Create thumbnail using sharp
      await sharp(buffer)
        .resize({
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(thumbnailPath);
      
      // Create relative URLs for database
      const fileUrl = `/uploads/families/${familyId}/galleries/${galleryId}/${filename}`;
      const thumbnailUrl = `/uploads/families/${familyId}/galleries/${galleryId}/${thumbnailFilename}`;
      
      // Store first photo URL for cover photo
      if (firstPhotoUrl === null) {
        firstPhotoUrl = fileUrl;
        firstThumbnailUrl = thumbnailUrl;
      }
      
      // Get caption if available
      const caption = i < captionsData.length ? captionsData[i] : null;
      
      // Create photo record in database
      const photo = await prisma.galleryPhoto.create({
        data: {
          galleryId,
          uploaderId: session.user.id,
          fileUrl,
          thumbnailUrl,
          caption,
          sortOrder: i,
          metadata: {
            originalFilename: file.name,
            contentType: file.type,
            fileSize: file.size
          }
        }
      });
      
      createdPhotos.push(photo);
    }
    
    if (createdPhotos.length === 0) {
      return NextResponse.json(
        { error: "No valid photos were uploaded" },
        { status: 400 }
      );
    }
    
    // Update gallery cover photo if needed
    if (setAsCover || !gallery.coverPhotoUrl) {
      await prisma.sharedGallery.update({
        where: { id: galleryId },
        data: {
          coverPhotoUrl: firstThumbnailUrl || firstPhotoUrl
        }
      });
    }
    
    // Log activity
    await createActivityRecord({
      familyId,
      actorId: session.user.id,
      type: ActivityType.PHOTO_UPLOADED,
      resourceType: 'gallery',
      resourceId: galleryId,
      description: `${session.user.firstName || session.user.name} uploaded ${createdPhotos.length} photo${createdPhotos.length > 1 ? 's' : ''} to gallery: ${gallery.title}`,
      metadata: {
        galleryTitle: gallery.title,
        photoCount: createdPhotos.length,
        firstPhotoId: createdPhotos[0].id
      }
    });
    
    // Publish SSE event
    publish(`family:${familyId}`, "photo:uploaded", {
      familyId,
      galleryId,
      photos: createdPhotos
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      photos: createdPhotos
    });
    
  } catch (error) {
    console.error("Error uploading photos:", error);
    return NextResponse.json(
      { error: "Failed to upload photos" },
      { status: 500 }
    );
  }
}
