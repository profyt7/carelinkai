import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatTile } from "@/components/dashboard/StatTile";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";

async function getFamilyDashboardData(userId: string) {
  // Get family record
  const family = await prisma.family.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!family) {
    return {
      activeInquiries: 0,
      activeLeads: 0,
      recentActivity: []
    };
  }

  // Count active home inquiries
  const activeInquiries = await prisma.inquiry.count({
    where: {
      familyId: family.id,
      status: { notIn: ['PLACEMENT_ACCEPTED', 'CLOSED_LOST'] }
    }
  });

  // Count active aide/provider leads
  const activeLeads = await prisma.lead.count({
    where: {
      familyId: family.id,
      status: { notIn: ['CLOSED', 'CANCELLED'] }
    }
  });

  // Get recent activity (inquiries + leads combined)
  const recentInquiries = await prisma.inquiry.findMany({
    where: { familyId: family.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      home: { select: { name: true } }
    }
  });

  const recentLeads = await prisma.lead.findMany({
    where: { familyId: family.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      aide: { 
        select: { 
          user: { select: { firstName: true, lastName: true } } 
        } 
      },
      provider: { select: { businessName: true } }
    }
  });

  // Combine and sort by date
  const recentActivity = [
    ...recentInquiries.map(inq => ({
      id: inq.id,
      type: 'home' as const,
      target: inq.home.name,
      status: inq.status,
      createdAt: inq.createdAt,
      link: `/dashboard/inquiries/${inq.id}`
    })),
    ...recentLeads.map(lead => ({
      id: lead.id,
      type: lead.targetType.toLowerCase() as 'aide' | 'provider',
      target: lead.targetType === 'AIDE' 
        ? `${lead.aide?.user.firstName} ${lead.aide?.user.lastName}`
        : lead.provider?.businessName || 'Unknown',
      status: lead.status,
      createdAt: lead.createdAt,
      link: `/leads/${lead.id}`
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);

  return {
    activeInquiries,
    activeLeads,
    recentActivity
  };
}

export default async function FamilyDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'FAMILY') {
    redirect('/unauthorized');
  }

  const data = await getFamilyDashboardData(session.user.id);
  const displayName = session.user.firstName || session.user.name?.split(' ')[0] || 'there';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {displayName}
        </h1>
        <p className="text-gray-600">
          Find the perfect care for your loved ones
        </p>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatTile
          title="Home Inquiries"
          value={data.activeInquiries}
          icon="🏠"
          description="Active care home requests"
          href="/dashboard/inquiries"
        />
        <StatTile
          title="Aide/Provider Requests"
          value={data.activeLeads}
          icon="📋"
          description="Open caregiver inquiries"
        />
        <StatTile
          title="Total Activity"
          value={data.activeInquiries + data.activeLeads}
          icon="💼"
          description="All active requests"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Search Homes"
            description="Find care homes in your area"
            href="/search-homes"
            icon="🏠"
          />
          <QuickActionCard
            title="Find Caregivers"
            description="Browse available caregivers"
            href="/marketplace?tab=caregivers"
            icon="👥"
          />
          <QuickActionCard
            title="Find Providers"
            description="Explore service providers"
            href="/marketplace?tab=providers"
            icon="🏥"
          />
        </div>
      </div>

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <Link
              href="/dashboard/inquiries"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {data.recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {item.type === 'home' ? '🏠' : item.type === 'aide' ? '👤' : '🏥'}
                        </span>
                        <h3 className="text-sm font-medium text-gray-900">
                          {item.target}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                      item.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-700' :
                      item.status === 'TOUR_SCHEDULED' ? 'bg-purple-100 text-purple-700' :
                      item.status === 'IN_REVIEW' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.recentActivity.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No inquiries yet
          </h3>
          <p className="text-gray-600 mb-4">
            Start your search to find the perfect care solution for your loved one
          </p>
          <Link
            href="/search-homes"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search Care Homes →
          </Link>
        </div>
      )}
    </div>
  );
}
