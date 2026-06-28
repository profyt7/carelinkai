'use client';

import { useState, useCallback } from 'react';
import { MapPin, Bed, DollarSign, CheckCircle, Send, Phone, Mail, Star, RefreshCw, ShieldCheck } from 'lucide-react';
import PlacementRequestModal from './PlacementRequestModal';

interface SearchResult {
  homeId: string;
  homeName: string;
  address: string;
  score: number;
  reasoning: string;
  careTypes: string[];
  availableBeds: number | null;
  startingPrice: number | null;
  amenities: string[];
  contactEmail?: string;
  contactPhone?: string;
  isUnclaimed?: boolean;
}

interface SearchResultsProps {
  searchId: string;
  query: string;
  matches: SearchResult[];
  totalMatches: number;
}

export default function SearchResults({ searchId, query, matches, totalMatches }: SearchResultsProps) {
  const [selectedHome, setSelectedHome] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [liveAvailability, setLiveAvailability] = useState<Record<string, number>>({});
  const [refreshingAvailability, setRefreshingAvailability] = useState(false);
  const [availabilityFetchedAt, setAvailabilityFetchedAt] = useState<string | null>(null);

  // Concierge is the pilot default: a request routes to the CareLinkAI care team
  // (in-app), never an auto-email to the operator. Clicking a specific home just
  // records it as a preferred option for the curator.
  const handleSendRequest = (home: SearchResult) => {
    setSelectedHome(home);
    setIsModalOpen(true);
  };

  const handleConcierge = () => {
    setSelectedHome(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHome(null);
  };

  const refreshAvailability = useCallback(async () => {
    const homeIds = matches?.map((m) => m.homeId).filter(Boolean).join(",");
    if (!homeIds) return;
    setRefreshingAvailability(true);
    try {
      const res = await fetch(`/api/discharge-planner/availability?homeIds=${homeIds}`);
      const data = await res.json();
      if (data.success) {
        const map: Record<string, number> = {};
        data.availability.forEach((a: { homeId: string; availableBeds: number }) => {
          map[a.homeId] = a.availableBeds;
        });
        setLiveAvailability(map);
        setAvailabilityFetchedAt(data.fetchedAt);
      }
    } catch {
      // silently fail — fall back to search result data
    } finally {
      setRefreshingAvailability(false);
    }
  }, [matches]);

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Search Results</h2>
            <p className="text-neutral-600">
              Found <span className="font-semibold text-primary-600">{totalMatches}</span> matching homes for your query
            </p>
          </div>
          <button
            onClick={refreshAvailability}
            disabled={refreshingAvailability}
            className="flex items-center gap-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingAvailability ? "animate-spin" : ""}`} />
            {refreshingAvailability ? "Refreshing..." : "Refresh Availability"}
          </button>
        </div>
        {availabilityFetchedAt && (
          <p className="text-xs text-success-600 mt-2 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Live availability updated at {new Date(availabilityFetchedAt).toLocaleTimeString()}
          </p>
        )}
        <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
          <p className="text-sm text-neutral-700">
            <span className="font-semibold">Your search:</span> {query}
          </p>
        </div>
      </div>

      {/* Concierge CTA — the pilot default. Routes to the CareLinkAI care team in-app. */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 rounded-full px-3 py-1 mb-2">
              <ShieldCheck className="h-4 w-4" /> AI-matched, care-team-verified
            </p>
            <h3 className="text-xl font-bold">Have CareLinkAI build your shortlist</h3>
            <p className="text-primary-100 text-sm mt-1 max-w-xl">
              Share the patient&apos;s needs once. Our care team confirms real-time availability and sends
              a curated shortlist back to you in the app. Patient details stay private — never emailed.
            </p>
          </div>
          <button
            onClick={handleConcierge}
            className="shrink-0 bg-white text-primary-700 py-3 px-6 rounded-xl font-semibold hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2 shadow-md"
          >
            <Send className="h-4 w-4" />
            Request a shortlist
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {matches?.map((home, index) => (
          <div
            key={home?.homeId || index}
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-neutral-900">
                      {home?.homeName || 'Unknown Home'}
                    </h3>
                    <div className="flex items-center gap-1 bg-primary-100 text-primary-800 px-3 py-1 rounded-full">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-semibold text-sm">{home?.score || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <MapPin className="h-4 w-4" />
                    <span>{home?.address || 'Address not available'}</span>
                  </div>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
                <h4 className="text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  Why this is a good match:
                </h4>
                <p className="text-neutral-700 leading-relaxed">{home?.reasoning || 'No reasoning available'}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Available Beds — live if refreshed */}
                <div className={`p-4 rounded-xl ${home?.homeId && liveAvailability[home.homeId] !== undefined ? 'bg-success-50 border border-success-200' : 'bg-neutral-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Bed className={`h-5 w-5 ${home?.homeId && liveAvailability[home.homeId] !== undefined ? 'text-success-600' : 'text-primary-600'}`} />
                    <span className="text-sm font-semibold text-neutral-700">Available Beds</span>
                    {home?.homeId && liveAvailability[home.homeId] !== undefined && (
                      <span className="text-xs text-success-600 font-medium">● Live</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {home?.homeId && liveAvailability[home.homeId] !== undefined
                      ? liveAvailability[home.homeId]
                      : home?.availableBeds != null
                        ? home.availableBeds
                        : <span className="text-base font-semibold text-neutral-500">Availability on request</span>}
                  </p>
                </div>

                {/* Starting Price */}
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-5 w-5 text-success-600" />
                    <span className="text-sm font-semibold text-neutral-700">Starting Price</span>
                  </div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {home?.startingPrice != null
                      ? <>${home.startingPrice.toLocaleString()}<span className="text-sm text-neutral-600">/mo</span></>
                      : <span className="text-base font-semibold text-neutral-500">Pricing not verified</span>}
                  </p>
                </div>

                {/* Care Types */}
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-5 w-5 text-secondary-600" />
                    <span className="text-sm font-semibold text-neutral-700">Care Types</span>
                  </div>
                  <p className="text-sm text-neutral-700">{home?.careTypes?.length || 0} available</p>
                </div>
              </div>

              {/* Care Types & Amenities */}
              <div className="space-y-4 mb-6">
                {/* Care Types */}
                {home?.careTypes && home?.careTypes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-700 mb-2">Care Services:</h4>
                    <div className="flex flex-wrap gap-2">
                      {home.careTypes.map((type, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-secondary-100 text-secondary-800 rounded-full text-sm font-medium"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {home?.amenities && home?.amenities?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-700 mb-2">Amenities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {home.amenities.slice(0, 8).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                      {home.amenities.length > 8 && (
                        <span className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-sm">
                          +{home.amenities.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Info & Action */}
              <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
                <div className="flex items-center gap-4 text-sm text-neutral-600">
                  {home?.isUnclaimed ? (
                    <span className="text-neutral-400 italic">Unclaimed — request via CareLinkAI</span>
                  ) : (
                    <>
                      {home?.contactEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{home.contactEmail}</span>
                        </div>
                      )}
                      {home?.contactPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{home.contactPhone}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button
                  onClick={() => handleSendRequest(home)}
                  className="bg-gradient-to-r from-primary-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-primary-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Send className="h-4 w-4" />
                  <span>Request via CareLinkAI</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Concierge request modal (home is an optional "preferred" hint). */}
      <PlacementRequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        home={selectedHome}
        searchId={searchId}
        mode="concierge"
      />
    </div>
  );
}
