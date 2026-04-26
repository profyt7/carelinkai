/**
 * Marketplace Demo Seed — CareLinkAI
 *
 * Seeds a rich, realistic marketplace story for sales demos:
 *   - 3 listings in various states
 *   - Applications across the full pipeline (APPLIED → HIRED)
 *   - 1 completed hire with a MarketplaceHire record
 *   - 1 five-star caregiver review
 *
 * Uses the main demo accounts (demo.operator@carelinkai.test,
 * demo.aide@carelinkai.test) so the data shows up when a prospect
 * logs in with demo credentials.
 */

import { PrismaClient, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting marketplace demo seed...');

  // ── Resolve demo accounts ──────────────────────────────────────────────────
  const operatorUser = await prisma.user.findUnique({
    where: { email: 'demo.operator@carelinkai.test' },
    select: { id: true },
  });
  const aideUser = await prisma.user.findUnique({
    where: { email: 'demo.aide@carelinkai.test' },
    select: { id: true },
  });

  if (!operatorUser || !aideUser) {
    throw new Error(
      'Demo accounts not found. Run seed-demo.ts first (demo.operator@carelinkai.test, demo.aide@carelinkai.test).'
    );
  }

  // Resolve caregiver profile for demo.aide
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: aideUser.id },
    select: { id: true },
  });
  if (!caregiver) {
    throw new Error('Caregiver profile not found for demo.aide@carelinkai.test');
  }

  const now = new Date();
  const future = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };
  const past = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  // ── Listing 1: HIRED — full pipeline complete ──────────────────────────────
  const listing1 = await prisma.marketplaceListing.upsert({
    where: { id: 'demo-listing-hired' },
    update: {},
    create: {
      id: 'demo-listing-hired',
      postedByUserId: operatorUser.id,
      title: 'Evening Companion Care — Assisted Living',
      description:
        'Seeking a compassionate caregiver for evening companion care at our assisted living community. Responsibilities include engaging residents in meaningful activities, assisting with evening routines, and providing emotional support. Memory care experience is a plus.',
      hourlyRateMin: 22,
      hourlyRateMax: 28,
      setting: 'assisted-living',
      careTypes: ['companion-care'],
      services: ['medication-prompting', 'transportation'],
      specialties: ['dementia-care', 'companionship'],
      city: 'Cleveland',
      state: 'OH',
      zipCode: '44114',
      startTime: past(14),
      endTime: future(60),
      status: 'OPEN',
    },
  });

  // Application: demo.aide was HIRED
  const app1 = await (prisma as any).marketplaceApplication.upsert({
    where: { listingId_caregiverId: { listingId: listing1.id, caregiverId: caregiver.id } },
    update: { status: ApplicationStatus.HIRED },
    create: {
      listingId: listing1.id,
      caregiverId: caregiver.id,
      status: ApplicationStatus.HIRED,
      note: 'I have 7 years of companion care experience and specialize in memory care. Available for all requested evening shifts — flexible and reliable.',
    },
  });

  // MarketplaceHire record (gates review permission)
  await prisma.marketplaceHire.upsert({
    where: { applicationId: app1.id },
    update: {},
    create: {
      applicationId: app1.id,
      listingId: listing1.id,
      caregiverId: caregiver.id,
    },
  });

  // 5-star review from operator
  const existingReview = await prisma.caregiverReview.findFirst({
    where: { caregiverId: caregiver.id, reviewerId: operatorUser.id },
  });
  if (!existingReview) {
    await prisma.caregiverReview.create({
      data: {
        caregiverId: caregiver.id,
        reviewerId: operatorUser.id,
        rating: 5,
        title: 'Outstanding — residents love her',
        content:
          'Sarah exceeded every expectation. Residents responded incredibly well to her warmth and patience. She handled a challenging memory care situation calmly and professionally. Would hire again without hesitation.',
        isPublic: true,
      },
    });
  }

  console.log(`Listing 1 (HIRED): "${listing1.title}"`);

  // ── Listing 2: Active pipeline — INTERVIEWING + APPLIED ───────────────────
  const listing2 = await prisma.marketplaceListing.upsert({
    where: { id: 'demo-listing-active' },
    update: {},
    create: {
      id: 'demo-listing-active',
      postedByUserId: operatorUser.id,
      title: 'Weekend Memory Care Specialist',
      description:
        'Looking for an experienced memory care specialist to join our team on weekends. You will support residents with Alzheimer\'s and dementia, implement structured daily routines, and collaborate with our full-time nursing staff.',
      hourlyRateMin: 26,
      hourlyRateMax: 32,
      setting: 'memory-care',
      careTypes: ['personal-care', 'companion-care'],
      services: ['medication-administration', 'bathing', 'dressing'],
      specialties: ['dementia-care', 'alzheimers-care'],
      city: 'Cleveland',
      state: 'OH',
      zipCode: '44114',
      startTime: future(7),
      endTime: future(90),
      status: 'OPEN',
    },
  });

  // Find another seeded caregiver for listing 2 — use any caregiver that isn't demo.aide
  const otherCaregivers = await prisma.caregiver.findMany({
    where: { id: { not: caregiver.id } },
    take: 2,
    select: { id: true },
  });

  if (otherCaregivers[0]) {
    await (prisma as any).marketplaceApplication.upsert({
      where: { listingId_caregiverId: { listingId: listing2.id, caregiverId: otherCaregivers[0].id } },
      update: {},
      create: {
        listingId: listing2.id,
        caregiverId: otherCaregivers[0].id,
        status: ApplicationStatus.INTERVIEWING,
        note: 'Three years specializing in memory care. Certified dementia practitioner. References available.',
      },
    });
  }
  if (otherCaregivers[1]) {
    await (prisma as any).marketplaceApplication.upsert({
      where: { listingId_caregiverId: { listingId: listing2.id, caregiverId: otherCaregivers[1].id } },
      update: {},
      create: {
        listingId: listing2.id,
        caregiverId: otherCaregivers[1].id,
        status: ApplicationStatus.APPLIED,
        note: 'Very interested in this role. I have weekend availability and enjoy working with memory care patients.',
      },
    });
  }

  console.log(`Listing 2 (active pipeline): "${listing2.title}"`);

  // ── Listing 3: Fresh — just posted, 1 applicant ───────────────────────────
  const listing3 = await prisma.marketplaceListing.upsert({
    where: { id: 'demo-listing-new' },
    update: {},
    create: {
      id: 'demo-listing-new',
      postedByUserId: operatorUser.id,
      title: 'Part-Time Personal Care Aide — Mornings',
      description:
        'We need a dependable personal care aide for morning shifts, Monday–Friday. Duties include personal hygiene assistance, light meal preparation, medication reminders, and transportation to appointments. Great for someone returning to caregiving or building a schedule.',
      hourlyRateMin: 18,
      hourlyRateMax: 22,
      setting: 'assisted-living',
      careTypes: ['personal-care'],
      services: ['bathing', 'dressing', 'meal-prep'],
      specialties: [],
      city: 'Cleveland',
      state: 'OH',
      zipCode: '44115',
      startTime: future(3),
      endTime: future(45),
      status: 'OPEN',
    },
  });

  if (otherCaregivers[0]) {
    await (prisma as any).marketplaceApplication.upsert({
      where: { listingId_caregiverId: { listingId: listing3.id, caregiverId: otherCaregivers[0].id } },
      update: {},
      create: {
        listingId: listing3.id,
        caregiverId: otherCaregivers[0].id,
        status: ApplicationStatus.APPLIED,
        note: 'Morning shifts work perfectly for my schedule. Excited about this opportunity.',
      },
    });
  }

  console.log(`Listing 3 (new): "${listing3.title}"`);

  console.log('\nMarketplace demo seed complete.');
  console.log('Demo story:');
  console.log('  Listing 1 → HIRED (with MarketplaceHire + 5-star review)');
  console.log('  Listing 2 → 2 applicants: INTERVIEWING + APPLIED');
  console.log('  Listing 3 → 1 applicant: APPLIED (just posted)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
