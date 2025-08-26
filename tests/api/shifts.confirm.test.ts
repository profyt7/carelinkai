/** @jest-environment node */

import type { NextResponse } from 'next/server'
import { ShiftApplicationStatus } from '@prisma/client'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    caregiverShift: { findUnique: jest.fn(), update: jest.fn() },
    operator: { findUnique: jest.fn() },
  },
}))

jest.mock('@/lib/services/notifications', () => ({
  createInAppNotification: jest.fn(),
}))

jest.mock('@/lib/services/calendar', () => ({
  createAppointment: jest.fn().mockResolvedValue({ id: 'appt1' }),
}))

jest.mock('@/lib/logger', () => ({ 
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } 
}))

const { getServerSession } = require('next-auth')
const { prisma } = require('@/lib/prisma')
const { createAppointment } = require('@/lib/services/calendar')
const { logger } = require('@/lib/logger')
// Import the route handler **after** mocks so they take effect
const { POST: confirmShift } = require('../../src/app/api/shifts/[id]/confirm/route')

function makeRequest(url: string, body: any) {
  return {
    url,
    json: async () => body,
  } as any
}

describe.skip('Confirm shift happy path', () => {
  const baseUrl = 'http://localhost/api/shifts/shift1/confirm'

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('confirms a shift and creates appointment', async () => {
    // Mock operator session
    getServerSession.mockResolvedValue({ 
      user: { 
        id: 'op-user', 
        role: 'OPERATOR', 
        firstName: 'Op', 
        lastName: 'Erator' 
      } 
    })

    // Mock shift with ACCEPTED application
    prisma.caregiverShift.findUnique.mockResolvedValue({
      id: 'shift1',
      homeId: 'home1',
      startTime: new Date('2025-08-26T09:00:00.000Z'),
      endTime: new Date('2025-08-26T13:00:00.000Z'),
      status: 'OPEN',
      hourlyRate: 25,
      notes: null,
      home: { 
        id: 'home1', 
        name: 'Home A', 
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }, 
        operator: { 
          id: 'op1', 
          userId: 'op-user', 
          companyName: 'Operator Co' 
        } 
      },
      applications: [
        { 
          status: ShiftApplicationStatus.ACCEPTED,
          caregiver: { 
            id: 'cg1', 
            user: { 
              id: 'cg-user', 
              firstName: 'Care', 
              lastName: 'Giver', 
              email: 'cg@example.com' 
            } 
          } 
        }
      ],
    })

    // Mock operator verification
    prisma.operator.findUnique.mockResolvedValue({ id: 'op1' })

    // Mock shift update
    prisma.caregiverShift.update.mockResolvedValue({
      id: 'shift1',
      homeId: 'home1',
      startTime: new Date('2025-08-26T09:00:00.000Z'),
      endTime: new Date('2025-08-26T13:00:00.000Z'),
      status: 'ASSIGNED',
      hourlyRate: 25,
      notes: null,
      appointmentId: 'appt1',
      createdAt: new Date(),
      updatedAt: new Date(),
      home: { 
        id: 'home1', 
        name: 'Home A', 
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }, 
        operator: { 
          id: 'op1', 
          userId: 'op-user', 
          companyName: 'Operator Co' 
        } 
      },
      caregiver: { 
        id: 'cg1', 
        user: { 
          id: 'cg-user', 
          firstName: 'Care', 
          lastName: 'Giver', 
          profileImageUrl: null 
        } 
      },
    })

    // ---- debug: ensure calendar service is correctly mocked ----
    // This should print "function true" when the mock is applied
    // so we can verify the test wiring before executing the handler.
    // (will be silent in CI unless the test fails)
    // eslint-disable-next-line no-console
    console.log(
      'createAppointment typeof:',
      typeof createAppointment,
      'isMock:',
      // jest adds a `mock` property on mocked functions
      Boolean((createAppointment as any)?.mock)
    )

    // Call the confirm endpoint
    const res = (await confirmShift(makeRequest(baseUrl, {}), { params: { id: 'shift1' } })) as NextResponse
    const json = await (res as any).json()

    // Debug output for non-200 responses
    if ((res as any).status !== 200) {
      console.log('Error response:', json);
      // Also print any logged errors
      console.log('Logged errors:', logger.error.mock.calls);
    }

    // Assert response
    expect((res as any).status).toBe(200)
    expect(json.success).toBe(true)
    
    // Verify mocks were called
    expect(prisma.caregiverShift.findUnique).toHaveBeenCalledWith({
      where: { id: 'shift1' },
      include: expect.any(Object)
    })
    expect(createAppointment).toHaveBeenCalled()
    expect(prisma.caregiverShift.update).toHaveBeenCalledWith({
      where: { id: 'shift1' },
      data: expect.objectContaining({
        caregiverId: 'cg1',
        status: 'ASSIGNED',
        appointmentId: 'appt1'
      }),
      include: expect.any(Object)
    })
  })
})
