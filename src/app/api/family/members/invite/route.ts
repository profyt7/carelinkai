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
import { ActivityType, FamilyMemberRole, FamilyMemberStatus } from "@prisma/client";
import { EmailService } from "@/lib/email-service";

// Configure runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate invite request body
 */
const inviteSchema = z.object({
  familyId: z.string().cuid(),
  email: z.string().email(),
  role: z.enum([
    FamilyMemberRole.OWNER,
    FamilyMemberRole.CARE_PROXY,
    FamilyMemberRole.MEMBER,
    FamilyMemberRole.GUEST
  ]).default(FamilyMemberRole.MEMBER)
});

/**
 * POST handler for inviting family members
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
    const validationResult = inviteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid invite data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Check if user is a member of the family with appropriate role
    const memberCheck = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: data.familyId,
          userId: session.user.id
        }
      }
    });
    
    if (!memberCheck) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Check if user has permission to invite (must be OWNER or CARE_PROXY)
    if (
      memberCheck.role !== FamilyMemberRole.OWNER &&
      memberCheck.role !== FamilyMemberRole.CARE_PROXY
    ) {
      return NextResponse.json({ 
        error: "Insufficient permissions to invite members" 
      }, { status: 403 });
    }
    
    // Get family details for the invitation
    const family = await prisma.family.findUnique({
      where: { id: data.familyId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }
    
    // Check if user with this email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    
    let invitedExistingUser = false;
    
    if (existingUser) {
      // Check if user is already a member of this family
      const existingMembership = await prisma.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: data.familyId,
            userId: existingUser.id
          }
        }
      });
      
      if (existingMembership) {
        return NextResponse.json({ 
          error: "User is already a member of this family",
          status: "already_member"
        }, { status: 409 });
      }
      
      // Create pending membership for existing user
      await prisma.familyMember.create({
        data: {
          familyId: data.familyId,
          userId: existingUser.id,
          role: data.role,
          status: FamilyMemberStatus.PENDING,
          invitedById: session.user.id,
          invitedAt: new Date()
        }
      });
      
      invitedExistingUser = true;
      
      // Send invitation email to existing user
      await EmailService.sendEmail({
        to: data.email,
        subject: `You've been invited to join a family on CareLinkAI`,
        text: `
          ${session.user.firstName || session.user.name} has invited you to join their family on CareLinkAI.
          
          To accept this invitation, please log in to your account and visit the Family section.
          
          If you have any questions, please contact support@carelinkai.com.
        `,
        html: `
          <h2>You've been invited to join a family on CareLinkAI</h2>
          <p>${session.user.firstName || session.user.name} has invited you to join their family on CareLinkAI.</p>
          <p>To accept this invitation, please log in to your account and visit the Family section.</p>
          <p>If you have any questions, please contact <a href="mailto:support@carelinkai.com">support@carelinkai.com</a>.</p>
        `
      });
      
    } else {
      // Generate signup link with invitation parameters
      const signupUrl = new URL(
        `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:5000'}/signup`
      );
      signupUrl.searchParams.append('email', data.email);
      signupUrl.searchParams.append('inviteFamilyId', data.familyId);
      signupUrl.searchParams.append('inviteRole', data.role);
      
      // Send invitation email to new user
      await EmailService.sendEmail({
        to: data.email,
        subject: `You've been invited to join a family on CareLinkAI`,
        text: `
          ${session.user.firstName || session.user.name} has invited you to join their family on CareLinkAI.
          
          To accept this invitation, please create an account using the link below:
          
          ${signupUrl.toString()}
          
          If you have any questions, please contact support@carelinkai.com.
        `,
        html: `
          <h2>You've been invited to join a family on CareLinkAI</h2>
          <p>${session.user.firstName || session.user.name} has invited you to join their family on CareLinkAI.</p>
          <p>To accept this invitation, please create an account using the link below:</p>
          <p><a href="${signupUrl.toString()}">Create your account</a></p>
          <p>If you have any questions, please contact <a href="mailto:support@carelinkai.com">support@carelinkai.com</a>.</p>
        `
      });
    }
    
    // Log activity
    await createActivityRecord({
      familyId: data.familyId,
      actorId: session.user.id,
      type: ActivityType.MEMBER_INVITED,
      resourceType: 'family_member',
      resourceId: null,
      description: `${session.user.firstName || session.user.name} invited ${data.email} to join the family`,
      metadata: {
        inviteeEmail: data.email,
        role: data.role,
        invitedExistingUser
      }
    });
    
    // Publish SSE event
    publish(`family:${data.familyId}`, "member:invited", {
      familyId: data.familyId,
      inviteeEmail: data.email,
      role: data.role,
      invitedBy: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName
      },
      invitedExistingUser
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      invitedExistingUser
    });
    
  } catch (error) {
    console.error("Error inviting family member:", error);
    return NextResponse.json(
      { error: "Failed to invite family member" },
      { status: 500 }
    );
  }
}
