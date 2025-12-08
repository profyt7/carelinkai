"use client";
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiAlertCircle } from 'react-icons/fi';
import { ResidentPhotoUpload } from './ResidentPhotoUpload';

type Resident = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  status: string;
  homeId?: string | null;
  photoUrl?: string | null;
  medicalConditions?: string | null;
  medications?: string | null;
  allergies?: string | null;
  dietaryRestrictions?: string | null;
};

export function EditResidentForm({ resident }: { resident: Resident }) {
  const [firstName, setFirstName] = useState(resident.firstName);
  const [lastName, setLastName] = useState(resident.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(resident.dateOfBirth?.slice(0, 10));
  const [gender, setGender] = useState(resident.gender);
  const [status, setStatus] = useState(resident.status);
  const [homeId, setHomeId] = useState(resident.homeId || '');
  const [photoUrl, setPhotoUrl] = useState(resident.photoUrl || null);
  
  // Medical information fields
  const [medicalConditions, setMedicalConditions] = useState(resident.medicalConditions || '');
  const [medications, setMedications] = useState(resident.medications || '');
  const [allergies, setAllergies] = useState(resident.allergies || '');
  const [dietaryRestrictions, setDietaryRestrictions] = useState(resident.dietaryRestrictions || '');
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/residents/${resident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName, 
          lastName, 
          dateOfBirth, 
          gender, 
          status, 
          homeId: homeId || null,
          medicalConditions: medicalConditions || null,
          medications: medications || null,
          allergies: allergies || null,
          dietaryRestrictions: dietaryRestrictions || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update resident');
      }
      toast.success('Resident updated successfully');
      router.push(`/operator/residents/${resident.id}`);
      router.refresh();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update resident');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-6">
      {/* Photo Upload */}
      <section className="border border-neutral-200 rounded-lg p-6 bg-white">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4 text-center">Profile Photo</h2>
        <ResidentPhotoUpload
          residentId={resident.id}
          residentName={`${firstName} ${lastName}`}
          currentPhotoUrl={photoUrl}
          onPhotoUpdated={(url) => setPhotoUrl(url)}
        />
      </section>

      {/* Basic Information */}
      <section className="border border-neutral-200 rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">Basic Information</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                placeholder="First name" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                placeholder="Last name" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                required 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                value={dateOfBirth} 
                onChange={(e) => setDateOfBirth(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Gender</label>
              <select 
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                value={gender} 
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
              <select 
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="INQUIRY">Inquiry</option>
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="DISCHARGED">Discharged</option>
                <option value="DECEASED">Deceased</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Home ID (optional)</label>
            <input 
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
              placeholder="Home ID (optional)" 
              value={homeId} 
              onChange={(e) => setHomeId(e.target.value)} 
            />
          </div>
        </div>
      </section>

      {/* Medical Information */}
      <section className="border border-neutral-200 rounded-lg p-4 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <FiAlertCircle className="text-amber-600 mt-1" size={20} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-neutral-800">Medical Information</h2>
            <p className="text-sm text-neutral-600 mt-1">
              All medical information is encrypted and stored securely in compliance with HIPAA regulations.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Medical Conditions
            </label>
            <textarea 
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px]" 
              placeholder="List any chronic conditions, diagnoses, etc."
              value={medicalConditions} 
              onChange={(e) => setMedicalConditions(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-neutral-500 mt-1">
              {medicalConditions.length} / 2000 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Current Medications
            </label>
            <textarea 
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px]" 
              placeholder="List medications, dosages, and frequency"
              value={medications} 
              onChange={(e) => setMedications(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-neutral-500 mt-1">
              {medications.length} / 2000 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Allergies
            </label>
            <textarea 
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]" 
              placeholder="List any known allergies (medications, food, environmental)"
              value={allergies} 
              onChange={(e) => setAllergies(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-neutral-500 mt-1">
              {allergies.length} / 1000 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Dietary Restrictions
            </label>
            <textarea 
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]" 
              placeholder="List any dietary restrictions or preferences"
              value={dietaryRestrictions} 
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-neutral-500 mt-1">
              {dietaryRestrictions.length} / 1000 characters
            </p>
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <button 
          disabled={loading} 
          className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
          type="submit"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-md hover:bg-neutral-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
