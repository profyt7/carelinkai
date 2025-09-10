'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { FiArrowLeft, FiPlus, FiTrash2, FiSave } from 'react-icons/fi';

// Hardcoded family ID - same as used in other pages
const FAMILY_ID = 'cmdhjmp2x0000765nc52usnp7';

// Define types for our form
interface EscalationContact {
  name: string;
  phone: string;
}

interface EmergencyPreference {
  escalationChain: EscalationContact[];
  notifyMethods: string[];
  careInstructions: string;
}

export default function EmergencyPreferencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [preferences, setPreferences] = useState<EmergencyPreference>({
    escalationChain: [],
    notifyMethods: [],
    careInstructions: '',
  });

  // Load existing preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/family/emergency?familyId=${FAMILY_ID}`);
        
        if (!response.ok) {
          throw new Error('Failed to load emergency preferences');
        }
        
        const data = await response.json();
        setPreferences(data.preference);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading preferences');
        console.error('Error loading emergency preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, []);

  // Handle notify method checkbox changes
  const handleNotifyMethodChange = (method: string) => {
    setPreferences(prev => {
      const methods = [...prev.notifyMethods];
      
      if (methods.includes(method)) {
        return {
          ...prev,
          notifyMethods: methods.filter(m => m !== method),
        };
      } else {
        return {
          ...prev,
          notifyMethods: [...methods, method],
        };
      }
    });
  };

  // Handle care instructions changes
  const handleCareInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPreferences(prev => ({
      ...prev,
      careInstructions: e.target.value,
    }));
  };

  // Handle escalation chain contact changes
  const handleContactChange = (index: number, field: keyof EscalationContact, value: string) => {
    setPreferences(prev => {
      const newChain = [...prev.escalationChain];
      newChain[index] = {
        ...newChain[index],
        [field]: value,
      };
      return {
        ...prev,
        escalationChain: newChain,
      };
    });
  };

  // Add new contact to escalation chain
  const addContact = () => {
    setPreferences(prev => ({
      ...prev,
      escalationChain: [...prev.escalationChain, { name: '', phone: '' }],
    }));
  };

  // Remove contact from escalation chain
  const removeContact = (index: number) => {
    setPreferences(prev => ({
      ...prev,
      escalationChain: prev.escalationChain.filter((_, i) => i !== index),
    }));
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/family/emergency?familyId=${FAMILY_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escalationChain: preferences.escalationChain,
          notifyMethods: preferences.notifyMethods,
          careInstructions: preferences.careInstructions,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save emergency preferences');
      }
      
      window.alert('Emergency preferences saved successfully');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving preferences');
      console.error('Error saving emergency preferences:', err);
      window.alert(`Failed to save: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Emergency Preferences">
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Emergency Preferences</h1>
              <p className="mt-1 text-primary-100">
                Configure who we contact in case of emergencies.
              </p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div>
          <Link 
            href="/family" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600"
          >
            <FiArrowLeft className="mr-1" /> Back to Family Portal
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-gray-500">Loading preferences…</div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notify Methods */}
            <div className="rounded-md border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Notification Methods</h2>
              <p className="mb-4 text-sm text-gray-600">
                Select how you would like to be notified in case of an emergency.
              </p>
              <div className="space-y-2">
                {['SMS', 'EMAIL', 'CALL'].map((method) => (
                  <label key={method} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={preferences.notifyMethods.includes(method)}
                      onChange={() => handleNotifyMethodChange(method)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Escalation Chain */}
            <div className="rounded-md border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Escalation Chain</h2>
              <p className="mb-4 text-sm text-gray-600">
                Add contacts in order of priority. We will contact each person in sequence until we reach someone.
              </p>
              
              {preferences.escalationChain.length === 0 ? (
                <div className="mb-4 rounded-md bg-gray-50 p-4 text-sm text-gray-600">
                  No contacts added. Add your first contact below.
                </div>
              ) : (
                <div className="mb-4 space-y-4">
                  {preferences.escalationChain.map((contact, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="flex-grow">
                        <label className="block text-xs font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                          className="mt-1 w-full rounded-md border-gray-300 text-sm"
                          placeholder="Contact name"
                        />
                      </div>
                      <div className="flex-grow">
                        <label className="block text-xs font-medium text-gray-700">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                          className="mt-1 w-full rounded-md border-gray-300 text-sm"
                          placeholder="Phone number"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="mr-1" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                type="button"
                onClick={addContact}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FiPlus className="mr-1" /> Add Contact
              </button>
            </div>

            {/* Care Instructions */}
            <div className="rounded-md border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Care Instructions</h2>
              <p className="mb-4 text-sm text-gray-600">
                Provide any special instructions for emergency situations.
              </p>
              <textarea
                value={preferences.careInstructions}
                onChange={handleCareInstructionsChange}
                rows={4}
                className="w-full rounded-md border-gray-300"
                placeholder="Enter any special care instructions or notes for emergency situations..."
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={savePreferences}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (
                  <>
                    <FiSave className="mr-2" /> Save Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
