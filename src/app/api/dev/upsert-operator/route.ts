export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { BAA_CURRENT_VERSION, DPA_CURRENT_VERSION } from '@/lib/legal';

// DEV-ONLY endpoint to create an operator, associated Operator record, and a Home.
// Assumptions:
// - Enabled only when ALLOW_DEV_ENDPOINTS=1
// - Creates/updates user with OPERATOR role and ACTIVE status
// - Ensures at least one AssistedLivingHome for the operator and returns its ID
//
// Directory fields (sprint W3 items 3/4 e2e): a seed may carry an address city,
// care levels, availability freshness, pricing, an ODH license and inspection
// records so the public SEO pages can be exercised against a real DB. Applied
// on create AND on an existing home (so re-runs converge on the seed).

type HomeSeed = {
  name: string;
  capacity?: number;
  isDemo?: boolean;
  city?: string;
  state?: string;
  zipCode?: string;
  careLevel?: Array<'INDEPENDENT' | 'ASSISTED' | 'MEMORY_CARE' | 'SKILLED_NURSING'>;
  /** Days ago the availability was verified (0 = today). Omit → never verified. */
  availabilityVerifiedDaysAgo?: number;
  availabilityCount?: number;
  startingPriceMonthly?: number;
  googleRating?: number;
  googleRatingCount?: number;
  odhLicenseNumber?: string;
  /** Sprint W5-2: seed a Medicaid waiver status so the directory filter can be exercised. */
  medicaidWaiverStatus?: 'ACCEPTING_NEW' | 'CURRENT_RESIDENTS_ONLY' | 'NOT_ACCEPTING_REFERRALS' | 'NOT_ON_LIST' | 'UNKNOWN';
  inspections?: Array<{ surveyDate: string; surveyType?: string; citationCount?: number }>;
  /** OL-176: listing copy as a directory import / enrichment script writes it (no EntityEvent rows). */
  description?: string;
  tagline?: string;
  amenities?: string[];
  /** OL-176: hand the home to the directory placeholder operator, as an unclaimed import is. */
  unclaimed?: boolean;
};

// The account that owns every unclaimed directory home (scripts/seed-cleveland-directory.ts).
const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

async function directoryPlaceholderOperatorId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DIRECTORY_UNCLAIMED_EMAIL },
    update: {},
    create: {
      email: DIRECTORY_UNCLAIMED_EMAIL,
      passwordHash: await bcrypt.hash(`unusable-${Date.now()}-${Math.random()}`, 10),
      firstName: 'CareLinkAI',
      lastName: 'Directory (Unclaimed)',
      role: 'OPERATOR' as any,
      status: 'ACTIVE' as any,
    },
  });
  const op = await prisma.operator.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, companyName: 'CareLinkAI Directory - Unclaimed Listings' },
  });
  return op.id;
}

async function applyDirectorySeed(homeId: string, h: HomeSeed) {
  const data: Record<string, unknown> = {};
  if (Array.isArray(h.careLevel) && h.careLevel.length) data['careLevel'] = h.careLevel;
  if (typeof h.description === 'string') data['description'] = h.description;
  if (typeof h.tagline === 'string') data['tagline'] = h.tagline;
  if (Array.isArray(h.amenities)) data['amenities'] = h.amenities;
  if (h.unclaimed === true) data['operatorId'] = await directoryPlaceholderOperatorId();
  if (typeof h.availabilityVerifiedDaysAgo === 'number') {
    data['availabilityVerifiedAt'] = new Date(Date.now() - h.availabilityVerifiedDaysAgo * 86_400_000);
    data['availabilityCount'] = typeof h.availabilityCount === 'number' ? h.availabilityCount : 1;
    data['availabilitySource'] = 'OPERATOR';
  }
  if (typeof h.startingPriceMonthly === 'number') {
    data['startingPriceMonthly'] = h.startingPriceMonthly;
    data['priceSource'] = 'OPERATOR';
    data['priceUpdatedAt'] = new Date();
  }
  if (typeof h.googleRating === 'number') data['googleRating'] = h.googleRating;
  if (typeof h.googleRatingCount === 'number') data['googleRatingCount'] = h.googleRatingCount;
  if (typeof h.odhLicenseNumber === 'string') data['odhLicenseNumber'] = h.odhLicenseNumber;
  if (typeof h.medicaidWaiverStatus === 'string') {
    data['medicaidWaiverStatus'] = h.medicaidWaiverStatus;
    data['medicaidWaiverSource'] = 'IMPORT';
    data['medicaidWaiverVerifiedAt'] = new Date();
  }
  if (Object.keys(data).length) {
    await prisma.assistedLivingHome.update({ where: { id: homeId }, data: data as any });
  }
  if (h.city) {
    const addr = { street: '1 Dev St', city: h.city, state: h.state ?? 'OH', zipCode: h.zipCode ?? '44101' };
    await prisma.address.upsert({
      where: { homeId },
      update: addr,
      create: { ...addr, homeId },
    });
  }
  if (Array.isArray(h.inspections)) {
    for (const r of h.inspections) {
      const surveyDate = new Date(r.surveyDate);
      if (Number.isNaN(surveyDate.getTime())) continue;
      const surveyType = r.surveyType ?? 'Standard';
      await prisma.facilityInspection.upsert({
        where: { facilityId_surveyDate_surveyType: { facilityId: homeId, surveyDate, surveyType } },
        update: { citationCount: r.citationCount ?? 0, odhLicenseNumber: h.odhLicenseNumber ?? null },
        create: {
          facilityId: homeId,
          surveyDate,
          surveyType,
          citationCount: r.citationCount ?? 0,
          odhLicenseNumber: h.odhLicenseNumber ?? null,
          citations: [],
        },
      });
    }
  }
}

/**
 * DELETE /api/dev/upsert-operator  { email, homeIds? }
 * Removes every home this dev operator owns (inspections, photos, address
 * first) plus any `homeIds` it seeded as unclaimed (those now belong to the
 * directory placeholder, which is never deleted), so an e2e spec can clean up what it seeded and never crowd the
 * public directory for the specs that run after it (the /search page shows
 * 10 per page). Dev-only, same ALLOW_DEV_ENDPOINTS gate. Best effort: a
 * cleanup failure must never fail the caller.
 */
export async function DELETE(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email : '';
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const op = user ? await prisma.operator.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
    const extra: string[] = Array.isArray(body?.homeIds) ? body.homeIds.filter((x: unknown) => typeof x === 'string') : [];
    if (!op && !extra.length) return NextResponse.json({ ok: true, deleted: 0 });
    const homes = op ? await prisma.assistedLivingHome.findMany({ where: { operatorId: op.id }, select: { id: true } }) : [];
    // Only unclaimed (placeholder-owned) homes may be named explicitly — never someone else's.
    const moved = extra.length
      ? await prisma.assistedLivingHome.findMany({
          where: { id: { in: extra }, operator: { user: { email: DIRECTORY_UNCLAIMED_EMAIL } } },
          select: { id: true },
        })
      : [];
    const ids = [...new Set([...homes.map((h) => h.id), ...moved.map((h) => h.id)])];
    if (ids.length) {
      await prisma.inboundLead.deleteMany({ where: { homeId: { in: ids } } }); // OL-177 web-inquiry queue rows
      await prisma.facilityInspection.deleteMany({ where: { facilityId: { in: ids } } });
      await prisma.homePhoto.deleteMany({ where: { homeId: { in: ids } } });
      await prisma.address.deleteMany({ where: { homeId: { in: ids } } });
      await prisma.assistedLivingHome.deleteMany({ where: { id: { in: ids } } });
    }
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e) {
    console.error('dev upsert-operator DELETE error', e);
    return NextResponse.json({ ok: false, error: 'cleanup failed' }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  // Allow when explicitly enabled via ALLOW_DEV_ENDPOINTS, regardless of NODE_ENV
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, companyName, homes, onboarded } = body || {} as {
      email?: string;
      password?: string;
      companyName?: string;
      // isDemo lets e2e specs seed a tutorial/demo fixture to prove the
      // public directory filters it (OL-112).
      homes?: HomeSeed[];
      /** Sprint W5-5: mark onboarding complete + BAA/DPA accepted so portal pages render (no wizard / gate). */
      onboarded?: boolean;
    };
    const onboardedData = onboarded === true
      ? { onboardingCompletedAt: new Date(), baaTemplateVersion: BAA_CURRENT_VERSION, baaAcceptedAt: new Date(), dpaTemplateVersion: DPA_CURRENT_VERSION, dpaAcceptedAt: new Date() }
      : {};
    if (!email || !companyName) {
      return NextResponse.json({ error: 'email and companyName required' }, { status: 400 });
    }

    const effectivePassword = password ?? 'password';
    const pwHash = await bcrypt.hash(effectivePassword, 10);
    // Upsert user as OPERATOR
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: pwHash, role: 'OPERATOR' as any, status: 'ACTIVE' as any },
      create: {
        email,
        passwordHash: pwHash,
        firstName: 'Op',
        lastName: 'E2E',
        role: 'OPERATOR' as any,
        status: 'ACTIVE' as any,
      },
    });

    // Ensure Operator
    const op = await prisma.operator.upsert({
      where: { userId: user.id },
      update: { companyName, ...onboardedData },
      create: { userId: user.id, companyName, ...onboardedData },
    });

    // Ensure homes for operator. If homes array provided, ensure each; else ensure a default one.
    const desiredHomes: HomeSeed[] = Array.isArray(homes) && homes.length > 0
      ? homes
      : [{ name: `${companyName} Home`, capacity: 100 }];

    const ensured: Array<{ id: string; name: string }> = [];
    for (const h of desiredHomes) {
      const existing = await prisma.assistedLivingHome.findFirst({
        where: { operatorId: op.id, name: h.name },
        select: { id: true, name: true, isDemo: true },
      });
      if (existing) {
        if (typeof h.isDemo === 'boolean' && existing.isDemo !== h.isDemo) {
          await prisma.assistedLivingHome.update({ where: { id: existing.id }, data: { isDemo: h.isDemo } });
        }
        await applyDirectorySeed(existing.id, h);
        ensured.push({ id: existing.id, name: existing.name });
        continue;
      }
      const created = await prisma.assistedLivingHome.create({
        data: {
          operatorId: op.id,
          name: h.name,
          description: 'Dev home for E2E',
          status: 'ACTIVE' as any,
          careLevel: ['ASSISTED'],
          capacity: typeof h.capacity === 'number' ? h.capacity : 100,
          amenities: ['wifi'],
          isDemo: h.isDemo === true,
        },
        select: { id: true, name: true },
      });
      await applyDirectorySeed(created.id, h);
      ensured.push(created);
    }

    if (ensured.length === 0) {
      return NextResponse.json({ error: 'Failed to ensure homes' }, { status: 500 });
    }

    // Back-compat: include homeId of the first ensured home for older tests
    return NextResponse.json({ homes: ensured, homeId: ensured[0]?.id });
  } catch (e) {
    console.error('dev upsert-operator error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
