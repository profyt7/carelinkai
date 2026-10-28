'use client';

import { useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import SearchResults from './SearchResults';
import { toast } from 'react-hot-toast';

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

interface SearchResponse {
  searchId: string;
  query: string;
  criteria: any;
  matches: SearchResult[];
  totalMatches: number;
}

const EXAMPLE_QUERIES = [
  "I need a memory care facility in Beachwood for a 78-year-old with moderate Alzheimer's, budget around $6,000/month",
  "Looking for assisted living in Lakewood with physical therapy, 24/7 nursing, accepts Medicaid",
  "Need a home in Parma for a veteran with PTSD, private room, pet-friendly, under $5,000/month",
  "Seeking skilled nursing facility in Westlake for post-stroke patient, needs speech therapy, Medicare coverage"
];

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query?.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults(null);

    try {
      const response = await fetch('/api/discharge-planner/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
      toast.success(`Found ${data?.totalMatches || 0} matching homes!`);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err?.message || 'Failed to search homes');
      toast.error(err?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults(null);
    setError(null);
  };

  return (
    <div className="space-y-8">
      {/* Search Input */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="space-y-4">
          <label htmlFor="search-query" className="block text-lg font-semibold text-neutral-900">
            Describe your patient's needs:
          </label>
          <div className="relative">
            <textarea
              id="search-query"
              value={query}
              onChange={(e) => setQuery(e?.target?.value || '')}
              placeholder="E.g., I need a memory care facility in Beachwood for a 78-year-old with moderate Alzheimer's, budget around $6,000/month..."
              rows={4}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-base"
              disabled={isSearching}
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                disabled={isSearching}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={isSearching || !query?.trim()}
            className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            {isSearching ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Searching with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Search with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Example Queries */}
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Example searches:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXAMPLE_QUERIES?.map((example, index) => (
              <button
                key={index}
                onClick={() => setQuery(example)}
                className="text-left p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 transition-colors"
                disabled={isSearching}
              >
                <Search className="h-4 w-4 inline mr-2 text-neutral-400" />
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-xl p-6">
          <h3 className="text-error-800 font-semibold mb-2">Search Error</h3>
          <p className="text-error-600">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults && (
        <SearchResults
          searchId={searchResults?.searchId || ''}
          query={searchResults?.query || ''}
          matches={searchResults?.matches || []}
          totalMatches={searchResults?.totalMatches || 0}
        />
      )}
    </div>
  );
}
