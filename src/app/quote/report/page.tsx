/**
 * /quote/report?token=… — no-login post-tour family quote survey (OL-111).
 * Server-verifies the signed token, loads the facility name, renders the form.
 * Opt-in, no PHI.
 */

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { verifyQuoteToken } from '@/lib/pricing/quote-token';
import QuoteReportForm from '@/components/pricing/QuoteReportForm';

export default async function QuoteReportPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  const secret = process.env['NEXTAUTH_SECRET'];
  const payload = token && secret ? verifyQuoteToken(token, secret) : null;

  let content: React.ReactNode;
  if (!payload) {
    content = (
      <div className="text-center">
        <div className="text-4xl mb-3">⏳</div>
        <h2 className="text-lg font-semibold text-neutral-900">This link is invalid or has expired</h2>
        <p className="mt-2 text-sm text-neutral-600">Quote-report links expire for privacy. No action needed.</p>
      </div>
    );
  } else {
    const home = await prisma.assistedLivingHome.findUnique({ where: { id: payload.homeId }, select: { name: true } });
    content = home
      ? <QuoteReportForm token={token as string} facilityName={home.name} />
      : <p className="text-center text-neutral-600">Listing not found.</p>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-neutral-100">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary-600 mb-4">
          CareLinkAI · Help other families
        </p>
        {content}
        <p className="mt-8 text-center text-xs text-neutral-400">
          Quotes are shown only as an average across several families — never your name, and never any
          medical or personal information.
        </p>
      </div>
    </div>
  );
}
