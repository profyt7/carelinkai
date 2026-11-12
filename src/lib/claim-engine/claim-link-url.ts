/**
 * The URL an emailed claim link carries. /claim?token=… is the landing that records the visit
 * and greets a signed-in addressed operator by facility name; logged out it hands off to
 * /auth/register?role=OPERATOR&claimToken=… (same token). `registerUrl` builds that form directly.
 */
export function claimLinkUrl(base: string, token: string, registerUrl = false): string {
  const b = base.replace(/\/$/, '');
  return registerUrl
    ? `${b}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`
    : `${b}/claim?token=${encodeURIComponent(token)}`;
}

/** The token in a /claim?token=… or /auth/register?…claimToken=… URL, or null. */
export function claimTokenFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.pathname === '/claim') return u.searchParams.get('token');
    if (u.pathname === '/auth/register') return u.searchParams.get('claimToken');
  } catch { /* not a URL */ }
  return null;
}
