'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FiSend, FiUser } from 'react-icons/fi';
import { MessageSquare } from 'lucide-react';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  receiver: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
};

type Conversation = {
  userId: string;
  userFirstName?: string | null;
  userLastName?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
};

interface MessagesTabProps {
  familyId: string | null;
  showMock?: boolean;
  currentUserId?: string;
}

export default function MessagesTab({ familyId, showMock = false, currentUserId }: MessagesTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);

      if (showMock) {
        const mockConversations: Conversation[] = [
          {
            userId: 'user-1',
            userFirstName: 'Dr. Sarah',
            userLastName: 'Miller',
            lastMessage: 'Your mom had a great day today!',
            lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
            unreadCount: 2,
          },
          {
            userId: 'user-2',
            userFirstName: 'James',
            userLastName: 'Thompson',
            lastMessage: 'Thank you for the update',
            lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
            unreadCount: 0,
          },
        ];
        setConversations(mockConversations);
        setLoading(false);
        return;
      }

      if (!familyId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/messages/conversations?familyId=${familyId}`);
      if (!res.ok) throw new Error('Failed to load conversations');
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      if (showMock) {
        const now = Date.now();
        const mockMessages: Message[] = [
          {
            id: 'msg-1',
            content: 'Hi! How is my mom doing today?',
            senderId: currentUserId || 'current-user',
            receiverId: otherUserId,
            status: 'READ',
            createdAt: new Date(now - 7200000).toISOString(),
            sender: { id: currentUserId || 'current-user', firstName: 'You', lastName: '' },
            receiver: { id: otherUserId, firstName: 'Dr. Sarah', lastName: 'Miller' },
          },
          {
            id: 'msg-2',
            content: 'Your mom had a great day today! She participated in all activities and enjoyed lunch with friends.',
            senderId: otherUserId,
            receiverId: currentUserId || 'current-user',
            status: 'READ',
            createdAt: new Date(now - 3600000).toISOString(),
            sender: { id: otherUserId, firstName: 'Dr. Sarah', lastName: 'Miller' },
            receiver: { id: currentUserId || 'current-user', firstName: 'You', lastName: '' },
          },
        ];
        setMessages(mockMessages);
        return;
      }

      const res = await fetch(`/api/messages/thread?otherUserId=${otherUserId}&limit=50`);
      if (!res.ok) throw new Error('Failed to load messages');
      const json = await res.json();
      setMessages(json.messages ?? []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [familyId, showMock]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
    }
  }, [selectedUser]);

  // SSE for real-time message updates
  useEffect(() => {
    if (showMock || !familyId) return;

    const es = new EventSource(`/api/sse?topics=${encodeURIComponent(`user:${currentUserId}`)}`);

    const parseData = (e: MessageEvent) => {
      try {
        return JSON.parse(e.data);
      } catch {
        return null;
      }
    };

    es.addEventListener('message:new', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.message) {
        if (selectedUser && (data.message.senderId === selectedUser || data.message.receiverId === selectedUser)) {
          setMessages((prev) => [...prev, data.message]);
        }
        fetchConversations(); // Refresh conversation list
      }
    });

    return () => es.close();
  }, [familyId, selectedUser, currentUserId, showMock]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      setSending(true);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedUser,
          content: newMessage.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      setNewMessage('');
      fetchMessages(selectedUser);
      fetchConversations();
    } catch (err: any) {
      alert(err.message ?? 'Error sending message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingState type="list" count={3} />;
  }

  return (
    <div className="h-[600px] flex gap-4">
      {/* Conversations List */}
      <div className="w-1/3 bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversations
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Start chatting with caregivers and staff
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUser(conv.userId)}
                  className={`w-full p-4 text-left hover:bg-blue-50 transition-colors ${
                    selectedUser === conv.userId ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {`${conv.userFirstName?.[0] ?? ''}${conv.userLastName?.[0] ?? ''}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {conv.userFirstName} {conv.userLastName}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                      {conv.lastMessageAt && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(conv.lastMessageAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              icon={MessageSquare}
              title="Select a Conversation"
              description="Choose a conversation from the left to view messages and start chatting."
            />
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold">
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">
                  {conversations.find((c) => c.userId === selectedUser)?.userFirstName}{' '}
                  {conversations.find((c) => c.userId === selectedUser)?.userLastName}
                </p>
                <p className="text-xs text-blue-100">Active now</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.senderId === currentUserId || msg.sender.firstName === 'You';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          isOwnMessage
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type your message..."
                  disabled={sending}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
