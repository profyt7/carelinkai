// Amenities Section - Card-based Layout
// This component should replace the current amenities section in SearchFilters.tsx

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
      className="min-w-[230px] rounded-lg border border-gray-200 p-4"
    >
      <div className="flex flex-wrap gap-3">
        {COMMON_AMENITIES.map((amenity) => (
          <label key={amenity} className="flex items-center bg-gray-50 px-3 py-2 rounded-md hover:bg-gray-100">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              checked={selectedAmenities.includes(amenity)}
              onChange={() => handleAmenityToggle(amenity)}
              disabled={loading}
              aria-label={`Filter by ${amenity}`}
            />
            <span className="ml-2 text-sm text-gray-700 whitespace-nowrap">{amenity}</span>
          </label>
        ))}
      </div>
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
