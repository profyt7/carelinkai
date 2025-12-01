export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';

// Public endpoint to create a family inquiry (lead) for a home.
// No authentication required. Input is validated and sanitized.

const InquiryCreateSchema = z.object({
  homeId: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().min(7).max(32).optional(),
  residentName: z.string().max(200).optional(),
  moveInTimeframe: z.string().max(100).optional(),
  careNeeded: z.array(z.string().max(100)).max(50).optional(),
  message: z.string().max(5000).optional(),
  // Optional preselected tour date/time (ISO). Typically set via UI later; accepted here if provided.
  tourDate: z.string().datetime().optional(),
  // Optional source/utm info
  source: z.string().max(100).optional(),
});

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().replace(/\s+/g, ' ').split(' ');
  const firstName = parts[0] || 'Family';
  const lastName = parts.slice(1).join(' ') || 'Contact';
  return { firstName, lastName };
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = InquiryCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      homeId,
      name,
      email,
      phone,
      residentName,
      moveInTimeframe,
      careNeeded,
      message,
      tourDate,
      source,
    } = parsed.data;

    // Ensure home exists and is active (or at least present)
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: { id: true, status: true },
    });
    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Resolve or create FAMILY user + Family record by email
    const lowerEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (existingUser && existingUser.role !== 'FAMILY') {
      return NextResponse.json(
        { error: 'Email is associated with a non-family account' },
        { status: 400 }
      );
    }

    const { firstName, lastName } = splitName(name);

    const user = existingUser ??
      (await prisma.user.create({
        data: {
          email: lowerEmail,
          firstName,
          lastName,
          role: 'FAMILY' as any,
          status: 'PENDING' as any,
          phone: phone || undefined,
        },
        select: { id: true },
      }));

    const family = await prisma.family.upsert({
      where: { userId: user.id },
      update: {
        emergencyContact: residentName ? name : undefined,
        emergencyPhone: phone || undefined,
      },
      create: {
        userId: user.id,
        emergencyContact: residentName ? name : undefined,
        emergencyPhone: phone || undefined,
      },
      select: { id: true },
    });

    // Compose safe message with context
    const details: string[] = [];
    if (residentName) details.push(`Resident: ${residentName}`);
    if (moveInTimeframe) details.push(`Move-in: ${moveInTimeframe}`);
    if (Array.isArray(careNeeded) && careNeeded.length) details.push(`Care: ${careNeeded.join(', ')}`);
    if (source) details.push(`Source: ${source}`);
    if (phone) details.push(`Phone: ${phone}`);

    const composedMessage = [message?.trim(), details.length ? details.join(' | ') : null]
      .filter(Boolean)
      .join('\n\n');

    const created = await prisma.inquiry.create({
      data: {
        familyId: family.id,
        homeId,
        status: 'NEW' as any,
        message: composedMessage || null,
        tourDate: tourDate ? new Date(tourDate) : null,
      },
      select: { id: true, status: true, createdAt: true },
    });

    // Best-effort audit log (will no-op for unauthenticated users)
    await createAuditLogFromRequest(
      req,
      'CREATE' as any,
      'Inquiry',
      created.id,
      'Created family inquiry',
      { homeId, source: source || null }
    );

    // Minimal response to avoid leaking data
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Inquiry create error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
