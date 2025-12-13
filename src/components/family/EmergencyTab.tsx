'use client';

import React, { useEffect, useState } from 'react';
import { FiAlertCircle, FiPhone, FiMail, FiPlus, FiEdit2, FiTrash2, FiX, FiSave } from 'react-icons/fi';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number;
};

type EmergencyPreference = {
  id: string;
  escalationChain: EmergencyContact[];
  notifyMethods: string[];
  careInstructions?: string;
  lastConfirmedAt?: string;
};

interface EmergencyTabProps {
  familyId: string | null;
  showMock?: boolean;
  isGuest?: boolean;
}

export default function EmergencyTab({ familyId, showMock = false, isGuest = false }: EmergencyTabProps) {
  const [prefs, setPrefs] = useState<EmergencyPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    priority: 1,
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      if (showMock) {
        const mockPrefs: EmergencyPreference = {
          id: 'pref-1',
          escalationChain: [
            { name: 'John Doe', relationship: 'Son', phone: '+1-555-0101', email: 'john@example.com', priority: 1 },
            { name: 'Jane Smith', relationship: 'Daughter', phone: '+1-555-0102', email: 'jane@example.com', priority: 2 },
          ],
          notifyMethods: ['SMS', 'EMAIL', 'CALL'],
          careInstructions: 'Patient has heart condition. Please contact cardiologist Dr. Brown at +1-555-9999 in case of cardiac emergency.',
          lastConfirmedAt: new Date().toISOString(),
        };
        setPrefs(mockPrefs);
        setLoading(false);
        return;
      }

      if (!familyId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/family/emergency?familyId=${familyId}`);
      if (!res.ok) throw new Error('Failed to load emergency preferences');
      const json = await res.json();
      setPrefs(json.preferences);
    } catch (err: any) {
      setError(err.message ?? 'Error loading emergency preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [familyId, showMock]);

  const handleAddContact = () => {
    setEditIndex(null);
    setEditForm({
      name: '',
      relationship: '',
      phone: '',
      email: '',
      priority: (prefs?.escalationChain.length || 0) + 1,
    });
    setIsEditing(true);
  };

  const handleEditContact = (index: number) => {
    if (prefs) {
      setEditIndex(index);
      setEditForm({ ...prefs.escalationChain[index] });
      setIsEditing(true);
    }
  };

  const handleSaveContact = async () => {
    if (!editForm.name || !editForm.phone || !editForm.relationship) {
      alert('Please fill in name, phone, and relationship');
      return;
    }

    try {
      const newChain = prefs?.escalationChain ? [...prefs.escalationChain] : [];
      
      if (editIndex !== null) {
        newChain[editIndex] = editForm;
      } else {
        newChain.push(editForm);
      }

      const res = await fetch('/api/family/emergency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          escalationChain: newChain,
          notifyMethods: prefs?.notifyMethods || ['SMS', 'EMAIL'],
          careInstructions: prefs?.careInstructions,
        }),
      });

      if (!res.ok) throw new Error('Failed to save emergency contact');
      
      setIsEditing(false);
      setEditIndex(null);
      fetchPreferences();
    } catch (err: any) {
      alert(err.message ?? 'Error saving contact');
    }
  };

  const handleDeleteContact = async (index: number) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;

    try {
      const newChain = prefs?.escalationChain.filter((_, i) => i !== index) || [];
      
      const res = await fetch('/api/family/emergency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          escalationChain: newChain,
          notifyMethods: prefs?.notifyMethods || ['SMS', 'EMAIL'],
          careInstructions: prefs?.careInstructions,
        }),
      });

      if (!res.ok) throw new Error('Failed to delete emergency contact');
      fetchPreferences();
    } catch (err: any) {
      alert(err.message ?? 'Error deleting contact');
    }
  };

  if (loading) {
    return <LoadingState type="list" count={3} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Error loading emergency preferences</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const contacts = prefs?.escalationChain || [];

  return (
    <div>
      {/* Emergency Instructions */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 p-6 mb-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <FiAlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-900 mb-2">Emergency Contact List</h3>
            <p className="text-sm text-red-700 leading-relaxed">
              {prefs?.careInstructions || 'These contacts will be notified in order of priority in case of emergencies.'}
            </p>
            {prefs?.lastConfirmedAt && (
              <p className="text-xs text-red-600 mt-2">
                Last confirmed: {new Date(prefs.lastConfirmedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add Contact Button */}
      {!isGuest && (
        <div className="mb-6">
          <button
            onClick={handleAddContact}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
          >
            <FiPlus className="w-5 h-5" />
            Add Emergency Contact
          </button>
        </div>
      )}

      {/* Contact Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiAlertCircle className="w-6 h-6 text-red-600" />
                {editIndex !== null ? 'Edit' : 'Add'} Emergency Contact
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Relationship *
                </label>
                <input
                  type="text"
                  value={editForm.relationship}
                  onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                  placeholder="Son, Daughter, Spouse, etc."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+1-555-0100"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveContact}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  <FiSave className="w-5 h-5" />
                  Save Contact
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <EmptyState
          icon={FiAlertCircle}
          title="No emergency contacts"
          description="Add emergency contacts who should be notified in case of urgent situations. They will be contacted in order of priority."
          actionLabel={isGuest ? undefined : 'Add First Contact'}
          onAction={isGuest ? undefined : handleAddContact}
        />
      ) : (
        <div className="space-y-4">
          {contacts.map((contact, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-red-300"
            >
              <div className="flex items-start gap-4">
                {/* Priority Badge */}
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-lg">#{index + 1}</span>
                </div>

                {/* Contact Info */}
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-900 mb-1">{contact.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{contact.relationship}</p>
                  
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <FiPhone className="w-4 h-4" />
                      {contact.phone}
                    </a>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <FiMail className="w-4 h-4" />
                        {contact.email}
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isGuest && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditContact(index)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guest Notice */}
      {isGuest && contacts.length > 0 && (
        <div className="mt-6 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 p-4 text-sm text-gray-600 border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚫</span>
            <p className="font-medium">
              As a guest, you can view but not modify emergency contacts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
