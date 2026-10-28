export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FiArrowLeft, FiShield, FiCheckCircle, FiAlertCircle, FiHome, FiUser } from 'react-icons/fi';

export const metadata = { title: 'Operator Detail | Admin' };

export default async function AdminOperatorDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') redirect('/auth/login');

  const operator = await prisma.operator.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
      homes: {
        select: { id: true, name: true, status: true, currentOccupancy: true, capacity: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { caregivers: true, invoices: true } },
    },
  });

  if (!operator) notFound();

  const baaAccepted = operator.baaTemplateVersion !== null && operator.baaAcceptedAt !== null;
  const dpaAccepted = operator.dpaTemplateVersion !== null && operator.dpaAcceptedAt !== null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/operators"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back to Operators
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {operator.user.firstName} {operator.user.lastName}
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">{operator.companyName}</p>
          <p className="text-neutral-400 text-xs mt-0.5">{operator.user.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            operator.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
            operator.subscriptionStatus === 'TRIALING' ? 'bg-blue-100 text-blue-700' :
            operator.subscriptionStatus === 'PAST_DUE' ? 'bg-red-100 text-red-700' :
            'bg-neutral-100 text-neutral-600'
          }`}>
            {operator.subscriptionStatus ?? 'No plan'}
          </span>
          <span className="text-xs text-neutral-500">{operator.subscriptionPlan ?? '—'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account info */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiUser className="w-4 h-4 text-neutral-500" />
            <h2 className="font-semibold text-neutral-900">Account</h2>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Status</dt>
              <dd className="text-neutral-900">{operator.user.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Operator ID</dt>
              <dd className="font-mono text-xs text-neutral-700">{operator.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Joined</dt>
              <dd className="text-neutral-700">{new Date(operator.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Last login</dt>
              <dd className="text-neutral-700">
                {operator.user.lastLoginAt ? new Date(operator.user.lastLoginAt).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Homes</dt>
              <dd className="text-neutral-700">{operator.homes.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Caregivers</dt>
              <dd className="text-neutral-700">{operator._count.caregivers}</dd>
            </div>
          </dl>
        </div>

        {/* Legal Agreements */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiShield className="w-4 h-4 text-neutral-500" />
            <h2 className="font-semibold text-neutral-900">Legal Agreements</h2>
          </div>

          {/* BAA */}
          <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Business Associate Agreement (BAA)</span>
              {baaAccepted ? (
                <FiCheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <FiAlertCircle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            {baaAccepted ? (
              <dl className="space-y-1 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <dt>Version</dt>
                  <dd className="font-mono">{operator.baaTemplateVersion}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Accepted at</dt>
                  <dd>{operator.baaAcceptedAt ? new Date(operator.baaAcceptedAt).toLocaleString() : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Accepted from IP</dt>
                  <dd className="font-mono">{operator.baaAcceptedIp ?? '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-amber-700">Not yet accepted</p>
            )}
          </div>

          {/* DPA */}
          <div className="p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Data Processing Agreement (DPA)</span>
              {dpaAccepted ? (
                <FiCheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <FiAlertCircle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            {dpaAccepted ? (
              <dl className="space-y-1 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <dt>Version</dt>
                  <dd className="font-mono">{operator.dpaTemplateVersion}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Accepted at</dt>
                  <dd>{operator.dpaAcceptedAt ? new Date(operator.dpaAcceptedAt).toLocaleString() : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Accepted from IP</dt>
                  <dd className="font-mono">{operator.dpaAcceptedIp ?? '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-amber-700">Not yet accepted</p>
            )}
          </div>
        </div>
      </div>

      {/* Homes */}
      {operator.homes.length > 0 && (
        <div className="mt-6 bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiHome className="w-4 h-4 text-neutral-500" />
            <h2 className="font-semibold text-neutral-900">Homes ({operator.homes.length})</h2>
          </div>
          <div className="space-y-2">
            {operator.homes.map((home) => (
              <div key={home.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <div>
                  <Link href={`/admin/homes`} className="text-sm font-medium text-neutral-900 hover:text-primary-600">
                    {home.name}
                  </Link>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    home.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {home.status}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">
                  {home.currentOccupancy ?? 0}/{home.capacity ?? '?'} occupied
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
