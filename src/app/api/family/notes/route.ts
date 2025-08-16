import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { 
  checkFamilyMembership,
  createActivityRecord,
  createDefaultAcl
} from "@/lib/services/family";
import { publish } from "@/lib/server/sse";
import { ActivityType, FamilyMemberRole } from "@prisma/client";

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate note creation input
 */
const noteCreateSchema = z.object({
  familyId: z.string().cuid(),
  title: z.string().min(1).max(255),
  content: z.object({
    type: z.enum(["html", "doc", "slate"]),
    content: z.any(),
    plainText: z.string().optional(),
    mentions: z.array(z.any()).optional()
  }),
  tags: z.array(z.string()).optional(),
  residentId: z.string().cuid().optional(),
  acl: z.any().optional()
});

/**
 * Validate note update input
 */
const noteUpdateSchema = noteCreateSchema.partial().extend({
  id: z.string().cuid()
});

/**
 * Validate note filter parameters
 */
const noteFilterSchema = z.object({
  familyId: z.string().cuid(),
  search: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  authorId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

/**
 * GET handler for fetching notes
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filterParams: Record<string, any> = {
      familyId: searchParams.get("familyId"),
      search: searchParams.get("search"),
      tags: searchParams.get("tags"),
      authorId: searchParams.get("authorId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder")
    };
    
    // Handle array parameters
    if (searchParams.has("tags") && searchParams.getAll("tags").length > 1) {
      filterParams['tags'] = searchParams.getAll("tags");
    }
    
    // Clean up undefined values
    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] === null || filterParams[key] === undefined) {
        delete filterParams[key];
      }
    });
    
    // Validate filter parameters
    const validationResult = noteFilterSchema.safeParse(filterParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const filters = validationResult.data;
    
    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, filters.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit;
    
    // Build query filters
    const whereClause: any = {
      familyId: filters.familyId
    };
    
    // Add author filter
    if (filters.authorId) {
      whereClause.authorId = filters.authorId;
    }
    
    // Add tags filter
    if (filters.tags) {
      const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
      whereClause.tags = {
        hasSome: tagsArray
      };
    }
    
    // Add search filter
    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } }
        // Note: We can't easily search in JSON content.plainText with Prisma
        // For a production app, consider using a text search index or raw SQL
      ];
    }
    
    // Build orderBy clause
    const orderByClause: Record<string, "asc" | "desc"> = {
      [filters.sortBy]: filters.sortOrder
    };

    // Query notes with pagination
    const [notes, totalCount] = await Promise.all([
      prisma.familyNote.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true
            }
          },
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              comments: true
            }
          }
        },
        orderBy: orderByClause,
        skip,
        take: filters.limit
      }),
      prisma.familyNote.count({
        where: whereClause
      })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit);
    const hasNextPage = filters.page < totalPages;
    const hasPreviousPage = filters.page > 1;
    
    // Transform notes to include comment count
    const notesWithDetails = notes.map(note => ({
      ...note,
      commentCount: note._count.comments,
      _count: undefined // Remove _count field
    }));
    
    // Return notes with pagination metadata
    return NextResponse.json({
      items: notesWithDetails,
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
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating notes
 */
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
    const validationResult = noteCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid note data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, data.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Create note
    const note = await prisma.familyNote.create({
      data: {
        familyId: data.familyId,
        authorId: session.user.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        residentId: data.residentId,
        acl: data.acl || createDefaultAcl(session.user.id)
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    // Log activity
    await createActivityRecord({
      familyId: data.familyId,
      actorId: session.user.id,
      type: ActivityType.NOTE_CREATED,
      resourceType: 'note',
      resourceId: note.id,
      description: `${session.user.firstName || session.user.name} created a new note: ${note.title}`,
      metadata: {
        noteTitle: note.title,
        tags: note.tags
      }
    });
    
    // Publish SSE event
    publish(`family:${data.familyId}`, "note:created", {
      familyId: data.familyId,
      note: {
        ...note,
        commentCount: 0
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      note: {
        ...note,
        commentCount: 0
      }
    });
    
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating notes
 */
export async function PUT(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = noteUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid note data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Find the note
    const note = await prisma.familyNote.findUnique({
      where: { id: data.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
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
    
    // Check if user has permission to update the note
    const isAuthor = note.authorId === session.user.id;
    
    // Get user's role in the family
    let hasPermission = isAuthor;
    
    if (!hasPermission) {
      // If not the author, check if user has OWNER or CARE_PROXY role
      const member = await prisma.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: note.familyId,
            userId: session.user.id
          }
        }
      });
      
      if (member && [FamilyMemberRole.OWNER, FamilyMemberRole.CARE_PROXY].includes(member.role)) {
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json({ error: "No permission to update this note" }, { status: 403 });
    }
    
    // Extract updatable fields
    const updates: any = {};
    
    if (data.title !== undefined) updates.title = data.title;
    if (data.content !== undefined) updates.content = data.content;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.residentId !== undefined) updates.residentId = data.residentId;
    if (data.acl !== undefined) updates.acl = data.acl;
    
    // Update note
    const updatedNote = await prisma.familyNote.update({
      where: { id: data.id },
      data: updates,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });
    
    // Log activity
    await createActivityRecord({
      familyId: note.familyId,
      actorId: session.user.id,
      type: ActivityType.NOTE_UPDATED,
      resourceType: 'note',
      resourceId: note.id,
      description: `${session.user.firstName || session.user.name} updated note: ${note.title}`,
      metadata: {
        noteTitle: note.title,
        previousTitle: data.title !== note.title ? note.title : undefined
      }
    });
    
    // Publish SSE event
    publish(`family:${note.familyId}`, "note:updated", {
      familyId: note.familyId,
      note: {
        ...updatedNote,
        commentCount: updatedNote._count.comments,
        _count: undefined
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      note: {
        ...updatedNote,
        commentCount: updatedNote._count.comments,
        _count: undefined
      }
    });
    
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing notes
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get note ID from URL
    const searchParams = request.nextUrl.searchParams;
    const noteId = searchParams.get("id");
    
    if (!noteId) {
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
    }
    
    // Find the note
    const note = await prisma.familyNote.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        familyId: true,
        authorId: true,
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
    
    // Check if user has permission to delete the note
    const isAuthor = note.authorId === session.user.id;
    
    // Get user's role in the family
    let hasPermission = isAuthor;
    
    if (!hasPermission) {
      // If not the author, check if user has OWNER or CARE_PROXY role
      const member = await prisma.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: note.familyId,
            userId: session.user.id
          }
        }
      });
      
      if (member && [FamilyMemberRole.OWNER, FamilyMemberRole.CARE_PROXY].includes(member.role)) {
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json({ error: "No permission to delete this note" }, { status: 403 });
    }
    
    // Delete note
    await prisma.familyNote.delete({
      where: { id: noteId }
    });
    
    // Log activity
    await createActivityRecord({
      familyId: note.familyId,
      actorId: session.user.id,
      type: ActivityType.NOTE_DELETED,
      resourceType: 'note',
      resourceId: null, // Note no longer exists
      description: `${session.user.firstName || session.user.name} deleted note: ${note.title}`,
      metadata: {
        noteTitle: note.title
      }
    });
    
    // Publish SSE event
    publish(`family:${note.familyId}`, "note:deleted", {
      familyId: note.familyId,
      noteId: note.id
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Note deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
