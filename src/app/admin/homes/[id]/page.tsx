'use client';

import { useState, useEffect, use } from 'react';
import {
  FiHome,
  FiMapPin,
  FiUsers,
  FiStar,
  FiImage,
  FiFileText,
  FiCalendar,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiEdit2,
  FiSave,
  FiArrowLeft,
  FiShield,
  FiMail,
  FiPhone,
  FiUserCheck,
} from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AvailabilityPanel from '@/components/availability/AvailabilityPanel';
import PricingPanel from '@/components/pricing/PricingPanel';

// Safely unwrap params — handles both Promise and plain object
function useUnwrapParams<T>(params: T | Promise<T>): T {
  // Check if params is a Promise (has .then method)
  if (params && typeof params === 'object' && 'then' in params && typeof (params as any).then === 'function') {
    return use(params as Promise<T>);
  }
  // Already a plain object
  return params as T;
}

// Helper function to safely convert any value to a displayable string
const safeString = (value: unknown, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  // Handle Prisma Decimal or other objects
  if (typeof value === 'object') {
    try {
      return String(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

// Helper to safely format a date string
const formatDate = (dateValue: unknown): string => {
  if (!dateValue) return 'N/A';
  try {
    const date = new Date(String(dateValue));
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
};

type HomeDetail = {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  careLevel: string[];
  capacity: number;
  currentOccupancy: number;
  genderRestriction: string | null;
  priceMin: number | null;
  priceMax: number | null;
  amenities: string[];
  highlights: string[];
  createdAt: string;
  updatedAt: string;
  operator: {
    id: string;
    companyName: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      status: string;
    };
  };
  address: {
    street: string;
    street2: string | null;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | null;
  licenses: Array<{
    id: string;
    licenseNumber: string;
    type: string;
    status: string;
    issueDate: string;
    expirationDate: string | null;
  }>;
  inspections: Array<{
    id: string;
    inspectionDate: string;
    inspectorName: string;
    passed: boolean;
    notes: string | null;
  }>;
  residents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    status: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    family: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
  photos: Array<{
    id: string;
    url: string;
    caption: string | null;
    isPrimary: boolean;
  }>;
  inquiries: Array<{
    id: string;
    status: string;
    createdAt: string;
    family: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
  metrics: {
    occupancyRate: string;
    activeResidents: number;
    averageRating: string | null;
    reviewCount: number;
    photoCount: number;
    activeLicenses: number;
    expiringLicenses: number;
    expiredLicenses: number;
    totalLicenses: number;
    pendingInquiries: number;
  };
  // AI auto-population (optional — not in all API responses yet)
  websiteUrl?: string | null;
  autoPopulatedAt?: string | null;
  autoPopulatedFromUrl?: string | null;
  autoPopulatedVersion?: number | null;
  aiPopulationConfidence?: string | null;
};

export default function AdminHomeDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = useUnwrapParams(params);
  const router = useRouter();
  const [home, setHome] = useState<HomeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'residents' | 'licenses' | 'reviews' | 'inquiries'>('overview');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'DRAFT' as HomeDetail['status'],
    careLevel: [] as string[],
    capacity: 0,
    currentOccupancy: 0,
    priceMin: null as number | null,
    priceMax: null as number | null,
  });

  useEffect(() => {
    fetchHome();
  }, [resolvedParams.id]);

  const fetchHome = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/homes/${resolvedParams.id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API returned error:', data);
        alert(`Failed to load home: ${data.error || 'Unknown error'}`);
        return;
      }
      
      setHome(data);
      setEditForm({
        name: data.name,
        description: data.description,
        status: data.status,
        careLevel: data.careLevel,
        capacity: data.capacity,
        currentOccupancy: data.currentOccupancy,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
      });
    } catch (error) {
      console.error('Failed to fetch home:', error);
      alert(`Error loading home: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/homes/${resolvedParams.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Failed to update home: ${data.error || 'Unknown error'}`);
        return;
      }

      alert('Home updated successfully');
      setEditing(false);
      fetchHome();
    } catch (error) {
      console.error('Failed to update home:', error);
      alert(`Error updating home: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (action: 'APPROVE' | 'REJECT') => {
    const reason = action === 'REJECT' 
      ? prompt('Enter reason for rejection:') 
      : null;
    
    if (action === 'REJECT' && !reason) return;

    try {
      const response = await fetch(`/api/admin/homes/${resolvedParams.id}/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Failed to ${action.toLowerCase()} home: ${data.error || 'Unknown error'}`);
        return;
      }

      alert(data.message);
      fetchHome();
    } catch (error) {
      console.error(`Failed to ${action.toLowerCase()} home:`, error);
      alert(`Error ${action.toLowerCase()}ing home: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClaim = async () => {
    const operatorEmail = prompt(
      "Enter the operator's account email to claim this listing for:"
    );
    if (!operatorEmail) return;

    try {
      const response = await fetch(
        `/api/admin/homes/${resolvedParams.id}/claim`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorEmail }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        alert(`Failed to claim listing: ${data.error || 'Unknown error'}`);
        return;
      }
      alert(data.message);
      fetchHome();
    } catch (error) {
      console.error('Failed to claim listing:', error);
      alert(
        `Error claiming listing: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success-100 text-success-800';
      case 'PENDING_REVIEW':
        return 'bg-warning-100 text-warning-800';
      case 'SUSPENDED':
        return 'bg-error-100 text-error-800';
      case 'INACTIVE':
        return 'bg-neutral-100 text-neutral-800';
      case 'DRAFT':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-neutral-600">Loading home details...</p>
        </div>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-7xl mx-auto text-center">
          <FiAlertTriangle className="mx-auto text-6xl text-error-600 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Home Not Found</h1>
          <p className="text-neutral-600 mb-6">The requested home could not be found.</p>
          <Link
            href="/admin/homes"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <FiArrowLeft />
            Back to Homes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/homes"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 mb-4"
          >
            <FiArrowLeft />
            Back to Homes
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
                <FiHome className="text-primary-600" />
                {editing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="border-2 border-primary-600 rounded px-2 py-1"
                  />
                ) : (
                  home.name
                )}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeClass(safeString(home.status, 'DRAFT'))}`}>
                  {safeString(home.status, 'Unknown').replace(/_/g, ' ')}
                </span>
                {(home.metrics?.expiringLicenses ?? 0) > 0 && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-warning-100 text-warning-800">
                    {home.metrics?.expiringLicenses} License(s) Expiring
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  {home.status === 'DRAFT' && (
                  <button
                    onClick={handleClaim}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <FiUserCheck />
                    Claim for operator
                  </button>
                )}
                {home.status === 'PENDING_REVIEW' && (
                    <>
                      <button
                        onClick={() => handleVerify('APPROVE')}
                        className="flex items-center gap-2 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700"
                      >
                        <FiCheck />
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerify('REJECT')}
                        className="flex items-center gap-2 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700"
                      >
                        <FiX />
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <FiEdit2 />
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditForm({
                        name: home.name,
                        description: home.description,
                        status: home.status,
                        careLevel: home.careLevel,
                        capacity: home.capacity,
                        currentOccupancy: home.currentOccupancy,
                        priceMin: home.priceMin,
                        priceMax: home.priceMax,
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700"
                  >
                    <FiX />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
                  >
                    <FiSave />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Occupancy</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {home.currentOccupancy ?? 0}/{home.capacity ?? 0}
                </p>
                <p className="text-sm text-neutral-500">{home.metrics?.occupancyRate ?? '0'}%</p>
              </div>
              <FiUsers className="text-3xl text-primary-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Average Rating</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {home.metrics?.averageRating || 'N/A'}
                </p>
                <p className="text-sm text-neutral-500">{home.metrics?.reviewCount ?? 0} reviews</p>
              </div>
              <FiStar className="text-3xl text-warning-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Licenses</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {home.metrics?.activeLicenses ?? 0}/{home.metrics?.totalLicenses ?? 0}
                </p>
                <p className="text-sm text-neutral-500">
                  {(home.metrics?.expiredLicenses ?? 0) > 0 
                    ? `${home.metrics?.expiredLicenses} expired` 
                    : 'All current'}
                </p>
              </div>
              <FiShield className="text-3xl text-success-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Pending Inquiries</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {home.metrics?.pendingInquiries ?? 0}
                </p>
                <p className="text-sm text-neutral-500">Total: {home.inquiries?.length ?? 0}</p>
              </div>
              <FiMail className="text-3xl text-secondary-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-neutral-200">
            <nav className="flex -mb-px">
              {['overview', 'residents', 'licenses', 'reviews', 'inquiries'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`px-6 py-3 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Availability freshness — Anita's concierge-logging + consent UI (OL-110) */}
                <AvailabilityPanel homeId={resolvedParams.id} />
                {/* Pricing capture — DP-estimate / public benchmark + family-report review (OL-111) */}
                <PricingPanel homeId={resolvedParams.id} />
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Description
                      </label>
                      {editing ? (
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={4}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2"
                        />
                      ) : (
                        <p className="text-neutral-900">{home.description}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Care Levels
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(home.careLevel || []).map((level, idx) => (
                          <span
                            key={`level-${idx}`}
                            className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                          >
                            {safeString(level, 'Unknown').replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Capacity
                      </label>
                      {editing ? (
                        <input
                          type="number"
                          value={editForm.capacity}
                          onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2"
                        />
                      ) : (
                        <p className="text-neutral-900">{home.capacity} residents</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Current Occupancy
                      </label>
                      {editing ? (
                        <input
                          type="number"
                          value={editForm.currentOccupancy}
                          onChange={(e) => setEditForm({ ...editForm, currentOccupancy: parseInt(e.target.value) })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2"
                        />
                      ) : (
                        <p className="text-neutral-900">{home.currentOccupancy} residents</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Price Range
                      </label>
                      <p className="text-neutral-900">
                        {home.priceMin && home.priceMax
                          ? `$${home.priceMin.toLocaleString()} - $${home.priceMax.toLocaleString()}`
                          : 'Not specified'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Status
                      </label>
                      {editing ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as HomeDetail['status'] })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="PENDING_REVIEW">Pending Review</option>
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      ) : (
                        <p className="text-neutral-900">{safeString(home.status, 'Unknown').replace(/_/g, ' ')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operator Info */}
                {home.operator && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Operator Information</h3>
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-neutral-600">Company Name</p>
                        <p className="font-medium text-neutral-900">{home.operator.companyName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600">Contact Person</p>
                        <p className="font-medium text-neutral-900">
                          {home.operator.user?.firstName || 'Unknown'} {home.operator.user?.lastName || 'User'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 flex items-center gap-1">
                          <FiMail /> Email
                        </p>
                        <p className="font-medium text-neutral-900">{home.operator.user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 flex items-center gap-1">
                          <FiPhone /> Phone
                        </p>
                        <p className="font-medium text-neutral-900">{home.operator.user?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Address */}
                {home.address && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Address</h3>
                    <div className="bg-neutral-50 rounded-lg p-4 flex items-start gap-2">
                      <FiMapPin className="text-neutral-600 mt-1" />
                      <div>
                        <p className="text-neutral-900">{home.address.street}</p>
                        {home.address.street2 && <p className="text-neutral-900">{home.address.street2}</p>}
                        <p className="text-neutral-900">
                          {home.address.city}, {home.address.state} {home.address.zipCode}
                        </p>
                        <p className="text-neutral-600">{home.address.country}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {home.amenities && home.amenities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {home.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-secondary-100 text-secondary-800 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <FiImage />
                    Photos ({home.photos?.length || 0})
                  </h3>
                  {home.photos && home.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {home.photos.slice(0, 8).map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Home photo'}
                            className="w-full h-full object-cover"
                          />
                          {photo.isPrimary && (
                            <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded text-xs">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500">No photos uploaded</p>
                  )}
                </div>

                {/* AI Auto-population status */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                    AI Auto-population
                  </h3>
                  {(home as any).autoPopulatedAt ? (
                    <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 text-sm space-y-1.5">
                      <div className="flex items-center gap-2 text-violet-800 font-medium">
                        ✨ Pipeline ran on {formatDate((home as any).autoPopulatedAt)}
                      </div>
                      <div className="text-neutral-600">
                        <span className="font-medium">Source URL:</span>{' '}
                        <a
                          href={(home as any).autoPopulatedFromUrl ?? (home as any).websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline break-all"
                        >
                          {(home as any).autoPopulatedFromUrl ?? (home as any).websiteUrl}
                        </a>
                      </div>
                      <div className="text-neutral-600">
                        <span className="font-medium">Confidence:</span>{' '}
                        <span className={
                          (home as any).aiPopulationConfidence === 'HIGH' ? 'text-success-700 font-medium' :
                          (home as any).aiPopulationConfidence === 'MEDIUM' ? 'text-amber-700 font-medium' :
                          'text-neutral-500'
                        }>
                          {(home as any).aiPopulationConfidence ?? 'N/A'}
                        </span>
                      </div>
                      <div className="text-neutral-600">
                        <span className="font-medium">Run #:</span>{' '}
                        {(home as any).autoPopulatedVersion ?? 1}
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-400 text-sm">
                      {(home as any).websiteUrl
                        ? `Website on file: ${(home as any).websiteUrl} — pipeline not yet run.`
                        : 'No website URL set. Run autopopulate-cohort.ts to populate.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'residents' && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  Residents ({home.residents?.length || 0})
                </h3>
                {home.residents && home.residents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Family Contact</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {home.residents.map((resident) => (
                          <tr key={resident.id}>
                            <td className="px-6 py-4 text-sm text-neutral-900">
                              {resident.firstName} {resident.lastName}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                safeString(resident.status) === 'ACTIVE' 
                                  ? 'bg-success-100 text-success-800'
                                  : 'bg-neutral-100 text-neutral-800'
                              }`}>
                                {safeString(resident.status, 'Unknown')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-900">
                              {(resident as any).family?.user 
                                ? `${(resident as any).family.user.firstName} ${(resident as any).family.user.lastName}`
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-neutral-500">No residents</p>
                )}
              </div>
            )}

            {activeTab === 'licenses' && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  Licenses ({home.licenses?.length || 0})
                </h3>
                {home.licenses && home.licenses.length > 0 ? (
                  <div className="space-y-4">
                    {home.licenses.map((license) => {
                      const daysUntilExpiry = license.expirationDate 
                        ? Math.floor((new Date(license.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                      const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

                      return (
                        <div key={license.id} className="bg-neutral-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <FiShield className="text-primary-600" />
                                <h4 className="font-semibold text-neutral-900">{safeString(license.type, 'License')}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  safeString(license.status) === 'ACTIVE' 
                                    ? 'bg-success-100 text-success-800'
                                    : 'bg-neutral-100 text-neutral-800'
                                }`}>
                                  {safeString(license.status, 'Unknown')}</span>
                                {isExpiringSoon && (
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-warning-100 text-warning-800">
                                    Expiring Soon
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-error-100 text-error-800">
                                    Expired
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-neutral-600">License #: {safeString(license.licenseNumber, 'N/A')}</p>
                              <div className="mt-2 text-sm text-neutral-600">
                                <p>Issued: {formatDate(license.issueDate)}</p>
                                {license.expirationDate && (
                                  <p>Expires: {formatDate(license.expirationDate)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-neutral-500">No licenses on file</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  Reviews ({home.reviews?.length || 0})
                </h3>
                {home.reviews && home.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {home.reviews.map((review) => (
                      <div key={review.id} className="bg-neutral-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <FiStar
                                  key={i}
                                  className={i < review.rating ? 'text-warning-500 fill-yellow-500' : 'text-neutral-300'}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-neutral-600">
                              {review.family?.user?.firstName || 'Unknown'} {review.family?.user?.lastName || 'User'}
                            </span>
                          </div>
                          <span className="text-sm text-neutral-500">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        <p className="text-neutral-900">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500">No reviews yet</p>
                )}
              </div>
            )}

            {activeTab === 'inquiries' && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  Recent Inquiries ({home.inquiries?.length || 0})
                </h3>
                {home.inquiries && home.inquiries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">From</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {home.inquiries.map((inquiry) => (
                          <tr key={inquiry.id}>
                            <td className="px-6 py-4 text-sm text-neutral-900">
                              {inquiry.family?.user?.firstName || 'Unknown'} {inquiry.family?.user?.lastName || 'User'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                safeString(inquiry.status) === 'NEW' || safeString(inquiry.status) === 'IN_PROGRESS'
                                  ? 'bg-warning-100 text-warning-800'
                                  : 'bg-neutral-100 text-neutral-800'
                              }`}>
                                {safeString(inquiry.status, 'Unknown')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-500">
                              {formatDate(inquiry.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-neutral-500">No inquiries</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
