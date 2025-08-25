/** @jest-environment node */

import { POST as offerShift } from '../../src/app/api/shifts/[id]/offer/route'
import { POST as acceptOffer } from '../../src/app/api/shifts/[id]/accept/route'
import { POST as confirmShift } from '../../src/app/api/shifts/[id]/confirm/route'
import { POST as cancelShift } from '../../src/app/api/shifts/[id]/cancel/route'
import { POST as completeShift } from '../../src/app/api/shifts/[id]/complete/route'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    caregiverShift: { findUnique: jest.fn(), update: jest.fn() },
    operator: { findUnique: jest.fn() },
    shiftApplication: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    caregiver: { findUnique: jest.fn() },
    payment: { create: jest.fn() },
  },
}))

jest.mock('../../src/lib/services/notifications', () => ({ createInAppNotification: jest.fn() }))
jest.mock('../../src/lib/services/calendar', () => ({
  createAppointment: jest.fn().mockResolvedValue({ id: 'appt1' }),
  cancelAppointment: jest.fn().mockResolvedValue(undefined),
  completeAppointment: jest.fn().mockResolvedValue(undefined),
}))

const { getServerSession } = require('next-auth')

function makeReq(url: string, body: any) {
  return { url, json: async () => body } as any
}

const base = 'http://localhost/api/shifts/shift1'

describe('Shifts flow auth gating', () => {
  beforeEach(() => jest.resetAllMocks())

  it('401 on unauthenticated for all endpoints', async () => {
    getServerSession.mockResolvedValue(null)

    for (const handler of [offerShift, acceptOffer, confirmShift, cancelShift, completeShift]) {
      const res = (await handler(makeReq(base, {}), { params: { id: 'shift1' } })) as any
      expect(res.status).toBe(401)
    }
  })

  it('403 on caregiver for offer/confirm/cancel/complete', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'CAREGIVER' } })

    for (const handler of [offerShift, confirmShift, cancelShift, completeShift]) {
      const res = (await handler(makeReq(base, {}), { params: { id: 'shift1' } })) as any
      expect(res.status).toBe(403)
    }
  })
})
