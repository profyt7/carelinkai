import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FiArrowLeft, FiUsers, FiCheckCircle } from 'react-icons/fi';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Discharge Planner Management | Admin' };

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success-100 text-success-700',
  TRIALING: 'bg-primary-100 text-primary-700',
  PAST_DUE: 'bg-error-100 text-error-700',
  CANCELED: 'bg-neutral-100 text-neutral-600',
  INCOMPLETE: 'bg-amber-100 text-amber-700',
  INCOMPLETE_EXPIRED: 'bg-error-100 text-error-700',
  PAUSED: 'bg-amber-100 text-amber-700',
};

export default async function AdminDischargePlannersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') redirect('/auth/login');

  const planners = await prisma.dischargePlannerProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Discharge planners are FREE (ratified 2026-06-27) — no DP subscription/MRR.
  const activeAccounts = planners.filter((p) => p.user.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-neutral-500 hover:text-neutral-700 text-sm flex items-center gap-1">
            <FiArrowLeft size={14} /> Admin
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Discharge Planner Management</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Planners', value: planners.length, icon: FiUsers, color: 'bg-primary-100 text-primary-600' },
            { label: 'Active Accounts', value: activeAccounts, icon: FiCheckCircle, color: 'bg-success-100 text-success-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-neutral-200 p-5 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.color}`}><s.icon size={18} /></div>
              <div>
                <p className="text-xs text-neutral-500">{s.label}</p>
                <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Free-access banner — DP is not a revenue line (operator subscriptions only) */}
        <div className="mb-6 bg-success-600 rounded-xl p-5 flex items-center justify-between text-white">
          <div>
            <p className="text-success-100 text-sm">Discharge Planner access</p>
            <p className="text-2xl font-bold">Free — no subscription</p>
          </div>
          <div className="text-right text-success-100 text-sm">
            <p>Revenue is operator subscriptions only.</p>
            <p>{planners.length} planner accounts · {activeAccounts} active</p>
          </div>
        </div>

        {/* Planners table */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-neutral-900">All Discharge Planners ({planners.length})</h2>
              <p className="text-sm text-neutral-500 mt-0.5">Hospital and facility-based discharge coordinators — free access, no subscription.</p>
            </div>
          </div>
          {planners.length === 0 ? (
            <div className="p-12 text-center">
              <FiUsers size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500 font-medium">No discharge planners yet</p>
              <p className="text-neutral-400 text-sm mt-1">Discharge planners sign up free at /auth/register?role=discharge_planner — no subscription.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    {['Name', 'Email', 'Organization', 'Title', 'Status', 'Trial / Period Ends', 'Last Login', 'Joined'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {planners.map((p) => {
                    const expiryDate = p.trialEndsAt ?? p.currentPeriodEndsAt;
                    const expired = expiryDate && new Date(expiryDate) < new Date() && p.subscriptionStatus !== 'ACTIVE';
                    return (
                      <tr key={p.id} className={`hover:bg-neutral-50 transition-colors ${p.subscriptionStatus === 'PAST_DUE' ? 'bg-error-50' : ''}`}>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {p.user.firstName} {p.user.lastName}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{p.user.email}</td>
                        <td className="px-4 py-3 text-neutral-600">{p.organization ?? <span className="text-neutral-400">—</span>}</td>
                        <td className="px-4 py-3 text-neutral-600">{p.title ?? <span className="text-neutral-400">—</span>}</td>
                        <td className="px-4 py-3">
                          {p.subscriptionStatus ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.subscriptionStatus] ?? 'bg-neutral-100 text-neutral-600'}`}>
                              {p.subscriptionStatus}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-xs">No subscription</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {expiryDate ? (
                            <span className={expired ? 'text-error-600 font-medium' : 'text-neutral-500'}>
                              {new Date(expiryDate).toLocaleDateString()}
                            </span>
                          ) : <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          {p.user.lastLoginAt ? new Date(p.user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          {new Date(p.user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
