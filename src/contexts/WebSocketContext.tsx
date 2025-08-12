"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// Types for messages and participants
export type ParticipantRole = 'USER' | 'CARE_HOME' | 'CARE_ADVISOR' | 'FAMILY_MEMBER' | 'SYSTEM';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  avatar?: string;
  isActive?: boolean;
  lastSeen?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  thumbnailUrl?: string;
  uploadProgress?: number;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  attachments?: Attachment[];
  replyTo?: string;
  isDeleted?: boolean;
  reactions?: MessageReaction[];
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

// WebSocket connection states
type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

// WebSocket event types
type WebSocketEventType = 
  | 'MESSAGE_RECEIVED' 
  | 'MESSAGE_SENT' 
  | 'MESSAGE_DELIVERED' 
  | 'MESSAGE_READ' 
  | 'TYPING_STARTED' 
  | 'TYPING_STOPPED' 
  | 'PARTICIPANT_ONLINE' 
  | 'PARTICIPANT_OFFLINE' 
  | 'CONNECTION_STATE_CHANGED'
  | 'CONVERSATION_UPDATED';

// WebSocket event interface
interface WebSocketEvent {
  type: WebSocketEventType;
  payload: any;
  timestamp: string;
}

// Context state interface
interface WebSocketContextState {
  connectionState: ConnectionState;
  conversations: Record<string, Conversation>;
  activeParticipants: Record<string, boolean>;
  typingParticipants: Record<string, Record<string, boolean>>;
  sendMessage: (conversationId: string, content: string, attachments?: File[], replyToId?: string) => Promise<Message>;
  updateMessageStatus: (conversationId: string, messageId: string, status: Message['status']) => void;
  startTyping: (conversationId: string, userId: string) => void;
  stopTyping: (conversationId: string, userId: string) => void;
  addReaction: (conversationId: string, messageId: string, emoji: string, userId: string, userName: string) => void;
  removeReaction: (conversationId: string, messageId: string, emoji: string, userId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  uploadAttachment: (file: File, onProgress?: (progress: number) => void) => Promise<Attachment>;
  getConversation: (conversationId: string) => Conversation | undefined;
  createConversation: (participants: Participant[], title?: string, type?: Conversation['type']) => Promise<Conversation>;
  reconnect: () => void;
}

// Create the context with default values
const WebSocketContext = createContext<WebSocketContextState | undefined>(undefined);

// Mock data for testing
const MOCK_USER_ID = 'current-user-123';
const MOCK_USER = {
  id: MOCK_USER_ID,
  name: 'You',
  role: 'USER' as ParticipantRole
};

// Mock conversations for testing
const MOCK_CONVERSATIONS: Record<string, Conversation> = {
  'conv-001': {
    id: 'conv-001',
    participants: [
      MOCK_USER,
      {
        id: 'facility-001',
        name: 'Sarah Johnson',
        role: 'CARE_HOME',
        avatar: 'https://placehold.co/100x100/e9ecef/495057?text=SJ',
        isActive: true
      }
    ],
    messages: [
      {
        id: 'msg-001',
        conversationId: 'conv-001',
        senderId: 'facility-001',
        content: 'Hello! Thank you for your interest in Sunshine Care Home. I\'d be happy to answer any questions you have about our facility and services.',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'READ'
      },
      {
        id: 'msg-002',
        conversationId: 'conv-001',
        senderId: MOCK_USER_ID,
        content: 'Thank you for the quick response. I\'m looking for a private room for my mother who needs assistance with medication management. Do you have availability in the next 1-3 months?',
        timestamp: new Date(Date.now() - 82800000).toISOString(), // 23 hours ago
        status: 'READ'
      }
    ],
    unreadCount: 0,
    lastActivity: new Date(Date.now() - 82800000).toISOString()
  }
};

// Mock WebSocket provider
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [conversations, setConversations] = useState<Record<string, Conversation>>(MOCK_CONVERSATIONS);
  const [activeParticipants, setActiveParticipants] = useState<Record<string, boolean>>({});
  const [typingParticipants, setTypingParticipants] = useState<Record<string, Record<string, boolean>>>({});
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  
  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      setConnectionState('CONNECTING');
      
      // In a real implementation, we would connect to a real WebSocket server
      // For now, we'll simulate a WebSocket connection
      setTimeout(() => {
        // Simulate successful connection
        setConnectionState('CONNECTED');
        reconnectAttemptsRef.current = 0;
        
        // Simulate some participants being online
        setActiveParticipants({
          'facility-001': true,
          'advisor-001': true
        });
        
        console.log('WebSocket connected');
      }, 1000);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionState('DISCONNECTED');
      scheduleReconnect();
    }
  }, []);
  
  // Reconnect with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Calculate delay with exponential backoff
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      setConnectionState('RECONNECTING');
      connect();
    }, delay);
  }, [connect]);
  
  // Manual reconnect
  const reconnect = useCallback(() => {
    if (connectionState === 'CONNECTED') return;
    
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connectionState, connect]);
  
  // Connect on mount and clean up on unmount
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // In a real implementation, we would close the WebSocket connection
      // wsRef.current?.close();
    };
  }, [connect]);
  
  // Helper to generate a unique ID
  const generateId = () => {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  };
  
  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    attachments: File[] = [], 
    replyToId?: string
  ): Promise<Message> => {
    if (connectionState !== 'CONNECTED') {
      throw new Error('WebSocket not connected');
    }
    
    // Create a new message
    const newMessage: Message = {
      id: generateId(),
      conversationId,
      senderId: MOCK_USER_ID,
      content,
      timestamp: new Date().toISOString(),
      status: 'SENDING',
      replyTo: replyToId,
      attachments: attachments.length > 0 ? [] : undefined
    };
    
    // Update conversation with the new message
    setConversations(prev => {
      const conversation = prev[conversationId];
      if (!conversation) return prev;
      
      return {
        ...prev,
        [conversationId]: {
          ...conversation,
          messages: [...conversation.messages, newMessage],
          lastActivity: newMessage.timestamp
        }
      };
    });
    
    // Process attachments if any
    if (attachments.length > 0) {
      const uploadedAttachments: Attachment[] = [];
      
      for (const file of attachments) {
        try {
          const attachment = await uploadAttachment(file, (progress) => {
            // Update attachment upload progress
            setConversations(prev => {
              const conversation = prev[conversationId];
              if (!conversation) return prev;
              
              const updatedMessages = conversation.messages.map(msg => {
                if (msg.id === newMessage.id) {
                  const updatedAttachments = msg.attachments?.map(att => {
                    if (att.name === file.name) {
                      return { ...att, uploadProgress: progress };
                    }
                    return att;
                  }) || [];
                  
                  return { ...msg, attachments: updatedAttachments };
                }
                return msg;
              });
              
              return {
                ...prev,
                [conversationId]: {
                  ...conversation,
                  messages: updatedMessages
                }
              };
            });
          });
          
          uploadedAttachments.push(attachment);
        } catch (error) {
          console.error('Failed to upload attachment:', error);
        }
      }
      
      // Update message with uploaded attachments
      setConversations(prev => {
        const conversation = prev[conversationId];
        if (!conversation) return prev;
        
        const updatedMessages = conversation.messages.map(msg => {
          if (msg.id === newMessage.id) {
            return { ...msg, attachments: uploadedAttachments };
          }
          return msg;
        });
        
        return {
          ...prev,
          [conversationId]: {
            ...conversation,
            messages: updatedMessages
          }
        };
      });
    }
    
    // Simulate sending the message
    setTimeout(() => {
      // Update message status to SENT
      updateMessageStatus(conversationId, newMessage.id, 'SENT');
      
      // Simulate message delivery after a short delay
      setTimeout(() => {
        updateMessageStatus(conversationId, newMessage.id, 'DELIVERED');
        
        // Simulate message being read after another delay
        setTimeout(() => {
          updateMessageStatus(conversationId, newMessage.id, 'READ');
          
          // Simulate a reply from the care home
          if (Math.random() > 0.3) { // 70% chance of reply
            simulateReply(conversationId, newMessage);
          }
        }, 5000 + Math.random() * 10000); // Random delay between 5-15 seconds
      }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
    }, 500 + Math.random() * 1000); // Random delay between 0.5-1.5 seconds
    
    return newMessage;
  }, [connectionState]);
  
  // Simulate a reply from another participant
  const simulateReply = (conversationId: string, originalMessage: Message) => {
    const conversation = conversations[conversationId];
    if (!conversation) return;
    
    // Find a participant that isn't the current user
    const otherParticipants = conversation.participants.filter(p => p.id !== MOCK_USER_ID);
    if (otherParticipants.length === 0) return;
    
    const respondingParticipant = otherParticipants[Math.floor(Math.random() * otherParticipants.length)];
    
    // Simulate typing indicator
    startTyping(conversationId, respondingParticipant.id);
    
    // Generate a response based on the original message
    setTimeout(() => {
      stopTyping(conversationId, respondingParticipant.id);
      
      const replyContent = generateReplyContent(originalMessage.content, respondingParticipant);
      
      const replyMessage: Message = {
        id: generateId(),
        conversationId,
        senderId: respondingParticipant.id,
        content: replyContent,
        timestamp: new Date().toISOString(),
        status: 'DELIVERED'
      };
      
      // Add the reply to the conversation
      setConversations(prev => {
        const conversation = prev[conversationId];
        if (!conversation) return prev;
        
        return {
          ...prev,
          [conversationId]: {
            ...conversation,
            messages: [...conversation.messages, replyMessage],
            lastActivity: replyMessage.timestamp,
            unreadCount: (conversation.unreadCount || 0) + 1
          }
        };
      });
    }, 2000 + Math.random() * 5000); // Random typing time between 2-7 seconds
  };
  
  // Generate a reply based on the original message
  const generateReplyContent = (originalContent: string, participant: Participant): string => {
    // Simple response generation based on keywords in the original message
    if (originalContent.toLowerCase().includes('availability')) {
      return `Yes, we currently have a few rooms available. Would you like to schedule a tour to see them?`;
    } else if (originalContent.toLowerCase().includes('tour')) {
      return `We'd be happy to schedule a tour for you. What day and time works best for you?`;
    } else if (originalContent.toLowerCase().includes('cost') || originalContent.toLowerCase().includes('price')) {
      return `Our pricing starts at $3,500 per month for a shared room, and $4,200 for a private room. This includes all basic services and meals.`;
    } else if (originalContent.toLowerCase().includes('medication')) {
      return `We provide comprehensive medication management services. Our staff can handle all aspects of medication administration and monitoring.`;
    } else {
      return `Thank you for your message. How else can I help you with your inquiry about our care home?`;
    }
  };
  
  // Update message status
  const updateMessageStatus = useCallback((
    conversationId: string, 
    messageId: string, 
    status: Message['status']
  ) => {
    setConversations(prev => {
      const conversation = prev[conversationId];
      if (!conversation) return prev;
      
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, status };
        }
        return msg;
      });
      
      return {
        ...prev,
        [conversationId]: {
          ...conversation,
          messages: updatedMessages
        }
      };
    });
  }, []);
  
  // Start typing indicator
  const startTyping = useCallback((conversationId: string, userId: string) => {
    setTypingParticipants(prev => {
      const conversationTyping = prev[conversationId] || {};
      return {
        ...prev,
        [conversationId]: {
          ...conversationTyping,
          [userId]: true
        }
      };
    });
    
    // In a real implementation, we would send a typing event to the WebSocket server
  }, []);
  
  // Stop typing indicator
  const stopTyping = useCallback((conversationId: string, userId: string) => {
    setTypingParticipants(prev => {
      const conversationTyping = prev[conversationId] || {};
      const { [userId]: _, ...rest } = conversationTyping;
      return {
        ...prev,
        [conversationId]: rest
      };
    });
    
    // In a real implementation, we would send a stop typing event to the WebSocket server
  }, []);
  
  // Add reaction to a message
  const addReaction = useCallback((
    conversationId: string, 
    messageId: string, 
    emoji: string, 
    userId: string, 
    userName: string
  ) => {
    setConversations(prev => {
      const conversation = prev[conversationId];
      if (!conversation) return prev;
      
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          // Remove existing reaction from this user with this emoji if it exists
          const filteredReactions = existingReactions.filter(
            r => !(r.userId === userId && r.emoji === emoji)
          );
          
          return { 
            ...msg, 
            reactions: [
              ...filteredReactions,
              { emoji, userId, userName }
            ]
          };
        }
        return msg;
      });
      
      return {
        ...prev,
        [conversationId]: {
          ...conversation,
          messages: updatedMessages
        }
      };
    });
    
    // In a real implementation, we would send a reaction event to the WebSocket server
  }, []);
  
  // Remove reaction from a message
  const removeReaction = useCallback((
    conversationId: string, 
    messageId: string, 
    emoji: string, 
    userId: string
  ) => {
    setConversations(prev => {
      const conversation = prev[conversationId];
      if (!conversation) return prev;
      
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.id === messageId && msg.reactions) {
          return { 
            ...msg, 
            reactions: msg.reactions.filter(
              r => !(r.userId === userId && r.emoji === emoji)
            )
          };
        }
        return msg;
      });
      
      return {
        ...prev,
        [conversationId]: {
          ...conversation,
          messages: updatedMessages
        }
      };
    });
    
    // In a real implementation, we would send a remove reaction event to the WebSocket server
  }, []);
  
  // Delete a message
  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    setConversations(prev => {
      const conversation = prev[conversationId];
      if (!conversation) return prev;
      
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, isDeleted: true, content: '', attachments: undefined };
        }
        return msg;
      });
      
      return {
        ...prev,
        [conversationId]: {
          ...conversation,
          messages: updatedMessages
        }
      };
    });
    
    // In a real implementation, we would send a delete message event to the WebSocket server
  }, []);
  
  // Upload an attachment
  const uploadAttachment = useCallback(async (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<Attachment> => {
    // In a real implementation, we would upload the file to a server
    // For now, we'll simulate an upload with progress
    
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15; // Random progress increment
        
        if (progress >= 100) {
          clearInterval(interval);
          progress = 100;
          
          if (onProgress) {
            onProgress(progress);
          }
          
          // Generate a mock URL based on file type
          const isImage = file.type.startsWith('image/');
          const mockUrl = isImage 
            ? `https://placehold.co/800x600/e9ecef/495057?text=${encodeURIComponent(file.name)}`
            : '#';
          
          const thumbnailUrl = isImage 
            ? `https://placehold.co/200x150/e9ecef/495057?text=${encodeURIComponent(file.name)}`
            : undefined;
          
          resolve({
            id: generateId(),
            name: file.name,
            url: mockUrl,
            type: file.type,
            size: file.size,
            thumbnailUrl
          });
        } else if (onProgress) {
          onProgress(progress);
        }
      }, 200);
    });
  }, []);
  
  // Get a conversation by ID
  const getConversation = useCallback((conversationId: string): Conversation | undefined => {
    return conversations[conversationId];
  }, [conversations]);
  
  // Create a new conversation
  const createConversation = useCallback(async (
    participants: Participant[],
    title?: string,
    type: Conversation['type'] = 'DIRECT'
  ): Promise<Conversation> => {
    // Ensure the current user is included in the participants
    if (!participants.some(p => p.id === MOCK_USER_ID)) {
      participants = [MOCK_USER, ...participants];
    }
    
    const newConversation: Conversation = {
      id: generateId(),
      participants,
      messages: [],
      unreadCount: 0,
      lastActivity: new Date().toISOString(),
      title,
      type
    };
    
    setConversations(prev => ({
      ...prev,
      [newConversation.id]: newConversation
    }));
    
    return newConversation;
  }, []);
  
  // Context value
  const contextValue: WebSocketContextState = {
    connectionState,
    conversations,
    activeParticipants,
    typingParticipants,
    sendMessage,
    updateMessageStatus,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    deleteMessage,
    uploadAttachment,
    getConversation,
    createConversation,
    reconnect
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
