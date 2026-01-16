'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FiArrowLeft,
  FiEdit,
  FiSave,
  FiX,
  FiCheck,
  FiAlertTriangle,
  FiClock,
  FiFileText,
  FiUser,
  FiMail,
  FiPhone,
  FiDollarSign,
  FiCalendar,
  FiBriefcase,
  FiAward,
  FiStar
} from 'react-icons/fi';
import Link from 'next/link';

type Caregiver = {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status: string;
    createdAt: string;
    lastLoginAt?: string;
  };
  bio?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  availability?: any;
  backgroundCheckStatus: string;
  backgroundCheckProvider?: string;
  backgroundCheckReportUrl?: string;
  specialties: string[];
  careTypes: string[];
  settings: string[];
  languages: string[];
  employmentType?: string;
  employmentStatus?: string;
  hireDate?: string;
  photoUrl?: string;
  isVisibleInMarketplace: boolean;
  certifications: Array<{
    id: string;
    certificationType: string;
    certificationName?: string;
    issueDate: string;
    expiryDate?: string;
    status: string;
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    title: string;
    uploadDate: string;
    expiryDate?: string;
  }>;
  assignments: Array<{
    id: string;
    resident: {
      firstName: string;
      lastName: string;
    };
    isPrimary: boolean;
    startDate: string;
    endDate?: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    title?: string;
    content?: string;
    createdAt: string;
  }>;
  averageRating?: number;
  reviewCount: number;
  assignmentCount: number;
  certificationCount: number;
};

export default function AdminCaregiverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caregiverId = params?.id as string;

  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'certifications' | 'documents' | 'assignments' | 'reviews'>('overview');

  // Form state
  const [formData, setFormData] = useState({
    backgroundCheckStatus: '',
    employmentStatus: '',
    employmentType: '',
    hourlyRate: '',
    yearsExperience: '',
    bio: '',
    isVisibleInMarketplace: true,
  });

  useEffect(() => {
    if (caregiverId) {
      fetchCaregiver();
    }
  }, [caregiverId]);

  const fetchCaregiver = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/caregivers/${caregiverId}`);
      const data = await response.json();

      if (!response.ok) {
        alert(`Failed to load caregiver: ${data.error || 'Unknown error'}`);
        return;
      }

      setCaregiver(data);
      setFormData({
        backgroundCheckStatus: data.backgroundCheckStatus || '',
        employmentStatus: data.employmentStatus || '',
        employmentType: data.employmentType || '',
        hourlyRate: data.hourlyRate?.toString() || '',
        yearsExperience: data.yearsExperience?.toString() || '',
        bio: data.bio || '',
        isVisibleInMarketplace: data.isVisibleInMarketplace ?? true,
      });
    } catch (error) {
      console.error('Failed to fetch caregiver:', error);
      alert('Error loading caregiver');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/caregivers/${caregiverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundCheckStatus: formData.backgroundCheckStatus,
          employmentStatus: formData.employmentStatus,
          employmentType: formData.employmentType,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
          bio: formData.bio,
          isVisibleInMarketplace: formData.isVisibleInMarketplace,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Failed to update caregiver: ${data.error || 'Unknown error'}`);
        return;
      }

      setCaregiver(data);
      setEditing(false);
      alert('Caregiver updated successfully');
    } catch (error) {
      console.error('Failed to update caregiver:', error);
      alert('Error updating caregiver');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeUserStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;

    try {
      const response = await fetch(`/api/admin/caregivers/${caregiverId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Failed to change status: ${data.error || 'Unknown error'}`);
        return;
      }

      fetchCaregiver();
      alert('User status updated successfully');
    } catch (error) {
      console.error('Failed to change status:', error);
      alert('Error changing status');
    }
  };

  const getBackgroundCheckBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      NOT_STARTED: { color: 'bg-gray-100 text-gray-800', icon: <FiClock size={16} />, label: 'Not Started' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: <FiClock size={16} />, label: 'Pending' },
      CLEAR: { color: 'bg-green-100 text-green-800', icon: <FiCheck size={16} />, label: 'Clear' },
      CONSIDER: { color: 'bg-orange-100 text-orange-800', icon: <FiAlertTriangle size={16} />, label: 'Consider' },
      EXPIRED: { color: 'bg-red-100 text-red-800', icon: <FiX size={16} />, label: 'Expired' },
    };
    const badge = badges[status] || badges.NOT_STARTED;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">Caregiver not found</p>
          <Link href="/admin/caregivers" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Back to Caregivers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/caregivers"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {caregiver.user.firstName} {caregiver.user.lastName}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Caregiver ID: {caregiver.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <FiX className="inline mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <FiSave className="inline mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <FiEdit className="inline mr-2" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <span className="text-3xl text-blue-600 font-bold">
                  {caregiver.user.firstName?.[0]}{caregiver.user.lastName?.[0]}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {caregiver.user.firstName} {caregiver.user.lastName}
              </h2>
              <div className="mt-3 space-y-2 w-full">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiMail size={16} />
                  {caregiver.user.email}
                </div>
                {caregiver.user.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiPhone size={16} />
                    {caregiver.user.phone}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Account Status</label>
                <div className="mt-1">
                  {editing ? (
                    <select
                      value={caregiver.user.status}
                      onChange={(e) => handleChangeUserStatus(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING">Pending</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      caregiver.user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      caregiver.user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      caregiver.user.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {caregiver.user.status}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Background Check</label>
                <div className="mt-1">
                  {editing ? (
                    <select
                      value={formData.backgroundCheckStatus}
                      onChange={(e) => setFormData({ ...formData, backgroundCheckStatus: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="PENDING">Pending</option>
                      <option value="CLEAR">Clear</option>
                      <option value="CONSIDER">Consider</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  ) : (
                    getBackgroundCheckBadge(caregiver.backgroundCheckStatus)
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Employment Status</label>
                <div className="mt-1">
                  {editing ? (
                    <select
                      value={formData.employmentStatus}
                      onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Not Set</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      caregiver.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      caregiver.employmentStatus === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                      caregiver.employmentStatus === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                      caregiver.employmentStatus === 'TERMINATED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {caregiver.employmentStatus || 'Not Set'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Employment Type</label>
                <div className="mt-1">
                  {editing ? (
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Not Set</option>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="PER_DIEM">Per Diem</option>
                      <option value="CONTRACT">Contract</option>
                    </select>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {caregiver.employmentType?.replace('_', ' ') || 'Not Set'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Marketplace Visibility</label>
                <div className="mt-1">
                  {editing ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isVisibleInMarketplace}
                        onChange={(e) => setFormData({ ...formData, isVisibleInMarketplace: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Visible in marketplace</span>
                    </label>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      caregiver.isVisibleInMarketplace ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {caregiver.isVisibleInMarketplace ? 'Visible' : 'Hidden'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rating</span>
                <span className="text-sm font-medium text-gray-900">
                  {caregiver.averageRating ? `⭐ ${caregiver.averageRating.toFixed(1)}` : 'No rating'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reviews</span>
                <span className="text-sm font-medium text-gray-900">{caregiver.reviewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Assignments</span>
                <span className="text-sm font-medium text-gray-900">{caregiver.assignmentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Certifications</span>
                <span className="text-sm font-medium text-gray-900">{caregiver.certificationCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Documents</span>
                <span className="text-sm font-medium text-gray-900">{caregiver.documents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Joined</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(caregiver.user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {caregiver.user.lastLoginAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Login</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(caregiver.user.lastLoginAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Tabbed Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-t-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: 'overview', label: 'Overview', icon: <FiUser size={16} /> },
                  { id: 'certifications', label: 'Certifications', icon: <FiAward size={16} />, count: caregiver.certifications.length },
                  { id: 'documents', label: 'Documents', icon: <FiFileText size={16} />, count: caregiver.documents.length },
                  { id: 'assignments', label: 'Assignments', icon: <FiBriefcase size={16} />, count: caregiver.assignments.length },
                  { id: 'reviews', label: 'Reviews', icon: <FiStar size={16} />, count: caregiver.reviews.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-lg shadow p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  {editing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-700">{caregiver.bio || 'No bio provided'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    {editing ? (
                      <input
                        type="number"
                        value={formData.yearsExperience}
                        onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0"
                      />
                    ) : (
                      <p className="text-gray-700">{caregiver.yearsExperience || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate
                    </label>
                    {editing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                          className="w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-700">
                        {caregiver.hourlyRate ? `$${caregiver.hourlyRate}/hr` : 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {caregiver.specialties.length > 0 ? (
                      caregiver.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {specialty}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No specialties listed</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Care Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {caregiver.careTypes.length > 0 ? (
                      caregiver.careTypes.map((type, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {type}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No care types specified</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {caregiver.languages.length > 0 ? (
                      caregiver.languages.map((language, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {language}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No languages listed</p>
                    )}
                  </div>
                </div>

                {caregiver.hireDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hire Date
                    </label>
                    <p className="text-gray-700">
                      {new Date(caregiver.hireDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'certifications' && (
              <div className="space-y-4">
                {caregiver.certifications.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No certifications found</p>
                ) : (
                  caregiver.certifications.map((cert) => (
                    <div key={cert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {cert.certificationName || cert.certificationType}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{cert.certificationType}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              Issued: {new Date(cert.issueDate).toLocaleDateString()}
                            </span>
                            {cert.expiryDate && (
                              <span>
                                Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          cert.status === 'CURRENT' ? 'bg-green-100 text-green-800' :
                          cert.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {cert.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                {caregiver.documents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No documents found</p>
                ) : (
                  caregiver.documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{doc.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{doc.documentType}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                            </span>
                            {doc.expiryDate && (
                              <span>
                                Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <FiFileText size={24} className="text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'assignments' && (
              <div className="space-y-4">
                {caregiver.assignments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No assignments found</p>
                ) : (
                  caregiver.assignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {assignment.resident.firstName} {assignment.resident.lastName}
                          </h4>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              Started: {new Date(assignment.startDate).toLocaleDateString()}
                            </span>
                            {assignment.endDate && (
                              <span>
                                Ended: {new Date(assignment.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {assignment.isPrimary && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {caregiver.reviews.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No reviews found</p>
                ) : (
                  caregiver.reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                size={16}
                                className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {review.rating}/5
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.title && (
                        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                      )}
                      {review.content && (
                        <p className="text-gray-700 text-sm">{review.content}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
