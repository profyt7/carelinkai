/**
 * /availability/update?token=…  — no-login availability updater (email magic-link).
 *
 * Server-verifies the signed token, loads the home name + current count, and renders
 * the +/- counter. Invalid/expired links get a friendly message. No PHI, no account.
 */

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { verifyAvailabilityToken } from '@/lib/availability/availability-token';
import { isAvailabilityFresh } from '@/lib/availability/availability';
import AvailabilityCounter from '@/components/availability/AvailabilityCounter';

export default async function AvailabilityUpdatePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  const secret = process.env['NEXTAUTH_SECRET'];
  const payload = token && secret ? verifyAvailabilityToken(token, secret) : null;

  let content: React.ReactNode;
  if (!payload) {
    content = (
      <div className="text-center">
        <div className="text-4xl mb-3">⏳</div>
        <h2 className="text-lg font-semibold text-neutral-900">This link is invalid or has expired</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Availability-update links expire for security. We&apos;ll send a fresh one with the next request.
        </p>
      </div>
    );
  } else {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: payload.homeId },
      select: { name: true, availabilityCount: true, availabilityVerifiedAt: true },
    });
    if (!home) {
      content = <p className="text-center text-neutral-600">Listing not found.</p>;
    } else {
      // Seed the counter with the last count only if it's still fresh; otherwise 0.
      const seed = isAvailabilityFresh(home.availabilityVerifiedAt) ? home.availabilityCount ?? 0 : 0;
      content = <AvailabilityCounter token={token as string} facilityName={home.name} initialCount={seed} />;
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-neutral-100">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary-600 mb-4">
          CareLinkAI · Availability
        </p>
        {content}
        <p className="mt-8 text-center text-xs text-neutral-400">
          Updating your free CareLinkAI listing. Business info only — no resident data is involved.
        </p>
      </div>
    </div>
  );
}
