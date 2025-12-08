"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumbs from '@/components/ui/breadcrumbs';
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

export default function NewHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    careLevel: [] as string[],
    capacity: '',
    priceMin: '',
    priceMax: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
    genderRestriction: '',
    amenities: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.name.trim()) newErrors.name = 'Home name is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.careLevel.length === 0) newErrors.careLevel = 'Select at least one care level';
    if (!form.capacity || parseInt(form.capacity) <= 0) newErrors.capacity = 'Capacity must be greater than 0';
    if (!form.street.trim()) newErrors.street = 'Street address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state.trim()) newErrors.state = 'State is required';
    if (!form.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    
    // ZIP code validation
    if (form.zipCode && !/^\d{5}(-\d{4})?$/.test(form.zipCode)) {
      newErrors.zipCode = 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
    }

    // Price validation
    if (form.priceMin && parseFloat(form.priceMin) < 0) {
      newErrors.priceMin = 'Minimum price must be 0 or greater';
    }
    if (form.priceMax && parseFloat(form.priceMax) < 0) {
      newErrors.priceMax = 'Maximum price must be 0 or greater';
    }
    if (form.priceMin && form.priceMax && parseFloat(form.priceMin) > parseFloat(form.priceMax)) {
      newErrors.priceMax = 'Maximum price must be greater than minimum price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        careLevel: form.careLevel,
        capacity: parseInt(form.capacity),
        priceMin: form.priceMin ? parseFloat(form.priceMin) : null,
        priceMax: form.priceMax ? parseFloat(form.priceMax) : null,
        genderRestriction: form.genderRestriction || null,
        amenities: form.amenities,
        address: {
          street: form.street.trim(),
          street2: form.street2.trim() || null,
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: form.zipCode.trim(),
        },
      };

      const res = await fetch('/api/operator/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create home');
      }

      const data = await res.json();
      toast.success('Home created successfully');
      router.push(`/operator/homes/${data.home.id}/edit`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create home');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
    // Clear error for this field when user starts typing
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

  return (
    <DashboardLayout title="Add New Home" showSearch={false}>
      <div className="p-4 sm:p-6 max-w-4xl">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Homes', href: '/operator/homes' },
          { label: 'New' }
        ]} />

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6">Home Details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-8">
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
                  placeholder="e.g., Sunny Meadows Assisted Living"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
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
                  placeholder="Describe your home, its atmosphere, and what makes it special..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    onChange={(e) => handleInputChange('capacity', e.target.value)}
                    placeholder="Number of residents"
                  />
                  {errors.capacity && (
                    <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
                  )}
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
                  <p className="mt-1 text-xs text-neutral-500">Optional gender restriction</p>
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
              {errors.careLevel && (
                <p className="text-sm text-red-600">{errors.careLevel}</p>
              )}
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
                    placeholder="e.g., 3000"
                  />
                  {errors.priceMin && (
                    <p className="mt-1 text-sm text-red-600">{errors.priceMin}</p>
                  )}
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
                    placeholder="e.g., 6000"
                  />
                  {errors.priceMax && (
                    <p className="mt-1 text-sm text-red-600">{errors.priceMax}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Location</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.street ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  value={form.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="123 Main St"
                />
                {errors.street && (
                  <p className="mt-1 text-sm text-red-600">{errors.street}</p>
                )}
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
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.city ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Seattle"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.state ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.state}
                    onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                    placeholder="WA"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.zipCode ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="98101"
                  />
                  {errors.zipCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
                  )}
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
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-400"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Home'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
