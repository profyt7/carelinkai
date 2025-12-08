"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import toast from 'react-hot-toast';

export default function OperatorProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    companyName: '',
    taxId: '',
    businessLicense: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Redirect if not operator
    if (status === 'authenticated' && session?.user?.role !== 'OPERATOR' && session?.user?.role !== 'ADMIN') {
      router.push('/settings');
      return;
    }

    // Fetch operator profile
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/operator/profile');
        if (res.ok) {
          const data = await res.json();
          setForm({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            phone: data.user.phone || '',
            email: data.user.email || '',
            companyName: data.operator.companyName || '',
            taxId: data.operator.taxId || '',
            businessLicense: data.operator.businessLicense || '',
          });
        } else if (res.status === 404) {
          toast.error('Operator profile not found');
        }
      } catch (e) {
        console.error('Failed to load profile', e);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, session, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.companyName.trim()) newErrors.companyName = 'Company name is required';
    
    // Phone validation if provided
    if (form.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(form.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
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

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        companyName: form.companyName.trim(),
        taxId: form.taxId.trim() || null,
        businessLicense: form.businessLicense.trim() || null,
      };

      const res = await fetch('/api/operator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout title="Operator Profile" showSearch={false}>
        <div className="p-6">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Operator Profile" showSearch={false}>
      <div className="p-4 sm:p-6 max-w-3xl">
        <Breadcrumbs items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Operator Profile' }
        ]} />

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-neutral-800">Operator Profile</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Manage your operator account information and business details.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Personal Information</h3>
              
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.email}
                    disabled
                  />
                  <p className="mt-1 text-xs text-neutral-500">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.phone ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    value={form.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Business Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.companyName ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  value={form.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Your company or facility name"
                />
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tax ID / EIN
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    placeholder="12-3456789"
                  />
                  <p className="mt-1 text-xs text-neutral-500">Optional - for billing purposes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Business License Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.businessLicense}
                    onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                    placeholder="License number"
                  />
                  <p className="mt-1 text-xs text-neutral-500">Optional</p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/settings')}
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
