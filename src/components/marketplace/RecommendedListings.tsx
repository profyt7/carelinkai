"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiMapPin, FiDollarSign } from "react-icons/fi";
import ExplainMatchTrigger from "@/components/marketplace/ExplainMatchTrigger";

type RecommendedListing = {
  id: string;
  score: number;
  reasons?: string[];
  data: {
    title: string;
    description: string;
    hourlyRateMin: number | null;
    hourlyRateMax: number | null;
    city: string | null;
    state: string | null;
    postedBy?: {
      id: string;
      firstName: string;
      lastName: string;
      profileImageUrl: string | null;
    };
  };
};

export default function RecommendedListings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RecommendedListing[]>([]);

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch("/api/matching/recommendations?target=listings&limit=6");
        
        if (!response.ok) {
          if (response.status === 403) {
            // This is expected if user is not a caregiver
            setItems([]);
            return;
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setItems(data.items || []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setError(err instanceof Error ? err.message : "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-xl font-semibold mb-4">Recommended Jobs</h2>
        <div className="py-12 text-center text-gray-500">
          <div className="animate-pulse flex justify-center">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
          <p className="mt-2">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <h2 className="text-xl font-semibold mb-4">Recommended Jobs</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>Unable to load recommendations. Please try again later.</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Don't show anything if no recommendations
  }

  return (
    <div className="py-8">
      <h2 className="text-xl font-semibold mb-4">Recommended Jobs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border rounded-md p-4 flex flex-col">
            <div className="flex items-start mb-2">
              <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                <Image 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.data.title)}&background=random&size=128`} 
                  alt={item.data.title} 
                  width={48} 
                  height={48} 
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{item.data.title}</h3>
                <div className="text-sm text-gray-600">
                  {item.data.city || item.data.state ? (
                    <div className="flex items-center">
                      <FiMapPin className="mr-1" size={14} />
                      <span>{[item.data.city, item.data.state].filter(Boolean).join(", ")}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            {(item.data.hourlyRateMin || item.data.hourlyRateMax) && (
              <div className="text-sm text-gray-800 mb-2 flex items-center">
                <FiDollarSign className="mr-1" size={14} />
                {item.data.hourlyRateMin && item.data.hourlyRateMax 
                  ? `$${item.data.hourlyRateMin} - $${item.data.hourlyRateMax}/hr` 
                  : item.data.hourlyRateMin 
                    ? `From $${item.data.hourlyRateMin}/hr` 
                    : `Up to $${item.data.hourlyRateMax}/hr`}
              </div>
            )}
            
            <p className="text-sm text-gray-700 line-clamp-2 mb-3 flex-grow">{item.data.description}</p>
            
            {item.score > 0 && (
              <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
                <span className="font-medium">{item.score}% match</span>
                <ExplainMatchTrigger
                  title={item.data.title}
                  score={item.score}
                  reasons={item.reasons}
                  className="text-[11px] px-2 py-1 border rounded-md text-neutral-700 hover:bg-neutral-50"
                />
              </div>
            )}
            
            <Link 
              href={`/marketplace/listings/${item.id}`} 
              className="mt-auto block text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
