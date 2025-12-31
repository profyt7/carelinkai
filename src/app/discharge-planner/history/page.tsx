"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  FiSearch, 
  FiCalendar, 
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiSend,
  FiClock
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

type SearchHistoryItem = {
  id: string;
  queryText: string;
  status: string;
  createdAt: string;
  parsedCriteria: any;
  searchResults: any;
  placementRequests: any[];
};

type FilterType = "all" | "SEARCHING" | "COMPLETED" | "CANCELLED";
type SortType = "date_desc" | "date_asc" | "matches_desc" | "requests_desc";

export default function SearchHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState<SearchHistoryItem[]>([]);
  const [filteredSearches, setFilteredSearches] = useState<SearchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("date_desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searches, searchQuery, filter, sortBy]);

  const fetchSearchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/discharge-planner/history", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch search history");
      }

      const data = await response.json();
      setSearches(data.searches || []);
    } catch (err: any) {
      console.error("Error fetching search history:", err);
      setError(err.message || "Failed to load search history");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...searches];

    // Apply search query filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((search) =>
        search.queryText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter((search) => search.status === filter);
    }

    // Apply sorting
    switch (sortBy) {
      case "date_desc":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "date_asc":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "matches_desc":
        filtered.sort((a, b) => {
          const aMatches = Array.isArray(a.searchResults?.matches) ? a.searchResults.matches.length : 0;
          const bMatches = Array.isArray(b.searchResults?.matches) ? b.searchResults.matches.length : 0;
          return bMatches - aMatches;
        });
        break;
      case "requests_desc":
        filtered.sort((a, b) => (b.placementRequests?.length || 0) - (a.placementRequests?.length || 0));
        break;
    }

    setFilteredSearches(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED: "bg-green-100 text-green-700",
      SEARCHING: "bg-blue-100 text-blue-700",
      CANCELLED: "bg-neutral-100 text-neutral-700",
    };
    return styles[status as keyof typeof styles] || "bg-neutral-100 text-neutral-700";
  };

  const getMatchCount = (searchResults: any) => {
    if (!searchResults) return 0;
    if (Array.isArray(searchResults)) return searchResults.length;
    if (searchResults.matches && Array.isArray(searchResults.matches)) {
      return searchResults.matches.length;
    }
    return 0;
  };

  // Pagination
  const totalPages = Math.ceil(filteredSearches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSearches = filteredSearches.slice(startIndex, endIndex);

  if (loading) {
    return (
      <DashboardLayout title="Search History" showSearch={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading search history...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Search History" showSearch={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <FiFileText size={48} className="mx-auto mb-2" />
              <p className="font-medium">Failed to load search history</p>
              <p className="text-sm text-neutral-600 mt-1">{error}</p>
            </div>
            <button onClick={fetchSearchHistory} className="btn-primary">
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Search History" showSearch={false}>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">Search History</h1>
              <p className="text-neutral-600">View and manage all your past placement searches</p>
            </div>
            <button
              onClick={() => router.push("/discharge-planner/search")}
              className="btn-primary inline-flex items-center"
            >
              <FiSearch className="mr-2" size={18} />
              New Search
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="SEARCHING">Searching</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="matches_desc">Most Matches</option>
              <option value="requests_desc">Most Requests</option>
            </select>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Searches</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{searches.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {searches.filter((s) => s.status === "COMPLETED").length}
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-600 font-medium">Total Matches</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {searches.reduce((sum, s) => sum + getMatchCount(s.searchResults), 0)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Requests Sent</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {searches.reduce((sum, s) => sum + (s.placementRequests?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Search Results List */}
        <div className="bg-white rounded-lg shadow">
          {filteredSearches.length === 0 ? (
            <div className="p-12 text-center">
              <FiSearch className="mx-auto text-neutral-300 mb-4" size={64} />
              <p className="text-neutral-600 font-medium mb-2">No searches found</p>
              <p className="text-neutral-500 text-sm">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your filters"
                  : "Start your first placement search to see history"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-200">
                <AnimatePresence>
                  {paginatedSearches.map((search, index) => {
                    const matchCount = getMatchCount(search.searchResults);
                    const requestCount = search.placementRequests?.length || 0;
                    const isExpanded = expandedId === search.id;

                    return (
                      <motion.div
                        key={search.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-neutral-50 transition-colors"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-neutral-900 truncate">
                                  {search.queryText}
                                </h3>
                                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusBadge(search.status)}`}>
                                  {search.status}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                                <div className="flex items-center">
                                  <FiCalendar size={14} className="mr-1" />
                                  {new Date(search.createdAt).toLocaleString()}
                                </div>
                                <div className="flex items-center">
                                  <FiFileText size={14} className="mr-1" />
                                  {matchCount} {matchCount === 1 ? "match" : "matches"}
                                </div>
                                <div className="flex items-center">
                                  <FiSend size={14} className="mr-1" />
                                  {requestCount} {requestCount === 1 ? "request" : "requests"} sent
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => toggleExpand(search.id)}
                              className="ml-4 p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                            >
                              {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                            </button>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-neutral-200"
                              >
                                {/* Parsed Criteria */}
                                {search.parsedCriteria && (
                                  <div className="mb-4">
                                    <h4 className="font-medium text-neutral-900 mb-2">Parsed Criteria:</h4>
                                    <div className="bg-neutral-50 rounded-lg p-4">
                                      <pre className="text-sm text-neutral-700 whitespace-pre-wrap">
                                        {JSON.stringify(search.parsedCriteria, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {/* Matched Homes */}
                                {matchCount > 0 && (
                                  <div className="mb-4">
                                    <h4 className="font-medium text-neutral-900 mb-2">Matched Homes ({matchCount}):</h4>
                                    <div className="grid gap-2">
                                      {(search.searchResults?.matches || []).slice(0, 5).map((match: any, idx: number) => (
                                        <div key={idx} className="bg-neutral-50 rounded-lg p-3 flex items-center justify-between">
                                          <div>
                                            <p className="font-medium text-neutral-900">{match.name || "Unknown Home"}</p>
                                            <p className="text-sm text-neutral-600">{match.location || "Location not specified"}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-medium text-blue-600">Score: {match.score || "N/A"}</p>
                                          </div>
                                        </div>
                                      ))}
                                      {matchCount > 5 && (
                                        <p className="text-sm text-neutral-500 text-center py-2">
                                          +{matchCount - 5} more {matchCount - 5 === 1 ? "match" : "matches"}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => router.push(`/discharge-planner/search?query=${encodeURIComponent(search.queryText)}`)}
                                    className="btn-secondary text-sm"
                                  >
                                    <FiSearch className="mr-2" size={16} />
                                    Search Again
                                  </button>
                                  {requestCount > 0 && (
                                    <button
                                      onClick={() => router.push(`/discharge-planner/requests?search=${search.id}`)}
                                      className="btn-secondary text-sm"
                                    >
                                      <FiFileText className="mr-2" size={16} />
                                      View Requests
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
                  <p className="text-sm text-neutral-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredSearches.length)} of {filteredSearches.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
