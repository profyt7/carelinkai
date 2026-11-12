/**
 * /claim landing (server-rendered). A logged-out visitor with a valid claim token sees a branded
 * page — facility name + city, photo, public-listing link, "Create your free account" (register
 * with the token, email locked to the recipient) and "Already have an account? Sign in" — before
 * any redirect. Expired / tampered / already-claimed / wrong-account get friendly notices with a
 * way to reach us. Every valid token records a visit (wanted).
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { signClaimToken } from '@/lib/claim-token';

const session = { current: null as any };
jest.mock('next-auth', () => ({ getServerSession: async () => session.current }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
class Redirect extends Error { constructor(public to: string) { super('NEXT_REDIRECT'); } }
jest.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new Redirect(to); },
  useRouter: () => ({ push: jest.fn() }),
}));
const recordClaimLinkVisit = jest.fn(async (_a: any) => undefined);
jest.mock('@/lib/claim-engine/claim-link-visit', () => ({ recordClaimLinkVisit: (a: any) => recordClaimLinkVisit(a) }));

const SENTINEL = 'directory-unclaimed@carelinkai.system';
const home = { current: null as any };
const findUnique = jest.fn(async (_a: any) => home.current);
jest.mock('@/lib/prisma', () => ({ prisma: { assistedLivingHome: { findUnique: (a: any) => findUnique(a) } } }));

import ClaimPage from '@/app/claim/page';

const SECRET = 'test-claim-secret';
const OLD = process.env;
beforeAll(() => { process.env = { ...OLD, NEXTAUTH_SECRET: SECRET } as NodeJS.ProcessEnv; });
afterAll(() => { process.env = OLD; });

const now = () => Math.floor(Date.now() / 1000);
const tokenFor = (over: Record<string, unknown> = {}) =>
  signClaimToken({ operatorEmail: 'kfuller@arden-courts.com', homeId: 'h-arden', clevelandFounder: true, iat: now(), exp: now() + 45 * 86400, ...over } as any, SECRET);
const ARDEN = {
  id: 'h-arden', name: 'Arden Courts (Parma)', address: { city: 'Parma', state: 'OH' },
  photos: [{ url: 'https://res.cloudinary.com/demo/arden.jpg' }],
  operator: { user: { email: SENTINEL } },
};

async function page(token: string | undefined) {
  try {
    return { html: renderToStaticMarkup(await ClaimPage({ searchParams: { token } })), redirect: null as string | null };
  } catch (e) {
    if (e instanceof Redirect) return { html: '', redirect: e.to };
    throw e;
  }
}
const decode = (s: string) => s.replace(/&amp;/g, '&');
/** href of the <a> carrying data-testid=<id>, whatever the attribute order. */
const hrefOf = (html: string, id: string) => {
  const tag = (html.match(new RegExp(`<a\\b[^>]*data-testid="${id}"[^>]*>`)) || [])[0] || '';
  return decode((tag.match(/href="([^"]+)"/) || [])[1] || '');
};

beforeEach(() => {
  session.current = null;
  home.current = ARDEN;
  recordClaimLinkVisit.mockClear();
  findUnique.mockClear();
});

describe('/claim — logged out, valid token', () => {
  it('shows the branded landing before any redirect; records the visit', async () => {
    const t = tokenFor();
    const { html, redirect } = await page(t);
    expect(redirect).toBeNull();
    expect(html).toContain('Claim Arden Courts (Parma)');
    expect(html).toContain('data-testid="claim-place">Parma, OH<');
    expect(html).toContain('src="https://res.cloudinary.com/demo/arden.jpg"');
    expect(html).toContain('href="/homes/h-arden"');
    expect(html).toContain('update your photos, pricing and availability');
    expect(html).toContain('free');
    const register = hrefOf(html, 'claim-create-account');
    expect(register).toBe(`/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(t)}`);
    expect(html).toContain('Create your free account');
    const signIn = hrefOf(html, 'claim-sign-in');
    expect(new URL(signIn, 'http://x').searchParams.get('callbackUrl')).toBe(`/claim?token=${t}`);
    expect(html).toContain('Already have an account? Sign in');
    expect(recordClaimLinkVisit).toHaveBeenCalledWith({ homeId: 'h-arden', operatorEmail: 'kfuller@arden-courts.com', source: 'claim_page' });
  });

  it('no photo (or a non-https one) → no image, page still renders', async () => {
    home.current = { ...ARDEN, photos: [{ url: 'http://insecure.example/x.jpg' }] };
    expect((await page(tokenFor())).html).not.toContain('data-testid="claim-photo"');
    home.current = { ...ARDEN, photos: [] };
    const { html } = await page(tokenFor());
    expect(html).not.toContain('<img src="http');
    expect(html).toContain('Claim Arden Courts (Parma)');
  });

  it('shows nothing about residents or families (no PHI)', async () => {
    const { html } = await page(tokenFor());
    expect(html).not.toMatch(/resident|patient|family member|diagnos/i);
    expect(html).not.toContain('kfuller@'); // the recipient email isn't shown either
  });
});

describe('/claim — friendly problems (no stack traces, no blank page)', () => {
  it('expired → "has expired" + reply/contact line; no visit, no DB read', async () => {
    const { html } = await page(tokenFor({ iat: now() - 50 * 86400, exp: now() - 86400 }));
    expect(html).toContain('This claim link has expired');
    expect(html).toContain('Reply to the email you received');
    expect(html).toContain('chris@getcarelinkai.com');
    expect(recordClaimLinkVisit).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('tampered (payload changed, or signature broken) → invalid notice', async () => {
    const t = tokenFor();
    const [data, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data, 'base64url').toString()), homeId: 'h-other' })).toString('base64url');
    for (const bad of [`${forged}.${sig}`, `${data}.${sig.slice(0, -2)}xx`, 'garbage', '']) {
      const { html } = await page(bad || undefined);
      expect(html).toContain('This claim link isn’t valid');
      expect(html).toContain('chris@getcarelinkai.com');
    }
    expect(recordClaimLinkVisit).not.toHaveBeenCalled();
  });

  it('signed in as a different user → different-account notice', async () => {
    session.current = { user: { email: 'someone.else@example.com' } };
    const { html } = await page(tokenFor());
    expect(html).toContain('This link is for a different account');
    expect(html).toContain('someone.else@example.com');
    expect(html).not.toContain('Create your free account');
  });

  it('already claimed → friendly notice (logged out: contact; signed in as recipient: dashboard)', async () => {
    home.current = { ...ARDEN, operator: { user: { email: 'owner@arden-courts.com' } } };
    let { html } = await page(tokenFor());
    expect(html).toContain('This listing has already been claimed');
    expect(html).toContain('chris@getcarelinkai.com');
    expect(html).not.toContain('Create your free account');
    session.current = { user: { email: 'kfuller@arden-courts.com' } };
    ({ html } = await page(tokenFor()));
    expect(html).toContain('href="/operator"');
  });

  it('listing gone → not-found notice', async () => {
    home.current = null;
    expect((await page(tokenFor())).html).toContain('We couldn’t find this listing');
  });
});

describe('/claim — unchanged paths', () => {
  it('signed in as the recipient → the confirm step', async () => {
    session.current = { user: { email: 'KFuller@arden-courts.com' } };
    const { html } = await page(tokenFor());
    expect(html).toContain('Claim Arden Courts (Parma)');
    expect(html).toContain('there’s no cost to claim');
    expect(html).not.toContain('Create your free account');
  });

  it('cohort link (no home) still hands off to the cohort landing', async () => {
    const t = signClaimToken({ operatorEmail: 'owner@agency.com', clevelandFounder: false, cohort: 'CLEVELAND_AGENCIES', iat: now(), exp: now() + 3600 } as any, SECRET);
    const { redirect } = await page(t);
    expect(redirect).toMatch(/\?token=.+#claim$/);
  });
});
