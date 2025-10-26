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

    const { session, error } = await requireAnyRole(["FAMILY"] as any);`r`n    if (error) return error;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.documentId;
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const doc = await prisma.familyDocument.findUnique({
      where: { id: documentId },
      select: { id: true, familyId: true, title: true, fileUrl: true, fileType: true }
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

    // Support only S3-backed documents for download; legacy public paths should be phased out
    const s3 = parseS3Url(doc.fileUrl);
    if (!s3) {
      // For legacy records, deny direct download to avoid public file exposure
      return NextResponse.json({ error: "Legacy file path not available for direct download" }, { status: 410 });
    }

    const signedUrl = await createSignedGetUrl({ bucket: s3.bucket, key: s3.key, expiresIn: 60 });

    // Audit log (read/download)
    await createAuditLogFromRequest(
      request,
      "READ" as any,
      "FamilyDocument",
      doc.id,
      "Downloaded family document",
      { fileType: doc.fileType }
    );

    // Redirect to signed URL
    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    console.error("Error generating signed download URL:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}
