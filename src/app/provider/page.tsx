import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FiInbox, FiMessageCircle, FiEdit, FiCheckCircle, FiAlertCircle, FiCreditCard, FiMapPin, FiTruck, FiShield, FiCircle } from "react-icons/fi";
import { computeProviderRideStats, scoreLabel, type RideStats } from "@/lib/rideStats";

async function getProviderDashboardData(userId: string) {
  const provider = await prisma.provider.findUnique({
    where: { userId },
    select: {
      id: true,
      isVerified: true,
      isActive: true,
      businessName: true,
      listingStatus: true,
      serviceTypes: true,
      bio: true,
      rateBaseFare: true,
      ratePerMile: true,
      rateWaitPerHour: true,
      coverageArea: true,
      credentials: {
        where: { status: "VERIFIED" },
        select: { id: true },
      },
    },
  });

  if (!provider) {
    return { provider: null, newLeads: 0, activeLeads: 0, recentLeads: [], rideStats: null };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const isTransport = provider.serviceTypes.includes("transportation");

  const [newLeads, activeLeads, recentLeads, rideStats] = await Promise.all([
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
    isTransport ? computeProviderRideStats(provider.id) : Promise.resolve(null),
  ]);

  return { provider, newLeads, activeLeads, recentLeads, rideStats };
}

export default async function ProviderDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "PROVIDER") redirect("/unauthorized");

  const { provider, newLeads, activeLeads, recentLeads, rideStats } = await getProviderDashboardData(session.user.id);
  const displayName = session.user.firstName || session.user.name?.split(" ")[0] || "there";

  const listingActive = provider?.listingStatus === "ACTIVE" || provider?.listingStatus === "TRIALING";
  const listingPastDue = provider?.listingStatus === "PAST_DUE";
  const listingNone = !provider?.listingStatus || provider?.listingStatus === "CANCELED";

  // Profile completeness checklist
  const verifiedCredentials = provider?.credentials?.length ?? 0;
  const checklistItems = provider ? [
    { label: "Business name set",        done: !!provider.businessName,                   href: "/settings/provider" },
    { label: "Bio written",              done: !!provider.bio,                            href: "/settings/provider" },
    { label: "Service types selected",   done: provider.serviceTypes.length > 0,          href: "/settings/provider" },
    { label: "Coverage area set",         done: !!(provider.coverageArea && Object.keys(provider.coverageArea as object).length > 0), href: "/settings/provider" },
    { label: "Rate set",                 done: !!(provider.rateBaseFare ?? provider.ratePerMile ?? provider.rateWaitPerHour), href: "/settings/provider" },
    { label: "1+ credential uploaded",   done: verifiedCredentials >= 1,                  href: "/settings/provider/credentials" },
    { label: "3 credentials (Certified)",done: verifiedCredentials >= 3,                  href: "/settings/provider/credentials" },
    { label: "Listing activated",        done: listingActive,                             href: "/settings/provider/billing" },
  ] : [];
  const completedCount = checklistItems.filter((i) => i.done).length;
  const completionPct = provider ? Math.round((completedCount / checklistItems.length) * 100) : 0;
  const showChecklist = provider && completionPct < 100;

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

      {/* Profile completeness checklist — shown until 100% complete */}
      {showChecklist && (
        <div className="mb-6 bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-neutral-900">Get listed on the marketplace</p>
              <p className="text-sm text-neutral-500">{completedCount} of {checklistItems.length} steps complete</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              completionPct >= 75 ? "bg-success-100 text-success-800" :
              completionPct >= 50 ? "bg-warning-100 text-warning-800" :
              "bg-neutral-100 text-neutral-700"
            }`}>
              {completionPct}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-neutral-100 rounded-full h-2 mb-4 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${completionPct >= 75 ? "bg-success-500" : completionPct >= 50 ? "bg-warning-400" : "bg-primary-500"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {/* Checklist items */}
          <ul className="space-y-2">
            {checklistItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 text-sm group ${item.done ? "text-neutral-500" : "text-neutral-800 hover:text-primary-700"}`}
                >
                  {item.done ? (
                    <FiCheckCircle className="h-4 w-4 text-success-500 shrink-0" />
                  ) : (
                    <FiCircle className="h-4 w-4 text-neutral-300 shrink-0 group-hover:text-primary-400" />
                  )}
                  <span className={item.done ? "line-through" : ""}>{item.label}</span>
                  {!item.done && (
                    <span className="ml-auto text-xs text-primary-600 group-hover:underline">Fix →</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Past-due and verified banners (kept as supplemental alerts) */}
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

      {/* Stat tiles */}
      <div className={`grid grid-cols-1 gap-4 mb-8 ${rideStats ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
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

        {/* Transport reliability tile — only for transport providers */}
        {rideStats && (() => {
          const sl = rideStats.hasEnoughData ? scoreLabel(rideStats.reliabilityScore) : null;
          return (
            <div className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-primary-100 p-2.5">
                  <FiTruck className="h-5 w-5 text-primary-600" />
                </div>
                {rideStats.hasEnoughData ? (
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${sl!.color}`}>
                    {sl!.label}
                  </span>
                ) : (
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500">
                    Building
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-neutral-700">Dispatch Reliability</p>
              {rideStats.hasEnoughData ? (
                <p className="text-xs text-neutral-500 mt-0.5">
                  {rideStats.completionRate}% completion · {rideStats.onTimeRate}% on-time
                </p>
              ) : (
                <p className="text-xs text-neutral-500 mt-0.5">
                  {rideStats.completedRides} ride{rideStats.completedRides !== 1 ? "s" : ""} completed so far
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/messages", icon: <FiMessageCircle className="h-5 w-5 text-primary-600" />, bg: "bg-primary-100", title: "Messages", desc: "Check your conversations" },
            { href: "/settings/provider", icon: <FiEdit className="h-5 w-5 text-secondary-600" />, bg: "bg-secondary-100", title: "Edit Profile", desc: "Update services and info" },
            { href: "/settings/provider/credentials", icon: <FiShield className="h-5 w-5 text-violet-600" />, bg: "bg-violet-100", title: "Credentials", desc: `${verifiedCredentials}/3 verified` },
            { href: "/settings/provider/billing", icon: <FiCreditCard className="h-5 w-5 text-success-600" />, bg: "bg-success-100", title: "Listing & Billing", desc: listingActive ? "Manage subscription" : "Activate listing" },
            { href: "/marketplace?tab=providers", icon: <FiMapPin className="h-5 w-5 text-warning-600" />, bg: "bg-warning-100", title: "View Marketplace", desc: "See your public profile" },
            ...(rideStats ? [{ href: "/rides", icon: <FiTruck className="h-5 w-5 text-primary-600" />, bg: "bg-primary-100", title: "Ride Dispatch", desc: "Manage today's runs" }] : []),
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
