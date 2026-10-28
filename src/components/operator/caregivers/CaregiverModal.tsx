"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiBriefcase } from 'react-icons/fi';

interface CaregiverModalProps {
  caregiver?: {
    id: string;
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string | null;
    };
    photoUrl?: string | null;
    dateOfBirth?: Date | string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    employmentType: string;
    employmentStatus: string;
    hireDate?: Date | string | null;
    specializations?: string[];
    languages?: string[];
    yearsOfExperience?: number | null;
    bio?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const SPECIALIZATIONS = [
  "Alzheimer's Care",
  "Dementia Care",
  "Physical Therapy",
  "Occupational Therapy",
  "Wound Care",
  "Medication Management",
  "Hospice Care",
  "Diabetes Management",
  "Post-Surgery Care",
  "Fall Prevention",
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'Mandarin',
  'Cantonese',
  'Vietnamese',
  'Tagalog',
  'Korean',
  'Russian',
  'Arabic',
];

export function CaregiverModal({ caregiver, onClose, onSuccess }: CaregiverModalProps) {
  const isEdit = !!caregiver;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: caregiver?.user.firstName || '',
    lastName: caregiver?.user.lastName || '',
    email: caregiver?.user.email || '',
    phoneNumber: caregiver?.user.phoneNumber || '',
    dateOfBirth: caregiver?.dateOfBirth
      ? new Date(caregiver.dateOfBirth).toISOString().split('T')[0]
      : '',
    address: caregiver?.address || '',
    city: caregiver?.city || '',
    state: caregiver?.state || '',
    zipCode: caregiver?.zipCode || '',
    employmentType: caregiver?.employmentType || 'FULL_TIME',
    employmentStatus: caregiver?.employmentStatus || 'ACTIVE',
    hireDate: caregiver?.hireDate
      ? new Date(caregiver.hireDate).toISOString().split('T')[0]
      : '',
    specializations: caregiver?.specializations || [],
    languages: caregiver?.languages || [],
    yearsOfExperience: caregiver?.yearsOfExperience?.toString() || '',
    bio: caregiver?.bio || '',
    photoUrl: caregiver?.photoUrl || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || null,
        hireDate: formData.hireDate || null,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
      };

      const url = isEdit
        ? `/api/operator/caregivers/${caregiver.id}`
        : '/api/operator/caregivers';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save caregiver');
      }

      toast.success(isEdit ? 'Caregiver updated successfully' : 'Caregiver created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving caregiver:', error);
      toast.error(error.message || 'Failed to save caregiver');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {isEdit ? 'Edit Caregiver' : 'Add New Caregiver'}
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              {isEdit ? 'Update caregiver information' : 'Enter caregiver details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FiUser className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FiMapPin className="w-4 h-4" />
              Address
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FiBriefcase className="w-4 h-4" />
              Employment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Employment Type *
                </label>
                <select
                  required
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="PER_DIEM">Per Diem</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Employment Status *
                </label>
                <select
                  required
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Specializations
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALIZATIONS.map((spec) => (
                <label
                  key={spec}
                  className="flex items-center gap-2 p-2 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.specializations.includes(spec)}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        specializations: toggleArrayItem(formData.specializations, spec),
                      })
                    }
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">{spec}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Languages Spoken
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => (
                <label
                  key={lang}
                  className="flex items-center gap-2 p-2 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.languages.includes(lang)}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        languages: toggleArrayItem(formData.languages, lang),
                      })
                    }
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">{lang}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Brief professional bio..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Caregiver' : 'Create Caregiver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
