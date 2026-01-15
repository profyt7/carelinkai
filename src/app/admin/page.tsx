import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { FiUsers, FiHome, FiActivity, FiTrendingUp, FiMessageSquare, FiFileText, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getAdminStats() {
  const [userCount, homeCount, caregiverCount, inquiryCount, placementCount, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.assistedLivingHome.count(),
    prisma.user.count({ where: { role: 'CAREGIVER' } }),
    prisma.inquiry.count(),
    prisma.placementSearch.count(),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
  ]);

  return {
    userCount,
    homeCount,
    caregiverCount,
    inquiryCount,
    placementCount,
    activeUsers,
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
      color: 'from-blue-500 to-blue-600',
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
      href: '/admin/listings',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Content Moderation',
      description: 'Review reports and moderate content',
      icon: FiMessageSquare,
      href: '/admin/moderation',
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'System Analytics',
      description: 'View platform metrics and insights',
      icon: FiTrendingUp,
      href: '/admin/analytics',
      color: 'from-green-500 to-green-600',
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
                <p className="text-sm text-green-600 mt-1">{stats.activeUsers} active (30d)</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiUsers className="text-blue-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Care Homes</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.homeCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiHome className="text-purple-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Caregivers</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.caregiverCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiActivity className="text-green-600 text-2xl" />
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
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FiFileText className="text-yellow-600 text-2xl" />
              </div>
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
