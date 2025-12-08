"use client";

/**
 * Operator Lead Detail Page
 * 
 * Displays comprehensive lead information with editing capabilities.
 * 
 * Features:
 * - Complete lead information display
 * - Status update dropdown
 * - Operator notes textarea
 * - Assignment management
 * - Family and target details
 * - Inquiry message display
 * - Care context information
 * - Activity log (future enhancement)
 * - Link to messaging (future enhancement)
 */

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import LeadStatusBadge from "@/components/operator/LeadStatusBadge";
import LeadTargetTypeBadge from "@/components/operator/LeadTargetTypeBadge";
import { LeadStatus, LeadTargetType } from "@prisma/client";
import {
  FiArrowLeft,
  FiSave,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiClock,
  FiCalendar,
  FiFileText,
  FiMessageSquare,
  FiInfo
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
  operatorNotes: string | null;
  createdAt: string;
  updatedAt: string;
  family: {
    id: string;
    primaryContactName: string | null;
    phone: string | null;
    relationshipToRecipient: string | null;
    recipientAge: number | null;
    primaryDiagnosis: string | null;
    mobilityLevel: string | null;
    careNotes: string | null;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    };
  };
  aide: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      profileImageUrl: any;
    };
  } | null;
  provider: {
    id: string;
    businessName: string | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      profileImageUrl: any;
    };
  } | null;
  assignedOperator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function OperatorLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const leadId = params.id as string;

  // State management
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [assignedOperatorId, setAssignedOperatorId] = useState<string | "">("");

  // Fetch lead details
  useEffect(() => {
    const fetchLeadDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/operator/leads/${leadId}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch lead details");
        }

        const data = await response.json();
        setLead(data.data);
        setStatus(data.data.status);
        setOperatorNotes(data.data.operatorNotes || "");
        setAssignedOperatorId(data.data.assignedOperator?.id || "");
      } catch (err: any) {
        console.error("Error fetching lead:", err);
        setError(err.message || "Failed to load lead details");
      } finally {
        setLoading(false);
      }
    };

    fetchLeadDetails();
  }, [leadId]);

  // Handle update submission
  const handleUpdate = async () => {
    if (!lead) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updateData: any = {};

      // Only include changed fields
      if (status && status !== lead.status) {
        updateData.status = status;
      }
      if (operatorNotes !== (lead.operatorNotes || "")) {
        updateData.operatorNotes = operatorNotes;
      }
      if (assignedOperatorId !== (lead.assignedOperator?.id || "")) {
        updateData.assignedOperatorId = assignedOperatorId || null;
      }

      // Skip update if nothing changed
      if (Object.keys(updateData).length === 0) {
        setSuccessMessage("No changes to save");
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }

      const response = await fetch(`/api/operator/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update lead");
      }

      const data = await response.json();
      setLead(data.data);
      setSuccessMessage("Lead updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating lead:", err);
      setError(err.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  // Format datetime
  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  // Get target name
  const getTargetName = (): string => {
    if (!lead) return "";
    if (lead.targetType === "AIDE" && lead.aide) {
      return `${lead.aide.user.firstName} ${lead.aide.user.lastName}`;
    } else if (lead.targetType === "PROVIDER" && lead.provider) {
      return lead.provider.businessName || `${lead.provider.user.firstName} ${lead.provider.user.lastName}`;
    }
    return "N/A";
  };

  // Get family name
  const getFamilyName = (): string => {
    if (!lead) return "";
    return lead.family.primaryContactName || `${lead.family.user.firstName} ${lead.family.user.lastName}`;
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Lead Details" showSearch={false}>
        <div className="p-6 flex items-center justify-center">
          <FiLoader className="animate-spin text-primary-500" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error && !lead) {
    return (
      <DashboardLayout title="Lead Details" showSearch={false}>
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <FiAlertCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-red-800">Error Loading Lead</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => router.push("/operator/leads")}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Back to Leads
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return null;
  }

  const statusOptions: LeadStatus[] = ["NEW", "IN_REVIEW", "CONTACTED", "CLOSED", "CANCELLED"];

  return (
    <DashboardLayout title={`Lead - ${getTargetName()}`} showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Leads', href: '/operator/leads' },
          { label: `#${lead.id.substring(0, 8)}` }
        ]} />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => router.push("/operator/leads")}
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            <FiArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Leads</span>
          </button>
          
          <div className="flex items-center gap-3">
            <LeadTargetTypeBadge targetType={lead.targetType} />
            <LeadStatusBadge status={lead.status} />
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
            <FiCheckCircle className="text-green-600 mt-0.5" size={20} />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <FiAlertCircle className="text-red-600 mt-0.5" size={20} />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Summary Card */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Lead ID</div>
              <div className="font-mono text-sm text-neutral-900">{lead.id}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Created</div>
              <div className="text-sm text-neutral-900">{formatDateTime(lead.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Last Updated</div>
              <div className="text-sm text-neutral-900">{formatDateTime(lead.updatedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Assigned To</div>
              <div className="text-sm text-neutral-900">
                {lead.assignedOperator
                  ? `${lead.assignedOperator.firstName} ${lead.assignedOperator.lastName}`
                  : <span className="text-neutral-400 italic">Unassigned</span>
                }
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Lead Details */}
          <div className="space-y-6 lg:col-span-2">
            {/* Family Information */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <FiUser size={16} />
                Family Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Contact Name</div>
                  <div className="text-sm text-neutral-900 font-medium">{getFamilyName()}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Email</div>
                  <a
                    href={`mailto:${lead.family.user.email}`}
                    className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                  >
                    <FiMail size={12} />
                    {lead.family.user.email}
                  </a>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Phone</div>
                  <div className="text-sm text-neutral-900 flex items-center gap-1">
                    <FiPhone size={12} />
                    {lead.family.phone || lead.family.user.phone || "Not provided"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Relationship</div>
                  <div className="text-sm text-neutral-900">
                    {lead.family.relationshipToRecipient || "Not specified"}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Information */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <FiUser size={16} />
                {lead.targetType === "AIDE" ? "Aide" : "Provider"} Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Name</div>
                  <div className="text-sm text-neutral-900 font-medium">{getTargetName()}</div>
                </div>
                {lead.targetType === "AIDE" && lead.aide && (
                  <>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Email</div>
                      <a
                        href={`mailto:${lead.aide.user.email}`}
                        className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <FiMail size={12} />
                        {lead.aide.user.email}
                      </a>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Phone</div>
                      <div className="text-sm text-neutral-900">
                        {lead.aide.user.phone || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Profile</div>
                      <a
                        href={`/marketplace/caregivers/${lead.aide.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        View Profile →
                      </a>
                    </div>
                  </>
                )}
                {lead.targetType === "PROVIDER" && lead.provider && (
                  <>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Email</div>
                      <a
                        href={`mailto:${lead.provider.user.email}`}
                        className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <FiMail size={12} />
                        {lead.provider.user.email}
                      </a>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Phone</div>
                      <div className="text-sm text-neutral-900">
                        {lead.provider.user.phone || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Profile</div>
                      <a
                        href={`/marketplace/providers/${lead.provider.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        View Profile →
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inquiry Details */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <FiFileText size={16} />
                Inquiry Details
              </h3>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
                      <FiCalendar size={12} />
                      Preferred Start Date
                    </div>
                    <div className="text-sm text-neutral-900">
                      {formatDate(lead.preferredStartDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
                      <FiClock size={12} />
                      Expected Hours/Week
                    </div>
                    <div className="text-sm text-neutral-900">
                      {lead.expectedHoursPerWeek ? `${lead.expectedHoursPerWeek} hours` : "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
                      <FiMapPin size={12} />
                      Location
                    </div>
                    <div className="text-sm text-neutral-900">
                      {lead.location || "Not specified"}
                    </div>
                  </div>
                </div>
                
                {lead.message && (
                  <div>
                    <div className="text-xs text-neutral-500 mb-2 flex items-center gap-1">
                      <FiMessageSquare size={12} />
                      Message from Family
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-neutral-800 font-sans">
                        {lead.message}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Care Context */}
            {(lead.family.recipientAge || lead.family.primaryDiagnosis || lead.family.mobilityLevel || lead.family.careNotes) && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <FiInfo size={16} />
                  Care Context
                </h3>
                <div className="space-y-3">
                  {lead.family.recipientAge && (
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Recipient Age</div>
                      <div className="text-sm text-neutral-900">{lead.family.recipientAge} years old</div>
                    </div>
                  )}
                  {lead.family.primaryDiagnosis && (
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Primary Diagnosis</div>
                      <div className="text-sm text-neutral-900">{lead.family.primaryDiagnosis}</div>
                    </div>
                  )}
                  {lead.family.mobilityLevel && (
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Mobility Level</div>
                      <div className="text-sm text-neutral-900">{lead.family.mobilityLevel}</div>
                    </div>
                  )}
                  {lead.family.careNotes && (
                    <div>
                      <div className="text-xs text-neutral-500 mb-2">Care Notes</div>
                      <div className="p-3 bg-neutral-50 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm text-neutral-800 font-sans">
                          {lead.family.careNotes}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Notes */}
          <div className="space-y-6">
            {/* Status Update */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">Lead Status</h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">Assignment</h3>
              <select
                value={assignedOperatorId}
                onChange={(e) => setAssignedOperatorId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {session?.user?.id && (
                  <option value={session.user.id}>Assign to Me</option>
                )}
              </select>
              <p className="text-xs text-neutral-500 mt-2">
                Assign this lead to an operator for follow-up
              </p>
            </div>

            {/* Operator Notes */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">Operator Notes</h3>
              <textarea
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="Add private notes for your team..."
                rows={8}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                maxLength={5000}
              />
              <div className="text-xs text-neutral-500 mt-2 text-right">
                {operatorNotes.length} / 5000 characters
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave size={18} />
                  Save Changes
                </>
              )}
            </button>

            {/* Open Conversation Button */}
            <button
              onClick={() => {
                // Navigate to messages with Family user context
                const familyUserId = lead.family.userId;
                router.push(`/messages?userId=${familyUserId}&context=lead&leadId=${lead.id}`);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              title="Start a conversation with the family member"
            >
              <FiMessageSquare size={18} />
              Open Conversation
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
