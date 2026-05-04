import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { FiUsers, FiHome, FiActivity, FiTrendingUp, FiMessageSquare, FiFileText, FiAlertCircle, FiDollarSign, FiCreditCard } from 'react-icons/fi';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getAdminStats() {
  const [
    userCount,
    homeCount,
    caregiverCount,
    inquiryCount,
    placementCount,
    activeUsers,
    activeOperators,
    proCaregiversCount,
    activeProvidersCount,
    dpIndividualSeats,
    dpDepartmentCount,
    familyPlusCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.assistedLivingHome.count(),
    prisma.user.count({ where: { role: 'CAREGIVER' } }),
    prisma.inquiry.count(),
    prisma.placementSearch.count(),
    prisma.user.count({
      where: { lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.operator.findMany({
      where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] } },
      select: { subscriptionPlan: true },
    }),
    (prisma as any).caregiver.count({ where: { proStatus: { in: ['ACTIVE', 'TRIALING'] } } }),
    (prisma as any).provider.count({ where: { listingStatus: { in: ['ACTIVE', 'TRIALING'] } } }),
    (prisma as any).dischargePlannerProfile.aggregate({
      where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] }, licenseType: 'INDIVIDUAL' },
      _sum: { seatCount: true },
    }),
    (prisma as any).dischargePlannerProfile.count({
      where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] }, licenseType: 'DEPARTMENT' },
    }),
    prisma.family.count({ where: { plusStatus: { in: ['ACTIVE', 'TRIALING'] } } }),
  ]);

  // Transport commissions: sum platformFee on COMPLETED rides this calendar month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const transportCommissions = await prisma.ride.aggregate({
    where: { status: 'COMPLETED', createdAt: { gte: monthStart } },
    _sum: { platformFee: true },
  });
  const transportCommissionMTD = Number(transportCommissions._sum?.platformFee ?? 0);

  const operatorMRR = (activeOperators as any[]).reduce((sum: number, op: any) => {
    const price = op.subscriptionPlan === 'STARTER' ? 99
      : op.subscriptionPlan === 'PROFESSIONAL' ? 249
      : op.subscriptionPlan === 'GROWTH' ? 499 : 0;
    return sum + price;
  }, 0);
  const providerMRR = (activeProvidersCount as number) * 99;
  const caregiverProMRR = (proCaregiversCount as number) * 19;
  const dpMRR = ((dpIndividualSeats as any)._sum?.seatCount ?? 0) * 99 + (dpDepartmentCount as number) * 499;
  const familyPlusMRR = (familyPlusCount as number) * 19;
  const totalMRR = operatorMRR + providerMRR + caregiverProMRR + dpMRR + familyPlusMRR;

  return {
    userCount,
    homeCount,
    caregiverCount,
    inquiryCount,
    placementCount,
    activeUsers,
    transportCommissionMTD,
    mrr: { operator: operatorMRR, provider: providerMRR, caregiver: caregiverProMRR, dp: dpMRR, familyPlus: familyPlusMRR, total: totalMRR },
    mrrCounts: {
      operators: (activeOperators as any[]).length,
      providers: activeProvidersCount as number,
      proCaregiversCount: proCaregiversCount as number,
      dpIndividualSeats: (dpIndividualSeats as any)._sum?.seatCount ?? 0,
      dpDepartment: dpDepartmentCount as number,
      familyPlus: familyPlusCount as number,
    },
  };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  const stats = await getAdminStats();

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: FiUsers,
      href: '/admin/users',
      color: 'from-primary-500 to-primary-600',
    },
    {
      title: 'Bug Reports',
      description: 'Review and manage bug reports from beta testing',
      icon: FiAlertCircle,
      href: '/admin/bug-reports',
      color: 'from-red-500 to-red-600',
    },
    {
      title: 'Listing Management',
      description: 'Review and manage home listings',
      icon: FiHome,
      href: '/admin/homes',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Affiliate Management',
      description: 'View affiliates, referrals, and commissions owed',
      icon: FiMessageSquare,
      href: '/admin/affiliates',
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'Operator Management',
      description: 'View operators, subscription plans, billing status, and MRR',
      icon: FiHome,
      href: '/admin/operators',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'Discharge Planners',
      description: 'Manage hospital discharge planner subscriptions and seat billing',
      icon: FiActivity,
      href: '/admin/discharge-planners',
      color: 'from-teal-500 to-teal-600',
    },
    {
      title: 'System Analytics',
      description: 'View platform metrics and insights',
      icon: FiTrendingUp,
      href: '/admin/analytics',
      color: 'from-success-500 to-success-600',
    },
    {
      title: 'Inquiries Management',
      description: 'View and manage all platform inquiries',
      icon: FiFileText,
      href: '/admin/inquiries',
      color: 'from-cyan-500 to-cyan-600',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Admin Dashboard</h1>
              <p className="mt-1 text-neutral-600">Welcome back, {session.user?.name || session.user?.email}</p>
            </div>
            <Link
              href="/"
              className="text-[#3978FC] hover:text-[#3167d4] font-medium transition-colors"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Users</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.userCount}</p>
                <p className="text-sm text-success-600 mt-1">{stats.activeUsers} active (30d)</p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <FiUsers className="text-primary-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Care Homes</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.homeCount}</p>
              </div>
              <div className="p-3 bg-secondary-100 rounded-lg">
                <FiHome className="text-secondary-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Caregivers</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.caregiverCount}</p>
              </div>
              <div className="p-3 bg-success-100 rounded-lg">
                <FiActivity className="text-success-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Inquiries</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.inquiryCount}</p>
              </div>
              <div className="p-3 bg-pink-100 rounded-lg">
                <FiMessageSquare className="text-pink-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Placements</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.placementCount}</p>
              </div>
              <div className="p-3 bg-warning-100 rounded-lg">
                <FiFileText className="text-warning-600 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* MRR Revenue Overview */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FiDollarSign className="text-success-600 text-xl" />
            <h2 className="text-xl font-bold text-neutral-900">Revenue Overview (Est. MRR)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="lg:col-span-1 bg-gradient-to-br from-success-500 to-success-600 rounded-lg p-5 text-white">
              <p className="text-sm font-medium text-success-100">Total MRR</p>
              <p className="text-3xl font-bold mt-1">${stats.mrr.total.toLocaleString()}</p>
              <p className="text-xs text-success-200 mt-1">Active + trialing</p>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Operators</p>
                <FiCreditCard className="text-primary-400 text-sm" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">${stats.mrr.operator.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 mt-1">{stats.mrrCounts.operators} active · $99–$499/mo</p>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Providers</p>
                <FiCreditCard className="text-secondary-400 text-sm" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">${stats.mrr.provider.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 mt-1">{stats.mrrCounts.providers} active · $99/mo</p>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Pro Caregivers</p>
                <FiCreditCard className="text-warning-400 text-sm" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">${stats.mrr.caregiver.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 mt-1">{stats.mrrCounts.proCaregiversCount} active · $19/mo</p>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Discharge Planners</p>
                <FiCreditCard className="text-teal-400 text-sm" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">${stats.mrr.dp.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {stats.mrrCounts.dpIndividualSeats} seats · {stats.mrrCounts.dpDepartment} dept
              </p>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Families Plus</p>
                <FiCreditCard className="text-pink-400 text-sm" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">${stats.mrr.familyPlus.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 mt-1">{stats.mrrCounts.familyPlus} active · $19/mo</p>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Transport Fees</p>
                <span className="text-sm">🚗</span>
              </div>
              <p className="text-2xl font-bold text-neutral-900">${stats.transportCommissionMTD.toFixed(2)}</p>
              <p className="text-xs text-neutral-500 mt-1">12% commission · MTD</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 bg-gradient-to-br ${action.color} rounded-lg group-hover:scale-110 transition-transform`}>
                    <action.icon className="text-white text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">{action.title}</h3>
                    <p className="text-neutral-600 text-sm">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
