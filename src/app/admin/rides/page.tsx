export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FiArrowLeft, FiTruck, FiCheckCircle, FiX, FiClock, FiDollarSign, FiAlertCircle } from "react-icons/fi";
import { scoreLabel } from "@/lib/rideStats";

async function getTransportStats() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    totalRides,
    completedRides,
    canceledRides,
    inProgressRides,
    recentRides,
    platformFeeAgg,
    providerSummaries,
  ] = await Promise.all([
    prisma.ride.count(),
    prisma.ride.count({ where: { status: "COMPLETED" } }),
    prisma.ride.count({ where: { status: "CANCELED" } }),
    prisma.ride.count({ where: { status: { in: ["REQUESTED", "CONFIRMED", "PAID", "IN_PROGRESS"] } } }),
    prisma.ride.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        provider: { select: { businessName: true } },
        family: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.ride.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: monthStart } },
      _sum: { platformFee: true, totalAmount: true },
    }),
    prisma.provider.findMany({
      where: { serviceTypes: { has: "transportation" } },
      select: {
        id: true,
        businessName: true,
        isVerified: true,
        _count: { select: { rides: true } },
      },
      orderBy: { businessName: "asc" },
    }),
  ]);

  const platformFeeMTD = Number(platformFeeAgg._sum?.platformFee ?? 0);
  const volumeMTD = Number(platformFeeAgg._sum?.totalAmount ?? 0);

  return { totalRides, completedRides, canceledRides, inProgressRides, recentRides, platformFeeMTD, volumeMTD, providerSummaries };
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED:   "bg-amber-100 text-amber-800",
  CONFIRMED:   "bg-primary-100 text-primary-800",
  PAID:        "bg-success-100 text-success-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED:   "bg-neutral-100 text-neutral-600",
  CANCELED:    "bg-error-100 text-error-700",
};

export default async function AdminRidesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") redirect("/auth/login");

  const stats = await getTransportStats();
  const cancellationRate = stats.totalRides > 0
    ? Math.round((stats.canceledRides / stats.totalRides) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin" className="text-neutral-400 hover:text-neutral-700 transition-colors">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <FiTruck className="text-primary-600" /> Transport Dashboard
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">All rides across the platform</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Rides", value: stats.totalRides, icon: <FiTruck />, color: "text-primary-600 bg-primary-100" },
            { label: "Completed", value: stats.completedRides, icon: <FiCheckCircle />, color: "text-success-600 bg-success-100" },
            { label: "Active Now", value: stats.inProgressRides, icon: <FiClock />, color: "text-amber-600 bg-amber-100" },
            { label: "Cancellation Rate", value: `${cancellationRate}%`, icon: <FiX />, color: "text-error-600 bg-error-100" },
          ].map((t) => (
            <div key={t.label} className="bg-white rounded-lg border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`rounded-lg p-2.5 ${t.color}`}>{t.icon}</div>
                <span className="text-2xl font-bold text-neutral-900">{t.value}</span>
              </div>
              <p className="text-sm font-medium text-neutral-700">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-neutral-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <FiDollarSign className="text-success-600" />
              <span className="text-sm font-medium text-neutral-600">Platform Fee Revenue MTD</span>
            </div>
            <p className="text-3xl font-bold text-neutral-900">${stats.platformFeeMTD.toFixed(2)}</p>
            <p className="text-xs text-neutral-500 mt-1">12% of completed ride totals this month</p>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <FiTruck className="text-primary-600" />
              <span className="text-sm font-medium text-neutral-600">Gross Ride Volume MTD</span>
            </div>
            <p className="text-3xl font-bold text-neutral-900">${stats.volumeMTD.toFixed(2)}</p>
            <p className="text-xs text-neutral-500 mt-1">Total passenger payment amount this month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Provider summary */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Transport Providers</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{stats.providerSummaries.length} active</p>
            </div>
            <div className="divide-y divide-neutral-100">
              {stats.providerSummaries.length === 0 ? (
                <p className="p-5 text-sm text-neutral-500">No transport providers yet.</p>
              ) : stats.providerSummaries.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/providers/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{p.businessName}</p>
                    <p className="text-xs text-neutral-500">{p._count.rides} ride{p._count.rides !== 1 ? "s" : ""}</p>
                  </div>
                  {p.isVerified
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700 font-medium">Verified</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Unverified</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent rides */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Recent Rides</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Last 50 rides across all providers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Passenger</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {stats.recentRides.map((ride) => {
                    const passengerName = ride.residentName
                      ?? (ride.family ? `${ride.family.user.firstName} ${ride.family.user.lastName}` : "—");
                    return (
                      <tr key={ride.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900 truncate max-w-[140px]">{passengerName}</td>
                        <td className="px-4 py-3 text-neutral-600 truncate max-w-[140px]">{ride.provider.businessName}</td>
                        <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                          {new Date(ride.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[ride.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                            {ride.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-700">
                          {ride.platformFee != null ? `$${Number(ride.platformFee).toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {stats.recentRides.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No rides yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
