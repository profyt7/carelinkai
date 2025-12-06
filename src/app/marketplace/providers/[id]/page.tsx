import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Provider = {
  id: string;
  userId: string;
  name: string;
  city: string;
  state: string;
  services: string[];
  description: string;
  coverageRadius?: number | null;
  logoUrl?: string | null;
};

async function getProviderById(id: string): Promise<Provider | null> {
  try {
    const h = headers();
    const cookie = h.get("cookie") ?? "";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const base = host ? `${proto}://${host}` : (process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000");
    const url = `${base}/api/marketplace/providers/${encodeURIComponent(id)}`;
    const res = await fetch(url, { headers: { cookie }, cache: 'no-store' });
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
                {provider.coverageRadius ? <span>~{provider.coverageRadius}mi radius</span> : null}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* About */}
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
            <Link href={`/messages?userId=${encodeURIComponent(provider.userId)}`} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md text-center">
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
