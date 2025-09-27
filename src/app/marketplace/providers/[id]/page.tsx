import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Provider = {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  services: string[];
  description: string;
  hourlyRate: number | null;
  perMileRate: number | null;
  ratingAverage: number;
  reviewCount: number;
  badges: string[];
  coverageRadius?: number;
  availableHours?: string;
};

async function getProviderById(id: string): Promise<Provider | null> {
  try {
    const cookie = headers().get("cookie") ?? "";
    const res = await fetch(`/api/marketplace/providers/${encodeURIComponent(id)}`, { headers: { cookie }, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as Provider) || null;
  } catch (e) {
    console.error("Error fetching provider:", e);
    return null;
  }
}

export default async function ProviderDetailPage({ params }: { params: { id: string } }) {
  const provider = await getProviderById(params.id);
  if (!provider) notFound();

  const location = [provider.city, provider.state].filter(Boolean).join(", ");

  // Helper to render rating stars
  const filled = Math.round(provider.ratingAverage || 0);
  const Stars = () => (
    <span className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < filled ? "text-yellow-400" : "text-gray-300"}>★</span>
      ))}
    </span>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <div className="h-full w-full flex items-center justify-center text-gray-400 text-2xl">
                {provider.name.charAt(0)}
              </div>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                {location && <span>{location}</span>}
                <span className="inline-flex items-center">
                  <Stars />
                  <span className="ml-2">{provider.ratingAverage.toFixed(1)} ({provider.reviewCount} reviews)</span>
                </span>
              </div>
              {/* Badges */}
              {provider.badges?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {provider.badges.map((b, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Pricing */}
          {(provider.hourlyRate || provider.perMileRate) && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {provider.hourlyRate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Hourly Rate</h3>
                  <p className="mt-1 text-lg font-semibold">${provider.hourlyRate}/hr</p>
                </div>
              )}
              {provider.perMileRate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Per Mile Rate</h3>
                  <p className="mt-1 text-lg font-semibold">${provider.perMileRate.toFixed(2)}/mile</p>
                </div>
              )}
            </div>
          )}

          {/* Coverage & Hours */}
          {(provider.coverageRadius || provider.availableHours) && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {provider.coverageRadius && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Coverage Radius</h3>
                  <p className="mt-1">{provider.coverageRadius} miles</p>
                </div>
              )}
              {provider.availableHours && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Available Hours</h3>
                  <p className="mt-1">{provider.availableHours}</p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {provider.description && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">About</h2>
              <div className="prose max-w-none text-gray-700">{provider.description}</div>
            </div>
          )}

          {/* Services */}
          {provider.services?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Services</h2>
              <div className="flex flex-wrap gap-2">
                {provider.services.map((s) => (
                  <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {s.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/messages" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md text-center">
              Message provider
            </Link>
            <Link href="/dashboard/inquiries" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md text-center">
              Request a ride/quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
