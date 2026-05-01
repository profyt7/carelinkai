"use client";

import { useState, useEffect } from "react";
import { FiX, FiCheck, FiLoader, FiStar, FiAlertCircle } from "react-icons/fi";

interface HomeCompareData {
  id: string;
  name: string;
  location: string;
  careLevel: string[];
  capacity: number;
  availableBeds: number;
  priceMin: number | null;
  priceMax: number | null;
  amenities: string[];
  highlights: string[];
  avgRating: number | null;
  reviewCount: number;
  activeLicenses: number;
}

interface Props {
  homeIds: string[];
  onClose: () => void;
}

export default function HomeCompareModal({ homeIds, onClose }: Props) {
  const [homes, setHomes] = useState<HomeCompareData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (homeIds.length < 2) return;
    fetch(`/api/family/homes/compare?ids=${homeIds.join(",")}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setHomes(d.homes);
        else setError(d.error ?? "Failed to load comparison");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [homeIds]);

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return "Contact for pricing";
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}/mo`;
    if (min) return `From $${min.toLocaleString()}/mo`;
    return `Up to $${max!.toLocaleString()}/mo`;
  };

  // All amenities across homes for the comparison rows
  const allAmenities = [...new Set(homes.flatMap((h) => h.amenities))].slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">Compare Care Homes</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center p-16">
            <FiLoader className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 m-6 p-4 bg-error-50 border border-error-200 rounded-xl text-error-700">
            <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && homes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-neutral-500 w-40 bg-neutral-50 border-b border-neutral-200">
                    Feature
                  </th>
                  {homes.map((home) => (
                    <th key={home.id} className="p-4 text-center border-b border-neutral-200 bg-neutral-50">
                      <p className="font-bold text-neutral-900 text-base">{home.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{home.location}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {/* Rating */}
                <tr className="hover:bg-neutral-50">
                  <td className="p-4 text-sm font-medium text-neutral-600">Rating</td>
                  {homes.map((home) => (
                    <td key={home.id} className="p-4 text-center">
                      {home.avgRating ? (
                        <div className="flex items-center justify-center gap-1">
                          <FiStar className="h-4 w-4 text-warning-400 fill-warning-400" />
                          <span className="font-semibold text-neutral-900">{home.avgRating}</span>
                          <span className="text-xs text-neutral-500">({home.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-sm">No reviews yet</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Price */}
                <tr className="hover:bg-neutral-50">
                  <td className="p-4 text-sm font-medium text-neutral-600">Monthly Cost</td>
                  {homes.map((home) => (
                    <td key={home.id} className="p-4 text-center">
                      <span className="font-semibold text-neutral-900 text-sm">
                        {formatPrice(home.priceMin, home.priceMax)}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Available Beds */}
                <tr className="hover:bg-neutral-50">
                  <td className="p-4 text-sm font-medium text-neutral-600">Available Beds</td>
                  {homes.map((home) => (
                    <td key={home.id} className="p-4 text-center">
                      <span className={`font-bold text-lg ${home.availableBeds > 0 ? "text-success-600" : "text-error-500"}`}>
                        {home.availableBeds}
                      </span>
                      <span className="text-xs text-neutral-500 block">of {home.capacity} total</span>
                    </td>
                  ))}
                </tr>

                {/* Care Levels */}
                <tr className="hover:bg-neutral-50">
                  <td className="p-4 text-sm font-medium text-neutral-600">Care Types</td>
                  {homes.map((home) => (
                    <td key={home.id} className="p-4 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {home.careLevel.map((cl) => (
                          <span key={cl} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                            {cl.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Licensed */}
                <tr className="hover:bg-neutral-50">
                  <td className="p-4 text-sm font-medium text-neutral-600">Active Licenses</td>
                  {homes.map((home) => (
                    <td key={home.id} className="p-4 text-center">
                      {home.activeLicenses > 0 ? (
                        <span className="inline-flex items-center gap-1 text-success-700 text-sm font-medium">
                          <FiCheck className="h-4 w-4" /> {home.activeLicenses} on file
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-sm">Not on file</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Amenities */}
                {allAmenities.length > 0 && (
                  <tr>
                    <td colSpan={homes.length + 1} className="p-4 bg-neutral-50 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Amenities
                    </td>
                  </tr>
                )}
                {allAmenities.map((amenity) => (
                  <tr key={amenity} className="hover:bg-neutral-50">
                    <td className="p-4 text-sm text-neutral-600">{amenity}</td>
                    {homes.map((home) => (
                      <td key={home.id} className="p-4 text-center">
                        {home.amenities.includes(amenity) ? (
                          <FiCheck className="h-5 w-5 text-success-500 mx-auto" />
                        ) : (
                          <span className="text-neutral-300 text-lg">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-neutral-200 text-xs text-neutral-400 text-center">
          Prices and availability are updated regularly. Contact homes directly to confirm current rates.
        </div>
      </div>
    </div>
  );
}
