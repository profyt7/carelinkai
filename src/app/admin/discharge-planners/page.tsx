import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FiArrowLeft, FiUsers, FiDollarSign, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

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

const SEAT_PRICE = 99; // $99/seat/mo

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

  const activeCount = planners.filter((p) => p.subscriptionStatus === 'ACTIVE').length;
  const trialingCount = planners.filter((p) => p.subscriptionStatus === 'TRIALING').length;
  const pastDueCount = planners.filter((p) => p.subscriptionStatus === 'PAST_DUE').length;
  const mrr = activeCount * SEAT_PRICE;

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
            { label: 'Active Seats', value: activeCount, icon: FiCheckCircle, color: 'bg-success-100 text-success-600' },
            { label: 'In Trial', value: trialingCount, icon: FiDollarSign, color: 'bg-secondary-100 text-secondary-600' },
            { label: 'Past Due', value: pastDueCount, icon: FiAlertCircle, color: 'bg-error-100 text-error-600' },
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

        {/* MRR banner */}
        <div className="mb-6 bg-primary-600 rounded-xl p-5 flex items-center justify-between text-white">
          <div>
            <p className="text-primary-200 text-sm">Discharge Planner MRR</p>
            <p className="text-3xl font-bold">${mrr.toLocaleString()}<span className="text-primary-300 text-lg font-normal">/mo</span></p>
          </div>
          <div className="text-right text-primary-200 text-sm">
            <p>{activeCount} active seats × ${SEAT_PRICE}/seat</p>
            <p>{trialingCount} in trial · {pastDueCount} past due</p>
          </div>
        </div>

        {/* Planners table */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-neutral-900">All Discharge Planners ({planners.length})</h2>
              <p className="text-sm text-neutral-500 mt-0.5">Hospital and facility-based discharge coordinators on the $99/seat/mo plan.</p>
            </div>
          </div>
          {planners.length === 0 ? (
            <div className="p-12 text-center">
              <FiUsers size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500 font-medium">No discharge planners yet</p>
              <p className="text-neutral-400 text-sm mt-1">Discharge planners sign up at /discharge-planner/billing for a $99/seat/mo subscription.</p>
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
