"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX, FiCalendar, FiUser, FiFileText, FiClipboard } from 'react-icons/fi';

// Assessment Types
const ASSESSMENT_TYPES = [
  { value: 'ADL', label: 'ADL (Activities of Daily Living)', description: 'Bathing, dressing, eating, toileting, mobility' },
  { value: 'COGNITIVE', label: 'Cognitive Assessment', description: 'Memory, orientation, decision-making' },
  { value: 'MEDICAL', label: 'Medical Assessment', description: 'Vital signs, medications, conditions' },
  { value: 'NUTRITIONAL', label: 'Nutritional Assessment', description: 'Weight, diet, hydration' },
  { value: 'FALL_RISK', label: 'Fall Risk Assessment', description: 'Mobility, balance, history' },
  { value: 'PAIN', label: 'Pain Assessment', description: 'Pain level, location, frequency' },
  { value: 'MOOD_BEHAVIORAL', label: 'Mood/Behavioral Assessment', description: 'Mood, behavior patterns' },
  { value: 'MMSE', label: 'MMSE (Mini-Mental State Exam)', description: 'Cognitive function screening' },
];

const ASSESSMENT_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'PENDING_REVIEW', 'SCHEDULED'];

type Assessment = {
  id: string;
  type: string;
  score?: number | null;
  status?: string | null;
  conductedBy?: string | null;
  conductedAt: string;
  notes?: string | null;
  recommendations?: string | null;
  data?: any;
  createdAt: string;
  updatedAt: string;
};

export function AssessmentsTab({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState<Assessment | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [formData, setFormData] = useState({
    type: 'ADL',
    score: '',
    status: 'COMPLETED',
    conductedBy: '',
    conductedAt: new Date().toISOString().slice(0, 16),
    notes: '',
    recommendations: '',
  });

  useEffect(() => {
    fetchAssessments();
  }, [residentId]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/residents/${residentId}/assessments?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch assessments');
      const data = await res.json();
      setAssessments(data.items || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        type: formData.type,
        status: formData.status,
        conductedBy: formData.conductedBy || null,
        conductedAt: new Date(formData.conductedAt).toISOString(),
        notes: formData.notes || null,
        recommendations: formData.recommendations || null,
      };
      if (formData.score) {
        payload.score = parseInt(formData.score);
      }

      const url = editingAssessment
        ? `/api/residents/${residentId}/assessments/${editingAssessment.id}`
        : `/api/residents/${residentId}/assessments`;
      const method = editingAssessment ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save assessment');

      toast.success(editingAssessment ? 'Assessment updated' : 'Assessment created');
      setShowModal(false);
      setEditingAssessment(null);
      resetForm();
      fetchAssessments();
      router.refresh();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    try {
      const res = await fetch(`/api/residents/${residentId}/assessments/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete assessment');

      toast.success('Assessment deleted');
      fetchAssessments();
      router.refresh();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast.error('Failed to delete assessment');
    }
  };

  const openEditModal = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    setFormData({
      type: assessment.type,
      score: assessment.score?.toString() || '',
      status: assessment.status || 'COMPLETED',
      conductedBy: assessment.conductedBy || '',
      conductedAt: new Date(assessment.conductedAt).toISOString().slice(0, 16),
      notes: assessment.notes || '',
      recommendations: assessment.recommendations || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'ADL',
      score: '',
      status: 'COMPLETED',
      conductedBy: '',
      conductedAt: new Date().toISOString().slice(0, 16),
      notes: '',
      recommendations: '',
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAssessment(null);
    resetForm();
  };

  const getAssessmentTypeLabel = (type: string) => {
    return ASSESSMENT_TYPES.find(t => t.value === type)?.label || type;
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

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'SCHEDULED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
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
          <h2 className="text-2xl font-bold text-neutral-900">Assessments</h2>
          <p className="text-neutral-600 mt-1">Track and manage resident assessments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          <FiPlus className="w-5 h-5" />
          New Assessment
        </button>
      </div>

      {/* Assessments Grid */}
      {assessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <FiClipboard className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No assessments yet</h3>
          <p className="text-neutral-600 mb-4">Get started by creating the first assessment for this resident</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            <FiPlus className="w-5 h-5" />
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 mb-1">
                    {getAssessmentTypeLabel(assessment.type)}
                  </h3>
                  {assessment.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                      {assessment.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewModal(assessment)}
                    className="p-1.5 text-neutral-600 hover:text-primary-600 hover:bg-neutral-50 rounded"
                    title="View details"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(assessment)}
                    className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-neutral-50 rounded"
                    title="Edit"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(assessment.id)}
                    className="p-1.5 text-neutral-600 hover:text-red-600 hover:bg-neutral-50 rounded"
                    title="Delete"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {assessment.score !== null && assessment.score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600">Score:</span>
                    <span className="font-medium">{assessment.score}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-neutral-600">
                  <FiCalendar className="w-4 h-4" />
                  <span>{formatDate(assessment.conductedAt)}</span>
                </div>
                {assessment.conductedBy && (
                  <div className="flex items-center gap-2 text-neutral-600">
                    <FiUser className="w-4 h-4" />
                    <span>{assessment.conductedBy}</span>
                  </div>
                )}
                {assessment.notes && (
                  <div className="text-neutral-600 line-clamp-2">
                    <FiFileText className="w-4 h-4 inline mr-1" />
                    {assessment.notes}
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editingAssessment ? 'Edit Assessment' : 'New Assessment'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Assessment Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {ASSESSMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  {ASSESSMENT_TYPES.find(t => t.value === formData.type)?.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Score (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {ASSESSMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Conducted By
                  </label>
                  <input
                    type="text"
                    value={formData.conductedBy}
                    onChange={(e) => setFormData({ ...formData, conductedBy: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Staff member name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Conducted At *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.conductedAt}
                    onChange={(e) => setFormData({ ...formData, conductedAt: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes/Observations
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="Enter observations and notes from the assessment..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Recommendations
                </label>
                <textarea
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Enter recommendations based on assessment results..."
                />
              </div>

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
                  {editingAssessment ? 'Update Assessment' : 'Create Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Assessment Details</h3>
              <button onClick={() => setViewModal(null)} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-1">Assessment Type</h4>
                <p className="text-lg font-semibold text-neutral-900">{getAssessmentTypeLabel(viewModal.type)}</p>
              </div>

              {viewModal.status && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-1">Status</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewModal.status)}`}>
                    {viewModal.status.replace('_', ' ')}
                  </span>
                </div>
              )}

              {viewModal.score !== null && viewModal.score !== undefined && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-1">Score</h4>
                  <p className="text-lg font-medium text-neutral-900">{viewModal.score}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-1">Conducted At</h4>
                  <p className="text-neutral-900">{formatDate(viewModal.conductedAt)}</p>
                </div>

                {viewModal.conductedBy && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 mb-1">Conducted By</h4>
                    <p className="text-neutral-900">{viewModal.conductedBy}</p>
                  </div>
                )}
              </div>

              {viewModal.notes && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Notes/Observations</h4>
                  <p className="text-neutral-900 whitespace-pre-wrap">{viewModal.notes}</p>
                </div>
              )}

              {viewModal.recommendations && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Recommendations</h4>
                  <p className="text-neutral-900 whitespace-pre-wrap">{viewModal.recommendations}</p>
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
                  Edit Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
