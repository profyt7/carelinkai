import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership, hasPermissionToViewDocuments } from "@/lib/services/family";
import { parseS3Url, createSignedGetUrl } from "@/lib/storage";
import { createAuditLogFromRequest } from "@/lib/audit";
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from "@/lib/rateLimit";

export async function GET(request: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    // Rate limit: 60 req/min per IP
    {
      const key = getClientIp(request as any);
      const limit = 60;
      const rr = await rateLimitAsync({ name: 'family:documents:DOWNLOAD', key, limit, windowMs: 60_000 });
      if (!rr.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
        );
      }
    }

    const { session, error } = await requireAnyRole([]);
      if (error) return error;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.documentId;
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const doc = await prisma.familyDocument.findUnique({
      where: { id: documentId },
      select: { id: true, familyId: true, title: true, fileUrl: true, fileType: true, fileName: true, metadata: true }
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Membership + permission checks
    const isMember = await checkFamilyMembership(session.user.id, doc.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    const canView = await hasPermissionToViewDocuments(session.user.id, doc.familyId);
    if (!canView) {
      return NextResponse.json({ error: "No permission to view documents" }, { status: 403 });
    }

    // Check if document is stored in Cloudinary
    const metadata = doc.metadata as any;
    const isCloudinary = metadata?.uploadService === 'cloudinary' || 
                        doc.fileUrl.includes('cloudinary.com') ||
                        doc.fileUrl.includes('res.cloudinary.com');
    
    // Handle Cloudinary documents
    if (isCloudinary) {
      console.log('[Download] Cloudinary document detected:', {
        documentId: doc.id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl
      });
      
      // Audit log (read/download)
      try {
        await createAuditLogFromRequest(
          request,
          "DOCUMENT_VIEWED" as any,
          "FamilyDocument",
          doc.id,
          `Downloaded family document: ${doc.title}`,
          { fileType: doc.fileType, action: 'download', service: 'cloudinary' }
        );
      } catch (auditError) {
        // Log audit error but don't fail the download
        console.error('Failed to create audit log:', auditError);
      }
      
      // Redirect directly to Cloudinary URL (it's already secure)
      return NextResponse.redirect(doc.fileUrl, 302);
    }
    
    // Handle S3 documents (legacy)
    const s3 = parseS3Url(doc.fileUrl);
    
    // Handle mock/development mode - allow direct access to mock URLs
    if (!s3) {
      // Check if it's a mock/example URL (development mode)
      if (process.env.NODE_ENV !== 'production' && 
          (doc.fileUrl.includes('example.com') || doc.fileUrl.includes('mock'))) {
        // Return mock download response
        return NextResponse.json({ 
          message: 'Mock download - file URL available',
          fileUrl: doc.fileUrl,
          fileName: doc.title,
          fileType: doc.fileType
        }, { status: 200 });
      }
      
      // For legacy records, deny direct download to avoid public file exposure
      return NextResponse.json({ error: "Legacy file path not available for direct download" }, { status: 410 });
    }

    const signedUrl = await createSignedGetUrl({ bucket: s3.bucket, key: s3.key, expiresIn: 60 });

    // Audit log (read/download)
    try {
      await createAuditLogFromRequest(
        request,
        "DOCUMENT_VIEWED" as any,
        "FamilyDocument",
        doc.id,
        `Downloaded family document: ${doc.title}`,
        { fileType: doc.fileType, action: 'download', service: 's3' }
      );
    } catch (auditError) {
      // Log audit error but don't fail the download
      console.error('Failed to create audit log:', auditError);
    }

    // Redirect to signed URL
    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    console.error("Error generating signed download URL:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}
