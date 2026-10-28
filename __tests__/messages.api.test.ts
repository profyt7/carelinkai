/**
 * Unit tests for Messages API
 * 
 * Tests the POST /api/messages and PUT /api/messages/[id]/read endpoints
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '@/app/api/messages/route';
import { PUT } from '@/app/api/messages/[id]/read/route';

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
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      }
    }
  };
});

// Mock SSE publish
jest.mock('@/lib/server/sse', () => ({
  publish: jest.fn(),
}));

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { publish } from '@/lib/server/sse';

// Helper to create a mock NextRequest for POST
function createMockRequest(body = null, method = 'POST') {
  const url = new URL('https://example.com/api/messages');
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

// Helper to create a mock NextRequest for routes with params
function createMockRequestWithParams(params = {}, body = null, method = 'PUT') {
  const url = new URL(`https://example.com/api/messages/${params.id || 'msg-123'}/read`);
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

describe('Messages API', () => {
  // Common test data
  const mockSender = {
    id: 'sender-123',
    email: 'sender@example.com',
    name: 'Sender User',
  };
  
  const mockReceiver = {
    id: 'receiver-123',
    email: 'receiver@example.com',
    name: 'Receiver User',
  };
  
  const mockMessage = {
    id: 'msg-123',
    senderId: mockSender.id,
    receiverId: mockReceiver.id,
    content: 'Hello, this is a test message',
    status: 'SENT',
    createdAt: new Date(),
    updatedAt: new Date(),
    readAt: null,
  };
  
  beforeEach(() => {
    // Setup default mocks
    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockSender,
    });
    
    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === mockReceiver.id) {
        return Promise.resolve(mockReceiver);
      }
      return Promise.resolve(null);
    });
    
    (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);
    
    (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);
  });
  
  describe('POST /api/messages', () => {
    const validBody = {
      receiverId: mockReceiver.id,
      content: 'Hello, this is a test message',
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest(validBody);
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('returns 400 when request body is invalid', async () => {
      const invalidBody = {
        receiverId: mockReceiver.id,
        // Missing content
      };
      
      const request = createMockRequest(invalidBody);
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid request parameters');
    });
    
    test('returns 404 when recipient not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest(validBody);
      const response = await POST(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Recipient not found' });
    });
    
    test('successfully creates message and publishes SSE event', async () => {
      const request = createMockRequest(validBody);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        message: expect.objectContaining({
          id: mockMessage.id,
          senderId: mockMessage.senderId,
          receiverId: mockMessage.receiverId,
          content: mockMessage.content,
          status: mockMessage.status,
          // Dates are serialized as ISO strings in API responses
          createdAt: expect.any(String),
        }),
      });
      
      // Verify message creation
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senderId: mockSender.id,
          receiverId: mockReceiver.id,
          content: validBody.content,
          status: 'SENT',
        }),
      });
      
      // Verify SSE event was published
      expect(publish).toHaveBeenCalledWith(
        `notifications:${mockReceiver.id}`,
        'message:created',
        expect.objectContaining({
          messageId: mockMessage.id,
          senderId: mockSender.id,
        })
      );
    });
  });
  
  describe('PUT /api/messages/[id]/read', () => {
    beforeEach(() => {
      // Setup message mock for read tests
      (prisma.message.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === mockMessage.id) {
          return Promise.resolve(mockMessage);
        }
        return Promise.resolve(null);
      });
      
      (prisma.message.update as jest.Mock).mockResolvedValue({
        ...mockMessage,
        status: 'READ',
        readAt: new Date(),
      });
    });
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: mockMessage.id });
      const response = await PUT(request, { params: { id: mockMessage.id } });
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('returns 404 when message not found', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent-msg' });
      const response = await PUT(request, { params: { id: 'non-existent-msg' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Message not found' });
    });
    
    test('returns 403 when user is not the recipient', async () => {
      // Switch session to receiver
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockSender, id: 'wrong-user-id' },
      });
      
      const request = createMockRequestWithParams({ id: mockMessage.id });
      const response = await PUT(request, { params: { id: mockMessage.id } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ 
        error: 'You can only mark messages sent to you as read' 
      });
    });
    
    test('returns success without updating if message already read', async () => {
      // Switch session to receiver
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockReceiver,
      });
      
      // Mock message as already read
      (prisma.message.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockMessage,
        status: 'READ',
        readAt: new Date(),
      });
      
      const request = createMockRequestWithParams({ id: mockMessage.id });
      const response = await PUT(request, { params: { id: mockMessage.id } });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      
      // Verify update was NOT called
      expect(prisma.message.update).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });
    
    test('successfully marks message as read and publishes SSE event', async () => {
      // Switch session to receiver
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockReceiver,
      });
      
      const request = createMockRequestWithParams({ id: mockMessage.id });
      const response = await PUT(request, { params: { id: mockMessage.id } });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      
      // Verify message update
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: mockMessage.id },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
      
      // Verify SSE event was published
      expect(publish).toHaveBeenCalledWith(
        `notifications:${mockReceiver.id}`,
        'message:read',
        expect.objectContaining({
          messageId: mockMessage.id,
        })
      );
    });
  });
  
  describe('GET /api/messages', () => {
    beforeEach(() => {
      // Setup for GET tests
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockMessage,
          sender: {
            id: mockSender.id,
            firstName: 'Sender',
            lastName: 'User',
            profileImageUrl: 'https://example.com/sender.jpg',
          },
          receiver: {
            id: mockReceiver.id,
            firstName: 'Receiver',
            lastName: 'User',
            profileImageUrl: 'https://example.com/receiver.jpg',
          },
        },
      ]);
    });
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest(null, 'GET');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('successfully retrieves messages and marks them as read', async () => {
      // Create request with userId param
      const url = new URL('https://example.com/api/messages');
      url.searchParams.append('userId', mockReceiver.id);
      
      const request = {
        nextUrl: url,
        method: 'GET',
      } as unknown as NextRequest;
      
      // Mock unread messages
      (prisma.message.findMany as jest.Mock).mockResolvedValueOnce([
        {
          ...mockMessage,
          receiverId: mockSender.id, // Message TO current user
          senderId: mockReceiver.id, // FROM other user
          status: 'SENT', // Unread
          sender: {
            id: mockReceiver.id,
            firstName: 'Receiver',
            lastName: 'User',
            profileImageUrl: 'https://example.com/receiver.jpg',
          },
          receiver: {
            id: mockSender.id,
            firstName: 'Sender',
            lastName: 'User',
            profileImageUrl: 'https://example.com/sender.jpg',
          },
        },
      ]);
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('messages');
      expect(data.messages).toHaveLength(1);
      
      // Verify messages were marked as read
      expect(prisma.message.updateMany).toHaveBeenCalled();
      
      // Verify SSE event was published
      expect(publish).toHaveBeenCalledWith(
        `notifications:${mockSender.id}`,
        'message:read',
        expect.objectContaining({
          messageIds: expect.any(Array),
        })
      );
    });
  });
});
