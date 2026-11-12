"use client";

/**
 * Discharge-planner landing for an account without 2FA (PHI step-up). Shows aggregate,
 * non-PHI availability across listed homes plus a card that sends them to set up 2FA.
 * The case list, case views, patient-criteria search and case submission stay behind
 * step-up (server-side: their APIs answer 403 TWO_FACTOR_STEP_UP_REQUIRED).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { FiLock, FiHome, FiCheckCircle, FiClock } from "react-icons/fi";
import { twoFactorStepUpUrl } from "@/lib/auth/two-factor-routes";
import { CARE_LEVEL_LABELS, type AvailabilitySummary } from "@/lib/discharge-planner/availability-summary";

/** After setup, come back to the full dashboard. */
export const SECURE_ACCOUNT_HREF = twoFactorStepUpUrl("/discharge-planner", "");

function verifiedLabel(iso: string | null): string {
  if (!iso) return "No recent verification";
  const d = new Date(iso);
  return `Last verified ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default function DischargePlannerSecureLanding() {
  const [summary, setSummary] = useState<AvailabilitySummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/discharge-planner/availability/summary", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (live) setSummary(data.summary as AvailabilitySummary);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => { live = false; };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Discharge Planning Assistant</h1>
        <p className="text-primary-100">
          Send a referral and get a shortlist, with each home&apos;s availability clearly labeled.
        </p>
      </div>

      <div data-testid="secure-account-card" className="rounded-lg border-2 border-warning-300 bg-warning-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-warning-100 rounded-full"><FiLock className="text-warning-700" size={22} /></div>
          <div>
            <p className="font-bold text-neutral-900">Secure your account to submit or view patient cases</p>
            <p className="text-sm text-neutral-700">
              Patient cases are protected health information. Set up two-factor authentication (about a minute, once) to
              search with patient criteria, send referrals and see your case list.
            </p>
          </div>
        </div>
        <Link href={SECURE_ACCOUNT_HREF} className="btn-primary whitespace-nowrap text-center">
          Set up two-factor authentication
        </Link>
      </div>

      <section aria-labelledby="availability-heading" className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 id="availability-heading" className="text-lg font-semibold text-neutral-900 mb-1">Availability across listed homes</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Openings are counted only where a home has verified them recently; others say &ldquo;contact to confirm&rdquo;.
        </p>

        {failed && <p className="text-sm text-error-700">Availability could not be loaded right now.</p>}
        {!failed && !summary && <p className="text-sm text-neutral-500">Loading availability…</p>}

        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-neutral-600 text-sm"><FiHome /> Listed homes</div>
                <p className="text-2xl font-bold text-neutral-900" data-testid="total-homes">{summary.totalHomes}</p>
              </div>
              <div className="rounded-lg bg-success-50 p-4">
                <div className="flex items-center gap-2 text-success-700 text-sm"><FiCheckCircle /> Homes with verified openings</div>
                <p className="text-2xl font-bold text-neutral-900" data-testid="homes-with-openings">{summary.homesWithOpenings}</p>
                <p className="text-xs text-neutral-600">{summary.openings} opening{summary.openings === 1 ? "" : "s"} in total</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-neutral-600 text-sm"><FiClock /> Verified recently</div>
                <p className="text-2xl font-bold text-neutral-900">{summary.verifiedHomes}</p>
                <p className="text-xs text-neutral-600">{verifiedLabel(summary.lastVerifiedAt)}</p>
              </div>
            </div>

            {summary.byCareLevel.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200">
                    <th className="py-2 font-medium">Care level</th>
                    <th className="py-2 font-medium text-right">Homes</th>
                    <th className="py-2 font-medium text-right">With verified openings</th>
                    <th className="py-2 font-medium text-right">Openings</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byCareLevel.map((l) => (
                    <tr key={l.careLevel} className="border-b border-neutral-100 last:border-0">
                      <td className="py-2 text-neutral-900">{CARE_LEVEL_LABELS[l.careLevel] ?? l.careLevel}</td>
                      <td className="py-2 text-right">{l.homes}</td>
                      <td className="py-2 text-right">{l.homesWithOpenings}</td>
                      <td className="py-2 text-right">{l.openings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </div>
  );
}
