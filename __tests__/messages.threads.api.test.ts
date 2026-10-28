/**
 * Unit tests for Messages Threads API
 * 
 * Tests the GET /api/messages/threads endpoint
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/messages/threads/route';

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

// Mock Next Auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest for GET
function createMockRequest(searchParams = {}) {
  const url = new URL('https://example.com/api/messages/threads');
  
  // Add search params if provided
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });
  }
  
  const request = {
    nextUrl: url,
    method: 'GET',
  } as unknown as NextRequest;
  
  return request;
}

describe('Messages Threads API', () => {
  // Common test data
  const mockCurrentUser = {
    id: 'current-user-123',
    email: 'current@example.com',
    name: 'Current User',
  };
  
  const mockPartner1 = {
    id: 'partner-1',
    firstName: 'Partner',
    lastName: 'One',
    profileImageUrl: 'https://example.com/partner1.jpg',
  };
  
  const mockPartner2 = {
    id: 'partner-2',
    firstName: 'Partner',
    lastName: 'Two',
    profileImageUrl: 'https://example.com/partner2.jpg',
  };
  
  const mockMessages = [
    // Messages with partner 1 (most recent)
    {
      id: 'msg-1',
      senderId: 'partner-1',
      receiverId: 'current-user-123',
      content: 'Hello from partner 1',
      status: 'SENT',
      createdAt: new Date('2025-09-10T15:00:00Z'),
    },
    {
      id: 'msg-2',
      senderId: 'current-user-123',
      receiverId: 'partner-1',
      content: 'Hi partner 1',
      status: 'READ',
      createdAt: new Date('2025-09-10T14:50:00Z'),
    },
    
    // Messages with partner 2 (older)
    {
      id: 'msg-3',
      senderId: 'current-user-123',
      receiverId: 'partner-2',
      content: 'Hello partner 2',
      status: 'READ',
      createdAt: new Date('2025-09-09T10:00:00Z'),
    },
    {
      id: 'msg-4',
      senderId: 'partner-2',
      receiverId: 'current-user-123',
      content: 'Hi there',
      status: 'READ',
      createdAt: new Date('2025-09-09T09:50:00Z'),
    },
  ];
  
  beforeEach(() => {
    // Setup default mocks
    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockCurrentUser,
    });
    
    // Mock findMany to return messages for identifying partners
    (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
    
    // Mock user.findUnique to return partner details
    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === 'partner-1') {
        return Promise.resolve(mockPartner1);
      } else if (where.id === 'partner-2') {
        return Promise.resolve(mockPartner2);
      }
      return Promise.resolve(null);
    });
    
    // Mock findFirst to return last message for each partner
    (prisma.message.findFirst as jest.Mock).mockImplementation(({ where }) => {
      if (where.OR[0].receiverId === 'partner-1' || where.OR[1].senderId === 'partner-1') {
        return Promise.resolve(mockMessages[0]); // Last message with partner 1
      } else if (where.OR[0].receiverId === 'partner-2' || where.OR[1].senderId === 'partner-2') {
        return Promise.resolve(mockMessages[2]); // Last message with partner 2
      }
      return Promise.resolve(null);
    });
    
    // Mock count to return unread count for each partner
    (prisma.message.count as jest.Mock).mockImplementation(({ where }) => {
      if (where.senderId === 'partner-1') {
        return Promise.resolve(1); // 1 unread from partner 1
      } else if (where.senderId === 'partner-2') {
        return Promise.resolve(0); // 0 unread from partner 2
      }
      return Promise.resolve(0);
    });
  });
  
  test('returns 401 when user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);
    
    const request = createMockRequest();
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
  
  test('returns empty list when no messages', async () => {
    (prisma.message.findMany as jest.Mock).mockResolvedValueOnce([]);
    
    const request = createMockRequest();
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('threads');
    expect(data.threads).toEqual([]);
    expect(data.total).toBe(0);
  });
  
  test('returns threads sorted by lastActivity with lastMessage and unreadCount', async () => {
    const request = createMockRequest();
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('threads');
    expect(data.threads).toHaveLength(2);
    
    // First thread should be with partner 1 (most recent activity)
    expect(data.threads[0]).toEqual({
      user: mockPartner1,
      lastMessage: expect.objectContaining({
        id: 'msg-1',
        senderId: 'partner-1',
        receiverId: 'current-user-123',
        content: 'Hello from partner 1',
        status: 'SENT',
        createdAt: expect.any(String),
      }),
      unreadCount: 1
    });
    
    // Second thread should be with partner 2
    expect(data.threads[1]).toEqual({
      user: mockPartner2,
      lastMessage: expect.objectContaining({
        id: 'msg-3',
        senderId: 'current-user-123',
        receiverId: 'partner-2',
        content: 'Hello partner 2',
        status: 'READ',
        createdAt: expect.any(String),
      }),
      unreadCount: 0
    });
  });
  
  test('respects limit parameter', async () => {
    // Set limit to 1
    const request = createMockRequest({ limit: '1' });
    
    // Mock the findMany to return the same messages
    // The limit is applied after processing, not in the DB query
    
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Should only return the first thread (partner 1)
    expect(data.threads).toHaveLength(1);
    expect(data.threads[0].user.id).toBe('partner-1');
    
    // Verify the limit was passed to the query
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
        orderBy: expect.any(Object),
        take: 500, // This is hardcoded in the implementation
      })
    );
  });
});
