"use client";

/**
 * Operator Leads List Page
 * 
 * Displays paginated list of leads with filtering and sorting capabilities.
 * 
 * Features:
 * - Filterable by status, target type, and assignment
 * - Searchable by family name or lead ID
 * - Paginated table view
 * - Responsive design (table on desktop, cards on mobile)
 * - Quick actions (View, Assign, Update Status)
 * - Empty states and loading indicators
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import LeadStatusBadge from "@/components/operator/LeadStatusBadge";
import LeadTargetTypeBadge from "@/components/operator/LeadTargetTypeBadge";
import LeadFilters, { LeadFiltersState } from "@/components/operator/LeadFilters";
import { LeadStatus, LeadTargetType } from "@prisma/client";
import {
  FiEye,
  FiUser,
  FiClock,
  FiAlertCircle,
  FiLoader,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

interface Lead {
  id: string;
  familyId: string;
  targetType: LeadTargetType;
  status: LeadStatus;
  message: string | null;
  preferredStartDate: string | null;
  expectedHoursPerWeek: number | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  family: {
    id: string;
    primaryContactName: string | null;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  aide: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  provider: {
    id: string;
    businessName: string | null;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  assignedOperator: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface LeadsResponse {
  success: boolean;
  data: {
    leads: Lead[];
    pagination: {
      total: number;
      pages: number;
      currentPage: number;
      limit: number;
      hasMore: boolean;
    };
  };
}

export default function OperatorLeadsListPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // State management
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<LeadFiltersState>({
    status: "ALL",
    targetType: "ALL",
    assignedTo: "ALL",
    search: ""
  });

  // Fetch leads with current filters
  const fetchLeads = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy: "createdAt",
        sortOrder: "desc"
      });

      // Add filters
      if (filters.status && filters.status !== "ALL") {
        params.append("status", filters.status);
      }
      if (filters.targetType && filters.targetType !== "ALL") {
        params.append("targetType", filters.targetType);
      }
      if (filters.assignedTo) {
        if (filters.assignedTo === "UNASSIGNED") {
          params.append("assignedOperatorId", "unassigned");
        } else if (filters.assignedTo === "ME") {
          params.append("assignedOperatorId", "me");
        } else if (filters.assignedTo !== "ALL") {
          params.append("assignedOperatorId", filters.assignedTo);
        }
      }

      const response = await fetch(`/api/operator/leads?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }

      const data: LeadsResponse = await response.json();

      // Filter by search term on client side (simple implementation)
      let filteredLeads = data.data.leads;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLeads = filteredLeads.filter(lead => {
          const familyName = `${lead.family.user.firstName} ${lead.family.user.lastName}`.toLowerCase();
          const contactName = lead.family.primaryContactName?.toLowerCase() || "";
          const leadId = lead.id.toLowerCase();
          
          return (
            familyName.includes(searchLower) ||
            contactName.includes(searchLower) ||
            leadId.includes(searchLower)
          );
        });
      }

      setLeads(filteredLeads);
      setCurrentPage(data.data.pagination.currentPage);
      setTotalPages(data.data.pagination.pages);
      setTotalLeads(data.data.pagination.total);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError(err.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch on mount and when filters change
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchLeads(1);
    }
  }, [sessionStatus, filters, fetchLeads]);

  // Handle filter changes
  const handleFilterChange = (newFilters: LeadFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchLeads(newPage);
  };

  // Get target name (aide or provider)
  const getTargetName = (lead: Lead): string => {
    if (lead.targetType === "AIDE" && lead.aide) {
      return `${lead.aide.user.firstName} ${lead.aide.user.lastName}`;
    } else if (lead.targetType === "PROVIDER" && lead.provider) {
      return lead.provider.businessName || `${lead.provider.user.firstName} ${lead.provider.user.lastName}`;
    }
    return "N/A";
  };

  // Get family name
  const getFamilyName = (lead: Lead): string => {
    return lead.family.primaryContactName || `${lead.family.user.firstName} ${lead.family.user.lastName}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Loading state
  if (sessionStatus === "loading" || loading) {
    return (
      <DashboardLayout title="Lead Management" showSearch={false}>
        <div className="p-6 flex items-center justify-center">
          <FiLoader className="animate-spin text-primary-500" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout title="Lead Management" showSearch={false}>
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <FiAlertCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-red-800">Error Loading Leads</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => fetchLeads(currentPage)}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Lead Management" showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Leads' }
        ]} />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Leads</h1>
            <p className="text-sm text-neutral-600 mt-1">
              Manage family inquiries for aides and providers
            </p>
          </div>
          <div className="text-sm text-neutral-600">
            <span className="font-medium text-neutral-900">{totalLeads}</span> total leads
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <LeadFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            operatorId={session?.user?.id}
          />
        </div>

        {/* Leads Table/List */}
        {leads.length === 0 ? (
          // Empty state
          <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <FiUser className="text-neutral-400" size={24} />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No leads found</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {filters.status !== "ALL" || filters.targetType !== "ALL" || filters.search
                ? "Try adjusting your filters to see more results."
                : "When families inquire about aides or providers, they'll appear here."}
            </p>
            {(filters.status !== "ALL" || filters.targetType !== "ALL" || filters.search) && (
              <button
                onClick={() => setFilters({ status: "ALL", targetType: "ALL", assignedTo: "ALL", search: "" })}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block rounded-lg border border-neutral-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Lead ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Family
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-neutral-600">
                          {lead.id.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                          {getFamilyName(lead)}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {getTargetName(lead)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <LeadTargetTypeBadge targetType={lead.targetType} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <LeadStatusBadge status={lead.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          <div className="flex items-center gap-1">
                            <FiClock size={12} />
                            {formatDate(lead.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {lead.assignedOperator
                            ? `${lead.assignedOperator.firstName} ${lead.assignedOperator.lastName}`
                            : <span className="text-neutral-400 italic">Unassigned</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button
                            onClick={() => router.push(`/operator/leads/${lead.id}`)}
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <FiEye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-neutral-900 truncate">
                        {getFamilyName(lead)}
                      </h3>
                      <p className="text-sm text-neutral-600 truncate">
                        {getTargetName(lead)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <LeadTargetTypeBadge targetType={lead.targetType} size="sm" />
                      <LeadStatusBadge status={lead.status} size="sm" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-neutral-500">Created</div>
                      <div className="text-neutral-900">{formatDate(lead.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Assigned To</div>
                      <div className="text-neutral-900">
                        {lead.assignedOperator
                          ? `${lead.assignedOperator.firstName} ${lead.assignedOperator.lastName}`
                          : <span className="text-neutral-400 italic">Unassigned</span>
                        }
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/operator/leads/${lead.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <FiEye size={16} />
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border border-neutral-200 rounded-lg">
            <div className="text-sm text-neutral-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={18} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
