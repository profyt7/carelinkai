import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Validate upload URL request
const uploadUrlRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  contentType: z.string().min(1, "Content type is required")
});

// S3 configuration
const S3_CONFIG = {
  region: process.env["AWS_REGION"] || "us-west-2",
  bucket: process.env["AWS_S3_BUCKET"] || "carelinkai-credentials",
  endpoint: process.env["AWS_S3_ENDPOINT"],
  forcePathStyle: process.env["AWS_S3_FORCE_PATH_STYLE"] === "true",
  presignedUrlExpiration: 3600, // 1 hour
};

// Initialize S3 client
const s3Client = new S3Client({
  region: S3_CONFIG.region,
  endpoint: S3_CONFIG.endpoint,
  forcePathStyle: S3_CONFIG.forcePathStyle,
});

// Sanitize filename to remove unsafe characters
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .substring(0, 100); // Limit length
}

// POST handler for generating upload URLs
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = uploadUrlRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { fileName, contentType } = validationResult.data;

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Generate a unique key for the file
    const timestamp = Date.now();
    const uuid = uuidv4();
    const sanitizedFileName = sanitizeFilename(fileName);
    const key = `caregivers/${caregiver.id}/credentials/${timestamp}-${uuid}-${sanitizedFileName}`;

    // In development/testing, return mock URLs
    if (process.env.NODE_ENV !== "production") {
      const mockFileUrl = `https://example.com/mock-credentials/${caregiver.id}/${uuid}-${sanitizedFileName}`;
      return NextResponse.json({
        url: `https://example.com/mock-upload/${caregiver.id}/${uuid}/${sanitizedFileName}`,
        fields: {},
        fileUrl: mockFileUrl,
        expires: S3_CONFIG.presignedUrlExpiration
      });
    }

    // Create command for generating presigned URL
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        userId: session.user.id,
        caregiverId: caregiver.id,
        originalName: fileName
      }
    });

    // Generate presigned URL
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: S3_CONFIG.presignedUrlExpiration
    });

    // Compute public file URL that the document will ultimately be accessible at
    const base =
      S3_CONFIG.endpoint ??
      `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com`;
    const fileUrl = `${base}/${key}`;

    // Return presigned URL and related information
    return NextResponse.json({
      url,
      fields: {},
      fileUrl,
      expires: S3_CONFIG.presignedUrlExpiration
    });

  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
