/**
 * /availability/ping?token=…[&reply=N|STOP] — one-tap landing page for the
 * weekly availability ping (sprint W4-1). Public (no login), no PHI.
 *
 * The server only READS the ping (facility, open/answered/expired). The reply
 * itself is applied by the client component via POST so a link-scanning mail
 * gateway that prefetches the GET cannot change a listing or opt someone out.
 * For a human it is still one tap: the page submits the pre-selected reply on
 * load and shows the confirmation.
 */

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import PingReplyClient from './PingReplyClient';

type SearchParams = Promise<{ token?: string; reply?: string }>;

export default async function AvailabilityPingPage({ searchParams }: { searchParams: SearchParams }) {
  const { token = '', reply } = await searchParams;
  const ping = token
    ? await prisma.availabilityPing.findUnique({
        where: { token },
        select: { outcome: true, parsedCount: true, expiresAt: true, home: { select: { name: true } } },
      })
    : null;

  let content: React.ReactNode;
  if (!ping) {
    content = (
      <div className="text-center" data-testid="ping-invalid">
        <h2 className="text-lg font-semibold text-neutral-900">This link is invalid</h2>
        <p className="mt-2 text-sm text-neutral-600">Ping links are single-use and expire. Reply to the email instead, or wait for the next one.</p>
      </div>
    );
  } else if (ping.outcome || ping.expiresAt.getTime() < Date.now()) {
    const answered = ping.outcome === 'UPDATED';
    content = (
      <div className="text-center" data-testid="ping-closed">
        <h2 className="text-lg font-semibold text-neutral-900">
          {answered ? `Already recorded: ${ping.parsedCount ?? 0} open at ${ping.home.name}` : ping.outcome === 'STOP' ? 'You are opted out' : 'This ping has closed'}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {answered
            ? 'Thanks — your listing shows Verified Availability. We will ping again next week.'
            : ping.outcome === 'STOP'
              ? 'We will not send availability pings for this listing again.'
              : 'Pings close after 10 days. Reply to the next one, or sign in to update your listing any time.'}
        </p>
      </div>
    );
  } else {
    content = <PingReplyClient token={token} facilityName={ping.home.name} initialReply={reply ?? null} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-neutral-100" data-testid="ping-page">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary-600 mb-4">CareLinkAI · Availability</p>
        {content}
        <p className="mt-8 text-center text-xs text-neutral-400">Updating your free CareLinkAI listing. Business info only — no resident data is involved.</p>
      </div>
    </div>
  );
}
