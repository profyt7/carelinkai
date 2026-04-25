import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FiArrowLeft, FiDollarSign, FiUsers, FiCheckCircle, FiClock } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Affiliate Management | Admin' };

const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default async function AdminAffiliatesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') redirect('/auth/login');

  const affiliates = await prisma.affiliate.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } },
      referrals: {
        select: {
          id: true,
          referredEmail: true,
          status: true,
          conversionDate: true,
          commissionAmount: true,
          commissionPaid: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalUnpaid = affiliates.reduce((s, a) =>
    s + a.referrals.reduce((r, ref) => r + (!ref.commissionPaid && ref.commissionAmount ? Number(ref.commissionAmount) : 0), 0), 0);
  const totalEarned = affiliates.reduce((s, a) =>
    s + a.referrals.reduce((r, ref) => r + (ref.commissionAmount ? Number(ref.commissionAmount) : 0), 0), 0);
  const totalConversions = affiliates.reduce((s, a) =>
    s + a.referrals.filter((r) => r.status === 'CONVERTED').length, 0);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-neutral-500 hover:text-neutral-700 text-sm flex items-center gap-1">
            <FiArrowLeft size={14} /> Admin
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Affiliate Management</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Affiliates', value: affiliates.length.toString(), icon: FiUsers, color: 'bg-primary-100 text-primary-600' },
            { label: 'Total Conversions', value: totalConversions.toString(), icon: FiCheckCircle, color: 'bg-success-100 text-success-600' },
            { label: 'Total Commissions Earned', value: fmt$(totalEarned), icon: FiDollarSign, color: 'bg-secondary-100 text-secondary-600' },
            { label: 'Commissions Unpaid', value: fmt$(totalUnpaid), icon: FiClock, color: 'bg-amber-100 text-amber-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-neutral-200 p-5 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-neutral-500">{stat.label}</p>
                <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Affiliates table */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="font-semibold text-neutral-900">All Affiliates</h2>
          </div>
          {affiliates.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              No affiliates yet. Affiliates sign up via the platform and receive a unique referral code.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    {['Name', 'Email', 'Code', 'Commission Rate', 'Referrals', 'Conversions', 'Earned', 'Unpaid', 'Joined'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {affiliates.map((a) => {
                    const earned = a.referrals.reduce((s, r) => s + (r.commissionAmount ? Number(r.commissionAmount) : 0), 0);
                    const unpaid = a.referrals.reduce((s, r) => s + (!r.commissionPaid && r.commissionAmount ? Number(r.commissionAmount) : 0), 0);
                    const conversions = a.referrals.filter((r) => r.status === 'CONVERTED').length;
                    return (
                      <tr key={a.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-neutral-900">{a.user.firstName} {a.user.lastName}</td>
                        <td className="px-4 py-3 text-neutral-600">{a.user.email}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">{a.affiliateCode}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {a.commissionRate ? `${Number(a.commissionRate)}%` : '20% (default)'}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{a.referrals.length}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-success-700 font-medium">
                            <FiCheckCircle size={12} /> {conversions}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900">{fmt$(earned)}</td>
                        <td className="px-4 py-3">
                          {unpaid > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                              <FiClock size={12} /> {fmt$(unpaid)}
                            </span>
                          ) : (
                            <span className="text-success-600 text-xs">Paid up</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">
                          {new Date(a.user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Referral detail */}
        {affiliates.some((a) => a.referrals.length > 0) && (
          <div className="mt-8 bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="font-semibold text-neutral-900">All Referrals</h2>
              <p className="text-sm text-neutral-500 mt-0.5">Every referral across all affiliates, newest first.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    {['Affiliate', 'Referred Email', 'Status', 'Commission', 'Paid?', 'Conversion Date', 'Referred On'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {affiliates.flatMap((a) =>
                    a.referrals.map((r) => (
                      <tr key={r.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-neutral-700 font-medium">{a.user.firstName} {a.user.lastName}</td>
                        <td className="px-4 py-3 text-neutral-600">{r.referredEmail}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.status === 'CONVERTED' ? 'bg-success-100 text-success-700'
                            : r.status === 'REGISTERED' ? 'bg-primary-100 text-primary-700'
                            : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-900 font-medium">
                          {r.commissionAmount ? fmt$(Number(r.commissionAmount)) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.commissionPaid ? (
                            <span className="text-success-600 text-xs font-medium">Paid</span>
                          ) : r.commissionAmount ? (
                            <span className="text-amber-600 text-xs font-medium">Pending</span>
                          ) : (
                            <span className="text-neutral-400 text-xs">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">
                          {r.conversionDate ? new Date(r.conversionDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
