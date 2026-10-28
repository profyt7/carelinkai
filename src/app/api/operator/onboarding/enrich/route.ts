export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, EnrichmentStatus } from '@prisma/client';
import { enrichHomeFromWebsite } from '@/lib/profile-generator/enrich-home';
import { captureError } from '@/lib/sentry';

// A RUNNING job older than this is considered stale (process restart) and may
// be retried.
const STALE_RUNNING_MS = 5 * 60 * 1000;

/**
 * POST /api/operator/onboarding/enrich
 *
 * Triggered when an operator opens their seeded home in onboarding. Kicks off
 * website enrichment (scrape + AI text + photos) as a background task and
 * returns immediately. The wizard polls the status route until READY/FAILED.
 *
 * Idempotent: a NONE home with a website starts a job; READY/in-progress homes
 * are reported as-is; FAILED or stale-RUNNING homes can be retried.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator?.seededHomeId) {
    return NextResponse.json({ status: 'NONE', reason: 'no seeded home' });
  }

  const homeId = operator.seededHomeId;
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId } });
  if (!home) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  // Nothing to enrich from.
  if (!home.websiteUrl) {
    return NextResponse.json({ status: 'NONE', reason: 'no website on file' });
  }

  // Already enriched (or previously bulk-populated) — nothing to do.
  if (home.enrichmentStatus === EnrichmentStatus.READY || home.autoPopulatedAt) {
    return NextResponse.json({ status: 'READY' });
  }

  // In progress and fresh — let it continue.
  if (
    home.enrichmentStatus === EnrichmentStatus.RUNNING &&
    home.enrichmentStartedAt &&
    Date.now() - home.enrichmentStartedAt.getTime() < STALE_RUNNING_MS
  ) {
    return NextResponse.json({ status: 'RUNNING' });
  }

  // Start (NONE, FAILED, or stale RUNNING).
  await prisma.assistedLivingHome.update({
    where: { id: homeId },
    data: {
      enrichmentStatus: EnrichmentStatus.RUNNING,
      enrichmentStartedAt: new Date(),
      enrichmentError: null,
    },
  });

  // Fire-and-forget: our Render Node server keeps running the task after the
  // response is sent. The wizard polls /status for completion.
  void enrichHomeFromWebsite(homeId, { withPhotos: true })
    .then(async (result) => {
      await prisma.assistedLivingHome.update({
        where: { id: homeId },
        data: { enrichmentStatus: EnrichmentStatus.READY },
      });
      console.log(
        `[enrich] ${homeId} READY — ${result.fieldsExtracted} fields (${result.confidence}), ${result.photosUploaded} photos`,
      );
    })
    .catch(async (e) => {
      const message = e instanceof Error ? e.message : String(e);
      captureError(e instanceof Error ? e : new Error(message), {
        tags: { route: 'operator:onboarding:enrich', homeId },
      });
      await prisma.assistedLivingHome
        .update({
          where: { id: homeId },
          data: { enrichmentStatus: EnrichmentStatus.FAILED, enrichmentError: message.slice(0, 500) },
        })
        .catch(() => {});
      console.error(`[enrich] ${homeId} FAILED:`, message);
    });

  return NextResponse.json({ status: 'RUNNING' });
}
