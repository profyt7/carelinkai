import { getOriginFromHeaders } from '@/lib/http';

describe('RecommendedCaregivers server component', () => {
  test('builds absolute URLs using forwarded headers', () => {
    const h = {
      get: (k: string) => ({ 'x-forwarded-proto': 'http', 'x-forwarded-host': 'localhost:3000' }[k.toLowerCase()] || null),
    } as any;
    expect(getOriginFromHeaders(h)).toBe('http://localhost:3000');
  });
});
