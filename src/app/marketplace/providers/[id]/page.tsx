"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  FiMapPin,
  FiGlobe,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiFile,
  FiMessageCircle,
  FiLoader,
  FiBriefcase,
  FiCalendar,
  FiAward,
  FiHeart,
  FiShield,
} from "react-icons/fi";
import RequestCareButton from "@/components/marketplace/RequestCareButton";
import ProviderReviewsListClient from "@/components/marketplace/ProviderReviewsListClient";
import RideRequestModal from "@/components/transport/RideRequestModal";

type Provider = {
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
  credentials: Array<{
    id: string;
    type: string;
    status: string;
    expiresAt: string | null;
  }>;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  rideTypes: string[];
  wheelchairAccessible: boolean;
  acceptsMedicaid: boolean;
  serviceRadius: number | null;
  allowsRecurring: boolean;
  rideStats: {
    totalRides: number;
    completedRides: number;
    completionRate: number;
    onTimeRate: number;
    reliabilityScore: number;
    hasEnoughData: boolean;
    noShowBreakdown: Record<string, number>;
  } | null;
};

const serviceTypeOptions = [
  { value: "transportation", label: "Transportation" },
  { value: "meal-prep", label: "Meal Preparation" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "personal-care", label: "Personal Care" },
  { value: "companionship", label: "Companionship" },
  { value: "medical-services", label: "Medical Services" },
  { value: "home-modification", label: "Home Modification" },
  { value: "respite-care", label: "Respite Care" },
];

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const providerId = params?.id as string;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRideModal, setShowRideModal] = useState(false);
  
  // Favorite state
  const PR_FAV_KEY = 'marketplace:provider-favorites:v1';
  const [isFavorite, setIsFavorite] = useState(false);
  const [checkOrdering, setCheckOrdering] = useState(false);
  const [checkOrdered, setCheckOrdered] = useState(false);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
      loadFavoriteStatus();
    }
  }, [providerId]);

  // Load favorite status
  const loadFavoriteStatus = async () => {
    if (session?.user?.role === 'FAMILY') {
      try {
        const res = await fetch('/api/marketplace/provider-favorites', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          const ids = new Set<string>(j?.data || []);
          setIsFavorite(ids.has(providerId));
          return;
        }
      } catch {}
    }
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(PR_FAV_KEY);
      if (raw) {
        const ids = new Set<string>(JSON.parse(raw));
        setIsFavorite(ids.has(providerId));
      }
    } catch {}
  };

  // Toggle favorite
  const toggleFavorite = useCallback(async () => {
    const wasFavorite = isFavorite;
    setIsFavorite(!isFavorite);
    
    // Update localStorage
    try {
      const raw = localStorage.getItem(PR_FAV_KEY);
      const ids = new Set<string>(raw ? JSON.parse(raw) : []);
      if (isFavorite) ids.delete(providerId);
      else ids.add(providerId);
      localStorage.setItem(PR_FAV_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
    
    // Sync with server if family
    if (session?.user?.role === 'FAMILY') {
      try {
        if (isFavorite) {
          const res = await fetch(`/api/marketplace/provider-favorites?providerId=${encodeURIComponent(providerId)}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('unfav failed');
        } else {
          const res = await fetch('/api/marketplace/provider-favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId }) });
          if (!res.ok) throw new Error('fav failed');
        }
      } catch {
        // Rollback
        setIsFavorite(wasFavorite);
        try {
          const raw = localStorage.getItem(PR_FAV_KEY);
          const ids = new Set<string>(raw ? JSON.parse(raw) : []);
          if (wasFavorite) ids.add(providerId);
          else ids.delete(providerId);
          localStorage.setItem(PR_FAV_KEY, JSON.stringify(Array.from(ids)));
        } catch {}
      }
    }
  }, [isFavorite, providerId, session?.user?.role, PR_FAV_KEY]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/marketplace/providers/${providerId}`);
      if (!res.ok) throw new Error("Failed to fetch provider details");

      const data = await res.json();
      setProvider(data.data);
    } catch (e: any) {
      console.error("Error fetching provider:", e);
      setError(e.message || "Failed to load provider details");
    } finally {
      setLoading(false);
    }
  };

  const handleContactProvider = () => {
    if (status !== "authenticated") {
      router.push(`/auth/login?callbackUrl=/marketplace/providers/${providerId}`);
      return;
    }

    // Navigate to messages page with provider's user ID
    if (provider?.userId) {
      router.push(`/messages?userId=${provider.userId}`);
    }
  };

  const handleOrderProviderCheck = async () => {
    if (status !== "authenticated") {
      router.push(`/auth/login?callbackUrl=/marketplace/providers/${providerId}`);
      return;
    }
    setCheckOrdering(true);
    try {
      const nameParts = (provider?.contactName ?? "").trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName = (nameParts.slice(1).join(" ") || nameParts[0]) ?? "";
      const res = await fetch("/api/background-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: provider?.contactEmail,
          role: "Other",
          packageType: "BASIC",
        }),
      });
      const data = await res.json();
      if (data.requiresPayment) {
        router.push("/background-checks");
        return;
      }
      if (data.success) {
        setCheckOrdered(true);
        toast.success("Background check invitation sent to provider contact!");
      } else {
        toast.error(data.error ?? "Failed to order background check.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCheckOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-12">
          <FiLoader className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-3 text-lg text-neutral-600">Loading provider details...</span>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-error-50 border border-error-200 rounded-md p-4">
          <p className="text-error-800">{error || "Provider not found"}</p>
        </div>
        <Link
          href="/marketplace?tab=providers"
          className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-500 font-medium transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Providers</span>
        </Link>
      </div>
    );
  }

  const verifiedCredentials = provider.credentials.filter(c => c.status === "VERIFIED");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-4">
        <Link
          href="/marketplace?tab=providers"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-500 font-medium transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Providers</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-neutral-900">
                      {provider.businessName}
                    </h1>
                    {provider.isVerified && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
                        <FiCheckCircle className="mr-1 h-4 w-4" />
                        Verified
                      </span>
                    )}
                    {provider.credentials.filter((c) => c.status === "VERIFIED").length >= 3 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                        <FiShield className="mr-1 h-4 w-4" />
                        CareLinkAI Certified
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-neutral-600">
                    Contact: {provider.contactName}
                  </p>
                </div>
                {/* Favorite Button */}
                <button
                  onClick={toggleFavorite}
                  className="text-neutral-400 hover:text-error-500 transition-colors p-2"
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <FiHeart
                    className={`h-7 w-7 ${
                      isFavorite ? "fill-error-500 text-error-500" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {provider.yearsInBusiness && (
                  <div className="flex items-center text-neutral-700">
                    <FiBriefcase className="h-5 w-5 mr-2 text-neutral-500" />
                    <span>{provider.yearsInBusiness} years in business</span>
                  </div>
                )}
                {provider.website && (
                  <div className="flex items-center text-neutral-700">
                    <FiGlobe className="h-5 w-5 mr-2 text-neutral-500" />
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-lg shadow border border-neutral-200 p-6">
            <ProviderReviewsListClient providerId={provider.id} />
          </div>

          {/* About Section */}
          {provider.bio && (
            <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-3">
                  About
                </h2>
                <p className="text-neutral-700 whitespace-pre-wrap">{provider.bio}</p>
              </div>
            </div>
          )}

          {/* Services Section */}
          <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                Services Offered
              </h2>
              <div className="flex flex-wrap gap-3">
                {provider.serviceTypes.map((service) => {
                  const serviceLabel =
                    serviceTypeOptions.find((opt) => opt.value === service)?.label ||
                    service;
                  return (
                    <span
                      key={service}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200"
                    >
                      {serviceLabel}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coverage Area Section */}
          {provider.coverageArea && (
            <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  <FiMapPin className="inline h-5 w-5 mr-2" />
                  Coverage Area
                </h2>
                <div className="space-y-3">
                  {provider.coverageArea.cities && provider.coverageArea.cities.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-700 mb-2">Cities</h3>
                      <div className="flex flex-wrap gap-2">
                        {provider.coverageArea.cities.map((city, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700"
                          >
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {provider.coverageArea.states && provider.coverageArea.states.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-700 mb-2">States</h3>
                      <div className="flex flex-wrap gap-2">
                        {provider.coverageArea.states.map((state, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700"
                          >
                            {state}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {provider.coverageArea.zipCodes && provider.coverageArea.zipCodes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-700 mb-2">ZIP Codes</h3>
                      <div className="flex flex-wrap gap-2">
                        {provider.coverageArea.zipCodes.map((zip, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700"
                          >
                            {zip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transportation Capabilities */}
          {provider.serviceTypes.includes("transportation") && (
            <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  🚗 Transportation Capabilities
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {provider.wheelchairAccessible && (
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <FiCheckCircle className="h-4 w-4 text-success-500 flex-shrink-0" />
                      Wheelchair Accessible
                    </div>
                  )}
                  {provider.acceptsMedicaid && (
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <FiCheckCircle className="h-4 w-4 text-success-500 flex-shrink-0" />
                      Accepts Medicaid
                    </div>
                  )}
                  {provider.allowsRecurring && (
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <FiCheckCircle className="h-4 w-4 text-success-500 flex-shrink-0" />
                      Recurring Rides Available
                    </div>
                  )}
                  {provider.serviceRadius && (
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <FiMapPin className="h-4 w-4 text-primary-500 flex-shrink-0" />
                      Serves up to {provider.serviceRadius} miles
                    </div>
                  )}
                </div>
                {(provider.rideTypes ?? []).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-neutral-700 mb-2">Ride Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.rideTypes.map((type) => (
                        <span key={type} className="px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dispatch Reliability */}
                {provider.rideStats && (
                  <div className="mt-5 pt-4 border-t border-neutral-100">
                    <h3 className="text-sm font-medium text-neutral-700 mb-3">Dispatch Reliability</h3>
                    {provider.rideStats.hasEnoughData ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">Ride Completion</span>
                          <div className="flex items-center gap-2 flex-1 ml-4">
                            <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${provider.rideStats.completionRate >= 90 ? "bg-success-500" : provider.rideStats.completionRate >= 75 ? "bg-amber-500" : "bg-error-500"}`}
                                style={{ width: `${provider.rideStats.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-neutral-700 w-9 text-right">{provider.rideStats.completionRate}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">On-Time Pickup</span>
                          <div className="flex items-center gap-2 flex-1 ml-4">
                            <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${provider.rideStats.onTimeRate >= 90 ? "bg-success-500" : provider.rideStats.onTimeRate >= 75 ? "bg-amber-500" : "bg-error-500"}`}
                                style={{ width: `${provider.rideStats.onTimeRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-neutral-700 w-9 text-right">{provider.rideStats.onTimeRate}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                          Based on {provider.rideStats.completedRides} completed ride{provider.rideStats.completedRides !== 1 ? "s" : ""}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">
                        {provider.rideStats.completedRides > 0
                          ? `${provider.rideStats.completedRides} ride${provider.rideStats.completedRides !== 1 ? "s" : ""} completed — building reputation`
                          : "No completed rides yet — be the first to book!"}
                      </p>
                    )}
                  </div>
                )}

                {status === "authenticated" && (session?.user?.role === "FAMILY" || session?.user?.role === "OPERATOR" || session?.user?.role === "STAFF") && (
                  <button
                    onClick={() => setShowRideModal(true)}
                    className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    🚗 {session?.user?.role === "FAMILY" ? "Book a Ride" : "Book Ride for Resident"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Licensing & Insurance */}
          {(provider.licenseNumber || provider.insuranceInfo) && (
            <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  <FiAward className="inline h-5 w-5 mr-2" />
                  Licensing & Insurance
                </h2>
                <div className="space-y-3">
                  {provider.licenseNumber && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-700">License Number</h3>
                      <p className="text-neutral-600">{provider.licenseNumber}</p>
                    </div>
                  )}
                  {provider.insuranceInfo && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-700">Insurance</h3>
                      <p className="text-neutral-600">{provider.insuranceInfo}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Credentials Section */}
          {verifiedCredentials.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  <FiFile className="inline h-5 w-5 mr-2" />
                  Verified Credentials
                </h2>
                <div className="space-y-3">
                  {verifiedCredentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-md"
                    >
                      <div className="flex items-center">
                        <FiCheckCircle className="h-5 w-5 text-success-500 mr-3" />
                        <div>
                          <p className="font-medium text-neutral-900">{credential.type}</p>
                          {credential.expiresAt && (
                            <p className="text-sm text-neutral-600">
                              Expires: {new Date(credential.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                  Contact Information
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <FiMail className="h-5 w-5 text-neutral-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-600">Email</p>
                      <a
                        href={`mailto:${provider.contactEmail}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {provider.contactEmail}
                      </a>
                    </div>
                  </div>
                  {provider.contactPhone && (
                    <div className="flex items-start">
                      <FiPhone className="h-5 w-5 text-neutral-500 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-neutral-600">Phone</p>
                        <a
                          href={`tel:${provider.contactPhone}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {provider.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  {/* Request Care Button - Primary CTA */}
                  <RequestCareButton
                    targetType="PROVIDER"
                    targetId={provider.id}
                    targetName={provider.businessName}
                    serviceTypes={provider.serviceTypes}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  />

                  {/* Send Message Button - Secondary CTA */}
                  <button
                    onClick={handleContactProvider}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-neutral-300 text-base font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FiMessageCircle className="mr-2 h-5 w-5" />
                    Send Message
                  </button>
                  
                  <p className="text-xs text-neutral-500 text-center">
                    {status !== "authenticated"
                      ? "Sign in to request care or send a message"
                      : "Request care to start the inquiry process"}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info Card */}
            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                About This Listing
              </h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-center">
                  <FiCheckCircle className="h-4 w-4 mr-2 text-success-500" />
                  {verifiedCredentials.length} verified credential
                  {verifiedCredentials.length !== 1 ? "s" : ""}
                </li>
                <li className="flex items-center">
                  <FiCheckCircle className="h-4 w-4 mr-2 text-success-500" />
                  {provider.serviceTypes.length} service
                  {provider.serviceTypes.length !== 1 ? "s" : ""} offered
                </li>
                {provider.isActive && (
                  <li className="flex items-center">
                    <FiCheckCircle className="h-4 w-4 mr-2 text-success-500" />
                    Currently accepting clients
                  </li>
                )}
              </ul>
            </div>

            {/* Background Check Card */}
            <div className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden">
              {/* Header — matches BackgroundCheckOrderPanel style */}
              <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                <FiShield className="h-4 w-4 text-primary-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-neutral-900">Safety &amp; Background Checks</span>
              </div>
              <div className="p-4">
                {checkOrdered ? (
                  <div className="flex items-center gap-2 rounded-lg bg-success-50 border border-success-200 p-3 text-sm text-success-700">
                    <FiCheckCircle className="h-4 w-4 flex-shrink-0" />
                    Invitation sent to {provider.contactName}. They&apos;ll receive an email to complete the check.
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-neutral-500 mb-3">
                      Send {provider.contactName.split(" ")[0]} a free background check invitation via Checkr. They&apos;ll consent and complete it by email.
                    </p>
                    <button
                      onClick={handleOrderProviderCheck}
                      disabled={checkOrdering}
                      className="w-full flex items-center justify-center gap-2 rounded-full border border-primary-400 text-primary-700 bg-primary-50 hover:bg-primary-100 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {checkOrdering ? (
                        <FiLoader className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FiShield className="h-3.5 w-3.5" />
                      )}
                      {checkOrdering ? "Sending..." : `Order Free — ${provider.contactName.split(" ")[0]}`}
                    </button>
                    <p className="mt-2 text-xs text-neutral-400 text-center">
                      Enhanced checks on the{" "}
                      <Link href="/background-checks" className="text-primary-500 hover:underline">
                        Background Checks hub
                      </Link>
                    </p>
                  </>
                )}
              </div>
              <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100">
                <p className="text-xs text-neutral-400 text-center">
                  Powered by Checkr · Consent-based invitation flow
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRideModal && (
        <RideRequestModal
          providerId={provider.id}
          providerName={provider.businessName}
          isOperator={session?.user?.role === "OPERATOR" || session?.user?.role === "STAFF"}
          onClose={() => setShowRideModal(false)}
          onRequested={() => setShowRideModal(false)}
        />
      )}
    </div>
  );
}
