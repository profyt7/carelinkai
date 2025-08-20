import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { 
  checkFamilyMembership,
  handleMentionsInComment,
  createActivityRecord
} from "@/lib/services/family";
import { publish } from "@/lib/server/sse";
import { ActivityType } from "@prisma/client";

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate route parameters
 */
const paramsSchema = z.object({
  noteId: z.string().cuid()
});

/**
 * Validate comment creation input
 */
const commentCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  mentions: z.array(z.any()).optional(),
  familyId: z.string().cuid().optional() // Optional for SSE channel
});

/**
 * Validate comment filter parameters
 */
const commentFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

/**
 * GET handler for fetching comments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { noteId: string } }
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
        { error: "Invalid note ID", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { noteId } = validatedParams.data;

    // Find the note to get familyId
    const note = await prisma.familyNote.findUnique({
      where: { id: noteId },
      select: { familyId: true }
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, note.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filterParams: Record<string, any> = {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortOrder: searchParams.get("sortOrder")
    };

    // Clean up undefined values
    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] === null || filterParams[key] === undefined) {
        delete filterParams[key];
      }
    });

    // Validate filter parameters
    const validationResult = commentFilterSchema.safeParse(filterParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const filters = validationResult.data;

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit;

    // Query comments with pagination
    const [comments, totalCount] = await Promise.all([
      prisma.noteComment.findMany({
        where: { noteId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true
            }
          }
        },
        orderBy: {
          createdAt: filters.sortOrder
        },
        skip,
        take: filters.limit
      }),
      prisma.noteComment.count({
        where: { noteId }
      })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit);
    const hasNextPage = filters.page < totalPages;
    const hasPreviousPage = filters.page > 1;

    // Return comments with pagination metadata
    return NextResponse.json({
      items: comments,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });

  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating comments
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { noteId: string } }
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
        { error: "Invalid note ID", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { noteId } = validatedParams.data;

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = commentCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid comment data", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Find the note to get familyId
    const note = await prisma.familyNote.findUnique({
      where: { id: noteId },
      select: { 
        id: true,
        familyId: true,
        title: true
      }
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, note.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }

    // Create comment
    const comment = await prisma.noteComment.create({
      data: {
        noteId,
        authorId: session.user.id,
        content: data.content
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        }
      }
    });

    // Process @mentions and create notifications
    await handleMentionsInComment({
      familyId: note.familyId,
      authorId: session.user.id,
      content: data.content,
      resource: { type: 'note', id: note.id, title: note.title || '' },
      commentId: comment.id
    });

    // Get updated comment count
    const commentCount = await prisma.noteComment.count({
      where: { noteId }
    });

    // Log activity
    await createActivityRecord({
      familyId: note.familyId,
      actorId: session.user.id,
      type: ActivityType.NOTE_COMMENTED,
      resourceType: 'note',
      resourceId: noteId,
      description: `${session.user.firstName || session.user.name} commented on note: ${note.title}`,
      metadata: {
        noteTitle: note.title,
        commentId: comment.id
      }
    });

    // Publish SSE event
    publish(`family:${note.familyId}`, "note:commented", {
      familyId: note.familyId,
      noteId,
      comment
    });

    // Return success response
    return NextResponse.json({
      success: true,
      comment,
      commentCount
    });

  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
