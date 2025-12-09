"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX, FiPhone, FiMail, FiMapPin, FiUser, FiStar, FiShield, FiMessageCircle } from 'react-icons/fi';
import { PermissionGuard, ActionGuard, useHasPermission, useUserRole } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

// Relationship Options
const RELATIONSHIPS = [
  'Daughter',
  'Son',
  'Spouse',
  'Sibling',
  'Grandchild',
  'Parent',
  'Niece/Nephew',
  'Friend',
  'Legal Guardian',
  'Power of Attorney',
  'Other',
];

// Permission Levels
const PERMISSION_LEVELS = [
  { value: 'FULL_ACCESS', label: 'Full Access', color: 'bg-green-100 text-green-800', description: 'Can view and update all information' },
  { value: 'LIMITED_ACCESS', label: 'Limited Access', color: 'bg-blue-100 text-blue-800', description: 'Can view most information, limited updates' },
  { value: 'VIEW_ONLY', label: 'View Only', color: 'bg-yellow-100 text-yellow-800', description: 'Can only view information' },
  { value: 'NO_ACCESS', label: 'No Access', color: 'bg-red-100 text-red-800', description: 'No access to information' },
];

// Contact Preferences
const CONTACT_PREFERENCES = [
  { value: 'PHONE', label: 'Phone', icon: FiPhone },
  { value: 'EMAIL', label: 'Email', icon: FiMail },
  { value: 'TEXT', label: 'Text Message', icon: FiMessageCircle },
  { value: 'IN_PERSON', label: 'In Person', icon: FiUser },
  { value: 'ANY', label: 'Any Method', icon: FiMessageCircle },
];

type FamilyContact = {
  id: string;
  name: string;
  relationship: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isPrimaryContact: boolean;
  permissionLevel: string;
  contactPreference?: string | null;
  notes?: string | null;
  lastContactDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function FamilyTab({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState<FamilyContact | null>(null);
  const [editingContact, setEditingContact] = useState<FamilyContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Daughter',
    phone: '',
    email: '',
    address: '',
    isPrimaryContact: false,
    permissionLevel: 'VIEW_ONLY',
    contactPreference: 'PHONE',
    notes: '',
    lastContactDate: '',
  });

  useEffect(() => {
    fetchContacts();
  }, [residentId]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/residents/${residentId}/family?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch family contacts');
      const data = await res.json();
      setContacts(data.items || []);
    } catch (error) {
      console.error('Error fetching family contacts:', error);
      toast.error('Failed to load family contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        relationship: formData.relationship,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        isPrimaryContact: formData.isPrimaryContact,
        permissionLevel: formData.permissionLevel,
        contactPreference: formData.contactPreference || null,
        notes: formData.notes || null,
        lastContactDate: formData.lastContactDate ? new Date(formData.lastContactDate).toISOString() : null,
      };

      const url = editingContact
        ? `/api/residents/${residentId}/family/${editingContact.id}`
        : `/api/residents/${residentId}/family`;
      const method = editingContact ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save family contact');

      toast.success(editingContact ? 'Family contact updated' : 'Family contact added');
      setShowModal(false);
      setEditingContact(null);
      resetForm();
      fetchContacts();
      router.refresh();
    } catch (error) {
      console.error('Error saving family contact:', error);
      toast.error('Failed to save family contact');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this family contact?')) return;

    try {
      const res = await fetch(`/api/residents/${residentId}/family/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete family contact');

      toast.success('Family contact deleted');
      fetchContacts();
      router.refresh();
    } catch (error) {
      console.error('Error deleting family contact:', error);
      toast.error('Failed to delete family contact');
    }
  };

  const openEditModal = (contact: FamilyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      isPrimaryContact: contact.isPrimaryContact,
      permissionLevel: contact.permissionLevel,
      contactPreference: contact.contactPreference || 'PHONE',
      notes: contact.notes || '',
      lastContactDate: contact.lastContactDate ? new Date(contact.lastContactDate).toISOString().slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: 'Daughter',
      phone: '',
      email: '',
      address: '',
      isPrimaryContact: false,
      permissionLevel: 'VIEW_ONLY',
      contactPreference: 'PHONE',
      notes: '',
      lastContactDate: '',
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    resetForm();
  };

  const getPermissionColor = (level: string) => {
    return PERMISSION_LEVELS.find(p => p.value === level)?.color || 'bg-neutral-100 text-neutral-800';
  };

  const getPermissionLabel = (level: string) => {
    return PERMISSION_LEVELS.find(p => p.value === level)?.label || level;
  };

  const getContactPreferenceIcon = (pref: string) => {
    const Icon = CONTACT_PREFERENCES.find(c => c.value === pref)?.icon || FiMessageCircle;
    return Icon;
  };

  const getContactPreferenceLabel = (pref: string) => {
    return CONTACT_PREFERENCES.find(c => c.value === pref)?.label || pref;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Family & Contacts</h2>
          <p className="text-neutral-600 mt-1">Manage family relationships and communication</p>
        </div>
        <ActionGuard resourceType="family_contact" action="create">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            <FiPlus className="w-5 h-5" />
            Add Family Contact
          </button>
        </ActionGuard>
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <FiUser className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No family contacts yet</h3>
          <p className="text-neutral-600 mb-4">Add family members to manage communication and permissions</p>
          <ActionGuard resourceType="family_contact" action="create">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              <FiPlus className="w-5 h-5" />
              Add Family Contact
            </button>
          </ActionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => {
            const PreferenceIcon = contact.contactPreference ? getContactPreferenceIcon(contact.contactPreference) : FiMessageCircle;
            return (
              <div key={contact.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-semibold text-lg">
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-900 truncate">
                          {contact.name}
                        </h3>
                        {contact.isPrimaryContact && (
                          <FiStar className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" title="Primary Contact" />
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">{contact.relationship}</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPermissionColor(contact.permissionLevel)}`}>
                          <FiShield className="w-3 h-3" />
                          {getPermissionLabel(contact.permissionLevel)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setViewModal(contact)}
                      className="p-1.5 text-neutral-600 hover:text-primary-600 hover:bg-neutral-50 rounded"
                      title="View details"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <ActionGuard resourceType="family_contact" action="update">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-neutral-50 rounded"
                        title="Edit"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                    </ActionGuard>
                    <ActionGuard resourceType="family_contact" action="delete">
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-1.5 text-neutral-600 hover:text-red-600 hover:bg-neutral-50 rounded"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </ActionGuard>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-neutral-700">
                      <FiPhone className="w-4 h-4 text-neutral-500" />
                      <a href={`tel:${contact.phone}`} className="hover:text-primary-600">{contact.phone}</a>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-neutral-700">
                      <FiMail className="w-4 h-4 text-neutral-500" />
                      <a href={`mailto:${contact.email}`} className="hover:text-primary-600 truncate">{contact.email}</a>
                    </div>
                  )}
                  {contact.contactPreference && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <PreferenceIcon className="w-4 h-4" />
                      <span>Prefers: {getContactPreferenceLabel(contact.contactPreference)}</span>
                    </div>
                  )}
                  {contact.lastContactDate && (
                    <div className="text-neutral-600 pt-2 border-t border-neutral-100">
                      <span className="font-medium">Last contact:</span> {formatDate(contact.lastContactDate)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editingContact ? 'Edit Family Contact' : 'New Family Contact'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Relationship *
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Street address, City, State ZIP"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Permission Level
                  </label>
                  <select
                    value={formData.permissionLevel}
                    onChange={(e) => setFormData({ ...formData, permissionLevel: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {PERMISSION_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    {PERMISSION_LEVELS.find(l => l.value === formData.permissionLevel)?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Contact Preference
                  </label>
                  <select
                    value={formData.contactPreference}
                    onChange={(e) => setFormData({ ...formData, contactPreference: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {CONTACT_PREFERENCES.map((pref) => (
                      <option key={pref.value} value={pref.value}>
                        {pref.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Last Contact Date
                </label>
                <input
                  type="date"
                  value={formData.lastContactDate}
                  onChange={(e) => setFormData({ ...formData, lastContactDate: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPrimaryContact}
                    onChange={(e) => setFormData({ ...formData, isPrimaryContact: e.target.checked })}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                  />
                  <span className="text-sm font-medium text-neutral-700">
                    Set as primary contact
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Additional notes about this contact..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Family Contact Details</h3>
              <button onClick={() => setViewModal(null)} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-semibold text-xl">
                    {viewModal.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xl font-semibold text-neutral-900">{viewModal.name}</h4>
                    {viewModal.isPrimaryContact && (
                      <FiStar className="w-5 h-5 text-yellow-500 fill-yellow-500" title="Primary Contact" />
                    )}
                  </div>
                  <p className="text-neutral-600">{viewModal.relationship}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Permission Level</h4>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getPermissionColor(viewModal.permissionLevel)}`}>
                  <FiShield className="w-4 h-4" />
                  {getPermissionLabel(viewModal.permissionLevel)}
                </span>
                <p className="text-xs text-neutral-500 mt-1">
                  {PERMISSION_LEVELS.find(l => l.value === viewModal.permissionLevel)?.description}
                </p>
              </div>

              {(viewModal.phone || viewModal.email) && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-3">Contact Information</h4>
                  <div className="space-y-3">
                    {viewModal.phone && (
                      <div className="flex items-center gap-3">
                        <FiPhone className="w-5 h-5 text-neutral-500" />
                        <a href={`tel:${viewModal.phone}`} className="text-primary-600 hover:text-primary-700">
                          {viewModal.phone}
                        </a>
                      </div>
                    )}
                    {viewModal.email && (
                      <div className="flex items-center gap-3">
                        <FiMail className="w-5 h-5 text-neutral-500" />
                        <a href={`mailto:${viewModal.email}`} className="text-primary-600 hover:text-primary-700">
                          {viewModal.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewModal.address && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Address</h4>
                  <div className="flex items-start gap-3">
                    <FiMapPin className="w-5 h-5 text-neutral-500 mt-0.5" />
                    <p className="text-neutral-900">{viewModal.address}</p>
                  </div>
                </div>
              )}

              {viewModal.contactPreference && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Contact Preference</h4>
                  <div className="flex items-center gap-2">
                    {React.createElement(getContactPreferenceIcon(viewModal.contactPreference), { className: 'w-5 h-5 text-neutral-500' })}
                    <span className="text-neutral-900">{getContactPreferenceLabel(viewModal.contactPreference)}</span>
                  </div>
                </div>
              )}

              {viewModal.lastContactDate && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Last Contact</h4>
                  <p className="text-neutral-900">{formatDate(viewModal.lastContactDate)}</p>
                </div>
              )}

              {viewModal.notes && (
                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Notes</h4>
                  <p className="text-neutral-900 whitespace-pre-wrap">{viewModal.notes}</p>
                </div>
              )}

              <div className="border-t border-neutral-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                  <div>
                    <span className="font-medium">Added:</span> {formatDate(viewModal.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {formatDate(viewModal.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => setViewModal(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    openEditModal(viewModal);
                    setViewModal(null);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Edit Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
