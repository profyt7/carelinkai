import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FiArrowLeft, FiHome, FiUsers, FiDollarSign, FiAlertCircle } from 'react-icons/fi';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Operator Management | Admin' };

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
};

const PLAN_PRICE: Record<string, string> = {
  STARTER: '$99/mo',
  PROFESSIONAL: '$249/mo',
  GROWTH: '$499/mo',
  ENTERPRISE: 'Custom',
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success-100 text-success-700',
  TRIALING: 'bg-primary-100 text-primary-700',
  PAST_DUE: 'bg-error-100 text-error-700',
  CANCELED: 'bg-neutral-100 text-neutral-600',
  INCOMPLETE: 'bg-amber-100 text-amber-700',
  INCOMPLETE_EXPIRED: 'bg-error-100 text-error-700',
  PAUSED: 'bg-amber-100 text-amber-700',
};

export default async function AdminOperatorsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') redirect('/auth/login');

  const operators = await prisma.operator.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, status: true, lastLoginAt: true, createdAt: true } },
      homes: { select: { id: true, name: true, status: true, currentOccupancy: true, capacity: true } },
      _count: { select: { caregivers: true, invoices: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalMRR = operators.reduce((s, op) => {
    if (op.subscriptionStatus !== 'ACTIVE' && op.subscriptionStatus !== 'TRIALING') return s;
    const price = op.subscriptionPlan === 'STARTER' ? 99
      : op.subscriptionPlan === 'PROFESSIONAL' ? 249
      : op.subscriptionPlan === 'GROWTH' ? 499 : 0;
    return s + price;
  }, 0);

  const activeCount = operators.filter((o) => o.subscriptionStatus === 'ACTIVE').length;
  const trialingCount = operators.filter((o) => o.subscriptionStatus === 'TRIALING').length;
  const pastDueCount = operators.filter((o) => o.subscriptionStatus === 'PAST_DUE').length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-neutral-500 hover:text-neutral-700 text-sm flex items-center gap-1">
            <FiArrowLeft size={14} /> Admin
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Operator Management</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Operators', value: operators.length, icon: FiUsers, color: 'bg-primary-100 text-primary-600' },
            { label: 'Active Subscriptions', value: activeCount, icon: FiHome, color: 'bg-success-100 text-success-600' },
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
            <p className="text-primary-200 text-sm">Estimated Monthly Recurring Revenue</p>
            <p className="text-3xl font-bold">${totalMRR.toLocaleString()}<span className="text-primary-300 text-lg font-normal">/mo</span></p>
          </div>
          <div className="text-right text-primary-200 text-sm">
            <p>{activeCount} active · {trialingCount} trialing</p>
            <p>Excludes past-due and canceled</p>
          </div>
        </div>

        {/* Operators table */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="font-semibold text-neutral-900">All Operators ({operators.length})</h2>
          </div>
          {operators.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">No operators found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    {['Company', 'Owner', 'Plan', 'Status', 'Homes', 'Caregivers', 'Trial / Period Ends', 'Last Login', 'Joined'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {operators.map((op) => {
                    const activeHomes = op.homes.filter((h) => h.status === 'ACTIVE').length;
                    const totalBeds = op.homes.reduce((s, h) => s + h.capacity, 0);
                    const occupiedBeds = op.homes.reduce((s, h) => s + h.currentOccupancy, 0);
                    const expiryDate = op.trialEndsAt ?? op.currentPeriodEndsAt;
                    const isPastDue = op.subscriptionStatus === 'PAST_DUE';
                    return (
                      <tr key={op.id} className={`hover:bg-neutral-50 transition-colors ${isPastDue ? 'bg-error-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{op.companyName}</p>
                          {op.stripeCustomerId && (
                            <p className="text-xs text-neutral-400 font-mono">{op.stripeCustomerId.slice(0, 14)}…</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-neutral-700">{op.user.firstName} {op.user.lastName}</p>
                          <p className="text-xs text-neutral-400">{op.user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {op.subscriptionPlan ? (
                            <div>
                              <span className="font-medium text-neutral-900">{PLAN_LABELS[op.subscriptionPlan]}</span>
                              <p className="text-xs text-neutral-500">{PLAN_PRICE[op.subscriptionPlan]}</p>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-xs">No plan</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {op.subscriptionStatus ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[op.subscriptionStatus] ?? 'bg-neutral-100 text-neutral-600'}`}>
                              {op.subscriptionStatus}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-neutral-700">{activeHomes} active</p>
                          <p className="text-xs text-neutral-400">{occupiedBeds}/{totalBeds} beds</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{op._count.caregivers}</td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          {expiryDate ? (
                            <span className={new Date(expiryDate) < new Date() && op.subscriptionStatus !== 'ACTIVE' ? 'text-error-600 font-medium' : ''}>
                              {new Date(expiryDate).toLocaleDateString()}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          {op.user.lastLoginAt ? new Date(op.user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          {new Date(op.user.createdAt).toLocaleDateString()}
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
