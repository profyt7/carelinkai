"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiGlobe,
  FiMapPin,
  FiMail,
  FiPhone,
  FiExternalLink,
  FiChevronLeft,
} from "react-icons/fi";

type Credential = {
  id: string;
  type: string;
  documentUrl: string | null;
  status: string;
  expiresAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: string;
};

type ProviderDetail = {
  id: string;
  userId: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  bio: string | null;
  website: string | null;
  insuranceInfo: string | null;
  licenseNumber: string | null;
  yearsInBusiness: number | null;
  isVerified: boolean;
  isActive: boolean;
  serviceTypes: string[];
  coverageArea: {
    cities: string[];
    states: string[];
    zipCodes: string[];
  } | null;
  credentials: Credential[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
};

export default function AdminProviderDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const providerId = params?.id;

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    const role = session?.user?.role as UserRole | undefined;
    const ok = role === UserRole.ADMIN || role === UserRole.STAFF;
    setIsAuthorized(ok);
    if (!ok) router.push("/dashboard");
  }, [session, status, router]);

  // Load detail
  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/providers/${providerId}`, {
          cache: "no-store",
        });
        if (!res.ok)
          throw new Error((await res.text()) || `Request failed (${res.status})`);
        const json = (await res.json()) as ProviderDetail;
        if (!cancelled) setProvider(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const toggleProviderVerification = async () => {
    if (!provider) return;
    try {
      setSaving("provider-verification");
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !provider.isVerified }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update");
      const updated = await res.json();
      setProvider(updated);
    } catch (e: any) {
      alert(e?.message || "Failed to update");
    } finally {
      setSaving(null);
    }
  };

  const toggleProviderActive = async () => {
    if (!provider) return;
    try {
      setSaving("provider-active");
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update");
      const updated = await res.json();
      setProvider(updated);
    } catch (e: any) {
      alert(e?.message || "Failed to update");
    } finally {
      setSaving(null);
    }
  };

  const toggleCredentialVerification = async (credential: Credential) => {
    if (!provider) return;
    try {
      setSaving(credential.id);
      const newStatus = credential.status === "VERIFIED" ? "PENDING" : "VERIFIED";
      const res = await fetch(`/api/admin/provider-credentials/${credential.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update");
      const updated = await res.json();
      // Update provider with new credential
      setProvider({
        ...provider,
        credentials: provider.credentials.map((c) =>
          c.id === credential.id ? { ...c, ...updated.credential } : c
        ),
      });
    } catch (e: any) {
      alert(e?.message || "Failed to update");
    } finally {
      setSaving(null);
    }
  };

  if (!isAuthorized) return null;

  return (
    <DashboardLayout title="Admin • Provider Details">
      <div className="px-4 py-6">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href="/admin/providers"
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            <FiChevronLeft className="mr-1 h-4 w-4" />
            Back to Providers
          </Link>
        </div>

        {loading && <div className="text-neutral-600">Loading…</div>}
        {error && !loading && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
            {error}
          </div>
        )}
        {provider && !loading && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                    {provider.businessName}
                  </h2>
                  <div className="space-y-1 text-sm text-neutral-600">
                    <div>Contact: {provider.contactName}</div>
                    <div className="flex items-center gap-2">
                      <FiMail className="h-4 w-4" />
                      <a
                        href={`mailto:${provider.contactEmail}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {provider.contactEmail}
                      </a>
                    </div>
                    {provider.contactPhone && (
                      <div className="flex items-center gap-2">
                        <FiPhone className="h-4 w-4" />
                        <a href={`tel:${provider.contactPhone}`}>
                          {provider.contactPhone}
                        </a>
                      </div>
                    )}
                    {provider.website && (
                      <div className="flex items-center gap-2">
                        <FiGlobe className="h-4 w-4" />
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {provider.website}
                          <FiExternalLink className="inline ml-1 h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={toggleProviderVerification}
                    disabled={saving === "provider-verification"}
                    className={`px-4 py-2 rounded-md font-medium text-sm ${
                      provider.isVerified
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    } disabled:opacity-50`}
                  >
                    {provider.isVerified ? (
                      <>
                        <FiCheckCircle className="inline mr-1 h-4 w-4" />
                        Verified
                      </>
                    ) : (
                      <>
                        <FiAlertCircle className="inline mr-1 h-4 w-4" />
                        Not Verified
                      </>
                    )}
                  </button>
                  <button
                    onClick={toggleProviderActive}
                    disabled={saving === "provider-active"}
                    className={`px-4 py-2 rounded-md font-medium text-sm ${
                      provider.isActive
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    } disabled:opacity-50`}
                  >
                    {provider.isActive ? (
                      <>
                        <FiCheckCircle className="inline mr-1 h-4 w-4" />
                        Active
                      </>
                    ) : (
                      <>
                        <FiXCircle className="inline mr-1 h-4 w-4" />
                        Inactive
                      </>
                    )}
                  </button>
                </div>
              </div>

              {provider.bio && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-700 mb-1">
                    Business Description
                  </h3>
                  <p className="text-neutral-700 whitespace-pre-wrap">{provider.bio}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Service Types */}
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                  <h3 className="text-lg font-medium text-neutral-900 mb-3">
                    Services Offered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {provider.serviceTypes.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Coverage Area */}
                {provider.coverageArea && (
                  <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <h3 className="text-lg font-medium text-neutral-900 mb-3">
                      <FiMapPin className="inline mr-2 h-5 w-5" />
                      Coverage Area
                    </h3>
                    <div className="space-y-3">
                      {provider.coverageArea.cities &&
                        provider.coverageArea.cities.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-1">
                              Cities
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {provider.coverageArea.cities.map((city, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded text-sm bg-neutral-100 text-neutral-700"
                                >
                                  {city}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      {provider.coverageArea.states &&
                        provider.coverageArea.states.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-1">
                              States
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {provider.coverageArea.states.map((state, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded text-sm bg-neutral-100 text-neutral-700"
                                >
                                  {state}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      {provider.coverageArea.zipCodes &&
                        provider.coverageArea.zipCodes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-1">
                              ZIP Codes
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {provider.coverageArea.zipCodes.map((zip, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded text-sm bg-neutral-100 text-neutral-700"
                                >
                                  {zip}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Licensing & Insurance */}
                {(provider.licenseNumber || provider.insuranceInfo) && (
                  <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <h3 className="text-lg font-medium text-neutral-900 mb-3">
                      Licensing & Insurance
                    </h3>
                    <div className="space-y-3">
                      {provider.licenseNumber && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-700">
                            License Number
                          </h4>
                          <p className="text-neutral-600">{provider.licenseNumber}</p>
                        </div>
                      )}
                      {provider.insuranceInfo && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-700">
                            Insurance Information
                          </h4>
                          <p className="text-neutral-600">{provider.insuranceInfo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Credentials */}
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                  <h3 className="text-lg font-medium text-neutral-900 mb-3">
                    Credentials
                  </h3>
                  {provider.credentials.length === 0 ? (
                    <p className="text-neutral-500 text-sm">
                      No credentials uploaded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-neutral-200">
                      {provider.credentials.map((cred) => (
                        <div key={cred.id} className="py-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-neutral-900">{cred.type}</div>
                            <div className="text-sm text-neutral-600">
                              Created:{" "}
                              {new Date(cred.createdAt).toLocaleDateString()}
                              {cred.expiresAt && (
                                <>
                                  {" • "}
                                  Expires:{" "}
                                  {new Date(cred.expiresAt).toLocaleDateString()}
                                </>
                              )}
                            </div>
                            {cred.documentUrl && (
                              <a
                                href={cred.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-600 hover:text-primary-700"
                              >
                                View document
                                <FiExternalLink className="inline ml-1 h-3 w-3" />
                              </a>
                            )}
                            {cred.notes && (
                              <div className="text-sm text-neutral-600 mt-1">
                                Notes: {cred.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                cred.status === "VERIFIED"
                                  ? "bg-green-100 text-green-800"
                                  : cred.status === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {cred.status}
                            </span>
                            <button
                              onClick={() => toggleCredentialVerification(cred)}
                              disabled={saving === cred.id}
                              className="px-3 py-1 text-sm rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                            >
                              {cred.status === "VERIFIED" ? "Unverify" : "Verify"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                  <h3 className="text-lg font-medium text-neutral-900 mb-4">
                    Account Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-neutral-600">User</div>
                      <div className="font-medium">
                        {provider.user.firstName} {provider.user.lastName}
                      </div>
                      <div className="text-neutral-600">{provider.user.email}</div>
                    </div>
                    {provider.yearsInBusiness && (
                      <div>
                        <div className="text-neutral-600">Years in Business</div>
                        <div className="font-medium">{provider.yearsInBusiness}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-neutral-600">Created</div>
                      <div className="font-medium">
                        {new Date(provider.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Last Updated</div>
                      <div className="font-medium">
                        {new Date(provider.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
