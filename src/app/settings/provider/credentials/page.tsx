"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import toast from "react-hot-toast";
import {
  FiCheckCircle, FiClock, FiAlertCircle, FiX, FiPlus, FiExternalLink, FiShield, FiUpload, FiFile,
} from "react-icons/fi";

const CREDENTIAL_TYPES = [
  { value: "BACKGROUND_CHECK",  label: "Background Check" },
  { value: "DRUG_TEST",         label: "Drug Test" },
  { value: "CPR_CERT",         label: "CPR / First Aid Cert" },
  { value: "VEHICLE_INSPECTION",label: "Vehicle Inspection" },
  { value: "INSURANCE",         label: "Liability Insurance" },
  { value: "DRIVERS_LICENSE",   label: "Driver's License" },
  { value: "NEMT_LICENSE",      label: "NEMT License / Permit" },
  { value: "OTHER",             label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:  { label: "Pending Review", color: "bg-amber-100 text-amber-800", icon: <FiClock size={11} /> },
  VERIFIED: { label: "Verified",       color: "bg-success-100 text-success-800", icon: <FiCheckCircle size={11} /> },
  REJECTED: { label: "Rejected",       color: "bg-error-100 text-error-700", icon: <FiX size={11} /> },
  EXPIRED:  { label: "Expired",        color: "bg-neutral-100 text-neutral-500", icon: <FiAlertCircle size={11} /> },
};

interface Credential {
  id: string;
  type: string;
  documentUrl: string | null;
  status: string;
  expiresAt: string | null;
  verifiedAt: string | null;
  notes: string | null;
  aiReviewStatus: string | null;
  aiReviewNotes: string | null;
  createdAt: string;
}

const EMPTY_FORM = { type: "BACKGROUND_CHECK", documentUrl: "", expiresAt: "", notes: "" };

export default function ProviderCredentialsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orderingBgCheck, setOrderingBgCheck] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session.user.role !== "PROVIDER") router.push("/dashboard");
  }, [status, session, router]);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/provider/credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchCredentials();
  }, [status]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch("/api/provider/credentials/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" }),
      });
      if (!urlRes.ok) { toast.error("Failed to get upload URL"); return; }
      const { url, fileUrl } = await urlRes.json();

      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadRes.ok) { toast.error("File upload failed"); return; }

      setForm((f) => ({ ...f, documentUrl: fileUrl }));
      setUploadedFileName(file.name);
      toast.success("File uploaded.");
    } catch {
      toast.error("Upload error — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type) return;
    setSubmitting(true);
    try {
      const body: Record<string, string> = { type: form.type };
      if (form.documentUrl.trim()) body.documentUrl = form.documentUrl.trim();
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch("/api/provider/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("Failed to add credential"); return; }
      toast.success("Credential submitted for review.");
      setForm(EMPTY_FORM);
      setUploadedFileName(null);
      setShowForm(false);
      fetchCredentials();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/provider/credentials/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to remove credential"); return; }
      toast.success("Credential removed.");
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleOrderBackgroundCheck = async () => {
    setOrderingBgCheck(true);
    try {
      const res = await fetch("/api/provider/credentials/order-background-check", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Background check ordered! Results in ${data.turnaround}.`);
        fetchCredentials();
      } else {
        toast.error(data.error ?? "Failed to order background check.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setOrderingBgCheck(false);
    }
  };

  const verifiedCount = credentials.filter((c) => c.status === "VERIFIED").length;
  const isCertified = verifiedCount >= 3;

  return (
    <DashboardLayout title="Credentials">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <FiShield className="text-primary-600" /> Credentials & Certifications
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Upload your credentials to get the CareLinkAI Certified badge on your marketplace listing.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors shrink-0"
          >
            <FiPlus size={15} /> Add Credential
          </button>
        </div>

        {/* Certified banner */}
        {isCertified ? (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
            <FiCheckCircle className="h-5 w-5 text-success-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-success-900">CareLinkAI Certified</p>
              <p className="text-sm text-success-700 mt-0.5">
                You have {verifiedCount} verified credentials. Your marketplace listing shows the Certified badge.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg flex items-start gap-3">
            <FiShield className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-primary-900">
                {verifiedCount}/3 verified credentials needed for Certified badge
              </p>
              <p className="text-sm text-primary-700 mt-0.5">
                Verified providers rank higher in search and build trust with families and facilities.
              </p>
            </div>
          </div>
        )}

        {/* Background check order callout */}
        {!loading && !credentials.some((c) => c.type === "BACKGROUND_CHECK" && ["PENDING", "VERIFIED"].includes(c.status)) && (
          <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <FiShield className="h-5 w-5 text-neutral-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-neutral-800 text-sm">No background check on file</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Order one through CareLinkAI powered by Checkr — Basic check is free.
                  Results in 1–3 business days.
                </p>
              </div>
            </div>
            <button
              onClick={handleOrderBackgroundCheck}
              disabled={orderingBgCheck}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {orderingBgCheck ? <FiUpload size={14} className="animate-spin" /> : <FiShield size={14} />}
              {orderingBgCheck ? "Ordering…" : "Order Background Check"}
            </button>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-neutral-900">New Credential</h2>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Credential Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Document <span className="text-neutral-400 font-normal">(optional)</span>
              </label>

              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />

              {uploadedFileName ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-success-50 border border-success-200 rounded-lg text-sm">
                  <FiFile className="text-success-600 shrink-0" size={14} />
                  <span className="flex-1 truncate text-success-900">{uploadedFileName}</span>
                  <button
                    type="button"
                    onClick={() => { setUploadedFileName(null); setForm((f) => ({ ...f, documentUrl: "" })); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-success-600 hover:text-error-600 transition-colors shrink-0"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
                >
                  <FiUpload size={14} />
                  {uploading ? "Uploading…" : "Upload file (PDF, JPG, PNG, DOC)"}
                </button>
              )}

              {/* URL fallback */}
              {!uploadedFileName && (
                <div className="mt-2">
                  <p className="text-xs text-neutral-400 text-center mb-2">— or paste a link —</p>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.documentUrl}
                    onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Expiration Date <span className="text-neutral-400 font-normal">(if applicable)</span>
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="E.g. issued by Ohio BMV, policy #ABC123..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setUploadedFileName(null); }}
                className="px-5 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Credentials list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />)}
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-10 text-center">
            <FiShield className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
            <p className="font-medium text-neutral-700">No credentials yet</p>
            <p className="text-sm text-neutral-500 mt-1">Add your background check, insurance, CPR cert, and more.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiPlus size={15} /> Add First Credential
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => {
              const cfg = STATUS_CONFIG[cred.status] ?? STATUS_CONFIG.PENDING;
              const typeLabel = CREDENTIAL_TYPES.find((t) => t.value === cred.type)?.label ?? cred.type;
              const expiresDate = cred.expiresAt ? new Date(cred.expiresAt) : null;
              const isExpiringSoon = expiresDate && expiresDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

              return (
                <div key={cred.id} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900 text-sm">{typeLabel}</span>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {isExpiringSoon && cred.status !== "EXPIRED" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Expiring soon</span>
                      )}
                    </div>
                    {cred.notes && !cred.notes.startsWith("Ordered via CareLinkAI") && (
                      <p className="text-xs text-neutral-500 mt-1">{cred.notes}</p>
                    )}
                    {cred.aiReviewStatus && cred.aiReviewStatus !== "SKIPPED" && (
                      <p className="text-xs mt-1">
                        <span className={`font-medium ${
                          cred.aiReviewStatus === "APPROVED" ? "text-success-700" :
                          cred.aiReviewStatus === "FLAGGED" ? "text-error-600" : "text-amber-700"
                        }`}>
                          {cred.aiReviewStatus === "APPROVED" ? "AI Review: Looks good" :
                           cred.aiReviewStatus === "FLAGGED" ? "AI Review: Flagged — " :
                           "AI Review: Pending admin verification"}
                        </span>
                        {cred.aiReviewStatus === "FLAGGED" && cred.aiReviewNotes && (
                          <span className="text-neutral-400">{cred.aiReviewNotes}</span>
                        )}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-neutral-400">
                      <span>Submitted {new Date(cred.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {expiresDate && <span>Expires {expiresDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                      {cred.verifiedAt && <span>Verified {new Date(cred.verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                    </div>
                  </div>
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
                    {cred.status !== "VERIFIED" && (
                      <button
                        onClick={() => handleDelete(cred.id)}
                        disabled={deleting === cred.id}
                        className="p-1.5 text-neutral-400 hover:text-error-600 transition-colors disabled:opacity-50"
                        title="Remove"
                      >
                        <FiX size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
