import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatTile } from "@/components/dashboard/StatTile";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";

async function getProviderDashboardData(userId: string) {
  // Get provider record
  const provider = await prisma.provider.findUnique({
    where: { userId },
    select: {
      id: true,
      isVerified: true,
      isActive: true,
      businessName: true
    }
  });

  if (!provider) {
    return {
      isVerified: false,
      isActive: false,
      newLeads: 0,
      activeLeads: 0,
      recentLeads: []
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Count new leads (last 7 days)
  const newLeads = await prisma.lead.count({
    where: {
      providerId: provider.id,
      targetType: 'PROVIDER',
      status: 'NEW',
      createdAt: { gte: sevenDaysAgo }
    }
  });

  // Count active leads
  const activeLeads = await prisma.lead.count({
    where: {
      providerId: provider.id,
      targetType: 'PROVIDER',
      status: { notIn: ['CLOSED', 'CANCELLED'] }
    }
  });

  // Get recent leads
  const recentLeads = await prisma.lead.findMany({
    where: { 
      providerId: provider.id,
      targetType: 'PROVIDER'
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      family: { 
        select: { 
          user: { select: { firstName: true, lastName: true } } 
        } 
      }
    }
  });

  return {
    isVerified: provider.isVerified,
    isActive: provider.isActive,
    newLeads,
    activeLeads,
    recentLeads
  };
}

function getVerificationStatusDisplay(isVerified: boolean) {
  return isVerified 
    ? { label: 'VERIFIED', color: 'bg-green-100 text-green-700' }
    : { label: 'PENDING', color: 'bg-yellow-100 text-yellow-700' };
}

export default async function ProviderDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'PROVIDER') {
    redirect('/unauthorized');
  }

  const data = await getProviderDashboardData(session.user.id);
  const displayName = session.user.firstName || session.user.name?.split(' ')[0] || 'there';
  const verificationStatus = getVerificationStatusDisplay(data.isVerified);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {displayName}
        </h1>
        <p className="text-gray-600">
          Manage your services and track inquiries
        </p>
      </div>

      {/* Verification Alert */}
      {!data.isVerified && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Verification Pending</h3>
              <p className="text-sm text-yellow-800 mb-2">
                Complete your profile and upload required credentials to get verified and appear in marketplace searches.
              </p>
              <Link
                href="/settings/provider"
                className="text-sm font-medium text-yellow-900 hover:underline"
              >
                Complete Profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatTile
          title="New Inquiries (7 days)"
          value={data.newLeads}
          icon="🆕"
          description="Recent family requests"
        />
        <StatTile
          title="Active Inquiries"
          value={data.activeLeads}
          icon="📋"
          description="Open conversations"
        />
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">{data.isVerified ? '✅' : '⏳'}</div>
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${verificationStatus.color}`}>
              {verificationStatus.label}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Verification Status</h3>
          <p className="text-xs text-gray-500">
            {data.isVerified ? 'Your business is verified' : 'Awaiting admin review'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Edit Profile"
            description="Update business info and services"
            href="/settings/provider"
            icon="✏️"
          />
          <QuickActionCard
            title="Upload Documents"
            description="Add licenses and insurance"
            href="/settings/provider/credentials"
            icon="📄"
          />
          <QuickActionCard
            title="Messages"
            description="Check your conversations"
            href="/messages"
            icon="💬"
          />
        </div>
      </div>

      {/* Recent Activity */}
      {data.recentLeads.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Inquiries</h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">👤</span>
                        <h3 className="text-sm font-medium text-gray-900">
                          {lead.family.user.firstName} {lead.family.user.lastName}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {new Date(lead.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      {lead.location && (
                        <p className="text-xs text-gray-500">📍 {lead.location}</p>
                      )}
                      {lead.message && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {lead.message}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      lead.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                      lead.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-700' :
                      lead.status === 'IN_REVIEW' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.recentLeads.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No inquiries yet
          </h3>
          <p className="text-gray-600 mb-4">
            {data.isVerified 
              ? "Complete your profile to attract more families" 
              : "Get verified to start receiving inquiries from families"}
          </p>
          <Link
            href="/settings/provider"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Complete Profile →
          </Link>
        </div>
      )}
    </div>
  );
}
