import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { FiStar } from "react-icons/fi";
import { StatTile } from "@/components/dashboard/StatTile";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";

async function getCaregiverDashboardData(userId: string) {
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId },
    select: {
      id: true,
      isVisibleInMarketplace: true,
      backgroundCheckStatus: true,
      _count: {
        select: {
          leads: { where: { status: { notIn: ['CLOSED', 'CANCELLED'] } } }
        }
      }
    }
  });

  if (!caregiver) {
    return {
      caregiverId: null as string | null,
      isVisible: false,
      backgroundCheckStatus: 'NOT_STARTED',
      activeLeads: 0,
      recentLeads: [],
      reviewStats: { avg: 0, count: 0 },
      recentReviews: [],
    };
  }

  const [recentLeads, reviewAgg, recentReviews] = await Promise.all([
    prisma.lead.findMany({
      where: { aideId: caregiver.id, targetType: 'AIDE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        family: { select: { user: { select: { firstName: true, lastName: true } } } }
      }
    }),
    prisma.caregiverReview.aggregate({
      where: { caregiverId: caregiver.id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.caregiverReview.findMany({
      where: { caregiverId: caregiver.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, rating: true, title: true, content: true, createdAt: true },
    }),
  ]);

  return {
    caregiverId: caregiver.id,
    isVisible: caregiver.isVisibleInMarketplace,
    backgroundCheckStatus: caregiver.backgroundCheckStatus,
    activeLeads: caregiver._count.leads,
    recentLeads,
    reviewStats: {
      avg: reviewAgg._avg.rating ?? 0,
      count: reviewAgg._count.rating,
    },
    recentReviews,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatTile
          title="Profile Visibility"
          value={data.isVisible ? 'Visible' : 'Hidden'}
          icon={data.isVisible ? '✅' : '👁️'}
          description={data.isVisible ? 'Active in marketplace' : 'Not shown to families'}
          href="/settings/profile"
        />
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">🔒</div>
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${backgroundCheckStatus}`}>
              {data.backgroundCheckStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <h3 className="text-sm font-medium text-neutral-600 mb-1">Background Check</h3>
          <p className="text-xs text-neutral-500">Verification status</p>
        </div>
        <StatTile
          title="Active Requests"
          value={data.activeLeads}
          icon="📋"
          description="Open family inquiries"
        />
        {/* Review rating tile */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map((s) => (
              <FiStar
                key={s}
                className={`h-5 w-5 ${s <= Math.round(data.reviewStats.avg) ? 'text-warning-400 fill-warning-400' : 'text-neutral-200'}`}
              />
            ))}
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-0.5">
            {data.reviewStats.count > 0 ? data.reviewStats.avg.toFixed(1) : '—'}
          </p>
          <h3 className="text-sm font-medium text-neutral-600 mb-0.5">My Rating</h3>
          <p className="text-xs text-neutral-400">
            {data.reviewStats.count === 0
              ? 'No reviews yet'
              : `${data.reviewStats.count} review${data.reviewStats.count !== 1 ? 's' : ''}`}
          </p>
        </div>
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

      {/* My Reviews */}
      {data.recentReviews.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">My Reviews</h2>
            <Link
              href={data.caregiverId ? `/marketplace/caregivers/${data.caregiverId}` : '/marketplace'}
              className="text-sm text-primary-600 hover:underline"
            >
              View public profile →
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
            {data.recentReviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <FiStar
                        key={s}
                        className={`h-3.5 w-3.5 ${s <= review.rating ? 'text-warning-400 fill-warning-400' : 'text-neutral-200'}`}
                      />
                    ))}
                  </div>
                  {review.title && (
                    <span className="text-sm font-medium text-neutral-800">{review.title}</span>
                  )}
                  <span className="text-xs text-neutral-400 ml-auto">
                    {formatDistance(new Date(review.createdAt), new Date(), { addSuffix: true })}
                  </span>
                </div>
                {review.content && (
                  <p className="text-sm text-neutral-600 line-clamp-2">{review.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
