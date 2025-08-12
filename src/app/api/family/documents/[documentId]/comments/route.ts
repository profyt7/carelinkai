import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  getDocumentComments, 
  createDocumentComment, 
  checkFamilyMembership, 
  hasPermissionToViewDocuments 
} from "@/lib/services/family";
import { publish } from "@/lib/server/sse";
import { 
  DocumentCommentWithAuthor, 
  CreateDocumentCommentRequest 
} from "@/lib/types/family";

/**
 * GET handler for fetching document comments
 * 
 * @param request - The incoming request
 * @param { params } - Route parameters containing documentId
 * @returns Comments for the document with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Get document ID from route params
    const { documentId } = params;
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    
    // Check if familyId was provided in query params for optimization
    let familyId = searchParams.get("familyId");

    // If familyId wasn't provided, look it up from the document
    if (!familyId) {
      // Find the document to get its familyId
      const document = await prisma.familyDocument.findUnique({
        where: { id: documentId },
        select: { familyId: true }
      });

      if (!document) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      familyId = document.familyId;
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, familyId);
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Check if user has permission to view documents
    const canViewDocuments = await hasPermissionToViewDocuments(
      session.user.id,
      familyId
    );
    if (!canViewDocuments) {
      return NextResponse.json(
        { error: "No permission to view documents" },
        { status: 403 }
      );
    }

    // Get document comments
    const commentsResponse = await getDocumentComments(
      familyId,
      documentId,
      { page, limit }
    );

    // Return comments with pagination metadata
    return NextResponse.json(commentsResponse);
  } catch (error) {
    console.error("Error fetching document comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch document comments" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a document comment
 * 
 * @param request - The incoming request with comment data
 * @param { params } - Route parameters containing documentId
 * @returns The created comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Get document ID from route params
    const { documentId } = params;
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { content, parentCommentId } = body as CreateDocumentCommentRequest;

    // Validate content
    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Find the document to get its familyId
    const document = await prisma.familyDocument.findUnique({
      where: { id: documentId },
      select: { familyId: true }
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const familyId = document.familyId;

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, familyId);
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Check if user has permission to view documents (which implies comment permission)
    const canViewDocuments = await hasPermissionToViewDocuments(
      session.user.id,
      familyId
    );
    if (!canViewDocuments) {
      return NextResponse.json(
        { error: "No permission to comment on documents" },
        { status: 403 }
      );
    }

    // Create the comment
    const comment = await createDocumentComment(
      familyId,
      documentId,
      session.user.id,
      { content, parentCommentId }
    );

    /* ------------------------------------------------------------------
     * Real-time updates: publish SSE event so connected clients can
     * receive the new comment without polling.
     * ------------------------------------------------------------------ */
    try {
      const payload = {
        familyId,
        documentId,
        commentId: comment.id,
        parentCommentId,
        comment
      };

      // Notify subscribers interested in this specific document
      publish(`document:${documentId}`, "comment:created", payload);

      // Notify subscribers interested in any comments for the family
      publish(`family:${familyId}`, "comment:created", payload);
    } catch (pubErr) {
      // Log but do not fail the request if publishing fails
      console.error("Failed to publish SSE comment event:", pubErr);
    }

    // Return success response with the created comment
    return NextResponse.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error("Error creating document comment:", error);
    return NextResponse.json(
      { error: "Failed to create document comment" },
      { status: 500 }
    );
  }
}
