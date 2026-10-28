'use client';

import { FiUser, FiCalendar, FiHome, FiPhone, FiMail, FiUsers, FiClock } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

type Contact = {
  id: string;
  name: string;
  relationship?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
};

type Caregiver = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type TimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  createdAt: string;
  completedAt?: string;
};

type Note = {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
  };
};

type ResidentData = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  status: string;
  photoUrl?: string;
  admissionDate?: string;
  careNeeds?: any;
  home?: {
    id: string;
    name: string;
  };
  contacts: Contact[];
  caregiverAssignments?: Caregiver[];
  timeline?: TimelineEvent[];
  notes?: Note[];
};

export function ResidentOverview({ resident }: { resident: ResidentData }) {
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(resident.dateOfBirth);
  const roomNumber = resident.careNeeds?.roomNumber || 'Not assigned';
  const careLevel = resident.careNeeds?.careLevel || 'Not specified';
  const primaryContact = resident.contacts.find(c => c.isPrimary);
  const secondaryContacts = resident.contacts.filter(c => !c.isPrimary);

  return (
    <div className="space-y-6">
      {/* Personal Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FiUser className="w-5 h-5 text-primary-600" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {resident.photoUrl ? (
                <Image
                  src={resident.photoUrl}
                  alt={`${resident.firstName} ${resident.lastName}`}
                  width={120}
                  height={120}
                  className="h-30 w-30 rounded-lg object-cover border-2 border-neutral-200"
                />
              ) : (
                <div className="h-30 w-30 rounded-lg bg-neutral-200 flex items-center justify-center">
                  <span className="text-neutral-600 font-semibold text-3xl">
                    {resident.firstName[0]}{resident.lastName[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-neutral-500">Full Name</p>
                <p className="text-base text-neutral-900">{resident.firstName} {resident.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Date of Birth</p>
                <p className="text-base text-neutral-900">
                  {new Date(resident.dateOfBirth).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} ({age} years old)
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Gender</p>
                <p className="text-base text-neutral-900 capitalize">{resident.gender.toLowerCase()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-neutral-500 flex items-center gap-1">
                <FiHome className="w-4 h-4" />
                Room Number
              </p>
              <p className="text-base text-neutral-900">{roomNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Care Level</p>
              <p className="text-base text-neutral-900">{careLevel}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 flex items-center gap-1">
                <FiCalendar className="w-4 h-4" />
                Admission Date
              </p>
              <p className="text-base text-neutral-900">
                {resident.admissionDate 
                  ? new Date(resident.admissionDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                  : 'Not admitted yet'}
              </p>
            </div>
            {resident.home && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Facility</p>
                <p className="text-base text-neutral-900">{resident.home.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contacts Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FiPhone className="w-5 h-5 text-primary-600" />
          Emergency Contacts
        </h3>
        {resident.contacts.length === 0 ? (
          <p className="text-sm text-neutral-600">No emergency contacts on file.</p>
        ) : (
          <div className="space-y-4">
            {primaryContact && (
              <div className="border-l-4 border-primary-600 pl-4 py-2 bg-primary-50 rounded-r">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{primaryContact.name}</p>
                    <p className="text-sm text-neutral-600">{primaryContact.relationship || 'Relationship not specified'}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Primary
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {primaryContact.phone && (
                    <p className="text-sm text-neutral-700 flex items-center gap-2">
                      <FiPhone className="w-4 h-4" />
                      {primaryContact.phone}
                    </p>
                  )}
                  {primaryContact.email && (
                    <p className="text-sm text-neutral-700 flex items-center gap-2">
                      <FiMail className="w-4 h-4" />
                      {primaryContact.email}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {secondaryContacts.length > 0 && (
              <div className="space-y-3">
                {secondaryContacts.map((contact) => (
                  <div key={contact.id} className="border-l-2 border-neutral-300 pl-4 py-2">
                    <div>
                      <p className="font-medium text-neutral-900">{contact.name}</p>
                      <p className="text-sm text-neutral-600">{contact.relationship || 'Relationship not specified'}</p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {contact.phone && (
                        <p className="text-sm text-neutral-700 flex items-center gap-2">
                          <FiPhone className="w-4 h-4" />
                          {contact.phone}
                        </p>
                      )}
                      {contact.email && (
                        <p className="text-sm text-neutral-700 flex items-center gap-2">
                          <FiMail className="w-4 h-4" />
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assigned Caregivers Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FiUsers className="w-5 h-5 text-primary-600" />
          Assigned Caregivers
        </h3>
        {!resident.caregiverAssignments || resident.caregiverAssignments.length === 0 ? (
          <p className="text-sm text-neutral-600">No caregivers assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resident.caregiverAssignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-medium text-sm">
                    {assignment.user.firstName[0]}{assignment.user.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">
                    {assignment.user.firstName} {assignment.user.lastName}
                  </p>
                  <p className="text-sm text-neutral-600">{assignment.user.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FiClock className="w-5 h-5 text-primary-600" />
          Recent Activity
        </h3>
        {!resident.timeline || resident.timeline.length === 0 ? (
          <p className="text-sm text-neutral-600">No recent activity.</p>
        ) : (
          <div className="space-y-4">
            {resident.timeline.slice(0, 5).map((event, idx) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-600" />
                  </div>
                  {idx < resident.timeline!.length - 1 && (
                    <div className="w-0.5 h-full bg-neutral-200 flex-1 min-h-[20px]" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-medium text-neutral-900">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-neutral-600 mt-1">{event.description}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(event.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Notes</h3>
        {!resident.notes || resident.notes.length === 0 ? (
          <p className="text-sm text-neutral-600">No notes yet.</p>
        ) : (
          <div className="space-y-4">
            {resident.notes.slice(0, 3).map((note) => (
              <div key={note.id} className="border-l-4 border-neutral-300 pl-4 py-2">
                <p className="text-sm text-neutral-900">{note.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                  {note.author && (
                    <span>by {note.author.firstName} {note.author.lastName}</span>
                  )}
                  <span>•</span>
                  <span>
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
