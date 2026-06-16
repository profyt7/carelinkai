import { normalizePreference, EMPTY_PREFERENCE } from '@/lib/family/emergency';

/**
 * Guards the data-contract bug that crashed /family/emergency: the API returns
 * { preferences } (null when none exist) with a free-form JSON escalationChain,
 * and the page used to dereference it directly, throwing in render.
 */
describe('normalizePreference', () => {
  it('returns an empty preference for null/undefined (no prefs yet)', () => {
    expect(normalizePreference(null)).toEqual(EMPTY_PREFERENCE);
    expect(normalizePreference(undefined)).toEqual(EMPTY_PREFERENCE);
  });

  it('returns an empty preference for non-object input', () => {
    expect(normalizePreference('nope')).toEqual(EMPTY_PREFERENCE);
    expect(normalizePreference(42)).toEqual(EMPTY_PREFERENCE);
  });

  it('passes through a well-formed preference', () => {
    const raw = {
      escalationChain: [{ name: 'Jane', phone: '216-555-0100' }],
      notifyMethods: ['SMS', 'EMAIL'],
      careInstructions: 'Call the cardiologist first.',
    };
    expect(normalizePreference(raw)).toEqual(raw);
  });

  it('coerces a null/garbage escalationChain to an empty array', () => {
    expect(normalizePreference({ escalationChain: null }).escalationChain).toEqual([]);
    expect(normalizePreference({ escalationChain: 'x' }).escalationChain).toEqual([]);
  });

  it('fills missing contact fields and drops non-string notify methods', () => {
    const out = normalizePreference({
      escalationChain: [{ name: 'Bob' }, null, { phone: '5551234' }],
      notifyMethods: ['SMS', 42, null, 'CALL'],
      careInstructions: 7,
    });
    expect(out.escalationChain).toEqual([
      { name: 'Bob', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '5551234' },
    ]);
    expect(out.notifyMethods).toEqual(['SMS', 'CALL']);
    expect(out.careInstructions).toBe('');
  });

  it('the result never has fields the UI would crash on', () => {
    for (const input of [null, {}, { escalationChain: undefined }, { notifyMethods: undefined }]) {
      const p = normalizePreference(input);
      expect(Array.isArray(p.escalationChain)).toBe(true);
      expect(Array.isArray(p.notifyMethods)).toBe(true);
      expect(typeof p.careInstructions).toBe('string');
    }
  });
});
