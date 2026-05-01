"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { FiCheckCircle, FiCalendar, FiBriefcase, FiHome } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Hire = {
  id: string;
  status: string;
  createdAt: string;
  position?: string | null;
  hourlyRate?: number | null;
  caregiver?: {
    id: string;
    name?: string;
    photoUrl?: string | null;
  } | null;
  listing?: { id: string; title: string } | null;
  shift?: {
    id: string;
    startTime: string;
    endTime: string;
    home?: { id: string; name: string } | null;
  } | null;
  payment?: { id: string; status: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-success-100 text-success-800",
  COMPLETED: "bg-primary-100 text-primary-800",
  CANCELLED: "bg-error-100 text-error-800",
  PENDING: "bg-amber-100 text-amber-800",
};

export default function MyHiresPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hires, setHires] = useState<Hire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/marketplace/hires", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load hires");
        const json = await res.json();
        setHires(json.hires || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load hires");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status]);

  return (
    <DashboardLayout title="My Hires" showSearch={false}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <FiCheckCircle size={28} className="text-success-600" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">My Hires</h1>
            <p className="text-sm text-neutral-500">
              {session?.user?.role === "CAREGIVER"
                ? "Positions you have been hired for"
                : "Caregivers and providers you have hired"}
            </p>
          </div>
        </div>

        {loading && (
          <div className="py-16 text-center text-neutral-500">Loading…</div>
        )}

        {error && !loading && (
          <div className="rounded-lg bg-error-50 border border-error-200 p-4 text-error-700">
            {error}
          </div>
        )}

        {!loading && !error && hires.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <FiBriefcase size={48} className="mx-auto text-neutral-300 mb-4" />
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">No hires yet</h2>
            <p className="text-neutral-500 mb-6">
              {session?.user?.role === "CAREGIVER"
                ? "You haven't been hired for any positions yet."
                : "You haven't hired anyone through the marketplace yet."}
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Browse Marketplace
            </Link>
          </div>
        )}

        {!loading && hires.length > 0 && (
          <div className="space-y-4">
            {hires.map((hire) => (
              <div
                key={hire.id}
                className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {hire.listing && (
                      <Link
                        href={`/marketplace/listings/${hire.listing.id}`}
                        className="text-base font-semibold text-primary-700 hover:underline flex items-center gap-1"
                      >
                        <FiBriefcase size={16} />
                        {hire.listing.title}
                      </Link>
                    )}
                    {hire.shift && (
                      <div className="flex items-center gap-1 text-sm text-neutral-700">
                        <FiCalendar size={14} />
                        {format(parseISO(hire.shift.startTime), "MMM d, yyyy")} •{" "}
                        {format(parseISO(hire.shift.startTime), "h:mm a")} –{" "}
                        {format(parseISO(hire.shift.endTime), "h:mm a")}
                      </div>
                    )}
                    {hire.shift?.home && (
                      <div className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
                        <FiHome size={14} />
                        {hire.shift.home.name}
                      </div>
                    )}
                    {hire.position && (
                      <p className="text-sm text-neutral-600 mt-1">{hire.position}</p>
                    )}
                    {typeof hire.hourlyRate === "number" && (
                      <p className="text-sm font-medium text-neutral-800 mt-1">
                        ${hire.hourlyRate.toFixed(2)}/hr
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[hire.status] || "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {hire.status}
                    </span>
                    {hire.payment && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          hire.payment.status === "PAID"
                            ? "bg-success-100 text-success-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        Payment: {hire.payment.status}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-neutral-400">
                  Hired {format(parseISO(hire.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
