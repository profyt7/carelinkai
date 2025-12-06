"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  FiAward
} from "react-icons/fi";

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

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    }
  }, [providerId]);

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
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || "Provider not found"}</p>
        </div>
        <Link
          href="/marketplace/providers"
          className="mt-4 inline-block text-primary-600 hover:text-primary-500"
        >
          ← Back to providers
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
          href="/marketplace/providers"
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          ← Back to providers
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
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <FiCheckCircle className="mr-1 h-4 w-4" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-neutral-600">
                    Contact: {provider.contactName}
                  </p>
                </div>
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
                        <FiCheckCircle className="h-5 w-5 text-green-500 mr-3" />
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

                <div className="mt-6">
                  <button
                    onClick={handleContactProvider}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FiMessageCircle className="mr-2 h-5 w-5" />
                    Send Message
                  </button>
                  <p className="mt-2 text-xs text-neutral-500 text-center">
                    {status !== "authenticated"
                      ? "Sign in to send a message"
                      : "Start a conversation with this provider"}
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
                  <FiCheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  {verifiedCredentials.length} verified credential
                  {verifiedCredentials.length !== 1 ? "s" : ""}
                </li>
                <li className="flex items-center">
                  <FiCheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  {provider.serviceTypes.length} service
                  {provider.serviceTypes.length !== 1 ? "s" : ""} offered
                </li>
                {provider.isActive && (
                  <li className="flex items-center">
                    <FiCheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Currently accepting clients
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
