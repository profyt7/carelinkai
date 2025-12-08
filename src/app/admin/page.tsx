import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatTile } from "@/components/dashboard/StatTile";

async function getAdminDashboardData() {
  const [
    totalUsers,
    totalLeads,
    totalInquiries,
    activeAides,
    activeProviders,
    pendingCredentials
  ] = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.inquiry.count(),
    prisma.caregiver.count({
      where: { isVisibleInMarketplace: true }
    }),
    prisma.provider.count({
      where: { isVerified: true }
    }),
    prisma.credential.count({
      where: { 
        isVerified: false
      }
    })
  ]);

  return {
    totalUsers,
    totalLeads,
    totalInquiries,
    activeAides,
    activeProviders,
    pendingCredentials
  };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const data = await getAdminDashboardData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          System overview and platform metrics
        </p>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatTile
          title="Total Users"
          value={data.totalUsers}
          icon="👥"
          description="All registered users"
        />
        <StatTile
          title="Total Inquiries"
          value={data.totalInquiries + data.totalLeads}
          icon="📋"
          description="Home + aide/provider leads"
        />
        <StatTile
          title="Active Caregivers"
          value={data.activeAides}
          icon="🩺"
          description="Visible in marketplace"
          href="/admin/aides"
        />
        <StatTile
          title="Verified Providers"
          value={data.activeProviders}
          icon="🏥"
          description="Active service providers"
          href="/admin/providers"
        />
      </div>

      {/* Pending Actions Alert */}
      {data.pendingCredentials > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">Action Required</h3>
              <p className="text-sm text-amber-800 mb-2">
                <strong>{data.pendingCredentials}</strong> credential{data.pendingCredentials > 1 ? 's' : ''} awaiting verification
              </p>
              <div className="flex gap-3">
                <Link
                  href="/admin/aides"
                  className="text-sm font-medium text-amber-900 hover:underline"
                >
                  Review Caregiver Credentials →
                </Link>
                <Link
                  href="/admin/providers"
                  className="text-sm font-medium text-amber-900 hover:underline"
                >
                  Review Provider Credentials →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/aides"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">🩺</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Caregivers</h3>
            <p className="text-sm text-gray-600">Manage aide profiles and credentials</p>
            <div className="mt-2 text-sm text-blue-600 font-medium">
              View all →
            </div>
          </Link>

          <Link
            href="/admin/providers"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">🏥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Providers</h3>
            <p className="text-sm text-gray-600">Manage service provider verification</p>
            <div className="mt-2 text-sm text-blue-600 font-medium">
              View all →
            </div>
          </Link>

          <Link
            href="/admin/metrics"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-sm text-gray-600">Detailed metrics and charts</p>
            <div className="mt-2 text-sm text-blue-600 font-medium">
              View all →
            </div>
          </Link>

          <Link
            href="/admin/tools"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tools</h3>
            <p className="text-sm text-gray-600">Admin utilities and settings</p>
            <div className="mt-2 text-sm text-blue-600 font-medium">
              View all →
            </div>
          </Link>

          <Link
            href="/operator"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">🏠</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Operator View</h3>
            <p className="text-sm text-gray-600">Switch to operator dashboard</p>
            <div className="mt-2 text-sm text-blue-600 font-medium">
              Switch →
            </div>
          </Link>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500 mb-1">Total Homes</div>
            <div className="text-lg font-semibold text-gray-900">
              {data.totalInquiries} inquiries
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Marketplace</div>
            <div className="text-lg font-semibold text-gray-900">
              {data.activeAides + data.activeProviders} active listings
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Platform Status</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-lg font-semibold text-gray-900">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
