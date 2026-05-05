"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FiCheckCircle, FiX, FiClock, FiAlertCircle, FiExternalLink, FiShield, FiRefreshCw,
} from "react-icons/fi";
import toast from "react-hot-toast";

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  BACKGROUND_CHECK: "Background Check",
  DRUG_TEST: "Drug Test",
  CPR_CERT: "CPR / First Aid Cert",
  VEHICLE_INSPECTION: "Vehicle Inspection",
  INSURANCE: "Liability Insurance",
  DRIVERS_LICENSE: "Driver's License",
  NEMT_LICENSE: "NEMT License / Permit",
  OTHER: "Other",
};

const STATUS_TABS = ["PENDING", "VERIFIED", "REJECTED", "EXPIRED", "ALL"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:  { label: "Pending",  color: "bg-amber-100 text-amber-800",    icon: <FiClock size={11} /> },
  VERIFIED: { label: "Verified", color: "bg-success-100 text-success-800", icon: <FiCheckCircle size={11} /> },
  REJECTED: { label: "Rejected", color: "bg-error-100 text-error-700",     icon: <FiX size={11} /> },
  EXPIRED:  { label: "Expired",  color: "bg-neutral-100 text-neutral-500", icon: <FiAlertCircle size={11} /> },
};

interface Credential {
  id: string;
  type: string;
  status: string;
  documentUrl: string | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  provider: {
    id: string;
    businessName: string;
    contactEmail: string;
    contactName: string;
    isVerified: boolean;
  };
}

export default function AdminCredentialsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>("PENDING");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchCredentials = useCallback(async (status: StatusTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/provider-credentials?status=${status}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials(activeTab);
  }, [activeTab, fetchCredentials]);

  const updateCredential = async (id: string, status: "VERIFIED" | "REJECTED", notes?: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/provider-credentials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(notes ? { notes } : {}) }),
      });
      if (!res.ok) {
        toast.error("Action failed");
        return;
      }
      toast.success(status === "VERIFIED" ? "Credential verified ✓" : "Credential rejected");
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => t - 1);
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Rejection reason (optional):");
    if (reason === null) return; // cancelled
    await updateCredential(id, "REJECTED", reason || undefined);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <FiShield className="text-primary-600" /> Credentials Queue
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Review and verify provider-submitted credentials.
          </p>
        </div>
        <button
          onClick={() => fetchCredentials(activeTab)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b border-neutral-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-sm text-neutral-500 mb-4">
          {total} credential{total !== 1 ? "s" : ""}
          {activeTab !== "ALL" ? ` with status ${activeTab.toLowerCase()}` : ""}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-12 text-center">
          <FiShield className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-medium text-neutral-700">No credentials in this queue</p>
          <p className="text-sm text-neutral-500 mt-1">
            {activeTab === "PENDING" ? "All submissions have been reviewed." : "Nothing to show here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => {
            const cfg = STATUS_CONFIG[cred.status] ?? STATUS_CONFIG.PENDING;
            const typeLabel = CREDENTIAL_TYPE_LABELS[cred.type] ?? cred.type.replace(/_/g, " ");
            const expiresDate = cred.expiresAt ? new Date(cred.expiresAt) : null;
            const isExpiringSoon =
              expiresDate &&
              expiresDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
              cred.status !== "EXPIRED";

            return (
              <div
                key={cred.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  {/* Provider name link */}
                  <Link
                    href={`/admin/providers/${cred.provider.id}`}
                    className="text-xs font-semibold text-primary-700 hover:underline"
                  >
                    {cred.provider.businessName}
                  </Link>
                  <p className="text-xs text-neutral-400">{cred.provider.contactEmail}</p>

                  {/* Credential type + status badge */}
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <span className="font-semibold text-neutral-900 text-sm">{typeLabel}</span>
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                    {isExpiringSoon && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        Expiring soon
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {cred.notes && (
                    <p className="text-xs text-neutral-500 mt-1 italic">{cred.notes}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-neutral-400">
                    <span>
                      Submitted{" "}
                      {new Date(cred.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {expiresDate && (
                      <span>
                        Expires{" "}
                        {expiresDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {cred.verifiedAt && (
                      <span>
                        Verified{" "}
                        {new Date(cred.verifiedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {cred.documentUrl && (
                    <a
                      href={cred.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-neutral-400 hover:text-primary-600 transition-colors"
                      title="View document"
                    >
                      <FiExternalLink size={15} />
                    </a>
                  )}
                  {cred.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => updateCredential(cred.id, "VERIFIED")}
                        disabled={acting === cred.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 transition-colors"
                      >
                        <FiCheckCircle size={13} /> Verify
                      </button>
                      <button
                        onClick={() => handleReject(cred.id)}
                        disabled={acting === cred.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-error-100 text-error-700 rounded-lg hover:bg-error-200 disabled:opacity-50 transition-colors"
                      >
                        <FiX size={13} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
