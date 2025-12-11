export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { 
  requirePermission, 
  getUserScope, 
  handleAuthError 
} from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';

// GET /api/residents
// Lists residents for operators (scoped to their homes) or all for admins.
// Supports filters: q (name contains), status, homeId, familyId
// Pagination: limit (default 50, max 200), cursor (resident.id)
// CSV export: format=csv
export async function GET(req: NextRequest) {
  try {
    // Require permission to view residents
    const user = await requirePermission(PERMISSIONS.RESIDENTS_VIEW);
    const userId = user.id;
    const role = user.role;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const homeId = (searchParams.get('homeId') || '').trim();
    const familyId = (searchParams.get('familyId') || '').trim();
    const cursor = (searchParams.get('cursor') || '').trim();
    const format = (searchParams.get('format') || '').trim().toLowerCase();
    const showArchived = searchParams.get('showArchived') === 'true';
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 50;
    if (limit > 200) limit = 200;

    // Get user scope for data filtering
    const scope = await getUserScope(userId);
    let allowedHomeIds: string[] | null = null;
    
    // Apply scope-based filtering
    if (scope.homeIds === "ALL") {
      // Admin/Staff: no restrictions
      allowedHomeIds = null;
    } else if (scope.role === "FAMILY") {
      // Family members see only their residents
      // Skip home-based filtering, use resident IDs directly
      allowedHomeIds = null;
    } else {
      // Operators and Caregivers: filtered by their assigned homes
      allowedHomeIds = scope.homeIds;
      if (allowedHomeIds.length === 0) {
        return NextResponse.json({ items: [], nextCursor: null });
      }
    }

    const where: any = {};
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status as any;
    if (homeId) where.homeId = homeId;
    if (familyId) where.familyId = familyId;
    
    // Filter archived residents: by default exclude them, unless showArchived=true
    if (!showArchived) {
      where.archivedAt = null;
    }
    
    // Apply scope-based filtering to where clause
    if (scope.role === "FAMILY" && scope.residentIds.length > 0) {
      // Family members see only their residents
      where.id = { in: scope.residentIds };
    } else if (allowedHomeIds) {
      // Operators/Caregivers see residents in their assigned homes
      where.homeId = where.homeId ? where.homeId : { in: allowedHomeIds };
    }

    // For CSV export, fetch more comprehensive data
    let selectFields: any;
    if (format === 'csv') {
      selectFields = { 
        id: true, 
        firstName: true, 
        lastName: true, 
        status: true,
        photoUrl: true,
        dateOfBirth: true,
        gender: true,
        admissionDate: true,
        careNeeds: true,
        medicalConditions: true,
        medications: true,
        allergies: true,
        dietaryRestrictions: true,
        home: {
          select: {
            id: true,
            name: true
          }
        },
        caregiverAssignments: {
          where: { isPrimary: true, isActive: true },
          take: 1,
          select: {
            caregiver: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        contacts: {
          where: { isPrimary: true },
          take: 1,
          select: {
            name: true,
            phone: true,
            relationship: true
          }
        },
        _count: {
          select: {
            assessmentResults: true,
            residentIncidents: true,
            familyContacts: true
          }
        },
        assessmentResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true
          }
        },
        residentIncidents: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: {
            occurredAt: true
          }
        }
      };
    } else {
      selectFields = { 
        id: true, 
        firstName: true, 
        lastName: true, 
        status: true,
        photoUrl: true,
        dateOfBirth: true,
        admissionDate: true,
        careNeeds: true,
        home: {
          select: {
            id: true,
            name: true
          }
        }
      };
    }

    const queryOpts: any = {
      where,
      take: limit + 1, // over-fetch to determine next cursor
      orderBy: { id: 'asc' },
      select: selectFields,
    };
    if (cursor) queryOpts.cursor = { id: cursor };
    if (cursor) queryOpts.skip = 1;

    const rows = await prisma.resident.findMany(queryOpts);
    let nextCursor: string | null = null;
    let items = rows;
    // NOTE(droid): Guard last row access to satisfy TS strict null checks in CI
    if (rows.length > limit) {
      const last = rows[rows.length - 1];
      if (last) {
        nextCursor = (last as any).id as string;
      }
      items = rows.slice(0, limit);
    }

    if (format === 'csv') {
      // Helper function to escape CSV values
      const escapeCsv = (value: any): string => {
        if (value == null) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Helper function to calculate age
      const calculateAge = (dob: Date): number => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      // Helper function to calculate days since admission
      const getDaysSinceAdmission = (admissionDate: Date | null): string => {
        if (!admissionDate) return '';
        const days = Math.floor((Date.now() - new Date(admissionDate).getTime()) / (1000 * 60 * 60 * 24));
        return String(days);
      };

      // Helper function to format date
      const formatDate = (date: Date | null): string => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US');
      };

      // CSV header
      const header = [
        'Name',
        'Preferred Name',
        'Age',
        'Date of Birth',
        'Gender',
        'Room Number',
        'Care Level',
        'Status',
        'Admission Date',
        'Days Since Admission',
        'Primary Caregiver',
        'Medical Conditions',
        'Medications',
        'Allergies',
        'Dietary Restrictions',
        'Mobility Aids',
        'Emergency Contact Name',
        'Emergency Contact Phone',
        'Emergency Contact Relationship',
        'Assessment Count',
        'Recent Assessment Date',
        'Incident Count',
        'Recent Incident Date',
        'Family Members Count'
      ].join(',') + '\n';

      // CSV body
      const body = items.map((r: any) => {
        const careNeeds = r.careNeeds || {};
        const primaryCaregiver = r.caregiverAssignments?.[0]?.caregiver?.user 
          ? `${r.caregiverAssignments[0].caregiver.user.firstName} ${r.caregiverAssignments[0].caregiver.user.lastName}`
          : 'Not Assigned';
        const emergencyContact = r.contacts?.[0] || {};
        const recentAssessment = r.assessmentResults?.[0]?.createdAt || null;
        const recentIncident = r.residentIncidents?.[0]?.occurredAt || null;

        return [
          escapeCsv(`${r.firstName} ${r.lastName}`),
          escapeCsv(careNeeds.preferredName || ''),
          escapeCsv(r.dateOfBirth ? calculateAge(r.dateOfBirth) : ''),
          escapeCsv(formatDate(r.dateOfBirth)),
          escapeCsv(r.gender || ''),
          escapeCsv(careNeeds.roomNumber || ''),
          escapeCsv(careNeeds.careLevel || ''),
          escapeCsv(r.status || ''),
          escapeCsv(formatDate(r.admissionDate)),
          escapeCsv(getDaysSinceAdmission(r.admissionDate)),
          escapeCsv(primaryCaregiver),
          escapeCsv(r.medicalConditions || ''),
          escapeCsv(r.medications || ''),
          escapeCsv(r.allergies || ''),
          escapeCsv(r.dietaryRestrictions || ''),
          escapeCsv(careNeeds.mobilityAids ? JSON.stringify(careNeeds.mobilityAids) : ''),
          escapeCsv(emergencyContact.name || ''),
          escapeCsv(emergencyContact.phone || ''),
          escapeCsv(emergencyContact.relationship || ''),
          escapeCsv(r._count?.assessmentResults || 0),
          escapeCsv(formatDate(recentAssessment)),
          escapeCsv(r._count?.residentIncidents || 0),
          escapeCsv(formatDate(recentIncident)),
          escapeCsv(r._count?.familyContacts || 0)
        ].join(',');
      }).join('\n');

      const csv = header + body + (body ? '\n' : '');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="residents-export-${new Date().toISOString().split('T')[0]}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ items, nextCursor }, { status: 200 });
  } catch (error) {
    console.error('Residents GET error', error);
    return handleAuthError(error);
  }
}

async function assertOperatorHomeOwnership(userId: string, homeId?: string | null) {
  if (!homeId) return true; // Allow creating unassigned residents
  const operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) return false;
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { operatorId: true } });
  return !!home && home.operatorId === operator.id;
}

export async function POST(req: NextRequest) {
  try {
    // Require permission to create residents
    const user = await requirePermission(PERMISSIONS.RESIDENTS_CREATE);
    const userId = user.id;
    const role = user.role;

    const body = await req.json().catch(() => ({}));
    const { familyId, familyEmail, familyName, homeId, firstName, lastName, dateOfBirth, gender, status } = body || {};
    if (!firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json({ error: 'firstName, lastName, dateOfBirth, gender are required' }, { status: 400 });
    }

    // For non-admin users, verify they have access to the specified home
    if (role !== 'ADMIN' && homeId) {
      const scope = await getUserScope(userId);
      const hasHomeAccess = scope.homeIds === "ALL" || scope.homeIds.includes(homeId);
      if (!hasHomeAccess) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this home' }, { status: 403 });
      }
    }

    // Resolve or create a family
    let resolvedFamilyId: string | null = null;
    if (familyId) {
      const fam = await prisma.family.findUnique({ where: { id: familyId }, select: { id: true } });
      if (!fam) return NextResponse.json({ error: 'Family not found' }, { status: 404 });
      resolvedFamilyId = fam.id;
    } else if (familyEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email: familyEmail } });
      if (existingUser && existingUser.role !== 'FAMILY') {
        return NextResponse.json({ error: 'Email belongs to a non-family user' }, { status: 400 });
      }
      const user = existingUser ?? await prisma.user.create({
        data: {
          email: familyEmail,
          firstName: (familyName || 'Family').split(' ')[0] || 'Family',
          lastName: (familyName || 'Contact').split(' ').slice(1).join(' ') || 'Contact',
          role: 'FAMILY' as any,
          status: 'ACTIVE' as any,
        }
      });
      const fam = await prisma.family.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
      resolvedFamilyId = fam.id;
    } else {
      // Create placeholder family for operator-created resident without known contacts
      const placeholderEmail = `no-family+${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
      const user = await prisma.user.create({
        data: {
          email: placeholderEmail,
          firstName: 'Unlisted',
          lastName: 'Family',
          role: 'FAMILY' as any,
          status: 'PENDING' as any,
        }
      });
      const fam = await prisma.family.create({ data: { userId: user.id } });
      resolvedFamilyId = fam.id;
    }

    // Create resident
    const created = await prisma.resident.create({
      data: {
        familyId: resolvedFamilyId,
        homeId: homeId || null,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        status: (status || 'INQUIRY') as any,
      },
      select: { id: true },
    });

    await createAuditLogFromRequest(
      req,
      'CREATE' as any,
      'Resident',
      created.id,
      'Created resident',
      { homeId: homeId || null, familyId }
    );

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    console.error('Resident create error', error);
    return handleAuthError(error);
  }
}
