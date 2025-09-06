import React, { useState, useEffect } from 'react';
import { CareLevel } from '@prisma/client';
import type { SearchParams } from '@/lib/searchService';
import { 
  validateSearchParams,
  getCareLevelName
} from '@/lib/searchService';

/**
 * Props expected by /search page
 *
 * NOTE: Internally we still manage a `localFilters` copy, but
 * all "upwards" communication now uses the new callback names
 * so SearchPage compiles without changes.
 */
interface SearchFiltersProps {
  filters: SearchParams;
  onFilterChange: (name: string, value: any) => void;
  onCareLevelChange: (level: CareLevel) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  isMobile?: boolean;
  loading?: boolean;
}

const COMMON_AMENITIES = [
  'Private Rooms',
  'Semi-Private Rooms',
  'Housekeeping',
  'Laundry Service',
  'Medication Management',
  'Transportation',
  'Beauty Salon',
  'Fitness Center',
  'Garden',
  'Pet Friendly',
  'WiFi',
  'Cable TV',
  'Emergency Call System'
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' }
];

/**
 * Enhanced search filters component for CareLinkAI
 * 
 * Provides a comprehensive set of filters for searching assisted living homes,
 * including care level, price range, location, and more.
 */
export default function SearchFilters({
  filters,
  /* new props expected by parent: */
  onFilterChange,
  onCareLevelChange,
  onApplyFilters,
  onResetFilters,
  isMobile = false,
  /* optional */
  loading = false,
}: SearchFiltersProps) {
  // Local state for filter values
  const [localFilters, setLocalFilters] = useState<SearchParams>(filters);
  const [errors, setErrors] = useState<string[]>([]);
  const [showAmenities, setShowAmenities] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    filters.amenities || []
  );
  
  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
    setSelectedAmenities(filters.amenities || []);
  }, [filters]);

  // Count active filters for badge
  const countActiveFilters = (): number => {
    let count = 0;
    if (localFilters.careLevels?.length) count += localFilters.careLevels.length;
    if (localFilters.priceMin) count++;
    if (localFilters.priceMax) count++;
    if (localFilters.location) count++;
    if (localFilters.gender && localFilters.gender !== 'ALL') count++;
    if (localFilters.availability !== undefined) count++;
    if (localFilters.amenities?.length) count++;
    if (localFilters.radius) count++;
    if (localFilters.sortBy && localFilters.sortBy !== 'relevance') count++;
    if (localFilters.verified) count++;
    return count;
  };

  // Handle filter changes (proxy → parent)
  const handleFilterChange = (field: keyof SearchParams, value: any) => {
    const newFilters = { ...localFilters, [field]: value };
    
    // Validate filters
    const validationErrors = validateSearchParams(newFilters);
    setErrors(validationErrors);
    
    setLocalFilters(newFilters);

    // Only propagate if valid
    if (validationErrors.length === 0) {
      onFilterChange(field, value);
    }
  };

  // Handle care level toggle
  const handleCareLevelToggle = (level: CareLevel) => {
    const currentLevels = localFilters.careLevels || [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter(l => l !== level)
      : [...currentLevels, level];
    
    /* delegate to parent convenience handler */
    onCareLevelChange(level);
  };

  // Handle amenity toggle
  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter(a => a !== amenity)
      : [...selectedAmenities, amenity];
    
    setSelectedAmenities(newAmenities);
    handleFilterChange('amenities', newAmenities);
  };

  // Reset all filters
  const handleReset = () => {
    setErrors([]);
    setSelectedAmenities([]);
    onResetFilters();
  };

  // Format price for display
  const formatPrice = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="p-4 md:p-6">
        {/* Header with title and clear button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {countActiveFilters() > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {countActiveFilters()}
              </span>
            )}
          </h2>
          
          <button 
            onClick={handleReset}
            disabled={countActiveFilters() === 0 || loading}
            className={`flex items-center text-sm px-3 py-1 rounded-md 
              ${countActiveFilters() === 0 || loading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            aria-label="Clear all filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All
          </button>
        </div>
        
        {/* Error messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}

        {/* --- MAIN FILTERS: horizontal card layout -------------------------------- */}
        {/* Each card gets a min-width so it never collapses too much;               */}
        {/* flex-wrap lets them flow nicely on smaller screens                       */}
        <div className="flex flex-wrap gap-4">
          {/* Care Level Section */}
          <div className="min-w-[230px] flex-1 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Care Level
            </h3>
            <div className="space-y-2">
              {Object.values(CareLevel).map(level => (
                <label key={level} className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={(localFilters.careLevels || []).includes(level)}
                    onChange={() => handleCareLevelToggle(level)}
                    disabled={loading}
                    aria-label={`Filter by ${getCareLevelName(level)}`}
                  />
                  <span className="ml-2 text-sm text-gray-700">{getCareLevelName(level)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Section */}
          <div className="min-w-[230px] flex-1 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Monthly Budget
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Min Price"
                  value={localFilters.priceMin || ''}
                  onChange={(e) => handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={loading}
                  aria-label="Minimum price"
                  min="0"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Max Price"
                  value={localFilters.priceMax || ''}
                  onChange={(e) => handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={loading}
                  aria-label="Maximum price"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="min-w-[230px] flex-1 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location
            </h3>
            <input
              type="text"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="City, State, or ZIP"
              value={localFilters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              disabled={loading}
              aria-label="Location search"
            />
            
            {/* Radius filter */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Search Radius: {localFilters.radius || 25} miles</span>
              </div>
              <input
                type="range"
                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                  ${!localFilters.location || loading ? 'opacity-50' : ''}`}
                min="5"
                max="100"
                step="5"
                value={localFilters.radius || 25}
                onChange={(e) => handleFilterChange('radius', Number(e.target.value))}
                disabled={loading || !localFilters.location}
                aria-label="Search radius in miles"
              />
              {!localFilters.location && (
                <p className="mt-1 text-xs text-gray-500">Enter a location to set radius</p>
              )}
            </div>
          </div>

          {/* Gender Preference */}
          <div className="min-w-[230px] flex-1 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium mb-2">Gender Preference</h3>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={localFilters.gender || 'ALL'}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              disabled={loading}
              aria-label="Gender preference"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male Only</option>
              <option value="FEMALE">Female Only</option>
            </select>
          </div>

          {/* Sort Options */}
          <div className="min-w-[230px] flex-1 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort Results
            </h3>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={localFilters.sortBy || 'relevance'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              disabled={loading}
              aria-label="Sort results by"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Availability & Verified */}
          <div className="min-w-[230px] flex-1 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium mb-2">Additional Filters</h3>
            
            {/* Availability Number */}
            <div className="mb-3">
              <input
                type="number"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Minimum Availability"
                value={typeof localFilters.availability === 'number' ? localFilters.availability : ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  handleFilterChange('availability', value);
                }}
                disabled={loading}
                min="0"
                aria-label="Minimum number of available spots"
              />
              <p className="mt-1 text-xs text-gray-500">Minimum number of available spots</p>
            </div>
            
            {/* Verified Only Toggle */}
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                checked={!!localFilters.verified}
                onChange={(e) => handleFilterChange('verified', e.target.checked)}
                disabled={loading}
                aria-label="Show verified homes only"
              />
              <span className="ml-2 flex items-center text-sm text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verified Homes Only
              </span>
            </label>
          </div>
        </div>

        {/* Amenities Section */}
        <div className="mt-6">
          <hr className="mb-4 border-gray-200" />
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Amenities</h3>
            <button 
              onClick={() => setShowAmenities(!showAmenities)}
              className="text-sm text-blue-600 hover:text-blue-800"
              aria-expanded={showAmenities}
              aria-controls="amenities-section"
            >
              {showAmenities ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showAmenities && (
            <div 
              id="amenities-section"
              className="flex flex-wrap gap-3"
            >
              {COMMON_AMENITIES.map((amenity) => (
                <label key={amenity} className="flex items-center bg-gray-50 px-3 py-2 rounded-md hover:bg-gray-100 min-w-fit">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={selectedAmenities.includes(amenity)}
                    onChange={() => handleAmenityToggle(amenity)}
                    disabled={loading}
                    aria-label={`Filter by ${amenity}`}
                  />
                  <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                </label>
              ))}
            </div>
          )}
          
          {!showAmenities && selectedAmenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedAmenities.map((amenity) => (
                <span 
                  key={amenity}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {amenity}
                  <button
                    type="button"
                    onClick={() => handleAmenityToggle(amenity)}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label={`Remove ${amenity} filter`}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {countActiveFilters() > 0 && (
          <div className="mt-6">
            <hr className="mb-4 border-gray-200" />
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Active Filters
            </h3>
            <div className="flex flex-wrap gap-2">
              {localFilters.careLevels?.map((level) => (
                <span 
                  key={level}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {getCareLevelName(level)}
                  <button
                    type="button"
                    onClick={() => handleCareLevelToggle(level)}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label={`Remove ${getCareLevelName(level)} filter`}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              
              {localFilters.priceMin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Min: {formatPrice(Number(localFilters.priceMin))}
                  <button
                    type="button"
                    onClick={() => handleFilterChange('priceMin', undefined)}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove minimum price filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {localFilters.priceMax && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Max: {formatPrice(Number(localFilters.priceMax))}
                  <button
                    type="button"
                    onClick={() => handleFilterChange('priceMax', undefined)}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove maximum price filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {localFilters.location && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Location: {localFilters.location}
                  <button
                    type="button"
                    onClick={() => handleFilterChange('location', '')}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove location filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {localFilters.gender && localFilters.gender !== 'ALL' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Gender: {localFilters.gender}
                  <button
                    type="button"
                    onClick={() => handleFilterChange('gender', 'ALL')}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove gender filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {localFilters.radius && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Radius: {localFilters.radius} miles
                  <button
                    type="button"
                    onClick={() => handleFilterChange('radius', undefined)}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove radius filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {localFilters.availability !== undefined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Min Availability: {localFilters.availability}
                  <button
                    type="button"
                    onClick={() => handleFilterChange('availability', undefined)}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove availability filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {localFilters.sortBy && localFilters.sortBy !== 'relevance' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Sort: {SORT_OPTIONS.find(o => o.value === localFilters.sortBy)?.label}
                  <button
                    type="button"
                    onClick={() => handleFilterChange('sortBy', 'relevance')}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove sort filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              
              {localFilters.verified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verified Only
                  <button
                    type="button"
                    onClick={() => handleFilterChange('verified', false)}
                    disabled={loading}
                    className="ml-1 flex-shrink-0 inline-flex text-blue-500 hover:text-blue-700 focus:outline-none"
                    aria-label="Remove verified filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons (mobile friendly) */}
        <div className={`mt-6 flex ${isMobile ? 'flex-col space-y-4' : 'justify-end space-x-3'}`}>
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            Reset
          </button>
          <button
            onClick={onApplyFilters}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
