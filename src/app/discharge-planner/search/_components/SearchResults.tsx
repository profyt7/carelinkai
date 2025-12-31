'use client';

import { useState } from 'react';
import { MapPin, Bed, DollarSign, CheckCircle, Send, Phone, Mail, Star } from 'lucide-react';
import PlacementRequestModal from './PlacementRequestModal';

interface SearchResult {
  homeId: string;
  homeName: string;
  address: string;
  score: number;
  reasoning: string;
  careTypes: string[];
  availableBeds: number;
  startingPrice: number;
  amenities: string[];
  contactEmail?: string;
  contactPhone?: string;
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

  const handleSendRequest = (home: SearchResult) => {
    setSelectedHome(home);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHome(null);
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Search Results
        </h2>
        <p className="text-gray-600">
          Found <span className="font-semibold text-blue-600">{totalMatches}</span> matching homes for your query
        </p>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Your search:</span> {query}
          </p>
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
                    <h3 className="text-2xl font-bold text-gray-900">
                      {home?.homeName || 'Unknown Home'}
                    </h3>
                    <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-semibold text-sm">{home?.score || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{home?.address || 'Address not available'}</span>
                  </div>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Why this is a good match:
                </h4>
                <p className="text-gray-700 leading-relaxed">{home?.reasoning || 'No reasoning available'}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Available Beds */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Bed className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Available Beds</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{home?.availableBeds || 0}</p>
                </div>

                {/* Starting Price */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">Starting Price</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${(home?.startingPrice || 0)?.toLocaleString()}<span className="text-sm text-gray-600">/mo</span></p>
                </div>

                {/* Care Types */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Care Types</span>
                  </div>
                  <p className="text-sm text-gray-700">{home?.careTypes?.length || 0} available</p>
                </div>
              </div>

              {/* Care Types & Amenities */}
              <div className="space-y-4 mb-6">
                {/* Care Types */}
                {home?.careTypes && home?.careTypes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Care Services:</h4>
                    <div className="flex flex-wrap gap-2">
                      {home.careTypes.map((type, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
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
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Amenities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {home.amenities.slice(0, 8).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                      {home.amenities.length > 8 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          +{home.amenities.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Info & Action */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm text-gray-600">
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
                </div>

                <button
                  onClick={() => handleSendRequest(home)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Placement Request</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placement Request Modal */}
      {selectedHome && (
        <PlacementRequestModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          home={selectedHome}
          searchId={searchId}
        />
      )}
    </div>
  );
}
