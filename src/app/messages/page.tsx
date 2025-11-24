"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FiMessageSquare, FiSearch, FiMoreVertical, FiChevronLeft } from 'react-icons/fi';
import ChatInterface, {
  type Conversation,
  type Message,
  type Participant,
} from '@/components/messaging/ChatInterface';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Types for API responses
interface ThreadUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
}

interface ThreadLastMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
}

interface Thread {
  user: ThreadUser;
  lastMessage: ThreadLastMessage;
  unreadCount: number;
}

interface ThreadsResponse {
  threads: Thread[];
  total: number;
}

interface ApiMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: string;
  createdAt: string;
  readAt: string | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
}

interface MessagesResponse {
  messages: ApiMessage[];
  hasMore: boolean;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadUserId, setSelectedThreadUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showThreadList, setShowThreadList] = useState(true);
  const [query, setQuery] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [caregivers, setCaregivers] = useState<
    Array<{ employmentId: string; caregiverId: string; name: string; email: string; isActive: boolean }>
  >([]);
  const [isLoadingCaregivers, setIsLoadingCaregivers] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Fetch threads on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchThreads();
    }
  }, [status]);

  // Fetch threads
  const fetchThreads = async () => {
    setIsLoadingThreads(true);
    setError(null);
    
    try {
      const response = await fetch('/api/messages/threads');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch threads: ${response.statusText}`);
      }
      
      const data: ThreadsResponse = await response.json();
      setThreads(data.threads);
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError('Failed to load conversations. Please try again later.');
    } finally {
      setIsLoadingThreads(false);
    }
  };

  // Fetch messages for a specific thread
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!session?.user?.id) return;
    
    setIsLoadingMessages(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/messages?userId=${partnerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      
      const data: MessagesResponse = await response.json();
      
      // Transform API messages to ChatInterface format
      const participants: Participant[] = [
        {
          id: session.user.id,
          name: session.user.name || 'You',
          role: 'USER',
          avatar: session.user.image || undefined,
        }
      ];
      
      // Add the partner
      const partnerData = threads.find(t => t.user.id === partnerId)?.user;
      if (partnerData) {
        participants.push({
          id: partnerData.id,
          name: `${partnerData.firstName} ${partnerData.lastName}`,
          role: 'USER',
          avatar: partnerData.profileImageUrl || undefined,
        });
      }
      
      // Transform messages
      const messages: Message[] = data.messages.map(msg => ({
        id: msg.id,
        conversationId: `conversation-${session.user.id}-${partnerId}`,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt,
        status: msg.status as 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
        attachments: [],
      }));
      
      // Create conversation object
      const conversationData: Conversation = {
        id: `conversation-${session.user.id}-${partnerId}`,
        participants,
        messages,
        unreadCount: threads.find(t => t.user.id === partnerId)?.unreadCount || 0,
        lastActivity: data.messages[0]?.createdAt,
        type: 'DIRECT',
      };
      
      setConversation(conversationData);
      
      // If on mobile, hide thread list when conversation is loaded
      if (isMobileView) {
        setShowThreadList(false);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again later.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [session, threads, isMobileView]);

  // Select a thread
  const handleSelectThread = (partnerId: string) => {
    setSelectedThreadUserId(partnerId);
    fetchMessages(partnerId);
  };

  // Send message handler
  const handleSendMessage = async (content: string) => {
    if (!selectedThreadUserId || !session?.user?.id || content.trim() === '') {
      return;
    }
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedThreadUserId,
          content: content,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
      
      // Refresh messages
      await fetchMessages(selectedThreadUserId);
      
      // Refresh threads to update last message
      await fetchThreads();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  // No-op mark as read handler (handled by GET /api/messages)
  const handleMarkAsRead = () => {
    // This is intentionally empty as the API handles marking messages as read
  };

  // Format relative time for last message
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Handle back button in mobile view
  const handleBackToThreads = () => {
    setShowThreadList(true);
  };

  // Loading state
  if (status === 'loading') {
    return (
      <DashboardLayout title="Messages" showSearch={false}>
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Messages" showSearch={false}>
      <div className="p-4 sm:p-6">
        <div className="flex min-h-[60vh] rounded-lg border border-neutral-200 bg-white shadow-sm">
        {/* Thread List - Hidden on mobile when conversation is selected */}
        {(showThreadList || !isMobileView) && (
          <div className={`border-r border-neutral-200 ${isMobileView ? 'w-full' : 'w-1/3'}`}>
            {/* Thread search */}
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center rounded-full border border-neutral-300 bg-neutral-50 px-3 py-2">
                  <FiSearch className="mr-2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search messages"
                    className="w-full bg-transparent text-sm focus:outline-none"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button
                  className="rounded-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                  onClick={async () => {
                    setShowNewMessage(true);
                    if (caregivers.length === 0 && !isLoadingCaregivers) {
                      setIsLoadingCaregivers(true);
                      try {
                        const res = await fetch('/api/operator/caregivers');
                        if (res.ok) {
                          const data = await res.json();
                          setCaregivers(data.caregivers || []);
                        }
                      } catch (e) {
                        console.error('Failed to load caregivers', e);
                        setError('Failed to load caregivers');
                      } finally {
                        setIsLoadingCaregivers(false);
                      }
                    }
                  }}
                >
                  New message
                </button>
              </div>
            </div>
            
            {/* Thread List */}
            <div className="h-[calc(100%-64px)] overflow-y-auto">
              {isLoadingThreads ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
                </div>
              ) : threads.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <FiMessageSquare className="mb-4 h-12 w-12 text-neutral-400" />
                  <h2 className="mb-1 text-lg font-medium">No messages yet</h2>
                  <p className="text-sm text-neutral-500">When you start conversations, they&apos;ll appear here.</p>
                </div>
              ) : (
                <div>
                  {(
                    (query.trim().length > 0
                      ? threads.filter((t) => {
                          const q = query.trim().toLowerCase();
                          const name = `${t.user.firstName} ${t.user.lastName}`.toLowerCase();
                          const last = (t.lastMessage?.content || '').toLowerCase();
                          return name.includes(q) || last.includes(q);
                        })
                      : threads)
                  ).map((thread) => (
                    <div
                      key={thread.user.id}
                      className={`cursor-pointer border-b border-neutral-100 p-4 hover:bg-neutral-50 ${
                        selectedThreadUserId === thread.user.id ? 'bg-neutral-100' : ''
                      }`}
                      onClick={() => handleSelectThread(thread.user.id)}
                    >
                      <div className="flex items-center">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-neutral-200">
                          {thread.user.profileImageUrl ? (
                            <Image
                              src={thread.user.profileImageUrl}
                              alt={`${thread.user.firstName} ${thread.user.lastName}`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-medium text-neutral-500">
                              {thread.user.firstName.charAt(0)}
                            </div>
                          )}
                          {thread.unreadCount > 0 && (
                            <div className="absolute right-0 top-0 h-4 w-4 rounded-full bg-primary-500 text-center text-xs font-bold text-white">
                              {thread.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">
                              {thread.user.firstName} {thread.user.lastName}
                            </h3>
                            <span className="text-xs text-neutral-500">
                              {formatRelativeTime(thread.lastMessage.createdAt)}
                            </span>
                          </div>
                          <p className={`truncate text-sm ${thread.unreadCount > 0 ? 'font-medium text-neutral-800' : 'text-neutral-500'}`}>
                            {thread.lastMessage.senderId === session?.user?.id ? (
                              <span className="text-neutral-400">You: </span>
                            ) : null}
                            {thread.lastMessage.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Chat Panel */}
        {((!showThreadList && isMobileView) || !isMobileView) && (
          <div className={`flex flex-col ${isMobileView ? 'w-full' : 'w-2/3'}`}>
            {/* Chat Header */}
            {selectedThreadUserId ? (
              <div className="flex items-center border-b border-neutral-200 p-4">
                {isMobileView && (
                  <button
                    onClick={handleBackToThreads}
                    className="mr-2 rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                )}
                
                {threads.find(t => t.user.id === selectedThreadUserId) && (
                  <>
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-neutral-200">
                      {threads.find(t => t.user.id === selectedThreadUserId)?.user.profileImageUrl ? (
                        <Image
                          src={threads.find(t => t.user.id === selectedThreadUserId)!.user.profileImageUrl!}
                          alt="Profile"
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-500">
                          {threads.find(t => t.user.id === selectedThreadUserId)!.user.firstName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <h2 className="font-medium">
                        {threads.find(t => t.user.id === selectedThreadUserId)!.user.firstName}{' '}
                        {threads.find(t => t.user.id === selectedThreadUserId)!.user.lastName}
                      </h2>
                    </div>
                    <div className="ml-auto">
                      <button className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
                        <FiMoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
            
            {/* Chat Interface */}
            <div className="flex-1">
              {selectedThreadUserId && conversation ? (
                <ChatInterface
                  conversation={conversation}
                  currentUserId={session!.user!.id}
                  onSendMessage={handleSendMessage}
                  onMarkAsRead={handleMarkAsRead}
                  isLoading={isLoadingMessages}
                  placeholder="Type a message..."
                  showTypingIndicator={false}
                  height="70vh"
                  className="rounded-none border-0 shadow-none"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <FiMessageSquare className="mb-4 h-16 w-16 text-neutral-200" />
                  <h2 className="mb-2 text-xl font-medium">Select a conversation</h2>
                  <p className="text-neutral-500">Choose a conversation from the list to start messaging</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* New Message Picker Modal */}
        {showNewMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-medium">Start a new message</h3>
                <button
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                  onClick={() => setShowNewMessage(false)}
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center rounded-full border border-neutral-300 bg-neutral-50 px-3 py-2">
                  <FiSearch className="mr-2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search caregivers by name or email"
                    className="w-full bg-transparent text-sm focus:outline-none"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {isLoadingCaregivers ? (
                    <div className="flex items-center justify-center py-8 text-neutral-500">Loading…</div>
                  ) : caregivers.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500">No caregivers available</div>
                  ) : (
                    (pickerQuery.trim()
                      ? caregivers.filter((c) => {
                          const q = pickerQuery.trim().toLowerCase();
                          return (
                            (c.name || '').toLowerCase().includes(q) ||
                            (c.email || '').toLowerCase().includes(q)
                          );
                        })
                      : caregivers
                    ).map((c) => (
                      <button
                        key={c.employmentId}
                        className="flex w-full items-center justify-between border-b px-3 py-3 text-left hover:bg-neutral-50"
                        onClick={async () => {
                          setShowNewMessage(false);
                          setPickerQuery('');
                          setQuery('');
                          setSelectedThreadUserId(c.caregiverId);
                          await fetchMessages(c.caregiverId);
                          if (isMobileView) setShowThreadList(false);
                        }}
                      >
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-neutral-500">{c.email}</div>
                        </div>
                        <span className="text-sm text-primary-600">Message</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-100 px-4 py-2 text-red-800 shadow-md">
            {error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
