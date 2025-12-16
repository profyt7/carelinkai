'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import TourRequestModal from '@/components/tours/TourRequestModal';

interface MatchResult {
  id: string;
  fitScore: number;
  rank: number;
  explanation: string;
  matchFactors: {
    budgetScore: number;
    conditionScore: number;
    careLevelScore: number;
    locationScore: number;
    amenitiesScore: number;
  };
  home: {
    id: string;
    name: string;
    description: string;
    careLevel: string[];
    priceMin: number;
    priceMax: number;
    amenities: string[];
    capacity: number;
    currentOccupancy: number;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    } | null;
    photos: Array<{
      url: string;
      isPrimary: boolean;
    }>;
    operator: {
      companyName: string;
      user: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
      };
    };
  };
}

interface MatchRequest {
  id: string;
  status: string;
  createdAt: string;
  results: MatchResult[];
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [matchRequest, setMatchRequest] = useState<MatchRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [selectedHomeForTour, setSelectedHomeForTour] = useState<{ id: string; name: string } | null>(null);
  
  useEffect(() => {
    if (params.id) {
      fetchMatchResults(params.id as string);
    }
  }, [params.id]);
  
  const fetchMatchResults = async (matchRequestId: string) => {
    try {
      const response = await fetch(`/api/family/match/${matchRequestId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMatchRequest(data.matchRequest);
      } else {
        setError(data.error || 'Failed to load results');
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('An error occurred while loading results');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-blue-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };
  
  const getAvailabilityBadge = (capacity: number, occupancy: number) => {
    const available = capacity - occupancy;
    const percentage = (available / capacity) * 100;
    
    if (percentage > 20) {
      return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
        {available} beds available
      </span>;
    } else if (percentage > 0) {
      return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
        {available} beds available
      </span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
        Waitlist only
      </span>;
    }
  };
  
  const submitFeedback = async (homeId: string, feedbackType: string) => {
    try {
      const response = await fetch(`/api/family/match/${params.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeId, feedbackType })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFeedback(prev => ({ ...prev, [homeId]: feedbackType }));
        
        if (feedbackType === 'PLACEMENT_CONFIRMED') {
          alert('🎉 Congratulations! We\'ve recorded your placement confirmation.');
        }
      } else if (response.status === 409) {
        alert('You\'ve already submitted feedback for this home.');
      } else {
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('An error occurred while submitting feedback');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }
  
  if (error || !matchRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'No results found'}
          </h2>
          <button
            onClick={() => router.push('/dashboard/find-care')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start New Search
          </button>
        </div>
      </div>
    );
  }
  
  const { results } = matchRequest;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/find-care')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center"
          >
            ← New Search
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your Top {results.length} Matches
          </h1>
          <p className="text-lg text-gray-600">
            We've found {results.length} homes that match your preferences
          </p>
        </div>
        
        {/* Results Grid */}
        <div className="space-y-6">
          {results.map((result) => (
            <div
              key={result.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Left Column: Image and Rank */}
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10">
                    <span className="px-3 py-1 bg-white rounded-full font-bold text-gray-900 shadow">
                      #{result.rank}
                    </span>
                  </div>
                  
                  <div className="relative h-48 rounded-lg overflow-hidden bg-gray-200">
                    {result.home.photos.length > 0 ? (
                      <Image
                        src={result.home.photos[0].url}
                        alt={result.home.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span>No image available</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Fit Score Badge */}
                  <div className="mt-4 text-center">
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBackground(result.fitScore)} ${getScoreColor(result.fitScore)}`}>
                      <div>
                        <div className="text-3xl font-bold">{result.fitScore.toFixed(0)}%</div>
                        <div className="text-xs font-medium">MATCH</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Middle Column: Home Details */}
                <div className="lg:col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {result.home.name}
                      </h2>
                      
                      {result.home.address && (
                        <p className="text-sm text-gray-600 mb-2">
                          📍 {result.home.address.city}, {result.home.address.state} {result.home.address.zipCode}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {result.home.careLevel.map((level) => (
                          <span
                            key={level}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                          >
                            {level.replace(/_/g, ' ')}
                          </span>
                        ))}
                        
                        {getAvailabilityBadge(result.home.capacity, result.home.currentOccupancy)}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Monthly Cost</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${result.home.priceMin} - ${result.home.priceMax}
                      </p>
                    </div>
                  </div>
                  
                  {/* AI Explanation */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      💡 Why This Match
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.explanation}
                    </p>
                  </div>
                  
                  {/* Match Factors */}
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {[
                      { label: 'Budget', score: result.matchFactors.budgetScore },
                      { label: 'Condition', score: result.matchFactors.conditionScore },
                      { label: 'Care Level', score: result.matchFactors.careLevelScore },
                      { label: 'Location', score: result.matchFactors.locationScore },
                      { label: 'Amenities', score: result.matchFactors.amenitiesScore }
                    ].map((factor) => (
                      <div key={factor.label} className="text-center">
                        <div className={`text-lg font-bold ${getScoreColor(factor.score)}`}>
                          {factor.score.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-600">{factor.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Amenities */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.home.amenities.slice(0, 6).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {amenity}
                        </span>
                      ))}
                      {result.home.amenities.length > 6 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{result.home.amenities.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Link
                        href={`/homes/${result.home.id}`}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 font-medium"
                      >
                        View Full Profile
                      </Link>
                      
                      <button
                        onClick={() => {
                          setSelectedHomeForTour({ id: result.home.id, name: result.home.name });
                          setTourModalOpen(true);
                        }}
                        className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 text-center rounded-md hover:bg-blue-50 font-medium"
                      >
                        Schedule Tour
                      </button>
                    </div>
                    
                    {/* Feedback Buttons */}
                    {feedback[result.home.id] ? (
                      <div className="text-center py-2 bg-green-50 text-green-700 rounded-md font-medium">
                        ✓ {feedback[result.home.id] === 'THUMBS_UP' ? 'Liked' : 
                           feedback[result.home.id] === 'THUMBS_DOWN' ? 'Not interested' : 
                           'Placement confirmed!'}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitFeedback(result.home.id, 'THUMBS_UP')}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-green-50 hover:border-green-500 hover:text-green-700"
                        >
                          👍 Like
                        </button>
                        
                        <button
                          onClick={() => submitFeedback(result.home.id, 'THUMBS_DOWN')}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-red-50 hover:border-red-500 hover:text-red-700"
                        >
                          👎 Not Interested
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm('Confirm that you have chosen this home?')) {
                              submitFeedback(result.home.id, 'PLACEMENT_CONFIRMED');
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                        >
                          ✓ Chose This Home
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Not seeing what you're looking for?
          </p>
          <button
            onClick={() => router.push('/dashboard/find-care')}
            className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-50 font-medium"
          >
            Refine Search Criteria
          </button>
        </div>
      </div>

      {/* Tour Request Modal */}
      {selectedHomeForTour && (
        <TourRequestModal
          isOpen={tourModalOpen}
          onClose={() => {
            setTourModalOpen(false);
            setSelectedHomeForTour(null);
          }}
          homeId={selectedHomeForTour.id}
          homeName={selectedHomeForTour.name}
          onSuccess={() => {
            alert('Tour request submitted successfully! Check the Tours page to view your request.');
          }}
        />
      )}
    </div>
  );
}
