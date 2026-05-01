import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatTile } from "@/components/dashboard/StatTile";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";

async function getCaregiverDashboardData(userId: string) {
  // Get caregiver record
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId },
    select: {
      id: true,
      isVisibleInMarketplace: true,
      backgroundCheckStatus: true,
      _count: {
        select: {
          leads: {
            where: {
              status: { notIn: ['CLOSED', 'CANCELLED'] }
            }
          }
        }
      }
    }
  });

  if (!caregiver) {
    return {
      isVisible: false,
      backgroundCheckStatus: 'NOT_STARTED',
      activeLeads: 0,
      recentLeads: []
    };
  }

  // Get recent leads
  const recentLeads = await prisma.lead.findMany({
    where: { 
      aideId: caregiver.id,
      targetType: 'AIDE'
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
    isVisible: caregiver.isVisibleInMarketplace,
    backgroundCheckStatus: caregiver.backgroundCheckStatus,
    activeLeads: caregiver._count.leads,
    recentLeads
  };
}

function getBackgroundCheckStatusColor(status: string) {
  switch (status) {
    case 'VERIFIED':
      return 'bg-success-100 text-success-700';
    case 'PENDING':
      return 'bg-warning-100 text-warning-700';
    case 'REJECTED':
      return 'bg-error-100 text-error-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
}

export default async function CaregiverDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'CAREGIVER') {
    redirect('/unauthorized');
  }

  const data = await getCaregiverDashboardData(session.user.id);
  const displayName = session.user.firstName || session.user.name?.split(' ')[0] || 'there';
  const backgroundCheckStatus = getBackgroundCheckStatusColor(data.backgroundCheckStatus);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Welcome back, {displayName}
        </h1>
        <p className="text-neutral-600">
          Manage your profile and track opportunities
        </p>
      </div>

      {/* Profile Alert */}
      {!data.isVisible && (
        <div className="mb-8 bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-warning-900 mb-1">Profile Not Visible</h3>
              <p className="text-sm text-warning-800 mb-2">
                Your profile is currently hidden from the marketplace. Make it visible to start receiving inquiries.
              </p>
              <Link
                href="/settings/profile"
                className="text-sm font-medium text-warning-900 hover:underline"
              >
                Update Profile Settings →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatTile
          title="Profile Visibility"
          value={data.isVisible ? 'Visible' : 'Hidden'}
          icon={data.isVisible ? '✅' : '👁️'}
          description={data.isVisible ? 'Active in marketplace' : 'Not shown to families'}
          href="/settings/profile"
        />
        <div className={`p-6 rounded-lg border ${
          data.backgroundCheckStatus === 'CLEAR'
            ? 'bg-success-50 border-success-200'
            : data.backgroundCheckStatus === 'PENDING'
            ? 'bg-warning-50 border-warning-200'
            : 'bg-white border-primary-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-3xl">
              {data.backgroundCheckStatus === 'CLEAR' ? '✅' : data.backgroundCheckStatus === 'PENDING' ? '⏳' : '🔒'}
            </div>
            {data.backgroundCheckStatus === 'CLEAR' && (
              <span className="text-xs font-bold bg-success-500 text-white px-2 py-0.5 rounded-full">Verified</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-neutral-700 mb-1">Background Check</h3>
          <p className="text-xs text-neutral-500 mb-3">
            {data.backgroundCheckStatus === 'CLEAR'
              ? 'Cleared — badge shows on your profile'
              : data.backgroundCheckStatus === 'PENDING'
              ? 'In progress (1–3 business days)'
              : 'Get verified to unlock more job offers'}
          </p>
          {data.backgroundCheckStatus === 'NOT_STARTED' && (
            <Link
              href="/caregiver/verification"
              className="text-xs font-semibold text-primary-700 hover:text-primary-600 underline"
            >
              Get Verified →
            </Link>
          )}
        </div>
        <StatTile
          title="Active Requests"
          value={data.activeLeads}
          icon="📋"
          description="Open family inquiries"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickActionCard
            title="My Applications"
            description="Track your job applications"
            href="/caregiver/applications"
            icon="📋"
          />
          <QuickActionCard
            title="Edit Profile"
            description="Update your bio, skills, and availability"
            href="/settings/profile"
            icon="✏️"
          />
          <QuickActionCard
            title="Upload Documents"
            description="Add certifications and credentials"
            href="/settings/credentials"
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
            <h2 className="text-xl font-semibold text-neutral-900">Recent Inquiries</h2>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="divide-y divide-neutral-200">
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">👤</span>
                        <h3 className="text-sm font-medium text-neutral-900">
                          {lead.family.user.firstName} {lead.family.user.lastName}
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {new Date(lead.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      {lead.message && (
                        <p className="text-sm text-neutral-600 mt-2 line-clamp-2">
                          {lead.message}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      lead.status === 'NEW' ? 'bg-primary-100 text-primary-700' :
                      lead.status === 'CONTACTED' ? 'bg-warning-100 text-warning-700' :
                      lead.status === 'IN_REVIEW' ? 'bg-warning-100 text-warning-700' :
                      'bg-neutral-100 text-neutral-700'
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
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No inquiries yet
          </h3>
          <p className="text-neutral-600 mb-4">
            {data.isVisible 
              ? "Complete your profile and credentials to attract more families" 
              : "Make your profile visible to start receiving inquiries"}
          </p>
          <Link
            href="/settings/profile"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Complete Profile →
          </Link>
        </div>
      )}
    </div>
  );
}
