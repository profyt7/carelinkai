/**
 * Availability contact upsert (sprint W5-5): the write and its History row commit
 * in one transaction. Opting in from the operator portal records
 * contact.opted_in with source OPERATOR + optedInSource OPERATOR + timestamp;
 * opting out records contact.opted_out; an admin call records source ADMIN.
 */

jest.mock('@/lib/prisma', () => {
  const p: any = {
    availabilityContact: { findUnique: jest.fn(), upsert: jest.fn() },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }), findMany: jest.fn().mockResolvedValue([]) },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendAvailabilityPingEmail: jest.fn() }));

import { prisma } from '@/lib/prisma';
import { upsertAvailabilityContact } from '@/lib/availability/ping-engine';

const P = prisma as any;
const NOW = new Date('2026-10-17T15:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  P.availabilityContact.upsert.mockImplementation(async (a: any) => ({ id: 'c1', homeId: a.where.homeId, ...a.update }));
});

describe('upsertAvailabilityContact + History', () => {
  it('operator opt-in → upsert + contact.opted_in (source OPERATOR, optedInSource OPERATOR, timestamp) in one transaction', async () => {
    P.availabilityContact.findUnique.mockResolvedValue(null);
    const c = await upsertAvailabilityContact({ homeId: 'h1', name: 'Pat Admissions', email: 'Pat@Facility.com', optedIn: true, source: 'operator_portal' }, NOW);
    expect(c).toMatchObject({ homeId: 'h1', optedIn: true, optedInSource: 'operator_portal', optedInAt: NOW, email: 'pat@facility.com' });
    expect(P.$transaction).toHaveBeenCalledTimes(1);
    expect(P.entityEvent.create).toHaveBeenCalledTimes(1);
    const data = P.entityEvent.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      entityType: 'AVAILABILITY_PING',
      entityId: 'h1',
      eventType: 'contact.opted_in',
      field: 'optedIn',
      source: 'OPERATOR',
      newValue: { optedIn: true, optedInSource: 'OPERATOR', optedInAt: NOW.toISOString(), preferredChannel: 'EMAIL' },
    });
    // No contact details in History.
    expect(JSON.stringify(data)).not.toMatch(/facility\.com|Pat/);
  });

  it('admin call opt-in → source ADMIN; flipping off → contact.opted_out', async () => {
    P.availabilityContact.findUnique.mockResolvedValue({ id: 'c1', homeId: 'h1', optedIn: false, optedInSource: null, preferredChannel: 'EMAIL' });
    await upsertAvailabilityContact({ homeId: 'h1', name: 'Pat', mobile: '2165550100', optedIn: true, source: 'admin_call' }, NOW);
    expect(P.entityEvent.create.mock.calls[0][0].data).toMatchObject({ eventType: 'contact.opted_in', source: 'ADMIN', newValue: expect.objectContaining({ optedInSource: 'ADMIN' }) });

    P.availabilityContact.findUnique.mockResolvedValue({ id: 'c1', homeId: 'h1', optedIn: true, optedInSource: 'operator_portal', preferredChannel: 'EMAIL' });
    await upsertAvailabilityContact({ homeId: 'h1', name: 'Pat', email: 'p@x.com', optedIn: false, source: 'operator_portal' }, NOW);
    expect(P.entityEvent.create.mock.calls[1][0].data).toMatchObject({
      eventType: 'contact.opted_out',
      source: 'OPERATOR',
      oldValue: { optedIn: true, optedInSource: 'OPERATOR' },
      newValue: expect.objectContaining({ optedIn: false }),
    });
  });

  it('a save that does not flip opt-in records contact.updated', async () => {
    P.availabilityContact.findUnique.mockResolvedValue({ id: 'c1', homeId: 'h1', optedIn: true, optedInSource: 'operator_portal', preferredChannel: 'EMAIL' });
    await upsertAvailabilityContact({ homeId: 'h1', name: 'New Name', email: 'p@x.com', optedIn: true, source: 'operator_portal' }, NOW);
    expect(P.entityEvent.create.mock.calls[0][0].data).toMatchObject({ eventType: 'contact.updated', source: 'OPERATOR' });
  });
});
