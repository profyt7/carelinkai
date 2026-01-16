'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, FiUser, FiHome, FiPhone, FiMail, FiCalendar, 
  FiFileText, FiMessageCircle, FiClock, FiEdit2, FiSave, FiX,
  FiAlertTriangle, FiCheckCircle, FiUserPlus, FiPlus
} from 'react-icons/fi';
import { format } from 'date-fns';

interface InquiryDetail {
  id: string;
  status: string;
  urgency: string;
  source: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  careRecipientName: string | null;
  careRecipientAge: number | null;
  careNeeds: string[];
  additionalInfo: string | null;
  message: string | null;
  internalNotes: string | null;
  tourDate: string | null;
  createdAt: string;
  updatedAt: string;
  conversionDate: string | null;
  conversionNotes: string | null;
  home: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    operator: {
      id: string;
      companyName: string;
      user: { firstName: string; lastName: string; email: string };
    };
  };
  family: {
    id: string;
    user: { firstName: string; lastName: string; email: string; phone: string | null };
  };
  assignedTo: { id: string; firstName: string; lastName: string; email: string } | null;
  convertedBy: { id: string; firstName: string; lastName: string } | null;
  convertedResident: { id: string; firstName: string; lastName: string } | null;
  documents: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    documentType: string;
    uploadedAt: string;
    uploadedBy: { firstName: string; lastName: string };
  }>;
  responses: Array<{
    id: string;
    content: string;
    type: string;
    channel: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }>;
  followUps: Array<{
    id: string;
    type: string;
    status: string;
    scheduledFor: string;
    completedAt: string | null;
    notes: string | null;
  }>;
}

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'TOUR_SCHEDULED', label: 'Tour Scheduled' },
  { value: 'TOUR_COMPLETED', label: 'Tour Completed' },
  { value: 'PLACEMENT_OFFERED', label: 'Placement Offered' },
  { value: 'PLACEMENT_ACCEPTED', label: 'Placement Accepted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'CONVERTING', label: 'Converting' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
];

const URGENCY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    CONTACTED: 'bg-yellow-100 text-yellow-800',
    TOUR_SCHEDULED: 'bg-purple-100 text-purple-800',
    TOUR_COMPLETED: 'bg-indigo-100 text-indigo-800',
    PLACEMENT_OFFERED: 'bg-orange-100 text-orange-800',
    PLACEMENT_ACCEPTED: 'bg-green-100 text-green-800',
    QUALIFIED: 'bg-cyan-100 text-cyan-800',
    CONVERTING: 'bg-amber-100 text-amber-800',
    CONVERTED: 'bg-emerald-100 text-emerald-800',
    CLOSED_LOST: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getUrgencyColor = (urgency: string) => {
  const colors: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  };
  return colors[urgency] || 'bg-gray-100 text-gray-800';
};

export default function AdminInquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'responses' | 'documents' | 'followups' | 'activity'>('details');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editUrgency, setEditUrgency] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    fetchInquiry();
  }, [id]);

  const fetchInquiry = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/inquiries/${id}`);
      if (!res.ok) throw new Error('Failed to fetch inquiry');
      const data = await res.json();
      setInquiry(data.inquiry);
      setAuditLogs(data.auditLogs || []);
      setEditStatus(data.inquiry.status);
      setEditUrgency(data.inquiry.urgency || 'MEDIUM');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inquiry');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!inquiry) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, urgency: editUrgency }),
      });
      if (!res.ok) throw new Error('Failed to update inquiry');
      await fetchInquiry();
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote, append: true }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      await fetchInquiry();
      setNewNote('');
      setShowNoteModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading inquiry...</p>
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error || 'Inquiry not found'}</p>
          <Link href="/admin/inquiries" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Inquiries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/inquiries" className="text-gray-500 hover:text-gray-700">
                <FiArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Inquiry from {inquiry.contactName || `${inquiry.family?.user?.firstName} ${inquiry.family?.user?.lastName}`}
                </h1>
                <p className="text-sm text-gray-500">ID: {inquiry.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(inquiry.status)}`}>
                {inquiry.status.replace(/_/g, ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(inquiry.urgency || 'MEDIUM')}`}>
                {inquiry.urgency || 'MEDIUM'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {[
                    { id: 'details', label: 'Details', icon: FiFileText },
                    { id: 'responses', label: 'Responses', icon: FiMessageCircle, count: inquiry.responses.length },
                    { id: 'documents', label: 'Documents', icon: FiFileText, count: inquiry.documents.length },
                    { id: 'followups', label: 'Follow-ups', icon: FiClock, count: inquiry.followUps.length },
                    { id: 'activity', label: 'Activity', icon: FiClock, count: auditLogs.length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Status Edit */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Inquiry Details</h3>
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(false)}
                            className="px-3 py-1.5 text-gray-600 hover:text-gray-800"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={saveChanges}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            <FiSave className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <FiEdit2 className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                    </div>

                    {editing && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                          <select
                            value={editUrgency}
                            onChange={(e) => setEditUrgency(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            {URGENCY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Contact Name</label>
                        <p className="font-medium">{inquiry.contactName || `${inquiry.family?.user?.firstName} ${inquiry.family?.user?.lastName}`}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Email</label>
                        <p className="font-medium">{inquiry.contactEmail || inquiry.family?.user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Phone</label>
                        <p className="font-medium">{inquiry.contactPhone || inquiry.family?.user?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Source</label>
                        <p className="font-medium">{inquiry.source || 'WEBSITE'}</p>
                      </div>
                    </div>

                    {/* Care Recipient */}
                    {inquiry.careRecipientName && (
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Care Recipient</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Name</label>
                            <p className="font-medium">{inquiry.careRecipientName}</p>
                          </div>
                          {inquiry.careRecipientAge && (
                            <div>
                              <label className="text-sm text-gray-500">Age</label>
                              <p className="font-medium">{inquiry.careRecipientAge}</p>
                            </div>
                          )}
                        </div>
                        {inquiry.careNeeds && inquiry.careNeeds.length > 0 && (
                          <div className="mt-3">
                            <label className="text-sm text-gray-500">Care Needs</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {inquiry.careNeeds.map((need, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-sm">{need}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message */}
                    {inquiry.message && (
                      <div className="border-t border-gray-200 pt-4">
                        <label className="text-sm text-gray-500">Message</label>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap">{inquiry.message}</p>
                      </div>
                    )}

                    {/* Internal Notes */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="font-medium text-gray-900">Internal Notes</label>
                        <button
                          onClick={() => setShowNoteModal(true)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <FiPlus className="w-4 h-4" />
                          Add Note
                        </button>
                      </div>
                      {inquiry.internalNotes ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 whitespace-pre-wrap text-sm">
                          {inquiry.internalNotes}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">No notes yet</p>
                      )}
                    </div>

                    {/* Conversion Info */}
                    {inquiry.convertedResident && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                            <FiCheckCircle className="w-5 h-5" />
                            Converted to Resident
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <label className="text-gray-500">Resident</label>
                              <p className="font-medium">{inquiry.convertedResident.firstName} {inquiry.convertedResident.lastName}</p>
                            </div>
                            {inquiry.conversionDate && (
                              <div>
                                <label className="text-gray-500">Conversion Date</label>
                                <p className="font-medium">{format(new Date(inquiry.conversionDate), 'MMM d, yyyy')}</p>
                              </div>
                            )}
                            {inquiry.convertedBy && (
                              <div>
                                <label className="text-gray-500">Converted By</label>
                                <p className="font-medium">{inquiry.convertedBy.firstName} {inquiry.convertedBy.lastName}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'responses' && (
                  <div className="space-y-4">
                    {inquiry.responses.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No responses yet</p>
                    ) : (
                      inquiry.responses.map(response => (
                        <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                response.type === 'AI_GENERATED' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {response.type}
                              </span>
                              <span className="text-sm text-gray-500">{response.channel}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              response.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {response.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.content}</p>
                          <div className="mt-2 text-xs text-gray-400">
                            {response.sentAt
                              ? `Sent: ${format(new Date(response.sentAt), 'MMM d, yyyy h:mm a')}`
                              : `Created: ${format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    {inquiry.documents.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No documents uploaded</p>
                    ) : (
                      inquiry.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <FiFileText className="w-8 h-8 text-gray-400" />
                            <div>
                              <p className="font-medium">{doc.fileName}</p>
                              <p className="text-sm text-gray-500">{doc.documentType} • {doc.fileType}</p>
                              <p className="text-xs text-gray-400">
                                Uploaded by {doc.uploadedBy.firstName} {doc.uploadedBy.lastName} on {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
                          >
                            View
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'followups' && (
                  <div className="space-y-4">
                    {inquiry.followUps.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No follow-ups scheduled</p>
                    ) : (
                      inquiry.followUps.map(followup => (
                        <div key={followup.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <FiClock className={`w-5 h-5 ${followup.status === 'COMPLETED' ? 'text-green-500' : 'text-orange-500'}`} />
                            <div>
                              <p className="font-medium">{followup.type}</p>
                              <p className="text-sm text-gray-500">
                                Scheduled: {format(new Date(followup.scheduledFor), 'MMM d, yyyy h:mm a')}
                              </p>
                              {followup.notes && <p className="text-sm text-gray-400 mt-1">{followup.notes}</p>}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            followup.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            followup.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {followup.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {auditLogs.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No activity recorded</p>
                    ) : (
                      auditLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 border-l-2 border-gray-200 pl-4 pb-4">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{log.action}</p>
                            <p className="text-xs text-gray-500">
                              by {log.user.firstName} {log.user.lastName} • {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <pre className="mt-1 text-xs text-gray-400 bg-gray-50 p-2 rounded overflow-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Home Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiHome className="w-4 h-4" />
                Home
              </h3>
              <div className="space-y-2">
                <p className="font-medium">{inquiry.home.name}</p>
                <p className="text-sm text-gray-500">
                  {inquiry.home.city}, {inquiry.home.state}
                </p>
                <p className="text-sm text-gray-500">
                  Operator: {inquiry.home.operator?.companyName}
                </p>
                <Link
                  href={`/admin/homes/${inquiry.home.id}`}
                  className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                >
                  View Home →
                </Link>
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiUserPlus className="w-4 h-4" />
                Assigned To
              </h3>
              {inquiry.assignedTo ? (
                <div>
                  <p className="font-medium">{inquiry.assignedTo.firstName} {inquiry.assignedTo.lastName}</p>
                  <p className="text-sm text-gray-500">{inquiry.assignedTo.email}</p>
                </div>
              ) : (
                <p className="text-gray-400 italic">Unassigned</p>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiCalendar className="w-4 h-4" />
                Timeline
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-gray-500">Created</label>
                  <p className="font-medium">{format(new Date(inquiry.createdAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <label className="text-gray-500">Last Updated</label>
                  <p className="font-medium">{format(new Date(inquiry.updatedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {inquiry.tourDate && (
                  <div>
                    <label className="text-gray-500">Tour Date</label>
                    <p className="font-medium text-purple-600">{format(new Date(inquiry.tourDate), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Internal Note</h3>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter note..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addNote}
                disabled={saving || !newNote.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
