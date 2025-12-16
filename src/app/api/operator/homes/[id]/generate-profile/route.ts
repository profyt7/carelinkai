/**
 * API Endpoint: Generate AI-Powered Home Profile (Feature #2)
 * POST /api/operator/homes/[id]/generate-profile
 * 
 * Generates professional description and highlights for an assisted living home
 * using AI. Requires Operator or Admin authentication.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, AuditAction } from '@prisma/client';
import { generateHomeProfile, validateHomeData, type HomeData } from '@/lib/profile-generator/home-profile-generator';
import { createAuditLogFromRequest } from '@/lib/audit';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 2. Authorization - Only Operators and Admins can generate profiles
    if (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden - Only operators and admins can generate profiles' },
        { status: 403 }
      );
    }

    // 3. Fetch the home
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: params.id },
      include: { address: true }
    });

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // 4. Verify ownership (Operators can only generate profiles for their own homes)
    if (user.role === UserRole.OPERATOR) {
      const operator = await prisma.operator.findUnique({
        where: { userId: user.id }
      });

      if (!operator || operator.id !== home.operatorId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only generate profiles for your own homes' },
          { status: 403 }
        );
      }
    }

    // 5. Prepare home data for AI generation
    const homeData: HomeData = {
      name: home.name,
      description: home.description || undefined,
      careLevel: home.careLevel || [],
      capacity: home.capacity,
      currentOccupancy: home.currentOccupancy,
      priceMin: home.priceMin ? Number(home.priceMin) : undefined,
      priceMax: home.priceMax ? Number(home.priceMax) : undefined,
      amenities: home.amenities || [],
      address: home.address ? {
        street: home.address.street || undefined,
        city: home.address.city || undefined,
        state: home.address.state || undefined,
        zipCode: home.address.zipCode || undefined,
      } : undefined,
      genderRestriction: home.genderRestriction,
    };

    // 6. Validate home data
    const validation = validateHomeData(homeData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid home data', details: validation.errors },
        { status: 400 }
      );
    }

    // 7. Generate AI profile
    console.log(`[Generate Profile] Generating profile for home: ${home.name} (${home.id})`);
    const generatedProfile = await generateHomeProfile(homeData);

    // 8. Save the generated profile to database
    const updatedHome = await prisma.assistedLivingHome.update({
      where: { id: home.id },
      data: {
        aiGeneratedDescription: generatedProfile.description,
        highlights: generatedProfile.highlights,
        lastProfileGenerated: new Date(),
      },
    });

    // 9. Create audit log
    await createAuditLogFromRequest(req, {
      userId: user.id,
      action: AuditAction.UPDATE,
      resourceType: 'AssistedLivingHome',
      resourceId: home.id,
      metadata: {
        action: 'generate_profile',
        homeName: home.name,
        highlightsCount: generatedProfile.highlights.length,
        descriptionLength: generatedProfile.description.length,
      },
    });

    console.log(`[Generate Profile] Successfully generated profile for home: ${home.name}`);

    // 10. Return the generated profile
    return NextResponse.json({
      success: true,
      data: {
        id: updatedHome.id,
        aiGeneratedDescription: updatedHome.aiGeneratedDescription,
        highlights: updatedHome.highlights,
        lastProfileGenerated: updatedHome.lastProfileGenerated,
      },
    });

  } catch (error) {
    console.error('[Generate Profile] Error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to generate profile', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
