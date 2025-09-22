import Link from "next/link";
import { headers } from "next/headers";
import { FiMapPin, FiStar } from "react-icons/fi";

export const dynamic = "force-dynamic";

type Provider = {
  id: string;
  name: string;
  city: string;
  state: string;
  description: string;
  hourlyRate: number | null;
  perMileRate: number | null;
  ratingAverage: number;
  reviewCount: number;
  badges: string[];
};

async function fetchProviders(): Promise<Provider[]> {
  try {
    const cookie = headers().get("cookie") ?? "";
    const res = await fetch(`/api/marketplace/providers?pageSize=12`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.error("Error fetching providers:", e);
    return [];
  }
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating || 0);
  return (
    <span className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < filled ? "text-yellow-400" : "text-gray-300"}>★</span>
      ))}
    </span>
  );
}

export default async function ProvidersPage() {
  const providers = await fetchProviders();
  if (!providers || providers.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Transportation Providers</h1>
      <p className="text-gray-600 mb-6">Find trusted transportation providers for medical appointments and daily needs.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p) => {
          const location = [p.city, p.state].filter(Boolean).join(", ");
          return (
            <div key={p.id} className="bg-white border rounded-md p-4 flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-1">{p.name}</h3>
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-3">
                {location && (
                  <span className="inline-flex items-center"><FiMapPin className="mr-1" />{location}</span>
                )}
                <span className="inline-flex items-center">
                  <Stars rating={p.ratingAverage} />
                  <span className="ml-2">{p.ratingAverage.toFixed(1)} ({p.reviewCount})</span>
                </span>
              </div>

              <p className="text-sm text-gray-700 line-clamp-3 mb-3">{p.description}</p>

              {p.badges?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {p.badges.slice(0, 3).map((b, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {b}
                    </span>
                  ))}
                  {p.badges.length > 3 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">+{p.badges.length - 3} more</span>
                  )}
                </div>
              )}

              <div className="mt-auto">
                <Link
                  href={`/marketplace/providers/${p.id}`}
                  className="block text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  View provider
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
