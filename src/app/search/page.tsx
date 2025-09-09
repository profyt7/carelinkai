"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  FiSearch, 
  FiMapPin, 
  FiList, 
  FiFilter, 
  FiX, 
  FiStar, 
  FiDollarSign, 
  FiUsers, 
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiHeart,
  FiInfo,
  FiHome,
  FiAward,
  FiMessageCircle
} from "react-icons/fi";
import { CareLevel } from "@prisma/client";
import { 
  searchHomes, 
  getCareLevelName, 
  parseNaturalLanguageQuery,
  getRecommendedSearches,
  type SearchParams,
  type SearchResponse,
  type SearchResultItem
} from "@/lib/searchService";
import { formatCurrency } from "@/lib/utils";
import {
  getFavorites,
  toggleFavorite,
} from "@/lib/favoritesService";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SearchFilters from "@/components/search/SearchFilters";
import dynamic from "next/dynamic";

// Dynamically import the map (Leaflet) to avoid SSR issues
const SimpleMap = dynamic(
  () => import("@/components/search/SimpleMap"),
  { ssr: false }
);

// Care level options for filtering
const CARE_LEVELS = [
  { id: CareLevel.INDEPENDENT, label: "Independent Living" },
  { id: CareLevel.ASSISTED, label: "Assisted Living" },
  { id: CareLevel.MEMORY_CARE, label: "Memory Care" },
  { id: CareLevel.SKILLED_NURSING, label: "Skilled Nursing" }
];

// Gender options for filtering
const GENDER_OPTIONS = [
  { id: "ALL", label: "All Genders" },
  { id: "FEMALE", label: "Female Only" },
  { id: "MALE", label: "Male Only" }
];

export default function SearchPage() {
  // Search params and router for query handling
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for view type (map or list)
  const [viewType, setViewType] = useState<"list" | "grid" | "map">("grid");
  
  // State for mobile filter visibility
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // State for natural language query
  const [naturalQuery, setNaturalQuery] = useState(searchParams.get("q") || "");
  
  // Ref for the map container
  const mapRef = useRef<HTMLDivElement>(null);
  
  // State for search filters
  const [filters, setFilters] = useState<SearchParams>({
    query: searchParams.get("q") || "",
    location: searchParams.get("location") || "",
    careLevels: searchParams.getAll("careLevel") as CareLevel[] || [],
    gender: (searchParams.get("gender") as "ALL" | "MALE" | "FEMALE") || "ALL",
    priceMin: searchParams.get("priceMin") || "",
    priceMax: searchParams.get("priceMax") || "",
    availability: searchParams.get("availability") === "true",
    verified: searchParams.get("verified") === "true",
    radius: searchParams.get("radius") ? parseInt(searchParams.get("radius") || "0") : undefined,
    sortBy: searchParams.get("sortBy") as "relevance" | "price_low" | "price_high" | "distance" | "rating" || "relevance",
    page: parseInt(searchParams.get("page") || "1"),
    limit: 10,
  });
  
  // State for search results
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);

  // ---- Favorites -----------------------------------------------------------------
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Fetch favorites once (or when session changes in future)
  useEffect(() => {
    async function fetchFavorites() {
      try {
        const favs = await getFavorites();
        setFavoriteIds(new Set(favs.map((f) => f.homeId)));
      } catch (err) {
        console.error("Failed to load favorites", err);
      }
    }
    fetchFavorites();
  }, []);

  const handleToggleFavorite = async (homeId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault(); // prevent link navigation
      e.stopPropagation(); // prevent bubbling
    }
    
    // optimistic UI
    setFavoriteIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(homeId)) {
        newSet.delete(homeId);
      } else {
        newSet.add(homeId);
      }
      return newSet;
    });

    try {
      await toggleFavorite(homeId);
    } catch (err) {
      // revert on error
      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(homeId)) {
          newSet.delete(homeId);
        } else {
          newSet.add(homeId);
        }
        return newSet;
      });
      console.error("Failed to toggle favorite", err);
    }
  };

  // State for search suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Ref for suggestions dropdown
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle filter changes
  const handleFilterChange = (name: string, value: any) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle care level selection (multiple selection)
  const handleCareLevelChange = (level: CareLevel) => {
    setFilters(prev => {
      const currentLevels = [...(prev.careLevels || [])];
      if (currentLevels.includes(level)) {
        return { ...prev, careLevels: currentLevels.filter(l => l !== level) };
      } else {
        return { ...prev, careLevels: [...currentLevels, level] };
      }
    });
  };

  // Handle natural language query change
  const handleNaturalQueryChange = (value: string) => {
    setNaturalQuery(value);
    
    // Show suggestions when typing
    if (value.length > 2) {
      const recommendedSearches = getRecommendedSearches();
      const matchedSuggestions = recommendedSearches.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      );
      
      setSuggestions(matchedSuggestions.length > 0 ? matchedSuggestions : recommendedSearches.slice(0, 3));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    setNaturalQuery(suggestion);
    setShowSuggestions(false);
    
    // Extract parameters from natural language query
    const extractedParams = parseNaturalLanguageQuery(suggestion);
    
    // Update filters with extracted parameters
    setFilters(prev => ({
      ...prev,
      query: suggestion,
      ...extractedParams
    }));
    
    // Perform search with the suggestion
    performSearch({
      ...filters,
      query: suggestion,
      ...extractedParams
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Apply filters to search
  const applyFilters = () => {
    // Extract parameters from natural language query
    const extractedParams = parseNaturalLanguageQuery(naturalQuery);
    
    // Merge extracted parameters with explicit filters
    const searchParams: SearchParams = {
      ...filters,
      query: naturalQuery,
      ...extractedParams
    };
    
    // Update URL with filters
    updateSearchUrl(searchParams);
    
    // Perform search
    performSearch(searchParams);
  };

  // Update URL with search parameters
  const updateSearchUrl = (params: SearchParams) => {
    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.set("q", params.query);
    if (params.location) queryParams.set("location", params.location);
    
    if (params.careLevels && params.careLevels.length > 0) {
      params.careLevels.forEach(level => {
        queryParams.append("careLevel", level);
      });
    }
    
    if (params.priceMin) queryParams.set("priceMin", params.priceMin.toString());
    if (params.priceMax) queryParams.set("priceMax", params.priceMax.toString());
    if (params.gender) queryParams.set("gender", params.gender);
    if (params.availability) queryParams.set("availability", "true");
    if (params.verified) queryParams.set("verified", "true");
    if (params.radius) queryParams.set("radius", params.radius.toString());
    if (params.sortBy) queryParams.set("sortBy", params.sortBy);
    if (params.page && params.page > 1) queryParams.set("page", params.page.toString());
    
    router.push(`/search?${queryParams.toString()}`);
  };
  
  // Perform search with given parameters
  const performSearch = async (params: SearchParams) => {
    setIsLoading(true);
    
    try {
      const response = await searchHomes(params);
      setSearchResponse(response);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setNaturalQuery("");
    setFilters({
      query: "",
      location: "",
      careLevels: [],
      gender: "ALL",
      priceMin: "",
      priceMax: "",
      availability: false,
      verified: false,
      radius: undefined,
      sortBy: "relevance",
      page: 1,
      limit: 10,
    });
    
    router.push("/search");
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    
    // Update URL and perform search with new page
    const updatedParams = { ...filters, page: newPage };
    updateSearchUrl(updatedParams);
    performSearch(updatedParams);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // Initialize map (would be implemented with Google Maps API in production)
  useEffect(() => {
    if (viewType === "map" && mapRef.current) {
      // In a real app, we would initialize Google Maps here
      console.log("Map view initialized");
    }
  }, [viewType]);
  
  // Apply initial filters on load
  useEffect(() => {
    const query = searchParams.get("q");
    
    // Extract parameters from natural language query if it exists
    if (query) {
      // Extract parameters from natural language query
      const extractedParams = parseNaturalLanguageQuery(query);
      
      // Update filters with extracted parameters
      setFilters(prev => ({
        ...prev,
        query,
        ...extractedParams
      }));
    }
    
    // Always apply filters on initial load
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get search results
  const searchResults = searchResponse?.results || [];
  
  return (
    <DashboardLayout title="Search Homes" showSearch={false}>
      <div className="p-4 md:p-6">
        {/* Natural language search bar */}
        <div className="relative mb-6">
          <div className="flex w-full items-center rounded-lg border border-neutral-300 bg-white">
            <div className="flex flex-1 items-center px-3">
              <FiSearch className="text-neutral-400" />
              <input
                type="text"
                placeholder="Try 'Memory care near San Francisco' or 'Assisted living under $5000'"
                value={naturalQuery}
                onChange={(e) => handleNaturalQueryChange(e.target.value)}
                className="w-full border-none py-3 pl-2 text-sm focus:outline-none focus:ring-0"
              />
            </div>
            <button
              onClick={applyFilters}
              className="rounded-r-lg bg-primary-500 px-4 py-3 text-white hover:bg-primary-600"
            >
              <FiSearch className="h-5 w-5" />
            </button>
          </div>

          {/* Search suggestions */}
          {showSuggestions && (
            <div 
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-neutral-200 bg-white shadow-lg"
            >
              <div className="p-2">
                <p className="mb-2 px-2 text-xs font-medium text-neutral-500">
                  Suggested searches:
                </p>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-100"
                  >
                    <FiSearch className="mr-2 text-neutral-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active filters */}
        {((filters.careLevels?.length ?? 0) > 0 || 
          filters.priceMin || 
          filters.priceMax || 
          filters.gender !== "ALL" || 
          filters.availability ||
          filters.verified ||
          filters.radius) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Active filters:</span>
            
            {filters.careLevels?.map(level => (
              <span 
                key={level}
                className="flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700"
              >
                {getCareLevelName(level)}
                <button 
                  onClick={() => handleCareLevelChange(level)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-200"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            ))}
            
            {(filters.priceMin || filters.priceMax) && (
              <span className="flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                {filters.priceMin && !filters.priceMax && `Min $${filters.priceMin}`}
                {!filters.priceMin && filters.priceMax && `Max $${filters.priceMax}`}
                {filters.priceMin && filters.priceMax && `$${filters.priceMin} - $${filters.priceMax}`}
                <button 
                  onClick={() => {
                    setFilters(prev => ({ ...prev, priceMin: "", priceMax: "" }));
                  }}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-200"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.gender !== "ALL" && (
              <span className="flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                {filters.gender === "MALE" ? "Male Only" : "Female Only"}
                <button 
                  onClick={() => handleFilterChange("gender", "ALL")}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-200"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.availability && (
              <span className="flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                Has Availability
                <button 
                  onClick={() => handleFilterChange("availability", false)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-200"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.verified && (
              <span className="flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                Verified Only
                <button 
                  onClick={() => handleFilterChange("verified", false)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-200"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.radius && (
              <span className="flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                Within {filters.radius} miles
                <button 
                  onClick={() => handleFilterChange("radius", undefined)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-200"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.sortBy && filters.sortBy !== "relevance" && (
              <span className="flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                Sort: {filters.sortBy.replace("_", " ")}
                <button 
                  onClick={() => handleFilterChange("sortBy", "relevance")}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-200"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            )}
            
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-primary-600 hover:text-primary-800"
            >
              Clear All
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-neutral-800">Find Your Ideal Care Home</h2>
          
          <div className="flex items-center space-x-2">
            {/* View toggle buttons */}
            <div className="hidden rounded-md border border-neutral-200 bg-white md:flex">
              <button
                onClick={() => setViewType("grid")}
                className={`flex items-center px-3 py-1.5 text-sm ${
                  viewType === "grid"
                    ? "bg-primary-500 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewType("list")}
                className={`flex items-center px-3 py-1.5 text-sm ${
                  viewType === "list"
                    ? "bg-primary-500 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <FiList className="mr-1" />
                List
              </button>
              <button
                onClick={() => setViewType("map")}
                className={`flex items-center px-3 py-1.5 text-sm ${
                  viewType === "map"
                    ? "bg-primary-500 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <FiMapPin className="mr-1" />
                Map
              </button>
            </div>
            
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 md:hidden"
            >
              <FiFilter className="mr-1" />
              Filters
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:space-x-6">
          {/* Filters sidebar - desktop */}
          <div className="mb-6 hidden w-64 shrink-0 md:block">
            <SearchFilters 
              filters={filters}
              onFilterChange={handleFilterChange}
              onCareLevelChange={handleCareLevelChange}
              onApplyFilters={applyFilters}
              onResetFilters={resetFilters}
            />
          </div>
          
          {/* Mobile filters - slide in panel */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-30 overflow-hidden md:hidden">
              <div className="absolute inset-0 bg-neutral-900 bg-opacity-50" onClick={() => setShowMobileFilters(false)}></div>
              <div className="absolute bottom-0 left-0 right-0 h-[80vh] rounded-t-xl bg-white p-4 shadow-lg">
                <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-2">
                  <h2 className="text-lg font-medium text-neutral-800">Filters</h2>
                  <button onClick={() => setShowMobileFilters(false)}>
                    <FiX className="h-5 w-5 text-neutral-500" />
                  </button>
                </div>
                
                <div className="h-[calc(80vh-6rem)] overflow-y-auto">
                  <SearchFilters 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onCareLevelChange={handleCareLevelChange}
                    onApplyFilters={() => {
                      applyFilters();
                      setShowMobileFilters(false);
                    }}
                    onResetFilters={resetFilters}
                    isMobile={true}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Main content area */}
          <div className="flex-1">
            {/* Results summary */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                {isLoading ? (
                  "Searching..."
                ) : searchResponse ? (
                  <>
                    Found <span className="font-medium">{searchResponse.pagination.totalResults}</span> homes
                  </>
                ) : (
                  "Enter search criteria"
                )}
              </p>
              
              {/* Mobile view toggle */}
              <div className="flex rounded-md border border-neutral-200 bg-white md:hidden">
                <button
                  onClick={() => setViewType("grid")}
                  className={`flex items-center px-3 py-1.5 text-sm ${
                    viewType === "grid"
                      ? "bg-primary-500 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewType("list")}
                  className={`flex items-center px-3 py-1.5 text-sm ${
                    viewType === "list"
                      ? "bg-primary-500 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <FiList className="mr-1" />
                  List
                </button>
                <button
                  onClick={() => setViewType("map")}
                  className={`flex items-center px-3 py-1.5 text-sm ${
                    viewType === "map"
                      ? "bg-primary-500 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <FiMapPin className="mr-1" />
                  Map
                </button>
              </div>
            </div>
            
            {/* Loading state */}
            {isLoading && (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
              </div>
            )}
            
            {/* No results state */}
            {!isLoading && searchResults.length === 0 && (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white p-8 text-center">
                <div className="mb-4 rounded-full bg-neutral-100 p-4">
                  <FiSearch className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-neutral-800">No homes found</h3>
                <p className="mb-4 text-neutral-600">
                  Try adjusting your filters or search for a different location.
                </p>
                <button
                  onClick={resetFilters}
                  className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                >
                  Reset Filters
                </button>
              </div>
            )}
            
            {/* Grid view */}
            {!isLoading && viewType === "grid" && searchResults.length > 0 && (
              <div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((home) => (
                    <div
                      key={home.id}
                      className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <Link href={`/homes/${home.id}`} className="block">
                        <div className="relative h-48 w-full">
                          {home.imageUrl ? (
                            <div className="h-full w-full">
                              <Image
                                src={home.imageUrl}
                                alt={home.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-200">
                              <FiHome className="h-12 w-12 text-neutral-400" />
                            </div>
                          )}
                          
                          {/* AI Match Score */}
                          <div className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-2 py-1 text-xs font-medium text-white shadow-md">
                            <div className="flex items-center">
                              <FiAward className="mr-1" />
                              {home.aiMatchScore}% Match
                            </div>
                          </div>
                          
                          {/* Availability badge */}
                          {home.availability > 0 ? (
                            <div className="absolute right-2 top-2 rounded-full bg-success-500 px-2 py-1 text-xs font-medium text-white shadow-md">
                              {home.availability} Available
                            </div>
                          ) : (
                            <div className="absolute right-2 top-2 rounded-full bg-neutral-500 px-2 py-1 text-xs font-medium text-white shadow-md">
                              Waitlist
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col p-4">
                          <h3 className="mb-1 text-lg font-medium text-neutral-800">{home.name}</h3>
                          <p className="mb-2 text-sm text-neutral-600">
                            {home.address?.city}, {home.address?.state}
                          </p>
                          
                          {/* Care levels */}
                          <div className="mb-3 flex flex-wrap gap-1">
                            {home.careLevel.map((level) => (
                              <span
                                key={`${home.id}-${level}`}
                                className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700"
                              >
                                {getCareLevelName(level)}
                              </span>
                            ))}
                          </div>
                          
                          <div className="mt-auto flex items-center justify-between">
                            <span className="text-xs font-medium text-neutral-700">
                              {home.priceRange.formattedMin}+
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={favoriteIds.has(home.id) ? "Unfavorite" : "Favorite"}
                                onClick={(e) => handleToggleFavorite(home.id, e)}
                                className="group"
                              >
                                <FiHeart
                                  className={`h-4 w-4 ${
                                    favoriteIds.has(home.id)
                                      ? "text-primary-500 fill-current"
                                      : "text-neutral-400 group-hover:text-primary-500"
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                className="rounded-md bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
                              >
                                View Listing
                              </button>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Map view */}
            {!isLoading && viewType === "map" && searchResults.length > 0 && (
              <div className="h-[calc(100vh-12rem)] w-full">
                <SimpleMap
                  homes={searchResults as any}
                  onToggleFavorite={handleToggleFavorite}
                  favorites={Array.from(favoriteIds)}
                />
              </div>
            )}
            
            {/* List view */}
            {!isLoading && viewType === "list" && searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((home) => (
                  <div
                    key={home.id}
                    className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <Link href={`/homes/${home.id}`} className="block">
                      <div className="flex flex-col md:flex-row">
                        {/* Image section */}
                        <div className="relative h-48 w-full md:h-auto md:w-1/3">
                          {home.imageUrl ? (
                            <div className="h-full w-full">
                              <Image
                                src={home.imageUrl}
                                alt={home.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-200">
                              <FiHome className="h-12 w-12 text-neutral-400" />
                            </div>
                          )}
                          
                          {/* AI Match Score */}
                          <div className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-2 py-1 text-xs font-medium text-white shadow-md">
                            <div className="flex items-center">
                              <FiAward className="mr-1" />
                              {home.aiMatchScore}% Match
                            </div>
                          </div>
                          
                          {/* Availability badge */}
                          {home.availability > 0 ? (
                            <div className="absolute right-2 top-2 rounded-full bg-success-500 px-2 py-1 text-xs font-medium text-white shadow-md">
                              {home.availability} Available
                            </div>
                          ) : (
                            <div className="absolute right-2 top-2 rounded-full bg-neutral-500 px-2 py-1 text-xs font-medium text-white shadow-md">
                              Waitlist
                            </div>
                          )}
                        </div>
                        
                        {/* Content section */}
                        <div className="flex flex-1 flex-col p-4">
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-neutral-800">{home.name}</h3>
                              <p className="text-sm text-neutral-600">
                                {home.address ? 
                                  `${home.address.street}, ${home.address.city}, ${home.address.state} ${home.address.zipCode}` : 
                                  "Address not available"}
                              </p>
                            </div>
                          </div>
                          
                          <p className="mb-3 line-clamp-2 text-sm text-neutral-600">{home.description}</p>
                          
                          {/* Care levels */}
                          <div className="mb-3 flex flex-wrap gap-2">
                            {home.careLevel.map((level) => (
                              <span
                                key={`${home.id}-${level}`}
                                className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700"
                              >
                                {getCareLevelName(level)}
                              </span>
                            ))}
                          </div>
                          
                          {/* Amenities */}
                          <div className="mb-3 flex flex-wrap gap-2">
                            {home.amenities.slice(0, 3).map((amenity) => (
                              <span
                                key={`${home.id}-${amenity}`}
                                className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                              >
                                {amenity}
                              </span>
                            ))}
                            {home.amenities.length > 3 && (
                              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                                +{home.amenities.length - 3} more
                              </span>
                            )}
                          </div>
                          
                          {/* Price + actions */}
                          <div className="mt-auto flex items-center justify-between">
                            <div>
                              <span className="text-lg font-semibold text-neutral-800">
                                {home.priceRange.formattedMin || "$0"}
                              </span>
                              <span className="text-sm text-neutral-500">
                                {" - "}{home.priceRange.formattedMax || "$0"}/mo
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                aria-label={favoriteIds.has(home.id) ? "Unfavorite" : "Favorite"}
                                onClick={(e) => handleToggleFavorite(home.id, e)}
                                className="rounded-full p-2 transition-colors hover:bg-neutral-100"
                              >
                                <FiHeart
                                  className={`h-5 w-5 ${
                                    favoriteIds.has(home.id)
                                      ? "text-primary-500 fill-current"
                                      : "text-neutral-400 hover:text-primary-500"
                                  }`}
                                />
                              </button>
                              <button className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
                                View Listing
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {!isLoading && searchResponse && searchResponse.pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center">
                <nav className="flex items-center space-x-1" aria-label="Pagination">
                  <button 
                    onClick={() => handlePageChange(Math.max(1, (filters.page || 1) - 1))}
                    disabled={(filters.page || 1) <= 1}
                    className={`rounded-md border px-2 py-1 text-sm ${
                      (filters.page || 1) <= 1 
                        ? "border-neutral-200 bg-neutral-50 text-neutral-400" 
                        : "border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50"
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Generate page buttons */}
                  {Array.from({ length: Math.min(5, searchResponse.pagination.totalPages) }, (_, i) => {
                    // Calculate which pages to show
                    const currentPage = filters.page || 1;
                    const totalPages = searchResponse.pagination.totalPages;
                    
                    let pageNum;
                    if (totalPages <= 5) {
                      // Show all pages if 5 or fewer
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      // Near start
                      if (i < 4) {
                        pageNum = i + 1;
                      } else {
                        pageNum = totalPages;
                      }
                    } else if (currentPage >= totalPages - 2) {
                      // Near end
                      if (i === 0) {
                        pageNum = 1;
                      } else {
                        pageNum = totalPages - 4 + i;
                      }
                    } else {
                      // Middle
                      if (i === 0) {
                        pageNum = 1;
                      } else if (i === 4) {
                        pageNum = totalPages;
                      } else {
                        pageNum = currentPage + i - 2;
                      }
                    }
                    
                    // Add ellipsis
                    if ((i === 1 && pageNum !== 2) || (i === 3 && pageNum !== totalPages - 1)) {
                      return (
                        <span key={`ellipsis-${i}`} className="px-1 text-neutral-500">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`rounded-md border px-3 py-1 text-sm ${
                          pageNum === (filters.page || 1)
                            ? "border-primary-300 bg-primary-50 font-medium text-primary-600"
                            : "border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button 
                    onClick={() => handlePageChange((filters.page || 1) + 1)}
                    disabled={(filters.page || 1) >= searchResponse.pagination.totalPages}
                    className={`rounded-md border px-2 py-1 text-sm ${
                      (filters.page || 1) >= searchResponse.pagination.totalPages
                        ? "border-neutral-200 bg-neutral-50 text-neutral-400" 
                        : "border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50"
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}

            {/* Search tips */}
            {!isLoading && searchResults.length > 0 && (
              <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-medium text-neutral-700">
                  <FiMessageCircle className="mr-1 inline" /> Search Tips
                </h3>
                <p className="text-xs text-neutral-600">
                  Try natural language searches like "memory care near San Francisco" or "assisted living with garden under $5000". 
                  Our AI will understand your needs and find the best matches.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
