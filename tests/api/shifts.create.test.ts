/** @jest-environment node */

import { POST as createShift } from '../../src/app/api/shifts/route'
import type { NextResponse } from 'next/server'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    assistedLivingHome: { findUnique: jest.fn() },
    operator: { findUnique: jest.fn() },
    caregiverShift: { create: jest.fn() },
  },
}))

jest.mock('../../src/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }))

const { getServerSession } = require('next-auth')
const { prisma } = require('../../src/lib/prisma')

function makeRequest(url: string, body: any) {
  return {
    url,
    json: async () => body,
  } as any
}

describe('POST /api/shifts', () => {
  const baseUrl = 'http://localhost/api/shifts'

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSession.mockResolvedValue(null)

    const res = (await createShift(makeRequest(baseUrl, {}))) as NextResponse
    // NextResponse.json returns a Response-like object; parse body
    const json = await (res as any).json()

    expect((res as any).status).toBe(401)
    expect(json.success).toBe(false)
  })

  it('returns 403 when role is CAREGIVER', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'CAREGIVER' } })

    const res = (await createShift(makeRequest(baseUrl, {}))) as any
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.success).toBe(false)
  })

  it('creates a shift for OPERATOR user', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'op-user', role: 'OPERATOR', firstName: 'Op', lastName: 'Erator' } })

    const payload = {
      homeId: 'home1',
      startTime: new Date('2025-08-26T09:00:00Z').toISOString(),
      endTime: new Date('2025-08-26T13:00:00Z').toISOString(),
      hourlyRate: 25,
      notes: 'Day shift',
    }

    prisma.assistedLivingHome.findUnique.mockResolvedValue({
      id: 'home1',
      name: 'Home A',
      address: null,
      operator: { id: 'op1', companyName: 'Operator Co' },
    })

    prisma.operator.findUnique.mockResolvedValue({ id: 'op1' })

    prisma.caregiverShift.create.mockResolvedValue({
      id: 'shift1',
      homeId: 'home1',
      startTime: new Date(payload.startTime),
      endTime: new Date(payload.endTime),
      status: 'OPEN',
      hourlyRate: 25,
      notes: 'Day shift',
      createdAt: new Date(),
      updatedAt: new Date(),
      home: { id: 'home1', name: 'Home A', address: null, operator: { id: 'op1', companyName: 'Operator Co' } },
    })

    const res = (await createShift(makeRequest(baseUrl, payload))) as any
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(prisma.caregiverShift.create).toHaveBeenCalled()
  })
})
