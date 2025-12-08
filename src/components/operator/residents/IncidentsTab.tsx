"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX, FiCalendar, FiUser, FiMapPin, FiAlertTriangle } from 'react-icons/fi';

// Incident Types
const INCIDENT_TYPES = [
  { value: 'FALL_WITH_INJURY', label: 'Fall (with injury)', severity: 'HIGH' },
  { value: 'FALL_NO_INJURY', label: 'Fall (without injury)', severity: 'MEDIUM' },
  { value: 'MEDICATION_ERROR_WRONG_DOSE', label: 'Medication Error - Wrong Dose', severity: 'HIGH' },
  { value: 'MEDICATION_ERROR_MISSED_DOSE', label: 'Medication Error - Missed Dose', severity: 'MEDIUM' },
  { value: 'MEDICATION_ERROR_WRONG_MED', label: 'Medication Error - Wrong Medication', severity: 'CRITICAL' },
  { value: 'BEHAVIORAL_AGGRESSION', label: 'Behavioral - Aggression', severity: 'HIGH' },
  { value: 'BEHAVIORAL_WANDERING', label: 'Behavioral - Wandering', severity: 'MEDIUM' },
  { value: 'BEHAVIORAL_REFUSAL', label: 'Behavioral - Refusal of Care', severity: 'LOW' },
  { value: 'MEDICAL_EMERGENCY', label: 'Medical Emergency', severity: 'CRITICAL' },
  { value: 'ELOPEMENT', label: 'Elopement/Missing Resident', severity: 'CRITICAL' },
  { value: 'INJURY_NOT_FALL', label: 'Injury (not from fall)', severity: 'MEDIUM' },
  { value: 'PROPERTY_DAMAGE', label: 'Property Damage', severity: 'LOW' },
  { value: 'OTHER', label: 'Other', severity: 'LOW' },
];

const SEVERITY_LEVELS = [
  { value: 'MINOR', label: 'Minor', color: 'bg-blue-100 text-blue-800' },
  { value: 'MODERATE', label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SEVERE', label: 'Severe', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const INCIDENT_STATUSES = [
  { value: 'REPORTED', label: 'Reported', color: 'bg-blue-100 text-blue-800' },
  { value: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Required', color: 'bg-orange-100 text-orange-800' },
];

type Incident = {
  id: string;
  type: string;
  severity: string;
  status: string;
  description?: string | null;
  occurredAt: string;
  location?: string | null;
  reportedBy?: string | null;
  reportedAt: string;
  witnessedBy?: string | null;
  actionsTaken?: string | null;
  followUpRequired: boolean;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function IncidentsTab({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState<Incident | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState({
    type: 'FALL_NO_INJURY',
    severity: 'MODERATE',
    status: 'REPORTED',
    description: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    location: '',
    reportedBy: '',
    reportedAt: new Date().toISOString().slice(0, 16),
    witnessedBy: '',
    actionsTaken: '',
    followUpRequired: false,
    resolutionNotes: '',
    resolvedAt: '',
    resolvedBy: '',
  });

  useEffect(() => {
    fetchIncidents();
  }, [residentId]);

  useEffect(() => {
    // Auto-set severity based on incident type
    const incidentType = INCIDENT_TYPES.find(t => t.value === formData.type);
    if (incidentType && !editingIncident) {
      setFormData(prev => ({ ...prev, severity: incidentType.severity }));
    }
  }, [formData.type, editingIncident]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/residents/${residentId}/incidents?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch incidents');
      const data = await res.json();
      setIncidents(data.items || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        type: formData.type,
        severity: formData.severity,
        status: formData.status,
        description: formData.description || null,
        occurredAt: new Date(formData.occurredAt).toISOString(),
        location: formData.location || null,
        reportedBy: formData.reportedBy || null,
        reportedAt: new Date(formData.reportedAt).toISOString(),
        witnessedBy: formData.witnessedBy || null,
        actionsTaken: formData.actionsTaken || null,
        followUpRequired: formData.followUpRequired,
        resolutionNotes: formData.resolutionNotes || null,
        resolvedAt: formData.resolvedAt ? new Date(formData.resolvedAt).toISOString() : null,
        resolvedBy: formData.resolvedBy || null,
      };

      const url = editingIncident
        ? `/api/residents/${residentId}/incidents/${editingIncident.id}`
        : `/api/residents/${residentId}/incidents`;
      const method = editingIncident ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save incident');

      toast.success(editingIncident ? 'Incident updated' : 'Incident reported');
      setShowModal(false);
      setEditingIncident(null);
      resetForm();
      fetchIncidents();
      router.refresh();
    } catch (error) {
      console.error('Error saving incident:', error);
      toast.error('Failed to save incident');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident report?')) return;

    try {
      const res = await fetch(`/api/residents/${residentId}/incidents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete incident');

      toast.success('Incident deleted');
      fetchIncidents();
      router.refresh();
    } catch (error) {
      console.error('Error deleting incident:', error);
      toast.error('Failed to delete incident');
    }
  };

  const openEditModal = (incident: Incident) => {
    setEditingIncident(incident);
    setFormData({
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      description: incident.description || '',
      occurredAt: new Date(incident.occurredAt).toISOString().slice(0, 16),
      location: incident.location || '',
      reportedBy: incident.reportedBy || '',
      reportedAt: new Date(incident.reportedAt).toISOString().slice(0, 16),
      witnessedBy: incident.witnessedBy || '',
      actionsTaken: incident.actionsTaken || '',
      followUpRequired: incident.followUpRequired,
      resolutionNotes: incident.resolutionNotes || '',
      resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt).toISOString().slice(0, 16) : '',
      resolvedBy: incident.resolvedBy || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'FALL_NO_INJURY',
      severity: 'MODERATE',
      status: 'REPORTED',
      description: '',
      occurredAt: new Date().toISOString().slice(0, 16),
      location: '',
      reportedBy: '',
      reportedAt: new Date().toISOString().slice(0, 16),
      witnessedBy: '',
      actionsTaken: '',
      followUpRequired: false,
      resolutionNotes: '',
      resolvedAt: '',
      resolvedBy: '',
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIncident(null);
    resetForm();
  };

  const getIncidentTypeLabel = (type: string) => {
    return INCIDENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getSeverityColor = (severity: string) => {
    return SEVERITY_LEVELS.find(s => s.value === severity)?.color || 'bg-neutral-100 text-neutral-800';
  };

  const getStatusColor = (status: string) => {
    return INCIDENT_STATUSES.find(s => s.value === status)?.color || 'bg-neutral-100 text-neutral-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Incidents</h2>
          <p className="text-neutral-600 mt-1">Report and manage resident incidents</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          <FiPlus className="w-5 h-5" />
          Report Incident
        </button>
      </div>

      {/* Incidents List */}
      {incidents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <FiAlertTriangle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No incidents reported</h3>
          <p className="text-neutral-600 mb-4">This is a good sign! Report any incidents as they occur.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            <FiPlus className="w-5 h-5" />
            Report Incident
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-neutral-900">
                      {getIncidentTypeLabel(incident.type)}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                      {incident.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {incident.description && (
                    <p className="text-sm text-neutral-600 line-clamp-2">{incident.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => setViewModal(incident)}
                    className="p-1.5 text-neutral-600 hover:text-primary-600 hover:bg-neutral-50 rounded"
                    title="View details"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(incident)}
                    className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-neutral-50 rounded"
                    title="Edit"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(incident.id)}
                    className="p-1.5 text-neutral-600 hover:text-red-600 hover:bg-neutral-50 rounded"
                    title="Delete"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-neutral-600 mb-1">
                    <FiCalendar className="w-3.5 h-3.5" />
                    <span className="font-medium">Occurred:</span>
                  </div>
                  <span className="text-neutral-900">{formatDate(incident.occurredAt)}</span>
                </div>
                {incident.location && (
                  <div>
                    <div className="flex items-center gap-1 text-neutral-600 mb-1">
                      <FiMapPin className="w-3.5 h-3.5" />
                      <span className="font-medium">Location:</span>
                    </div>
                    <span className="text-neutral-900">{incident.location}</span>
                  </div>
                )}
                {incident.reportedBy && (
                  <div>
                    <div className="flex items-center gap-1 text-neutral-600 mb-1">
                      <FiUser className="w-3.5 h-3.5" />
                      <span className="font-medium">Reported By:</span>
                    </div>
                    <span className="text-neutral-900">{incident.reportedBy}</span>
                  </div>
                )}
                {incident.followUpRequired && (
                  <div>
                    <div className="text-neutral-600 mb-1 font-medium">Follow-up:</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Required
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editingIncident ? 'Edit Incident' : 'Report Incident'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-neutral-900">Incident Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Incident Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    {INCIDENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Severity *
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      {SEVERITY_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      {INCIDENT_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Follow-up Required
                    </label>
                    <label className="flex items-center gap-2 h-[42px] px-3 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50">
                      <input
                        type="checkbox"
                        checked={formData.followUpRequired}
                        onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Describe what happened..."
                  />
                </div>
              </div>

              {/* Occurrence Details */}
              <div className="space-y-4 pt-4 border-t border-neutral-200">
                <h4 className="font-medium text-neutral-900">Occurrence Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Occurred At *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.occurredAt}
                      onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Room 101, Dining Hall, Hallway"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Witnessed By
                  </label>
                  <input
                    type="text"
                    value={formData.witnessedBy}
                    onChange={(e) => setFormData({ ...formData, witnessedBy: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Names of witnesses (comma-separated)"
                  />
                </div>
              </div>

              {/* Reporting Details */}
              <div className="space-y-4 pt-4 border-t border-neutral-200">
                <h4 className="font-medium text-neutral-900">Reporting Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Reported By
                    </label>
                    <input
                      type="text"
                      value={formData.reportedBy}
                      onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Staff member name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Reported At
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.reportedAt}
                      onChange={(e) => setFormData({ ...formData, reportedAt: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Actions Taken
                  </label>
                  <textarea
                    value={formData.actionsTaken}
                    onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Describe immediate actions taken following the incident..."
                  />
                </div>
              </div>

              {/* Resolution Details */}
              {formData.status === 'RESOLVED' && (
                <div className="space-y-4 pt-4 border-t border-neutral-200">
                  <h4 className="font-medium text-neutral-900">Resolution Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Resolved By
                      </label>
                      <input
                        type="text"
                        value={formData.resolvedBy}
                        onChange={(e) => setFormData({ ...formData, resolvedBy: e.target.value })}
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Staff member name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Resolved At
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.resolvedAt}
                        onChange={(e) => setFormData({ ...formData, resolvedAt: e.target.value })}
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Resolution Notes
                    </label>
                    <textarea
                      value={formData.resolutionNotes}
                      onChange={(e) => setFormData({ ...formData, resolutionNotes: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      placeholder="Describe how the incident was resolved..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  {editingIncident ? 'Update Incident' : 'Report Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Incident Details</h3>
              <button onClick={() => setViewModal(null)} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Incident Type</h4>
                <p className="text-lg font-semibold text-neutral-900">{getIncidentTypeLabel(viewModal.type)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(viewModal.severity)}`}>
                    {viewModal.severity}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewModal.status)}`}>
                    {viewModal.status.replace(/_/g, ' ')}
                  </span>
                  {viewModal.followUpRequired && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      Follow-up Required
                    </span>
                  )}
                </div>
              </div>

              {viewModal.description && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Description</h4>
                  <p className="text-neutral-900 whitespace-pre-wrap">{viewModal.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-1">Occurred At</h4>
                  <p className="text-neutral-900">{formatDate(viewModal.occurredAt)}</p>
                </div>

                {viewModal.location && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 mb-1">Location</h4>
                    <p className="text-neutral-900">{viewModal.location}</p>
                  </div>
                )}

                {viewModal.reportedBy && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 mb-1">Reported By</h4>
                    <p className="text-neutral-900">{viewModal.reportedBy}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-1">Reported At</h4>
                  <p className="text-neutral-900">{formatDate(viewModal.reportedAt)}</p>
                </div>
              </div>

              {viewModal.witnessedBy && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Witnessed By</h4>
                  <p className="text-neutral-900">{viewModal.witnessedBy}</p>
                </div>
              )}

              {viewModal.actionsTaken && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Actions Taken</h4>
                  <p className="text-neutral-900 whitespace-pre-wrap">{viewModal.actionsTaken}</p>
                </div>
              )}

              {viewModal.status === 'RESOLVED' && viewModal.resolutionNotes && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Resolution</h4>
                  <p className="text-neutral-900 whitespace-pre-wrap">{viewModal.resolutionNotes}</p>
                  {viewModal.resolvedAt && (
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <span className="font-medium text-neutral-500">Resolved At:</span>
                        <p className="text-neutral-900">{formatDate(viewModal.resolvedAt)}</p>
                      </div>
                      {viewModal.resolvedBy && (
                        <div>
                          <span className="font-medium text-neutral-500">Resolved By:</span>
                          <p className="text-neutral-900">{viewModal.resolvedBy}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-neutral-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(viewModal.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {formatDate(viewModal.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => setViewModal(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    openEditModal(viewModal);
                    setViewModal(null);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Edit Incident
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
