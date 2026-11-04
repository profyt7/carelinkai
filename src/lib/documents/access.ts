/**
 * P0-5 (security decision package, Nov 2026): ownership for the generic Document model (/api/documents/*).
 * Before this, every route there checked only "signed in": any role could list, read, search, OCR, classify,
 * reclassify, review or validate any resident/inquiry document (incl. extracted text) and attach uploads to any
 * resident. Access is now derived from the caller's scope (getUserScope):
 *   ADMIN / STAFF  → all documents
 *   OPERATOR       → documents they uploaded, or linked to a resident/inquiry in one of their homes
 *   CAREGIVER      → documents they uploaded, or linked to a resident in a home where they are employed
 *   FAMILY         → documents they uploaded, or linked to one of their residents or their family's inquiries
 *   anyone else    → only documents they uploaded
 */
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserScope } from '@/lib/auth-utils';

/** `null` = unrestricted (ADMIN/STAFF). Otherwise AND this into every Document query. */
export async function documentScopeWhere(userId: string): Promise<Prisma.DocumentWhereInput | null> {
  const scope: any = await getUserScope(userId);
  if (scope.homeIds === 'ALL') return null;
  const OR: Prisma.DocumentWhereInput[] = [{ uploadedById: userId }];
  if (scope.role === 'OPERATOR' && scope.homeIds.length) {
    OR.push({ resident: { homeId: { in: scope.homeIds } } }, { inquiry: { homeId: { in: scope.homeIds } } });
  } else if (scope.role === 'CAREGIVER' && scope.homeIds.length) {
    OR.push({ resident: { homeId: { in: scope.homeIds } } });
  } else if (scope.role === 'FAMILY') {
    if (scope.residentIds?.length) OR.push({ residentId: { in: scope.residentIds } });
    if (scope.familyId) OR.push({ inquiry: { familyId: scope.familyId } });
  }
  return { OR };
}

/** AND the caller's scope into a where clause. */
export async function scopedDocumentWhere(userId: string, where: Prisma.DocumentWhereInput = {}): Promise<Prisma.DocumentWhereInput> {
  const scope = await documentScopeWhere(userId);
  return scope ? { AND: [where, scope] } : where;
}

/** 404 if the document doesn't exist, 403 if it's outside the caller's scope, else null. */
export async function denyUnlessDocumentAccess(userId: string, documentId: string): Promise<NextResponse | null> {
  const scope = await documentScopeWhere(userId);
  const visible = await prisma.document.findFirst({
    where: scope ? { AND: [{ id: documentId }, scope] } : { id: documentId },
    select: { id: true },
  });
  if (visible) return null;
  const exists = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true } });
  return exists
    ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    : NextResponse.json({ error: 'Document not found' }, { status: 404 });
}

/** Upload targets: the caller must be allowed to attach to this resident / inquiry. */
export async function canAttachDocument(userId: string, target: { residentId?: string | null; inquiryId?: string | null }): Promise<boolean> {
  const scope: any = await getUserScope(userId);
  if (scope.homeIds === 'ALL') return true;
  if (target.residentId) {
    const r = await prisma.resident.findUnique({ where: { id: target.residentId }, select: { homeId: true } });
    if (!r) return false;
    const ok =
      (scope.role === 'FAMILY' && scope.residentIds?.includes(target.residentId)) ||
      ((scope.role === 'OPERATOR' || scope.role === 'CAREGIVER') && !!r.homeId && scope.homeIds.includes(r.homeId));
    if (!ok) return false;
  }
  if (target.inquiryId) {
    const i = await prisma.inquiry.findUnique({ where: { id: target.inquiryId }, select: { homeId: true, familyId: true } });
    if (!i) return false;
    const ok =
      (scope.role === 'FAMILY' && !!scope.familyId && i.familyId === scope.familyId) ||
      (scope.role === 'OPERATOR' && scope.homeIds.includes(i.homeId));
    if (!ok) return false;
  }
  return true;
}

/** ADMIN/STAFF see aggregate stats for everyone; everyone else only their own uploads. */
export async function isDocumentAdmin(userId: string): Promise<boolean> {
  const scope: any = await getUserScope(userId);
  return scope.homeIds === 'ALL';
}
