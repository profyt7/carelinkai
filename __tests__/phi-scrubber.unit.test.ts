/**
 * Unit tests for scrubPhi() — HIPAA Phase 2C log redaction.
 * Every denylist field must be covered, plus nested/array/mixed cases.
 *
 * See HIPAA_PHASE_2_DESIGN.md §PR-C
 */

import { scrubPhi } from '../src/lib/phi-scrubber';

// ── Every denylist field individually ────────────────────────────────────────

const PHI_FIELDS = [
  'firstName', 'lastName', 'dateOfBirth', 'ssn',
  'medicalConditions', 'medications', 'allergies',
  'diagnosis', 'primaryDiagnosis', 'careNotes', 'notes',
  'content', 'description',
  'email', 'phone', 'contactEmail', 'contactPhone', 'contactName',
  'emergencyContact', 'emergencyPhone',
  'address', 'patientInfo', 'fileUrl',
] as const;

describe('scrubPhi — every denylist field', () => {
  for (const field of PHI_FIELDS) {
    it(`redacts ${field}`, () => {
      const input = { [field]: 'sensitive-value-123' };
      const result = scrubPhi(input) as Record<string, unknown>;
      expect(result[field]).toBe('[REDACTED]');
    });
  }
});

// ── Non-PHI fields pass through ──────────────────────────────────────────────

describe('scrubPhi — non-PHI fields pass through', () => {
  it('preserves non-PHI string fields', () => {
    const input = { id: 'abc123', status: 'active', role: 'OPERATOR' };
    const result = scrubPhi(input) as Record<string, unknown>;
    expect(result).toEqual({ id: 'abc123', status: 'active', role: 'OPERATOR' });
  });

  it('preserves non-PHI numeric fields', () => {
    const input = { count: 42, version: 3 };
    const result = scrubPhi(input) as Record<string, unknown>;
    expect(result).toEqual({ count: 42, version: 3 });
  });

  it('preserves boolean fields', () => {
    const input = { isActive: true, isDeleted: false };
    const result = scrubPhi(input) as Record<string, unknown>;
    expect(result).toEqual({ isActive: true, isDeleted: false });
  });
});

// ── Mixed PHI + non-PHI ──────────────────────────────────────────────────────

describe('scrubPhi — mixed PHI + non-PHI', () => {
  it('redacts only PHI fields, preserves others', () => {
    const input = {
      id: 'res-abc',
      firstName: 'John',
      lastName: 'Smith',
      status: 'ACTIVE',
      homeId: 'home-123',
      dateOfBirth: '1945-06-15',
    };
    const result = scrubPhi(input) as Record<string, unknown>;
    expect(result.id).toBe('res-abc');
    expect(result.status).toBe('ACTIVE');
    expect(result.homeId).toBe('home-123');
    expect(result.firstName).toBe('[REDACTED]');
    expect(result.lastName).toBe('[REDACTED]');
    expect(result.dateOfBirth).toBe('[REDACTED]');
  });
});

// ── Nested objects ───────────────────────────────────────────────────────────

describe('scrubPhi — nested objects', () => {
  it('redacts PHI fields in nested objects (2 levels)', () => {
    const input = {
      resident: {
        id: 'res-1',
        firstName: 'Alice',
        contact: {
          email: 'alice@example.com',
          phone: '555-1234',
        },
      },
    };
    const result = scrubPhi(input) as any;
    expect(result.resident.id).toBe('res-1');
    expect(result.resident.firstName).toBe('[REDACTED]');
    expect(result.resident.contact.email).toBe('[REDACTED]');
    expect(result.resident.contact.phone).toBe('[REDACTED]');
  });

  it('handles deeply nested PHI (3+ levels)', () => {
    const input = {
      data: {
        family: {
          member: {
            email: 'test@example.com',
            address: '123 Main St',
          },
        },
      },
    };
    const result = scrubPhi(input) as any;
    expect(result.data.family.member.email).toBe('[REDACTED]');
    expect(result.data.family.member.address).toBe('[REDACTED]');
  });
});

// ── Arrays ───────────────────────────────────────────────────────────────────

describe('scrubPhi — arrays', () => {
  it('processes array of objects, redacting PHI in each', () => {
    const input = [
      { id: '1', firstName: 'Alice', status: 'active' },
      { id: '2', firstName: 'Bob', status: 'inactive' },
    ];
    const result = scrubPhi(input) as any[];
    expect(result[0].id).toBe('1');
    expect(result[0].firstName).toBe('[REDACTED]');
    expect(result[0].status).toBe('active');
    expect(result[1].id).toBe('2');
    expect(result[1].firstName).toBe('[REDACTED]');
  });

  it('handles arrays nested inside objects', () => {
    const input = {
      items: [
        { id: '1', email: 'a@example.com' },
        { id: '2', email: 'b@example.com' },
      ],
    };
    const result = scrubPhi(input) as any;
    expect(result.items[0].id).toBe('1');
    expect(result.items[0].email).toBe('[REDACTED]');
    expect(result.items[1].email).toBe('[REDACTED]');
  });

  it('handles array of primitives unchanged', () => {
    const input = { tags: ['admin', 'operator'], counts: [1, 2, 3] };
    const result = scrubPhi(input) as any;
    expect(result.tags).toEqual(['admin', 'operator']);
    expect(result.counts).toEqual([1, 2, 3]);
  });

  it('handles array at root level', () => {
    const input = [{ email: 'a@b.com' }, { id: 'x' }];
    const result = scrubPhi(input) as any[];
    expect(result[0].email).toBe('[REDACTED]');
    expect(result[1].id).toBe('x');
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('scrubPhi — edge cases', () => {
  it('returns null unchanged', () => {
    expect(scrubPhi(null)).toBeNull();
  });

  it('returns undefined unchanged', () => {
    expect(scrubPhi(undefined)).toBeUndefined();
  });

  it('returns primitive string at root unchanged', () => {
    expect(scrubPhi('hello')).toBe('hello');
  });

  it('returns primitive number at root unchanged', () => {
    expect(scrubPhi(42)).toBe(42);
  });

  it('returns boolean at root unchanged', () => {
    expect(scrubPhi(true)).toBe(true);
  });

  it('handles empty object', () => {
    expect(scrubPhi({})).toEqual({});
  });

  it('handles empty array', () => {
    expect(scrubPhi([])).toEqual([]);
  });

  it('is deterministic — same input always produces same output', () => {
    const input = { id: '1', firstName: 'Test', email: 'test@test.com' };
    const r1 = scrubPhi(input);
    const r2 = scrubPhi(input);
    expect(r1).toEqual(r2);
  });

  it('does not mutate the original object', () => {
    const input = { firstName: 'Original', id: 'keep' };
    scrubPhi(input);
    expect(input.firstName).toBe('Original');
  });
});
