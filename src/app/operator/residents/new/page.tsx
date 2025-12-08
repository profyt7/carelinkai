"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import toast from 'react-hot-toast';

type HomeOption = {
  id: string;
  name: string;
};

export default function NewResidentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingHomes, setLoadingHomes] = useState(true);
  const [homes, setHomes] = useState<HomeOption[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    status: 'INQUIRY',
    homeId: '',
    familyEmail: '',
    familyName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch homes for the dropdown
    const fetchHomes = async () => {
      try {
        const res = await fetch('/api/operator/homes');
        if (res.ok) {
          const data = await res.json();
          setHomes(data.homes || []);
        }
      } catch (e) {
        console.error('Failed to load homes', e);
      } finally {
        setLoadingHomes(false);
      }
    };
    fetchHomes();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!form.gender) newErrors.gender = 'Gender is required';
    
    // Date of birth validation
    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
      const now = new Date();
      if (dob > now) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
      const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age > 150) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    // Email validation if provided
    if (form.familyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.familyEmail)) {
      newErrors.familyEmail = 'Please enter a valid email address';
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
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        status: form.status,
        homeId: form.homeId || null,
      };

      // Include family info if provided
      if (form.familyEmail) {
        payload.familyEmail = form.familyEmail.trim();
        if (form.familyName) {
          payload.familyName = form.familyName.trim();
        }
      }

      const res = await fetch('/api/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create resident');
      }

      const data = await res.json();
      toast.success('Resident created successfully');
      router.push(`/operator/residents/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create resident');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <DashboardLayout title="Add New Resident" showSearch={false}>
      <div className="p-4 sm:p-6 max-w-3xl">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Residents', href: '/operator/residents' },
          { label: 'New' }
        ]} />

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6">Resident Information</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.firstName ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.lastName ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.gender ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Placement Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Placement Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="INQUIRY">Inquiry</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DISCHARGED">Discharged</option>
                  </select>
                  <p className="mt-1 text-xs text-neutral-500">Current status of the resident</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Assign to Home
                  </label>
                  {loadingHomes ? (
                    <div className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-50 text-sm text-neutral-500">
                      Loading homes...
                    </div>
                  ) : (
                    <select
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={form.homeId}
                      onChange={(e) => handleInputChange('homeId', e.target.value)}
                    >
                      <option value="">None (Unassigned)</option>
                      {homes.map((home) => (
                        <option key={home.id} value={home.id}>
                          {home.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-xs text-neutral-500">Optionally assign to one of your homes</p>
                </div>
              </div>
            </div>

            {/* Family Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Family Contact (Optional)</h3>
              <p className="text-sm text-neutral-600">
                If you have family contact information, enter it here. Otherwise, a placeholder family record will be created.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Family Email
                  </label>
                  <input
                    type="email"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.familyEmail ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.familyEmail}
                    onChange={(e) => handleInputChange('familyEmail', e.target.value)}
                    placeholder="family@example.com"
                  />
                  {errors.familyEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.familyEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Family Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.familyName}
                    onChange={(e) => handleInputChange('familyName', e.target.value)}
                    placeholder="John Doe"
                  />
                  <p className="mt-1 text-xs text-neutral-500">Full name of family contact</p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/operator/residents')}
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
                {loading ? 'Creating...' : 'Create Resident'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
