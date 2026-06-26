"use client";

import PhotoGalleryManager from '@/components/operator/homes/PhotoGalleryManager';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const id = params['id'];
  const operatorId = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('operatorId') : null);
  const [showAIBanner, setShowAIBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get('ai') === '1') {
      setShowAIBanner(true);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  
  // Featured listing state
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredUntil, setFeaturedUntil] = useState<Date | null>(null);
  const [featuringListing, setFeaturingListing] = useState(false);

  // AI Profile Generation State
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<{
    description: string;
    highlights: string[];
    lastGenerated?: Date;
  } | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: 0,
    currentOccupancy: 0,
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

  const loadHomeData = async () => {
    try {
      const res = await fetch(`/api/operator/homes/${id}`);
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          setForm({
            name: data.name || '',
            description: data.description || '',
            capacity: data.capacity || 0,
            currentOccupancy: data.currentOccupancy ?? 0,
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
          setPhotos(data.photos || []);
          setIsFeatured(data.isFeatured ?? false);
          setFeaturedUntil(data.featuredUntil ? new Date(data.featuredUntil) : null);

          // Load AI-generated profile data if exists
          if (data.aiGeneratedDescription || data.highlights) {
            setAiGeneratedData({
              description: data.aiGeneratedDescription || '',
              highlights: data.highlights || [],
              lastGenerated: data.lastProfileGenerated ? new Date(data.lastProfileGenerated) : undefined,
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to load home', e);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI Profile
  const handleGenerateProfile = async () => {
    if (generatingProfile) return;
    
    setGeneratingProfile(true);
    try {
      const res = await fetch(`/api/operator/homes/${id}/generate-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate profile');
      }

      const result = await res.json();
      
      if (result.success && result.data) {
        setAiGeneratedData({
          description: result.data.aiGeneratedDescription || '',
          highlights: result.data.highlights || [],
          lastGenerated: result.data.lastProfileGenerated ? new Date(result.data.lastProfileGenerated) : new Date(),
        });
        setShowAIPreview(true);
        toast.success('Profile generated successfully!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate profile');
    } finally {
      setGeneratingProfile(false);
    }
  };

  // Apply AI-generated content to form
  const handleApplyAIProfile = () => {
    if (aiGeneratedData) {
      handleInputChange('description', aiGeneratedData.description);
      toast.success('AI-generated content applied to description');
      setShowAIPreview(false);
    }
  };

  const handleToggleFeatured = async () => {
    if (featuringListing) return;
    setFeaturingListing(true);
    const action = isFeatured ? 'disable' : 'enable';
    try {
      const res = await fetch(`/api/operator/homes/${id}/featured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update featured status');
      setIsFeatured(data.isFeatured);
      setFeaturedUntil(data.featuredUntil ? new Date(data.featuredUntil) : null);
      toast.success(action === 'enable' ? 'Listing featured! $79 will appear on your next invoice.' : 'Featured listing disabled.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update featured status');
    } finally {
      setFeaturingListing(false);
    }
  };

  useEffect(() => {
    loadHomeData();
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
        currentOccupancy: Number(form.currentOccupancy),
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
      <div className="p-6">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Homes', href: '/operator/homes' },
          { label: form.name || 'Edit' }
        ]} />

        {showAIBanner && (
          <div className="mb-6 bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-300 rounded-xl p-5 flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-bold text-primary-900 text-base mb-1">Your home was created — now let AI write your profile!</div>
              <p className="text-sm text-primary-700">Scroll down to the <strong>Description</strong> field and click <strong>"Generate Profile with AI"</strong> to instantly create a compelling, professional listing description based on your home's details.</p>
            </div>
            <button onClick={() => setShowAIBanner(false)} className="text-primary-400 hover:text-primary-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6">Edit Home Details</h2>

          <form onSubmit={submit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Home Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.name ? 'border-error-500' : 'border-neutral-300'
                  }`}
                  value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
                {errors.name && <p className="mt-1 text-sm text-error-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Description <span className="text-error-500">*</span>
                </label>
                <textarea
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.description ? 'border-error-500' : 'border-neutral-300'
                  }`}
                  value={form.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                {errors.description && <p className="mt-1 text-sm text-error-600">{errors.description}</p>}
                
                {/* AI Profile Generation */}
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGenerateProfile}
                    disabled={generatingProfile}
                    className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-secondary-500 hover:opacity-90 shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    <svg className={`w-4 h-4 mr-2 ${generatingProfile ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {generatingProfile ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      )}
                    </svg>
                    {generatingProfile ? 'Generating...' : '⚡ Generate Profile with AI'}
                  </button>
                  <span className="text-xs text-neutral-500">Saves 5+ hours of writing</span>
                  
                  {aiGeneratedData && aiGeneratedData.lastGenerated && (
                    <span className="ml-3 text-xs text-neutral-500">
                      Last generated: {aiGeneratedData.lastGenerated.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* AI Preview Modal/Section */}
              {showAIPreview && aiGeneratedData && (
                <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <h4 className="text-sm font-semibold text-neutral-800">
                        AI-Generated Profile
                      </h4>
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                        New
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAIPreview(false)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Generated Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Generated Description:
                    </label>
                    <div className="bg-white p-3 rounded-md border border-primary-200 text-sm text-neutral-700 leading-relaxed">
                      {aiGeneratedData.description}
                    </div>
                  </div>

                  {/* Generated Highlights */}
                  {aiGeneratedData.highlights && aiGeneratedData.highlights.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Key Highlights:
                      </label>
                      <ul className="bg-white p-3 rounded-md border border-primary-200 space-y-2">
                        {aiGeneratedData.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start text-sm text-neutral-700">
                            <svg className="w-4 h-4 text-success-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleApplyAIProfile}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Apply to Description
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateProfile}
                      disabled={generatingProfile}
                      className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAIPreview(false)}
                      className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Capacity <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.capacity ? 'border-error-500' : 'border-neutral-300'
                    }`}
                    value={form.capacity}
                    onChange={(e) => handleInputChange('capacity', Number(e.target.value))}
                  />
                  {errors.capacity && <p className="mt-1 text-sm text-error-600">{errors.capacity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Current Residents
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.capacity}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.currentOccupancy}
                    onChange={(e) => handleInputChange('currentOccupancy', Number(e.target.value))}
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    {form.capacity - form.currentOccupancy} spot{form.capacity - form.currentOccupancy !== 1 ? 's' : ''} available
                  </p>
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
                Care Levels Offered <span className="text-error-500">*</span>
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
              {errors.careLevel && <p className="text-sm text-error-600">{errors.careLevel}</p>}
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
                      errors.priceMin ? 'border-error-500' : 'border-neutral-300'
                    }`}
                    value={form.priceMin}
                    onChange={(e) => handleInputChange('priceMin', e.target.value)}
                  />
                  {errors.priceMin && <p className="mt-1 text-sm text-error-600">{errors.priceMin}</p>}
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
                      errors.priceMax ? 'border-error-500' : 'border-neutral-300'
                    }`}
                    value={form.priceMax}
                    onChange={(e) => handleInputChange('priceMax', e.target.value)}
                  />
                  {errors.priceMax && <p className="mt-1 text-sm text-error-600">{errors.priceMax}</p>}
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
                    placeholder="Cleveland"
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

            {/* Photos */}
            <PhotoGalleryManager
              homeId={id}
              photos={photos}
              onPhotosChange={loadHomeData}
            />

            {/* Featured Listing */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⭐</span>
                    <h3 className="font-semibold text-neutral-900">Featured Listing</h3>
                    {isFeatured && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">
                    Appear at the top of family search results for 30 days. <strong>$79/month add-on</strong> — billed on your next invoice.
                  </p>
                  {isFeatured && featuredUntil && (
                    <p className="text-xs text-amber-700 mt-1">
                      Featured until {featuredUntil.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleToggleFeatured}
                  disabled={featuringListing}
                  className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 ${
                    isFeatured
                      ? 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {featuringListing ? 'Updating...' : isFeatured ? 'Disable Featured' : 'Enable Featured — $79/mo'}
                </button>
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
  );
}
