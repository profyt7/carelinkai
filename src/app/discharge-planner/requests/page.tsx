"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  FiSend, 
  FiCalendar, 
  FiFilter,
  FiEye,
  FiCheck,
  FiX,
  FiClock,
  FiMail,
  FiFileText,
  FiRefreshCw
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

type PlacementRequest = {
  id: string;
  status: string;
  emailSentAt: string | null;
  emailDeliveryStatus: string | null;
  homeResponse: string | null;
  homeResponseAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  home: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
  search: {
    id: string;
    queryText: string;
    createdAt: string;
  };
  patientInfo: any;
};

type FilterType = "all" | "PENDING" | "SENT" | "VIEWED" | "RESPONDED" | "ACCEPTED" | "DECLINED";
type SortType = "date_desc" | "date_asc" | "status";

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchId = searchParams?.get("search");

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PlacementRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PlacementRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("date_desc");
  const [selectedRequest, setSelectedRequest] = useState<PlacementRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRequests();
  }, [searchId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [requests, searchQuery, filter, sortBy]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = searchId
        ? `/api/discharge-planner/requests?searchId=${searchId}`
        : "/api/discharge-planner/requests";

      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch placement requests");
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      setError(err.message || "Failed to load placement requests");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...requests];

    // Apply search query filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (req) =>
          req.home.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.search.queryText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter((req) => req.status === filter);
    }

    // Apply sorting
    switch (sortBy) {
      case "date_desc":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "date_asc":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "status":
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: "bg-neutral-100", text: "text-neutral-700", icon: FiClock },
      SENT: { bg: "bg-blue-100", text: "text-blue-700", icon: FiSend },
      VIEWED: { bg: "bg-amber-100", text: "text-amber-700", icon: FiEye },
      RESPONDED: { bg: "bg-purple-100", text: "text-purple-700", icon: FiMail },
      ACCEPTED: { bg: "bg-green-100", text: "text-green-700", icon: FiCheck },
      DECLINED: { bg: "bg-red-100", text: "text-red-700", icon: FiX },
    };
    return styles[status] || styles.PENDING;
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/discharge-planner/requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      // Refresh the list
      await fetchRequests();
      setSelectedRequest(null);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  if (loading) {
    return (
      <DashboardLayout title="Placement Requests" showSearch={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading placement requests...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Placement Requests" showSearch={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <FiFileText size={48} className="mx-auto mb-2" />
              <p className="font-medium">Failed to load placement requests</p>
              <p className="text-sm text-neutral-600 mt-1">{error}</p>
            </div>
            <button onClick={fetchRequests} className="btn-primary">
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Placement Requests" showSearch={false}>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">Placement Requests</h1>
              <p className="text-neutral-600">Track all placement requests sent to assisted living homes</p>
              {searchId && (
                <button
                  onClick={() => router.push("/discharge-planner/requests")}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  ← View all requests
                </button>
              )}
            </div>
            <button
              onClick={fetchRequests}
              className="btn-secondary inline-flex items-center"
            >
              <FiRefreshCw className="mr-2" size={18} />
              Refresh
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search by home or patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="VIEWED">Viewed</option>
              <option value="RESPONDED">Responded</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="status">By Status</option>
            </select>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
            {[
              { label: "Total", count: requests.length, color: "blue" },
              { label: "Pending", count: requests.filter((r) => r.status === "PENDING").length, color: "neutral" },
              { label: "Sent", count: requests.filter((r) => r.status === "SENT").length, color: "blue" },
              { label: "Viewed", count: requests.filter((r) => r.status === "VIEWED").length, color: "amber" },
              { label: "Responded", count: requests.filter((r) => r.status === "RESPONDED").length, color: "purple" },
              { label: "Accepted", count: requests.filter((r) => r.status === "ACCEPTED").length, color: "green" },
            ].map((stat, idx) => (
              <div key={idx} className={`bg-${stat.color}-50 rounded-lg p-3`}>
                <p className={`text-xs text-${stat.color}-600 font-medium`}>{stat.label}</p>
                <p className={`text-xl font-bold text-${stat.color}-900 mt-1`}>{stat.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <FiSend className="mx-auto text-neutral-300 mb-4" size={64} />
              <p className="text-neutral-600 font-medium mb-2">No requests found</p>
              <p className="text-neutral-500 text-sm">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your filters"
                  : "Send your first placement request to see it here"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-200">
                <AnimatePresence>
                  {paginatedRequests.map((request, index) => {
                    const statusStyle = getStatusBadge(request.status);
                    const StatusIcon = statusStyle.icon;

                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-6 hover:bg-neutral-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-neutral-900">
                                {request.home.name}
                              </h3>
                              <span className={`px-3 py-1 text-xs rounded-full ${statusStyle.bg} ${statusStyle.text} inline-flex items-center`}>
                                <StatusIcon size={12} className="mr-1" />
                                {request.status}
                              </span>
                            </div>

                            <p className="text-sm text-neutral-600 mb-2">
                              {request.home.address}, {request.home.city}, {request.home.state}
                            </p>

                            <p className="text-sm text-neutral-700 truncate mb-2">
                              {request.search.queryText}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                              <div className="flex items-center">
                                <FiCalendar size={12} className="mr-1" />
                                Sent: {new Date(request.createdAt).toLocaleString()}
                              </div>
                              {request.emailSentAt && (
                                <div className="flex items-center">
                                  <FiMail size={12} className="mr-1" />
                                  Email delivered
                                </div>
                              )}
                              {request.homeResponseAt && (
                                <div className="flex items-center">
                                  <FiCheck size={12} className="mr-1" />
                                  Responded: {new Date(request.homeResponseAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
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
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length}
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

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-neutral-900">Request Details</h2>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-neutral-100 rounded-lg"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Home Information</h3>
                  <p className="text-neutral-700">{selectedRequest.home.name}</p>
                  <p className="text-sm text-neutral-600">
                    {selectedRequest.home.address}, {selectedRequest.home.city}, {selectedRequest.home.state}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Search Query</h3>
                  <p className="text-neutral-700">{selectedRequest.search.queryText}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Patient Information</h3>
                  <pre className="bg-neutral-50 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedRequest.patientInfo, null, 2)}
                  </pre>
                </div>

                {selectedRequest.homeResponse && (
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-2">Home Response</h3>
                    <p className="text-neutral-700">{selectedRequest.homeResponse}</p>
                  </div>
                )}

                {selectedRequest.notes && (
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-2">Notes</h3>
                    <p className="text-neutral-700">{selectedRequest.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {["PENDING", "SENT", "VIEWED", "RESPONDED", "ACCEPTED", "DECLINED"].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedRequest.id, status)}
                        disabled={selectedRequest.status === status}
                        className={`px-4 py-2 text-sm rounded-lg ${getStatusBadge(status).bg} ${getStatusBadge(status).text} disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
