"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

const CARE_LEVELS = [
  { value: 'INDEPENDENT', label: 'Independent Living' },
  { value: 'ASSISTED', label: 'Assisted Living' },
  { value: 'MEMORY_CARE', label: 'Memory Care' },
  { value: 'SKILLED_NURSING', label: 'Skilled Nursing' },
];

const AMENITIES_OPTIONS = [
  'Private Rooms',
  'Shared Rooms',
  'Wheelchair Accessible',
  'Emergency Call System',
  'Medication Management',
  'Housekeeping',
  'Laundry Service',
  'Meal Service',
  'Activities Program',
  'Transportation',
  'Beauty Salon',
  'Chapel',
  'Garden/Outdoor Space',
  'WiFi',
  'Pet Friendly',
];

export default function EditHomePage() {
  const router = useRouter();
  const params = useParams() as Record<string, string>;
  const id = params['id'];
  const operatorId = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('operatorId') : null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: 0,
    careLevel: [] as string[],
    status: 'ACTIVE',
    genderRestriction: '',
    amenities: [] as string[],
    priceMin: '',
    priceMax: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/operator/homes/${id}`);
        if (res.ok) {
          const { data } = await res.json();
          if (mounted && data) {
            setForm({
              name: data.name || '',
              description: data.description || '',
              capacity: data.capacity || 0,
              careLevel: Array.isArray(data.careLevel) ? data.careLevel : [],
              status: data.status || 'ACTIVE',
              genderRestriction: data.genderRestriction || '',
              amenities: Array.isArray(data.amenities) ? data.amenities : [],
              priceMin: data.priceMin ?? '',
              priceMax: data.priceMax ?? '',
              street: data.address?.street || '',
              street2: data.address?.street2 || '',
              city: data.address?.city || '',
              state: data.address?.state || '',
              zipCode: data.address?.zipCode || '',
            });
          }
        }
      } catch (e) {
        console.error('Failed to load home', e);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.name.trim()) newErrors.name = 'Home name is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.careLevel.length === 0) newErrors.careLevel = 'Select at least one care level';
    if (!form.capacity || form.capacity <= 0) newErrors.capacity = 'Capacity must be greater than 0';
    
    // Price validation
    if (form.priceMin && parseFloat(form.priceMin.toString()) < 0) {
      newErrors.priceMin = 'Minimum price must be 0 or greater';
    }
    if (form.priceMax && parseFloat(form.priceMax.toString()) < 0) {
      newErrors.priceMax = 'Maximum price must be 0 or greater';
    }
    if (form.priceMin && form.priceMax && parseFloat(form.priceMin.toString()) > parseFloat(form.priceMax.toString())) {
      newErrors.priceMax = 'Maximum price must be greater than minimum price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name || undefined,
        description: form.description || undefined,
        capacity: Number(form.capacity) || undefined,
        careLevel: form.careLevel.length > 0 ? form.careLevel : undefined,
        status: form.status || undefined,
        genderRestriction: form.genderRestriction || null,
        amenities: form.amenities || undefined,
        priceMin: form.priceMin ? Number(form.priceMin) : undefined,
        priceMax: form.priceMax ? Number(form.priceMax) : undefined,
      };

      // Include address if any address field is present
      if (form.street || form.city || form.state || form.zipCode) {
        payload.address = {
          street: form.street || undefined,
          street2: form.street2 || null,
          city: form.city || undefined,
          state: form.state || undefined,
          zipCode: form.zipCode || undefined,
        };
      }

      const res = await fetch(`/api/operator/homes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update');
      }

      toast.success('Home updated successfully');
      router.push(`/operator/homes${operatorId ? `?operatorId=${operatorId}` : ''}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const toggleCareLevel = (level: string) => {
    const newLevels = form.careLevel.includes(level)
      ? form.careLevel.filter((l) => l !== level)
      : [...form.careLevel, level];
    handleInputChange('careLevel', newLevels);
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = form.amenities.includes(amenity)
      ? form.amenities.filter((a) => a !== amenity)
      : [...form.amenities, amenity];
    handleInputChange('amenities', newAmenities);
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Home" showSearch={false}>
        <div className="p-6">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Home" showSearch={false}>
      <div className="p-4 sm:p-6 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/operator/homes')}
            className="text-sm text-neutral-600 hover:text-neutral-800"
          >
            ← Back to Homes
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6">Edit Home Details</h2>

          <form onSubmit={submit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Home Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.name ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.description ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  value={form.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.capacity ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.capacity}
                    onChange={(e) => handleInputChange('capacity', Number(e.target.value))}
                  />
                  {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Gender Restriction
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.genderRestriction}
                    onChange={(e) => handleInputChange('genderRestriction', e.target.value)}
                  >
                    <option value="">No Restriction</option>
                    <option value="MALE">Male Only</option>
                    <option value="FEMALE">Female Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Care Levels */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">
                Care Levels Offered <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CARE_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={`flex items-center p-3 border rounded-md cursor-pointer transition ${
                      form.careLevel.includes(level.value)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-300 hover:border-neutral-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                      checked={form.careLevel.includes(level.value)}
                      onChange={() => toggleCareLevel(level.value)}
                    />
                    <span className="text-sm font-medium text-neutral-700">{level.label}</span>
                  </label>
                ))}
              </div>
              {errors.careLevel && <p className="text-sm text-red-600">{errors.careLevel}</p>}
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Pricing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Minimum Monthly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.priceMin ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.priceMin}
                    onChange={(e) => handleInputChange('priceMin', e.target.value)}
                  />
                  {errors.priceMin && <p className="mt-1 text-sm text-red-600">{errors.priceMin}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Maximum Monthly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.priceMax ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.priceMax}
                    onChange={(e) => handleInputChange('priceMax', e.target.value)}
                  />
                  {errors.priceMax && <p className="mt-1 text-sm text-red-600">{errors.priceMax}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Location</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Apartment, Suite, etc.
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.street2}
                  onChange={(e) => handleInputChange('street2', e.target.value)}
                  placeholder="Apt 4B (optional)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">City</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Seattle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">State</label>
                  <input
                    type="text"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.state}
                    onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                    placeholder="WA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="98101"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES_OPTIONS.map((amenity) => (
                  <label
                    key={amenity}
                    className={`flex items-center p-2 border rounded-md cursor-pointer transition text-sm ${
                      form.amenities.includes(amenity)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                      checked={form.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                    />
                    <span className="text-neutral-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/operator/homes')}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-400"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
