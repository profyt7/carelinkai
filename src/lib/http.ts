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

export function getBaseUrl(h: HeaderGetter): string {
  const origin = getOriginFromHeaders(h);
  if (origin) return origin;
  const envUrl = (process.env['NEXT_PUBLIC_APP_URL'] || process.env['APP_URL'] || '').toString().trim();
  if (envUrl) return envUrl;
  return 'http://127.0.0.1:3000';
}
