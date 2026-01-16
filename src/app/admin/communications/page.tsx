'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiMail,
  FiSend,
  FiInbox,
  FiUsers,
  FiBell,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string | null;
  content: string;
  status: string;
  createdAt: string;
  readAt: string | null;
  sender: User;
  receiver: User;
  broadcast?: {
    id: string;
    subject: string;
    targetRole: string | null;
  } | null;
}

interface Broadcast {
  id: string;
  senderId: string;
  subject: string;
  content: string;
  targetRole: string | null;
  recipientCount: number;
  createdAt: string;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  user: User;
}

type TabType = 'inbox' | 'sent' | 'compose' | 'broadcast' | 'notifications';

const ROLES = [
  { value: 'ALL', label: 'All Users' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'CAREGIVER', label: 'Caregiver' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'PROVIDER', label: 'Provider' },
  { value: 'AFFILIATE', label: 'Affiliate' },
  { value: 'DISCHARGE_PLANNER', label: 'Discharge Planner' },
];

const NOTIFICATION_TYPES = [
  'MESSAGE',
  'BOOKING',
  'PAYMENT',
  'COMPLIANCE',
  'SYSTEM',
  'BROADCAST',
  'ALERT',
  'ANNOUNCEMENT',
];

export default function CommunicationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotalPages, setMessagesTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastsPage, setBroadcastsPage] = useState(1);
  const [broadcastsTotalPages, setBroadcastsTotalPages] = useState(1);
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [notificationsTotalPages, setNotificationsTotalPages] = useState(1);
  const [notificationTypeFilter, setNotificationTypeFilter] = useState('');
  
  // Compose form state
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [composeRecipientId, setComposeRecipientId] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  
  // Broadcast form state
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastTargetRole, setBroadcastTargetRole] = useState('ALL');
  const [broadcastTargetStatus, setBroadcastTargetStatus] = useState('ACTIVE');

  // Fetch messages
  const fetchMessages = useCallback(async (view: 'inbox' | 'sent') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/communications/messages?view=${view}&page=${messagesPage}&search=${searchQuery}`
      );
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data.messages);
      setUnreadCount(data.unreadCount);
      setMessagesTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [messagesPage, searchQuery, router]);

  // Fetch broadcasts history
  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/communications/broadcast?page=${broadcastsPage}`
      );
      if (!response.ok) throw new Error('Failed to fetch broadcasts');
      const data = await response.json();
      setBroadcasts(data.broadcasts);
      setBroadcastsTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError('Failed to load broadcast history');
    } finally {
      setLoading(false);
    }
  }, [broadcastsPage]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: notificationsPage.toString(),
        limit: '50',
      });
      if (notificationTypeFilter) {
        params.append('type', notificationTypeFilter);
      }
      const response = await fetch(`/api/admin/communications/notifications?${params}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data.notifications);
      setNotificationsTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [notificationsPage, notificationTypeFilter]);

  // Search users for compose
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchedUsers([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) throw new Error('Failed to search users');
      const data = await response.json();
      setSearchedUsers(data.users || []);
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  }, []);

  // Effect for tab changes
  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchMessages('inbox');
    } else if (activeTab === 'sent') {
      fetchMessages('sent');
    } else if (activeTab === 'broadcast') {
      fetchBroadcasts();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab, fetchMessages, fetchBroadcasts, fetchNotifications]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery) {
        searchUsers(userSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeRecipientId || !composeSubject || !composeContent) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/communications/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: composeRecipientId,
          subject: composeSubject,
          content: composeContent,
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      setSuccess('Message sent successfully');
      setComposeSubject('');
      setComposeContent('');
      setComposeRecipientId('');
      setUserSearchQuery('');
      setSearchedUsers([]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Send broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastContent) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/communications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: broadcastSubject,
          content: broadcastContent,
          targetRole: broadcastTargetRole,
          targetStatus: broadcastTargetStatus,
        }),
      });
      if (!response.ok) throw new Error('Failed to send broadcast');
      const data = await response.json();
      setSuccess(`Broadcast sent to ${data.recipientCount} users`);
      setBroadcastSubject('');
      setBroadcastContent('');
      setBroadcastTargetRole('ALL');
      fetchBroadcasts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  // Mark message as read/unread
  const handleMarkMessage = async (messageId: string, action: 'markAsRead' | 'markAsUnread') => {
    try {
      const response = await fetch(`/api/admin/communications/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error('Failed to update message');
      if (activeTab === 'inbox') fetchMessages('inbox');
      else if (activeTab === 'sent') fetchMessages('sent');
    } catch (err) {
      setError('Failed to update message');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const response = await fetch(`/api/admin/communications/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete message');
      setSuccess('Message deleted');
      setSelectedMessage(null);
      if (activeTab === 'inbox') fetchMessages('inbox');
      else if (activeTab === 'sent') fetchMessages('sent');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete message');
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Tab button component
  const TabButton = ({ tab, label, icon: Icon, badge }: { tab: TabType; label: string; icon: any; badge?: number }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
          {badge}
        </span>
      )}
    </button>
  );

  // Messages list view
  const renderMessagesList = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Messages list */}
      <div className="divide-y divide-gray-200">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FiMail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No messages found</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                message.status !== 'READ' && activeTab === 'inbox' ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {message.status !== 'READ' && activeTab === 'inbox' && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                    <span className="font-medium text-gray-900">
                      {activeTab === 'inbox'
                        ? `${message.sender.firstName} ${message.sender.lastName}`
                        : `To: ${message.receiver.firstName} ${message.receiver.lastName}`}
                    </span>
                    {message.broadcast && (
                      <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                        Broadcast
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1 truncate">
                    {message.subject || '(No subject)'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{message.content}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {formatDate(message.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {messagesTotalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setMessagesPage((p) => Math.max(1, p - 1))}
            disabled={messagesPage === 1}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <FiChevronLeft /> Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {messagesPage} of {messagesTotalPages}
          </span>
          <button
            onClick={() => setMessagesPage((p) => Math.min(messagesTotalPages, p + 1))}
            disabled={messagesPage === messagesTotalPages}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Next <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );

  // Message detail view
  const renderMessageDetail = () => {
    if (!selectedMessage) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Message Details</h3>
            <button
              onClick={() => setSelectedMessage(null)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <FiX />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">From</p>
                <p className="font-medium">
                  {selectedMessage.sender.firstName} {selectedMessage.sender.lastName}{' '}
                  <span className="text-gray-400">({selectedMessage.sender.email})</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">To</p>
                <p className="font-medium">
                  {selectedMessage.receiver.firstName} {selectedMessage.receiver.lastName}{' '}
                  <span className="text-gray-400">({selectedMessage.receiver.email})</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium">{selectedMessage.subject || '(No subject)'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(selectedMessage.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Message</p>
                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                  {selectedMessage.content}
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab === 'inbox' && (
                <>
                  {selectedMessage.status === 'READ' ? (
                    <button
                      onClick={() => handleMarkMessage(selectedMessage.id, 'markAsUnread')}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <FiEyeOff /> Mark as Unread
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkMessage(selectedMessage.id, 'markAsRead')}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <FiEye /> Mark as Read
                    </button>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => handleDeleteMessage(selectedMessage.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              <FiTrash2 /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Compose form
  const renderComposeForm = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Compose New Message</h3>
      <form onSubmit={handleSendMessage} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient *
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a user..."
              value={userSearchQuery}
              onChange={(e) => {
                setUserSearchQuery(e.target.value);
                setComposeRecipientId('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {isSearchingUsers && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <FiRefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
            {searchedUsers.length > 0 && !composeRecipientId && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchedUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setComposeRecipientId(user.id);
                      setUserSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
                      setSearchedUsers([]);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
          <input
            type="text"
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
            placeholder="Enter subject..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            value={composeContent}
            onChange={(e) => setComposeContent(e.target.value)}
            placeholder="Enter your message..."
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !composeRecipientId || !composeSubject || !composeContent}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend /> Send Message
          </button>
        </div>
      </form>
    </div>
  );

  // Broadcast form
  const renderBroadcastForm = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Send Broadcast Message</h3>
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
              <select
                value={broadcastTargetRole}
                onChange={(e) => setBroadcastTargetRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Status</label>
              <select
                value={broadcastTargetStatus}
                onChange={(e) => setBroadcastTargetStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ACTIVE">Active Users Only</option>
                <option value="PENDING">Pending Users Only</option>
                <option value="ALL">All Users</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              value={broadcastSubject}
              onChange={(e) => setBroadcastSubject(e.target.value)}
              placeholder="Enter broadcast subject..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="Enter your broadcast message..."
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !broadcastSubject || !broadcastContent}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiUsers /> Send Broadcast
            </button>
          </div>
        </form>
      </div>

      {/* Broadcast History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Broadcast History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {broadcasts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FiUsers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No broadcasts sent yet</p>
            </div>
          ) : (
            broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{broadcast.subject}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{broadcast.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                        {broadcast.targetRole || 'All Users'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {broadcast.recipientCount} recipients
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(broadcast.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        {broadcastsTotalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-4">
            <button
              onClick={() => setBroadcastsPage((p) => Math.max(1, p - 1))}
              disabled={broadcastsPage === 1}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {broadcastsPage} of {broadcastsTotalPages}
            </span>
            <button
              onClick={() => setBroadcastsPage((p) => Math.min(broadcastsTotalPages, p + 1))}
              disabled={broadcastsPage === broadcastsTotalPages}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Notifications list
  const renderNotificationsList = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">System Notifications</h3>
        <select
          value={notificationTypeFilter}
          onChange={(e) => setNotificationTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {NOTIFICATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FiBell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications found</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                    <span className="font-medium text-gray-900">{notification.title}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      notification.type === 'ALERT' ? 'bg-red-100 text-red-700' :
                      notification.type === 'BROADCAST' ? 'bg-purple-100 text-purple-700' :
                      notification.type === 'SYSTEM' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    To: {notification.user.firstName} {notification.user.lastName} ({notification.user.email})
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {formatDate(notification.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      {notificationsTotalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-4">
          <button
            onClick={() => setNotificationsPage((p) => Math.max(1, p - 1))}
            disabled={notificationsPage === 1}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {notificationsPage} of {notificationsTotalPages}
          </span>
          <button
            onClick={() => setNotificationsPage((p) => Math.min(notificationsTotalPages, p + 1))}
            disabled={notificationsPage === notificationsTotalPages}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-500 mt-1">Manage messages, broadcasts, and notifications</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <FiX className="text-red-500" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">
              <FiX />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <FiCheck className="text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton tab="inbox" label="Inbox" icon={FiInbox} badge={unreadCount} />
          <TabButton tab="sent" label="Sent" icon={FiSend} />
          <TabButton tab="compose" label="Compose" icon={FiEdit} />
          <TabButton tab="broadcast" label="Broadcast" icon={FiUsers} />
          <TabButton tab="notifications" label="Notifications" icon={FiBell} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {(activeTab === 'inbox' || activeTab === 'sent') && renderMessagesList()}
            {activeTab === 'compose' && renderComposeForm()}
            {activeTab === 'broadcast' && renderBroadcastForm()}
            {activeTab === 'notifications' && renderNotificationsList()}
          </>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && renderMessageDetail()}
      </div>
    </div>
  );
}
