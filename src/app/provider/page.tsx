import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FiInbox, FiMessageCircle, FiEdit, FiCheckCircle, FiAlertCircle, FiCreditCard, FiMapPin } from "react-icons/fi";

async function getProviderDashboardData(userId: string) {
  const provider = await prisma.provider.findUnique({
    where: { userId },
    select: {
      id: true,
      isVerified: true,
      isActive: true,
      businessName: true,
      listingStatus: true,
    },
  });

  if (!provider) {
    return { provider: null, newLeads: 0, activeLeads: 0, recentLeads: [] };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [newLeads, activeLeads, recentLeads] = await Promise.all([
    prisma.lead.count({
      where: { providerId: provider.id, targetType: "PROVIDER", createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.lead.count({
      where: { providerId: provider.id, targetType: "PROVIDER", status: { notIn: ["CLOSED", "CANCELLED"] } },
    }),
    prisma.lead.findMany({
      where: { providerId: provider.id, targetType: "PROVIDER" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        family: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  return { provider, newLeads, activeLeads, recentLeads };
}

export default async function ProviderDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "PROVIDER") redirect("/unauthorized");

  const { provider, newLeads, activeLeads, recentLeads } = await getProviderDashboardData(session.user.id);
  const displayName = session.user.firstName || session.user.name?.split(" ")[0] || "there";

  const listingActive = provider?.listingStatus === "ACTIVE" || provider?.listingStatus === "TRIALING";
  const listingPastDue = provider?.listingStatus === "PAST_DUE";
  const listingNone = !provider?.listingStatus || provider?.listingStatus === "CANCELED";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-1">Welcome back, {displayName}</h1>
        {provider?.businessName && (
          <p className="text-neutral-500 flex items-center gap-1 text-sm">
            <FiMapPin size={13} className="shrink-0" />
            {provider.businessName}
          </p>
        )}
      </div>

      {/* Listing status banners */}
      {listingNone && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg flex items-start gap-3">
          <FiCreditCard className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-primary-900">Activate your marketplace listing</p>
            <p className="text-sm text-primary-700 mt-0.5">Subscribe at $99/mo to appear in searches by families and care homes.</p>
            <Link href="/settings/provider/billing" className="mt-2 inline-block text-sm font-semibold text-primary-700 underline underline-offset-2">
              Manage listing →
            </Link>
          </div>
        </div>
      )}

      {listingPastDue && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
          <FiAlertCircle className="h-5 w-5 text-error-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-error-900">Listing payment past due</p>
            <p className="text-sm text-error-700 mt-0.5">Your marketplace listing is paused. Update your payment method to restore visibility.</p>
            <Link href="/settings/provider/billing" className="mt-2 inline-block text-sm font-semibold text-error-700 underline underline-offset-2">
              Update payment →
            </Link>
          </div>
        </div>
      )}

      {!provider?.isVerified && (
        <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg flex items-start gap-3">
          <FiAlertCircle className="h-5 w-5 text-warning-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-warning-900">Profile verification pending</p>
            <p className="text-sm text-warning-700 mt-0.5">Complete your profile to get verified and build trust with clients.</p>
            <Link href="/settings/provider" className="mt-2 inline-block text-sm font-semibold text-warning-700 underline underline-offset-2">
              Complete profile →
            </Link>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="rounded-lg bg-primary-100 p-2.5">
              <FiInbox className="h-5 w-5 text-primary-600" />
            </div>
            <span className="text-3xl font-bold text-neutral-900">{newLeads}</span>
          </div>
          <p className="text-sm font-medium text-neutral-700">New Inquiries</p>
          <p className="text-xs text-neutral-500 mt-0.5">Last 7 days</p>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="rounded-lg bg-secondary-100 p-2.5">
              <FiMessageCircle className="h-5 w-5 text-secondary-600" />
            </div>
            <span className="text-3xl font-bold text-neutral-900">{activeLeads}</span>
          </div>
          <p className="text-sm font-medium text-neutral-700">Active Inquiries</p>
          <p className="text-xs text-neutral-500 mt-0.5">Open conversations</p>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`rounded-lg p-2.5 ${listingActive ? "bg-success-100" : "bg-neutral-100"}`}>
              <FiCheckCircle className={`h-5 w-5 ${listingActive ? "text-success-600" : "text-neutral-400"}`} />
            </div>
            <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
              listingActive ? "bg-success-100 text-success-800" :
              listingPastDue ? "bg-error-100 text-error-800" :
              "bg-neutral-100 text-neutral-600"
            }`}>
              {listingActive ? "Active" : listingPastDue ? "Past Due" : "Inactive"}
            </span>
          </div>
          <p className="text-sm font-medium text-neutral-700">Marketplace Listing</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {listingActive ? "Visible in search results" : "Not visible to clients"}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/messages", icon: <FiMessageCircle className="h-5 w-5 text-primary-600" />, bg: "bg-primary-100", title: "Messages", desc: "Check your conversations" },
            { href: "/settings/provider", icon: <FiEdit className="h-5 w-5 text-secondary-600" />, bg: "bg-secondary-100", title: "Edit Profile", desc: "Update services and info" },
            { href: "/settings/provider/billing", icon: <FiCreditCard className="h-5 w-5 text-success-600" />, bg: "bg-success-100", title: "Listing & Billing", desc: listingActive ? "Manage subscription" : "Activate listing" },
            { href: "/marketplace?tab=providers", icon: <FiMapPin className="h-5 w-5 text-warning-600" />, bg: "bg-warning-100", title: "View Marketplace", desc: "See your public profile" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="group bg-white rounded-lg border border-neutral-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all flex items-center gap-3">
              <div className={`rounded-lg p-2 shrink-0 ${a.bg}`}>{a.icon}</div>
              <div>
                <p className="text-sm font-medium text-neutral-900 group-hover:text-primary-700">{a.title}</p>
                <p className="text-xs text-neutral-500">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Inquiries */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Recent Inquiries</h2>

        {recentLeads.length === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
            <FiInbox className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
            <p className="font-medium text-neutral-700">No inquiries yet</p>
            <p className="text-sm text-neutral-500 mt-1">
              {listingActive
                ? "Families will contact you here once they find your listing."
                : "Activate your marketplace listing to start receiving inquiries."}
            </p>
            {!listingActive && (
              <Link href="/settings/provider/billing" className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors">
                Activate Listing →
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-100">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="p-4 hover:bg-neutral-50 transition-colors flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {lead.family.user.firstName} {lead.family.user.lastName}
                  </p>
                  {lead.message && (
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{lead.message}</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  lead.status === "NEW" ? "bg-primary-100 text-primary-700" :
                  lead.status === "CONTACTED" ? "bg-warning-100 text-warning-700" :
                  "bg-neutral-100 text-neutral-600"
                }`}>
                  {lead.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
