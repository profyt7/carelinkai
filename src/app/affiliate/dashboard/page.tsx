"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiLink, FiDollarSign, FiUsers, FiCopy, FiCheck } from "react-icons/fi";

interface DashboardData {
  affiliateCode: string;
  commissionRate: number | null;
  referralLink: string;
  summary: {
    totalReferrals: number;
    converted: number;
    totalEarned: number;
    totalPaid: number;
    pendingPayout: number;
  };
  referrals: Array<{
    id: string;
    referredEmail: string;
    status: string;
    conversionDate: string | null;
    commissionAmount: number | null;
    commissionPaid: boolean;
    createdAt: string;
  }>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const statusColor: Record<string, string> = {
  PENDING:   "bg-warning-100 text-warning-700",
  CONVERTED: "bg-success-100 text-success-700",
  PAID:      "bg-primary-100 text-primary-700",
};

export default function AffiliateDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/affiliate/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout title="Affiliate Dashboard" showSearch={false}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">Affiliate Dashboard</h1>
        <p className="mt-1 text-neutral-600">Track your referrals and earnings.</p>

        {loading && <p className="mt-8 text-neutral-500">Loading…</p>}
        {error && <p className="mt-8 text-error-600">{error}</p>}

        {data && (
          <div className="mt-6 space-y-6">
            {/* Referral link */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-3">
                <FiLink className="text-primary-600" />
                <h2 className="font-semibold text-neutral-900">Your Referral Link</h2>
              </div>
              <div className="flex items-center gap-3">
                <code className="flex-1 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-2 text-sm text-neutral-700 truncate">
                  {data.referralLink}
                </code>
                <button
                  onClick={copyLink}
                  className="btn btn-secondary flex items-center gap-2 shrink-0"
                >
                  {copied ? <FiCheck className="text-success-600" /> : <FiCopy />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Share this link. When someone submits an inquiry through it, you earn{" "}
                {data.commissionRate ? `${data.commissionRate}%` : "a commission"} of the placement fee on conversion.
              </p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Referrals", value: data.summary.totalReferrals, icon: <FiUsers />, color: "text-primary-600" },
                { label: "Converted",       value: data.summary.converted,      icon: <FiCheck />,   color: "text-success-600" },
                { label: "Total Earned",    value: fmt(data.summary.totalEarned),   icon: <FiDollarSign />, color: "text-emerald-600" },
                { label: "Pending Payout",  value: fmt(data.summary.pendingPayout), icon: <FiDollarSign />, color: "text-amber-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className={`text-xl mb-1 ${s.color}`}>{s.icon}</div>
                  <div className="text-xl font-bold text-neutral-900">{s.value}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Referrals table */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">Referral History</h2>
              </div>
              {data.referrals.length === 0 ? (
                <div className="px-6 py-12 text-center text-neutral-500 text-sm">
                  No referrals yet. Share your link to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-6 py-3 text-left">Referred</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Converted</th>
                        <th className="px-6 py-3 text-right">Commission</th>
                        <th className="px-6 py-3 text-right">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.referrals.map((r) => (
                        <tr key={r.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-3 text-neutral-700 max-w-[200px] truncate">
                            {r.referredEmail.startsWith("inquiry:") ? "—" : r.referredEmail}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[r.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-neutral-500">
                            {r.conversionDate
                              ? new Date(r.conversionDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-neutral-900">
                            {r.commissionAmount ? fmt(Number(r.commissionAmount)) : "—"}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {r.commissionPaid ? (
                              <span className="text-success-600 font-medium">✓ Paid</span>
                            ) : (
                              <span className="text-neutral-400">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-400 text-center">
              Commissions are paid manually within 30 days of a confirmed placement. Questions? Email hello@getcarelinkai.com
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
