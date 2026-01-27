import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin user fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { role, status, firstName, lastName } = body;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role && { role }),
        ...(status && { status }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Don't allow admins to delete themselves
    if (session.user?.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, role: true },
    });

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SOFT DELETE: Update status to SUSPENDED and mark for deletion
    // This avoids foreign key constraint issues with related records
    await prisma.user.update({
      where: { id: params.id },
      data: {
        status: 'SUSPENDED',
        email: `deleted_${Date.now()}_${userExists.email}`, // Prevent email reuse
        firstName: '[DELETED]',
        lastName: 'User',
      },
    });

    // Log the deletion action
    await prisma.auditLog.create({
      data: {
        userId: params.id,
        actionedBy: session.user.id,
        action: 'USER_DELETE',
        entityType: 'User',
        entityId: params.id,
        description: `User ${userExists.email} (${userExists.role}) was deleted by admin`,
        metadata: {
          deletedEmail: userExists.email,
          deletedRole: userExists.role,
          deletedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({ 
      message: 'User deleted successfully',
      deleted: true 
    });
  } catch (error: any) {
    console.error('Admin user delete error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: 'Cannot delete user due to related records. Please contact support.' 
      }, { status: 400 });
    }
    
    // Generic error with helpful message
    return NextResponse.json({ 
      error: 'Failed to delete user. Please try again or contact support.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
