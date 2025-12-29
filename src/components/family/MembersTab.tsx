'use client';

import React, { useEffect, useState } from 'react';
import { FiUserPlus, FiX, FiMail, FiShield, FiTrash2, FiEdit, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { Users } from 'lucide-react';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

type Member = {
  id: string;
  userId: string;
  role: 'OWNER' | 'CARE_PROXY' | 'MEMBER' | 'GUEST';
  joinedAt: string;
  lastActive?: string | null;
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: 'OWNER' | 'CARE_PROXY' | 'MEMBER' | 'GUEST';
  status: string;
  createdAt: string;
  invitedBy: {
    firstName?: string | null;
    lastName?: string | null;
  };
};

interface MembersTabProps {
  familyId: string | null;
  showMock?: boolean;
  isGuest?: boolean;
  currentUserRole?: string;
}

export default function MembersTab({ familyId, showMock = false, isGuest = false, currentUserRole }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'MEMBER' as 'OWNER' | 'CARE_PROXY' | 'MEMBER' | 'GUEST',
    message: '',
  });
  const [newRole, setNewRole] = useState<'OWNER' | 'CARE_PROXY' | 'MEMBER' | 'GUEST'>('MEMBER');
  const isOwner = currentUserRole === 'OWNER';

  const roleColors = {
    OWNER: 'from-purple-100 to-pink-100 text-purple-800 border-purple-200',
    CARE_PROXY: 'from-blue-100 to-cyan-100 text-blue-800 border-blue-200',
    MEMBER: 'from-green-100 to-emerald-100 text-green-800 border-green-200',
    GUEST: 'from-gray-100 to-slate-100 text-gray-800 border-gray-200',
  };

  const roleDescriptions = {
    OWNER: 'Full control over the family portal, including member management',
    CARE_PROXY: 'High-level access to manage care, view all information, and communicate',
    MEMBER: 'Standard access to view, comment, upload, and participate',
    GUEST: 'View-only access with limited permissions',
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (showMock) {
        const now = Date.now();
        const mockMembers: Member[] = [
          {
            id: 'member-1',
            userId: 'user-1',
            role: 'OWNER',
            joinedAt: new Date(now - 30 * 86400000).toISOString(),
            lastActive: new Date(now - 3600000).toISOString(),
            user: {
              id: 'user-1',
              firstName: 'Ava',
              lastName: 'Johnson',
              email: 'ava.johnson@example.com',
            },
          },
          {
            id: 'member-2',
            userId: 'user-2',
            role: 'MEMBER',
            joinedAt: new Date(now - 15 * 86400000).toISOString(),
            lastActive: new Date(now - 86400000).toISOString(),
            user: {
              id: 'user-2',
              firstName: 'Noah',
              lastName: 'Williams',
              email: 'noah.williams@example.com',
            },
          },
        ];
        const mockInvitations: Invitation[] = [
          {
            id: 'invite-1',
            email: 'sophia.martinez@example.com',
            role: 'MEMBER',
            status: 'PENDING',
            createdAt: new Date(now - 2 * 86400000).toISOString(),
            invitedBy: { firstName: 'Ava', lastName: 'Johnson' },
          },
        ];
        setMembers(mockMembers);
        setInvitations(mockInvitations);
        setLoading(false);
        return;
      }

      if (!familyId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/family/members?familyId=${familyId}`);
      if (!res.ok) throw new Error('Failed to load members');
      const json = await res.json();
      setMembers(json.members ?? []);
      setInvitations(json.invitations ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Error loading members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [familyId, showMock]);

  // SSE for real-time updates
  useEffect(() => {
    if (showMock || !familyId) return;

    const es = new EventSource(`/api/sse?topics=${encodeURIComponent(`family:${familyId}`)}`);

    const parseData = (e: MessageEvent) => {
      try {
        return JSON.parse(e.data);
      } catch {
        return null;
      }
    };

    es.addEventListener('member:invited', () => fetchMembers());
    es.addEventListener('member:joined', () => fetchMembers());
    es.addEventListener('member:removed', () => fetchMembers());
    es.addEventListener('member:role_changed', () => fetchMembers());

    return () => es.close();
  }, [familyId, showMock]);

  const handleInvite = async () => {
    if (!inviteForm.email) {
      alert('Please enter an email address');
      return;
    }

    try {
      const res = await fetch('/api/family/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          email: inviteForm.email,
          role: inviteForm.role,
          message: inviteForm.message || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to send invitation');

      setIsInviteOpen(false);
      setInviteForm({ email: '', role: 'MEMBER', message: '' });
      fetchMembers();
    } catch (err: any) {
      alert(err.message ?? 'Error sending invitation');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember) return;

    try {
      const res = await fetch(`/api/family/members/${selectedMember.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error('Failed to change role');

      setIsChangeRoleOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err: any) {
      alert(err.message ?? 'Error changing role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the family portal?`)) return;

    try {
      const res = await fetch(`/api/family/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove member');

      fetchMembers();
    } catch (err: any) {
      alert(err.message ?? 'Error removing member');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/family/members/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to resend invitation');

      alert('Invitation resent successfully!');
    } catch (err: any) {
      alert(err.message ?? 'Error resending invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const res = await fetch(`/api/family/members/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to cancel invitation');

      fetchMembers();
    } catch (err: any) {
      alert(err.message ?? 'Error canceling invitation');
    }
  };

  if (loading) {
    return <LoadingState type="list" count={4} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Error loading members</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Family Members</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage who has access to your family portal
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
          >
            <FiUserPlus className="w-5 h-5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiUserPlus className="w-6 h-6 text-blue-600" />
                Invite Family Member
              </h3>
              <button
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteForm({ email: '', role: 'MEMBER', message: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="member@example.com"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="MEMBER">Member</option>
                  <option value="CARE_PROXY">Care Proxy</option>
                  <option value="GUEST">Guest</option>
                  <option value="OWNER">Owner</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {roleDescriptions[inviteForm.role]}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  placeholder="Add a personal note to the invitation..."
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleInvite}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  <FiMail className="w-5 h-5" />
                  Send Invitation
                </button>
                <button
                  onClick={() => {
                    setIsInviteOpen(false);
                    setInviteForm({ email: '', role: 'MEMBER', message: '' });
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {isChangeRoleOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiShield className="w-6 h-6 text-blue-600" />
                Change Role
              </h3>
              <button
                onClick={() => {
                  setIsChangeRoleOpen(false);
                  setSelectedMember(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Member</p>
                <p className="font-semibold text-gray-900">
                  {selectedMember.user.firstName} {selectedMember.user.lastName}
                </p>
                <p className="text-xs text-gray-500 mt-1">{selectedMember.user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Role: <span className="text-blue-600">{selectedMember.role}</span>
                </label>
                <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">
                  New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="MEMBER">Member</option>
                  <option value="CARE_PROXY">Care Proxy</option>
                  <option value="GUEST">Guest</option>
                  <option value="OWNER">Owner</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">{roleDescriptions[newRole]}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Changing this member's role will immediately update their
                  permissions.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleChangeRole}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  Change Role
                </button>
                <button
                  onClick={() => {
                    setIsChangeRoleOpen(false);
                    setSelectedMember(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FiMail className="w-5 h-5 text-blue-600" />
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-400 rounded-full flex items-center justify-center text-white">
                    <FiMail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{invitation.email}</p>
                    <p className="text-xs text-gray-600">
                      Invited as <span className="font-semibold">{invitation.role}</span> by{' '}
                      {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResendInvitation(invitation.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Resend invitation"
                    >
                      <FiRefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancel invitation"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Invite family members to access the portal and stay connected with their loved one's care."
          actionLabel={isOwner ? 'Invite First Member' : undefined}
          onAction={isOwner ? () => setIsInviteOpen(true) : undefined}
        />
      ) : (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FiUsers className="w-5 h-5 text-blue-600" />
            Active Members ({members.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="group bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300"
              >
                {/* Avatar and Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {`${member.user.firstName?.[0] ?? ''}${member.user.lastName?.[0] ?? ''}`}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{member.user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r text-xs font-semibold border ${roleColors[member.role]}`}
                  >
                    <FiShield className="w-3 h-3" />
                    {member.role}
                  </span>
                </div>

                {/* Meta Info */}
                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>
                    <span className="font-medium">Joined:</span>{' '}
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                  {member.lastActive && (
                    <p>
                      <span className="font-medium">Last active:</span>{' '}
                      {new Date(member.lastActive).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {isOwner && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setNewRole(member.role);
                        setIsChangeRoleOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold"
                    >
                      <FiEdit className="w-3.5 h-3.5" />
                      Change Role
                    </button>
                    {member.role !== 'OWNER' && (
                      <button
                        onClick={() =>
                          handleRemoveMember(
                            member.id,
                            `${member.user.firstName} ${member.user.lastName}`
                          )
                        }
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Legend */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-blue-600" />
          Role Permissions
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(roleDescriptions).map(([role, description]) => (
            <div key={role} className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r text-xs font-semibold border ${
                    roleColors[role as keyof typeof roleColors]
                  }`}
                >
                  <FiCheck className="w-3 h-3" />
                  {role}
                </span>
              </div>
              <p className="text-sm text-gray-700">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
