/**
 * LeadFilters Component
 * 
 * Reusable filter component for lead lists with common filtering options.
 * 
 * Features:
 * - Status filter (multi-select tabs)
 * - Target type filter (AIDE/PROVIDER/All)
 * - Assignment filter (All/Unassigned/Assigned to me/Specific operator)
 * - Search by family name or lead ID
 */

import React from "react";
import { LeadStatus, LeadTargetType } from "@prisma/client";
import { FiSearch, FiFilter } from "react-icons/fi";

export interface LeadFiltersState {
  status?: LeadStatus | "ALL";
  targetType?: LeadTargetType | "ALL";
  assignedTo?: string | "ALL" | "UNASSIGNED" | "ME";
  search?: string;
}

interface LeadFiltersProps {
  filters: LeadFiltersState;
  onFilterChange: (filters: LeadFiltersState) => void;
  operatorId?: string; // Current operator ID for "Assigned to me" filter
  className?: string;
}

export default function LeadFilters({ 
  filters, 
  onFilterChange,
  operatorId,
  className = "" 
}: LeadFiltersProps) {
  const handleStatusChange = (status: LeadStatus | "ALL") => {
    onFilterChange({ ...filters, status });
  };

  const handleTargetTypeChange = (targetType: LeadTargetType | "ALL") => {
    onFilterChange({ ...filters, targetType });
  };

  const handleAssignmentChange = (assignedTo: string) => {
    onFilterChange({ ...filters, assignedTo });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const statusOptions: Array<{ value: LeadStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "NEW", label: "New" },
    { value: "IN_REVIEW", label: "In Review" },
    { value: "CONTACTED", label: "Contacted" },
    { value: "CLOSED", label: "Closed" },
    { value: "CANCELLED", label: "Cancelled" }
  ];

  const targetTypeOptions: Array<{ value: LeadTargetType | "ALL"; label: string }> = [
    { value: "ALL", label: "All Types" },
    { value: "AIDE", label: "Aides" },
    { value: "PROVIDER", label: "Providers" }
  ];

  const assignmentOptions = [
    { value: "ALL", label: "All" },
    { value: "UNASSIGNED", label: "Unassigned" },
    { value: "ME", label: "Assigned to Me" }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
        <input
          type="text"
          placeholder="Search by family name or lead ID..."
          value={filters.search || ""}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Status Filter Tabs */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          <FiFilter className="inline mr-1" size={14} />
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md border transition-colors
                ${filters.status === option.value || (!filters.status && option.value === "ALL")
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-500"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid for other filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Type Filter */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Target Type
          </label>
          <select
            value={filters.targetType || "ALL"}
            onChange={(e) => handleTargetTypeChange(e.target.value as LeadTargetType | "ALL")}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {targetTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assignment Filter */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Assignment
          </label>
          <select
            value={filters.assignedTo || "ALL"}
            onChange={(e) => handleAssignmentChange(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {assignmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
