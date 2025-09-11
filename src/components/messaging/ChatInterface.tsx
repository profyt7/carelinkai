"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  FiSend, 
  FiPaperclip, 
  FiImage, 
  FiFile, 
  FiX, 
  FiCheck, 
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiMoreVertical,
  FiCornerDownRight,
  FiSmile,
  FiMic,
  FiVideo,
  FiMessageSquare
} from 'react-icons/fi';

// Types
export type ParticipantRole = 'USER' | 'CARE_HOME' | 'CARE_ADVISOR' | 'FAMILY_MEMBER' | 'SYSTEM';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  avatar?: string;
  isActive?: boolean;
  lastSeen?: string;
  isTyping?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  attachments?: Attachment[];
  replyTo?: string; // ID of message being replied to
  isDeleted?: boolean;
  reactions?: {
    emoji: string;
    userId: string;
  }[];
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  participants: Participant[];
  messages: Message[];
  unreadCount?: number;
  lastActivity?: string;
  title?: string;
  type?: 'DIRECT' | 'GROUP' | 'INQUIRY' | 'SUPPORT';
}

interface ChatInterfaceProps {
  conversation: Conversation;
  currentUserId: string;
  onSendMessage: (content: string, attachments?: File[], replyToId?: string) => Promise<void>;
  onMarkAsRead?: (messageIds: string[]) => void;
  onTypingStart?: () => void;
  onTypingEnd?: () => void;
  onFileUpload?: (files: File[]) => Promise<Attachment[]>;
  isLoading?: boolean;
  maxAttachmentSize?: number; // in bytes
  allowedFileTypes?: string[];
  placeholder?: string;
  showTypingIndicator?: boolean;
  showReadReceipts?: boolean;
  className?: string;
  height?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  currentUserId,
  onSendMessage,
  onMarkAsRead,
  onTypingStart,
  onTypingEnd,
  onFileUpload,
  isLoading = false,
  maxAttachmentSize = 10 * 1024 * 1024, // 10MB default
  allowedFileTypes = ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  placeholder = 'Type a message...',
  showTypingIndicator = true,
  showReadReceipts = true,
  className = '',
  height = '500px'
}) => {
  // State
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Get current user
  const currentUser = conversation.participants.find(p => p.id === currentUserId);
  if (!currentUser) {
    console.error('Current user not found in conversation participants');
  }
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);
  
  // Mark messages as read when viewed
  useEffect(() => {
    if (onMarkAsRead) {
      const unreadMessages = conversation.messages
        .filter(msg => msg.senderId !== currentUserId && msg.status !== 'READ')
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        onMarkAsRead(unreadMessages);
      }
    }
  }, [conversation.messages, currentUserId, onMarkAsRead]);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle input change with typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Handle typing indicators
    if (onTypingStart && e.target.value.length > 0) {
      onTypingStart();
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        if (onTypingEnd) onTypingEnd();
      }, 3000);
      
      setTypingTimeout(timeout);
    }
    
    // If input is empty and we have a typing end handler
    if (onTypingEnd && e.target.value.length === 0 && typingTimeout) {
      clearTimeout(typingTimeout);
      onTypingEnd();
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const invalidFiles = files.filter(file => {
      const fileType = file.type;
      return !allowedFileTypes.some(type => {
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', '/'));
        }
        return type === fileType;
      });
    });
    
    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxAttachmentSize);
    
    if (oversizedFiles.length > 0) {
      setError(`File(s) exceed maximum size of ${formatFileSize(maxAttachmentSize)}: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    setAttachments(prev => [...prev, ...files]);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Handle message submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (message.trim() === '' && attachments.length === 0) return;
    
    try {
      setIsSubmitting(true);
      await onSendMessage(message, attachments, replyToMessage?.id);
      setMessage('');
      setAttachments([]);
      setReplyToMessage(null);
      
      // Clear typing indicator
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      if (onTypingEnd) {
        onTypingEnd();
      }
      
      // Focus back on input
      messageInputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Get participant by ID
  const getParticipant = (id: string): Participant | undefined => {
    return conversation.participants.find(p => p.id === id);
  };
  
  // Get message that is being replied to
  const getReplyToMessage = (replyToId: string): Message | undefined => {
    return conversation.messages.find(m => m.id === replyToId);
  };
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];
    
    conversation.messages.forEach(message => {
      const messageDate = new Date(message.timestamp).toLocaleDateString();
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }
    
    return groups;
  };
  
  // Format time
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date for message groups
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'SENDING':
        return <FiClock className="h-3 w-3 text-neutral-400" />;
      case 'SENT':
        return <FiCheck className="h-3 w-3 text-neutral-400" />;
      case 'DELIVERED':
        return <FiCheck className="h-3 w-3 text-primary-500" />;
      case 'READ':
        return <FiCheckCircle className="h-3 w-3 text-primary-500" />;
      case 'FAILED':
        return <FiX className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };
  
  // Get role color
  const getRoleColor = (role: ParticipantRole) => {
    switch (role) {
      case 'CARE_HOME':
        return 'bg-blue-100 text-blue-800';
      case 'CARE_ADVISOR':
        return 'bg-purple-100 text-purple-800';
      case 'FAMILY_MEMBER':
        return 'bg-green-100 text-green-800';
      case 'SYSTEM':
        return 'bg-neutral-100 text-neutral-800';
      default:
        return 'bg-primary-100 text-primary-800';
    }
  };
  
  // Get message style based on sender
  const getMessageStyle = (senderId: string) => {
    const sender = getParticipant(senderId);
    const isCurrentUser = senderId === currentUserId;
    
    if (isCurrentUser) {
      return {
        containerClass: 'justify-end',
        bubbleClass: 'bg-primary-500 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg',
        textClass: 'text-white'
      };
    } else if (sender?.role === 'SYSTEM') {
      return {
        containerClass: 'justify-center',
        bubbleClass: 'bg-neutral-100 text-neutral-800 rounded-lg',
        textClass: 'text-neutral-800'
      };
    } else if (sender?.role === 'CARE_ADVISOR') {
      return {
        containerClass: 'justify-start',
        bubbleClass: 'bg-purple-100 text-neutral-800 rounded-tr-lg rounded-bl-lg rounded-br-lg',
        textClass: 'text-neutral-800'
      };
    } else {
      return {
        containerClass: 'justify-start',
        bubbleClass: 'bg-white border border-neutral-200 text-neutral-800 rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-sm',
        textClass: 'text-neutral-800'
      };
    }
  };
  
  // Render attachment preview
  const renderAttachmentPreview = (file: File, index: number) => {
    const isImage = file.type.startsWith('image/');
    
    return (
      <div key={index} className="relative rounded-md border border-neutral-200 bg-neutral-50 p-2">
        <div className="flex items-center">
          {isImage ? (
            <div className="h-12 w-12 overflow-hidden rounded-md bg-neutral-100">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100">
              <FiFile className="h-6 w-6 text-neutral-500" />
            </div>
          )}
          <div className="ml-2 flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-neutral-800">{file.name}</p>
            <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={() => removeAttachment(index)}
            className="ml-2 rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };
  
  // Render message attachment
  const renderMessageAttachment = (attachment: Attachment) => {
    const isImage = attachment.type.startsWith('image/');
    const isPdf = attachment.type === 'application/pdf';
    
    return (
      <div key={attachment.id} className="mt-2 overflow-hidden rounded-md border border-neutral-200 bg-white">
        {isImage ? (
          <div className="relative h-48 w-full cursor-pointer overflow-hidden bg-neutral-100">
            <Image
              src={attachment.thumbnailUrl || attachment.url}
              alt={attachment.name}
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100">
              {isPdf ? (
                <FiFile className="h-5 w-5 text-red-500" />
              ) : (
                <FiFile className="h-5 w-5 text-neutral-500" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-neutral-800">{attachment.name}</p>
              <p className="text-xs text-neutral-500">{formatFileSize(attachment.size)}</p>
            </div>
            <a
              href={attachment.url}
              download={attachment.name}
              className="ml-2 rounded-md bg-neutral-100 p-2 text-neutral-700 hover:bg-neutral-200"
            >
              <FiDownload className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    );
  };
  
  // Render typing indicator
  const renderTypingIndicator = () => {
    const typingParticipants = conversation.participants.filter(
      p => p.id !== currentUserId && p.isTyping
    );
    
    if (typingParticipants.length === 0) return null;
    
    const typingText = typingParticipants.length === 1
      ? `${(typingParticipants[0]?.name || 'Someone')} is typing...`
      : 'Multiple people are typing...';
    
    return (
      <div className="flex items-center px-4 py-2">
        <div className="flex space-x-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400"></div>
        </div>
        <span className="ml-2 text-xs text-neutral-500">{typingText}</span>
      </div>
    );
  };
  
  // Render reply preview
  const renderReplyPreview = () => {
    if (!replyToMessage) return null;
    
    const repliedToUser = getParticipant(replyToMessage.senderId);
    
    return (
      <div className="mb-2 flex items-start rounded-md border border-neutral-200 bg-neutral-50 p-2">
        <div className="flex-1 overflow-hidden">
          <p className="text-xs font-medium text-primary-600">
            Reply to {repliedToUser?.name || 'Unknown'}
          </p>
          <p className="truncate text-sm text-neutral-700">{replyToMessage.content}</p>
        </div>
        <button
          onClick={() => setReplyToMessage(null)}
          className="ml-2 rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    );
  };
  
  return (
    <div 
      className={`flex flex-col rounded-lg border border-neutral-200 bg-white shadow-sm ${className}`}
      style={{ height }}
    >
      {/* Messages container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
          </div>
        ) : conversation.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-neutral-100 p-4">
              <FiMessageSquare className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="mb-1 text-lg font-medium text-neutral-800">No messages yet</p>
            <p className="text-sm text-neutral-500">Start the conversation by sending a message</p>
          </div>
        ) : (
          <>
            {groupMessagesByDate().map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6">
                <div className="mb-4 flex items-center justify-center">
                  <div className="h-px flex-1 bg-neutral-200"></div>
                  <span className="mx-4 text-xs font-medium text-neutral-500">
                    {formatDate(group.date)}
                  </span>
                  <div className="h-px flex-1 bg-neutral-200"></div>
                </div>
                
                <div className="space-y-4">
                  {group.messages.map((msg, msgIndex) => {
                    const sender = getParticipant(msg.senderId);
                    const isCurrentUser = msg.senderId === currentUserId;
                    const style = getMessageStyle(msg.senderId);
                    const showSender = msgIndex === 0 || group.messages[msgIndex - 1]?.senderId !== msg.senderId;
                    const replyMessage = msg.replyTo ? getReplyToMessage(msg.replyTo) : undefined;
                    const replyToSender = replyMessage ? getParticipant(replyMessage.senderId) : undefined;
                    
                    return (
                      <div key={msg.id} className={`flex ${style.containerClass}`}>
                        <div className="max-w-[80%]">
                          {/* Sender info */}
                          {showSender && !isCurrentUser && sender && (
                            <div className="mb-1 flex items-center">
                              {sender.avatar ? (
                                <div className="mr-2 h-6 w-6 overflow-hidden rounded-full">
                                  <Image
                                    src={sender.avatar}
                                    alt={sender.name}
                                    width={24}
                                    height={24}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
                                  {sender.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex items-center">
                                <span className="text-xs font-medium text-neutral-800">
                                  {sender.name}
                                </span>
                                {sender.role !== 'USER' && (
                                  <span className={`ml-1 rounded-sm px-1 py-0.5 text-[10px] ${getRoleColor(sender.role)}`}>
                                    {sender.role === 'CARE_HOME' ? 'STAFF' : 
                                     sender.role === 'CARE_ADVISOR' ? 'ADVISOR' : 
                                     sender.role === 'FAMILY_MEMBER' ? 'FAMILY' : 
                                     sender.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Message bubble */}
                          <div className={`overflow-hidden rounded-lg ${style.bubbleClass} p-3`}>
                            {/* Reply reference */}
                            {replyMessage && (
                              <div className="mb-2 rounded-md bg-black/10 p-2 text-sm">
                                <div className="flex items-center">
                                  <FiCornerDownRight className="mr-1 h-3 w-3 opacity-70" />
                                  <span className="text-xs font-medium opacity-70">
                                    {replyToSender?.name || 'Unknown'}
                                  </span>
                                </div>
                                <p className="mt-1 truncate opacity-70">
                                  {replyMessage.content || (replyMessage.attachments?.length ? '[Attachment]' : '')}
                                </p>
                              </div>
                            )}
                            
                            {/* Message content */}
                            {msg.isDeleted ? (
                              <p className={`italic text-sm opacity-60`}>This message was deleted</p>
                            ) : (
                              <>
                                {msg.content && (
                                  <p className={`whitespace-pre-wrap text-sm ${style.textClass}`}>
                                    {msg.content}
                                  </p>
                                )}
                                
                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {msg.attachments.map(attachment => renderMessageAttachment(attachment))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          
                          {/* Message footer */}
                          <div className={`mt-1 flex items-center ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-neutral-500">
                              {formatTime(msg.timestamp)}
                            </span>
                            
                            {isCurrentUser && showReadReceipts && (
                              <span className="ml-1">
                                {getStatusIcon(msg.status)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {showTypingIndicator && renderTypingIndicator()}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Message input */}
      <div className="border-t border-neutral-200 p-4">
        {error && (
          <div className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-800">
            <p>{error}</p>
          </div>
        )}
        
        {/* Reply preview */}
        {renderReplyPreview()}
        
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {attachments.map((file, index) => renderAttachmentPreview(file, index))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex items-end rounded-md border border-neutral-300 bg-white focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
            {/* Message input */}
            <textarea
              ref={messageInputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className="min-h-[44px] max-h-32 flex-1 resize-none rounded-md border-0 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-0"
              disabled={isSubmitting}
              rows={1}
            />
            
            {/* Attachment button */}
            <div className="flex items-center px-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                disabled={isSubmitting}
              >
                <FiPaperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept={allowedFileTypes.join(',')}
                disabled={isSubmitting}
              />
              
              {/* Emoji button (placeholder) */}
              <button
                type="button"
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                disabled={isSubmitting}
              >
                <FiSmile className="h-5 w-5" />
              </button>
              
              {/* Send button */}
              <button
                type="submit"
                className="ml-1 rounded-full bg-primary-500 p-2 text-white hover:bg-primary-600 disabled:bg-neutral-300"
                disabled={isSubmitting || (message.trim() === '' && attachments.length === 0)}
              >
                <FiSend className="h-5 w-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
