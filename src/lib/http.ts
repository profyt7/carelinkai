export type HeaderGetter = { get: (key: string) => string | null };

export function getOriginFromHeaders(h: HeaderGetter): string {
  try {
    const proto = (h.get('x-forwarded-proto') || 'http').toString();
    const host = (h.get('x-forwarded-host') || h.get('host') || '').toString();
    return host ? `${proto}://${host}` : '';
  } catch {
    return '';
  }
}
