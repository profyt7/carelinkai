/**
 * Append-only history helper (sprint W5-1, Δ14 / G2).
 *
 *  - recordEvent writes one row with the transaction client it is given
 *  - the PHI guard strips names / DOB / diagnoses / notes / contact details and
 *    long free text from old/new values, keeping IDs, statuses, counts, payer
 *    lane, care level and ZIP
 *  - diffFields only reports fields that actually changed
 *  - availability channel → history source mapping
 */

jest.mock('@/lib/prisma', () => ({ prisma: { $transaction: jest.fn() } }));

import {
  recordEvent,
  sanitizeEventValue,
  diffFields,
  eventSourceForAvailability,
} from '@/lib/events/record-event';

/** A deliberately PHI-laden fixture — none of the marked values may survive. */
const PHI_FIXTURE = {
  id: 'ps_1',
  homeId: 'home_1',
  status: 'SUBMITTED',
  count: 2,
  payerLane: 'FEE_ELIGIBLE',
  careLevel: 'Memory care',
  zip: '44122',
  patientName: 'Jane Doe',
  dateOfBirth: '1941-03-02',
  diagnosis: 'advanced dementia',
  medicalNeeds: 'insulin twice daily, wandering',
  additionalNotes: 'POA daughter Mary 216-555-0100',
  contactEmail: 'mary@example.com',
  contactPhone: '216-555-0100',
  patientInfo: { patientName: 'Jane Doe', medicalNeeds: 'dementia' },
  description: 'x'.repeat(300),
};
const PHI_MARKERS = ['Jane', 'Doe', '1941', 'dementia', 'insulin', 'wandering', 'Mary', '216-555', 'mary@example.com', 'xxxxxxxxxx'];

describe('sanitizeEventValue — PHI guard', () => {
  it('keeps only business facts from a PHI-laden object', () => {
    const out = sanitizeEventValue(PHI_FIXTURE) as Record<string, unknown>;
    expect(out).toMatchObject({ id: 'ps_1', homeId: 'home_1', status: 'SUBMITTED', count: 2, payerLane: 'FEE_ELIGIBLE', careLevel: 'Memory care', zip: '44122' });
    const json = JSON.stringify(out);
    for (const m of PHI_MARKERS) expect(json).not.toContain(m);
    for (const k of ['patientName', 'dateOfBirth', 'diagnosis', 'medicalNeeds', 'additionalNotes', 'contactEmail', 'contactPhone', 'patientInfo', 'description']) {
      expect(out).not.toHaveProperty(k);
    }
    expect(out.redactedKeys).toBe(9);
  });

  it('keeps nulls inside objects (a change from null to a value is history)', () => {
    expect(sanitizeEventValue({ count: null, source: null })).toEqual({ count: null, source: null });
  });

  it('replaces long strings with a length marker and passes short primitives', () => {
    expect(sanitizeEventValue('ACTIVE')).toBe('ACTIVE');
    expect(sanitizeEventValue(3)).toBe(3);
    expect(sanitizeEventValue(true)).toBe(true);
    expect(sanitizeEventValue(null)).toBeNull();
    expect(sanitizeEventValue(undefined)).toBeNull();
    expect(sanitizeEventValue('a'.repeat(200))).toEqual({ redacted: true, length: 200 });
    expect(sanitizeEventValue(new Date('2026-10-16T00:00:00Z'))).toBe('2026-10-16T00:00:00.000Z');
  });

  it('sanitizes arrays and nested objects, and caps depth', () => {
    expect(sanitizeEventValue(['ASSISTED', 'MEMORY_CARE'])).toEqual(['ASSISTED', 'MEMORY_CARE']);
    const nested = sanitizeEventValue({ acuityCeiling: { wandering: true, oxygen: null, patientName: 'Jane' } }) as Record<string, unknown>;
    expect(nested).toEqual({ acuityCeiling: { wandering: true, oxygen: null, redactedKeys: 1 } });
    const deep = sanitizeEventValue({ acuityCeiling: { acuityCeiling: { acuityCeiling: { wandering: true } } } }) as Record<string, unknown>;
    expect(JSON.stringify(deep)).not.toContain('true');
  });
});

describe('recordEvent', () => {
  it('writes one row through the given client with sanitized values', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'evt_1' });
    const tx = { entityEvent: { create } } as unknown as Parameters<typeof recordEvent>[0];
    const at = new Date('2026-10-16T12:00:00Z');
    const r = await recordEvent(tx, {
      entityType: 'AVAILABILITY',
      entityId: 'home_1',
      eventType: 'availability.updated',
      field: 'availabilityCount',
      oldValue: { count: 1, patientName: 'Jane Doe' },
      newValue: { count: 2 },
      source: 'OPERATOR',
      actor: { userId: 'u_1', role: 'OPERATOR' },
      occurredAt: at,
    });
    expect(r).toEqual({ id: 'evt_1' });
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      entityType: 'AVAILABILITY', entityId: 'home_1', eventType: 'availability.updated', field: 'availabilityCount',
      source: 'OPERATOR', actorUserId: 'u_1', actorRole: 'OPERATOR', occurredAt: at,
      oldValue: { count: 1, redactedKeys: 1 }, newValue: { count: 2 },
    });
    expect(JSON.stringify(data)).not.toContain('Jane');
  });

  it('omits null values instead of writing JSON null', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'evt_2' });
    const tx = { entityEvent: { create } } as unknown as Parameters<typeof recordEvent>[0];
    await recordEvent(tx, { entityType: 'PLACEMENT_SEARCH', entityId: 'ps_1', eventType: 'status.changed', source: 'DP', oldValue: null, newValue: { status: 'SUBMITTED' } });
    const data = create.mock.calls[0][0].data;
    expect(data.oldValue).toBeUndefined();
    expect(data.actorUserId).toBeNull();
    expect(data.field).toBeNull();
  });
});

describe('diffFields', () => {
  it('reports only changed, tracked fields', () => {
    const before = { capacity: 10, priceMin: 3000, amenities: ['a'], description: 'old', untracked: 1 };
    const after = { capacity: 10, priceMin: 3500, amenities: ['a', 'b'], untracked: 2 };
    expect(diffFields(before, after, ['capacity', 'priceMin', 'amenities', 'description'])).toEqual([
      { field: 'priceMin', oldValue: 3000, newValue: 3500 },
      { field: 'amenities', oldValue: ['a'], newValue: ['a', 'b'] },
    ]);
  });
  it('treats undefined in the patch as "not sent"', () => {
    expect(diffFields({ capacity: 1 }, { capacity: undefined }, ['capacity'])).toEqual([]);
  });
});

describe('eventSourceForAvailability', () => {
  it('maps every channel', () => {
    expect(eventSourceForAvailability('OPERATOR')).toBe('OPERATOR');
    expect(eventSourceForAvailability('SMS')).toBe('OPERATOR');
    expect(eventSourceForAvailability('EMAIL')).toBe('OPERATOR');
    expect(eventSourceForAvailability('PING')).toBe('PING');
    expect(eventSourceForAvailability('VOICE')).toBe('VA_CALL');
    expect(eventSourceForAvailability('CONCIERGE')).toBe('ADMIN');
  });
});
