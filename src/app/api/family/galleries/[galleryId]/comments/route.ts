import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership } from "@/lib/services/family";
import { publish } from "@/lib/server/sse";
import { ActivityType } from "@prisma/client";

// GET query params schema
const GetCommentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// POST body schema
const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required"),
  parentCommentId: z.string().optional(),
});

// GET /api/family/galleries/[galleryId]/comments
export async function GET(
  req: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    const { galleryId } = params;
    
    // Parse and validate query params
    const url = new URL(req.url);
    const cursorParam = url.searchParams.get("cursor");
    const limitParam  = url.searchParams.get("limit");
    const queryResult = GetCommentsQuerySchema.safeParse({
      cursor: cursorParam ?? undefined,
      limit:  limitParam  ?? undefined,
    });
    
    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryResult.error.format() },
        { status: 400 }
      );
    }
    
    const { cursor, limit } = queryResult.data;
    
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the gallery and check if user has access
    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { familyId: true },
    });
    
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }
    
    // Check if user is an active member of the family
    const isMember = await checkFamilyMembership(session.user.id, gallery.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Query comments with pagination
    const comments = await prisma.galleryComment.findMany({
      where: {
        galleryId,
        parentCommentId: null, // Only fetch top-level comments
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    
    // Get the next cursor
    // Safely derive the cursor for the next page
    // Guard against empty arrays to satisfy strict null-checks
    const nextCursor =
      comments.length === limit && comments.length > 0
        ? comments[comments.length - 1]!.id
        : null;
    
    return NextResponse.json({
      comments,
      // alias to mirror documents API shape
      items: comments,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching gallery comments:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch comments",
        ...(process.env.NODE_ENV === "development" && { details: error })
      },
      { status: 500 }
    );
  }
}

// POST /api/family/galleries/[galleryId]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    const { galleryId } = params;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyResult = CreateCommentSchema.safeParse(await req.json());
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: bodyResult.error.format() },
        { status: 400 }
      );
    }
    const { content, parentCommentId } = bodyResult.data;

    const gallery = await prisma.sharedGallery.findUnique({
      where: { id: galleryId },
      select: { id: true, familyId: true, title: true },
    });
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const isMember = await checkFamilyMembership(
      session.user.id,
      gallery.familyId
    );
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parentCommentId) {
      const parent = await prisma.galleryComment.findUnique({
        where: { id: parentCommentId, galleryId },
      });
      if (!parent) {
        return NextResponse.json(
          {
            error:
              "Parent comment not found or doesn't belong to this gallery",
          },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.galleryComment.create({
      data: {
        content,
        parentCommentId,
        galleryId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // Log activity (non-blocking if it fails)
    await prisma.activityFeedItem.create({
      data: {
        familyId: gallery.familyId,
        actorId: session.user.id,
        type: ActivityType.GALLERY_UPDATED,
        resourceType: "gallery",
        resourceId: galleryId,
        description: `${session.user.firstName} ${session.user.lastName} commented on gallery: ${gallery.title}`,
        metadata: { commentId: comment.id },
      },
    });

    try {
      const payload = {
        familyId: gallery.familyId,
        galleryId,
        commentId: comment.id,
        parentCommentId,
        comment,
      };
      // Generic event consumed by existing listeners
      publish(`family:${gallery.familyId}`, "comment:created", {
        ...payload,
        resourceType: "gallery",
        resourceId: galleryId,
      });
      // Aliases to mirror documents behaviour
      publish(`family:${gallery.familyId}`, "gallery:commented", payload);
      publish(`gallery:${galleryId}`, "gallery:commented", payload);
    } catch (sseError) {
      console.error("Failed to publish gallery comment SSE:", sseError);
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Error creating gallery comment:", error);
    return NextResponse.json(
      {
        error: "Failed to create comment",
        ...(process.env.NODE_ENV === "development" && { details: String(error) }),
      },
      { status: 500 }
    );
  }
}
