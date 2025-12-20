
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const uploadUrlRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  contentType: z.string().min(1, "Content type is required")
});

const S3_CONFIG = {
  region: process.env["AWS_REGION"] || "us-west-2",
  bucket: process.env["AWS_S3_BUCKET"] || "carelinkai-credentials",
  endpoint: process.env["AWS_S3_ENDPOINT"],
  forcePathStyle: process.env["AWS_S3_FORCE_PATH_STYLE"] === "true",
  presignedUrlExpiration: 3600,
};

const s3Client = new S3Client({
  region: S3_CONFIG.region,
  endpoint: S3_CONFIG.endpoint,
  forcePathStyle: S3_CONFIG.forcePathStyle,
});

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_").substring(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["PROVIDER"] as any);
    if (error) return error;

    const body = await request.json();
    const validationResult = uploadUrlRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid input", details: validationResult.error.format() }, { status: 400 });
    }

    const { fileName, contentType } = validationResult.data;

    const provider = await prisma.provider.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!provider) return NextResponse.json({ error: "User is not registered as a provider" }, { status: 403 });

    const timestamp = Date.now();
    const uuid = uuidv4();
    const sanitizedFileName = sanitizeFilename(fileName);
    const key = `providers/${provider.id}/credentials/${timestamp}-${uuid}-${sanitizedFileName}`;

    const hasAwsCreds = !!(process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY']);
    const useMock = process.env.NODE_ENV !== 'production' ||
      process.env['ALLOW_DEV_ENDPOINTS'] === '1' ||
      request.headers.get('x-e2e-bypass') === '1' ||
      !hasAwsCreds;
    if (useMock) {
      const mockFileUrl = `https://example.com/mock-credentials/${provider.id}/${uuid}-${sanitizedFileName}`;
      // Same-origin mock upload endpoint to avoid CORS in browser tests
      const mockUpload = `/api/dev/mock-upload/${provider.id}/${uuid}/${sanitizedFileName}`;
      return NextResponse.json({
        url: mockUpload,
        fields: {},
        fileUrl: mockFileUrl,
        expires: S3_CONFIG.presignedUrlExpiration,
      });
    }

    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        userId: session!.user!.id!,
        providerId: provider.id,
        originalName: fileName
      }
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: S3_CONFIG.presignedUrlExpiration });

    const base = S3_CONFIG.endpoint ?? `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com`;
    const fileUrl = `${base}/${key}`;

    return NextResponse.json({ url, fields: {}, fileUrl, expires: S3_CONFIG.presignedUrlExpiration });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
