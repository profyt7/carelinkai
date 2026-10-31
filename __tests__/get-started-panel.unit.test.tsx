/**
 * @jest-environment jsdom
 *
 * OL-248 h — the homepage "Get started on your own" panel. Each role link points at a real route (the
 * app/ page file exists; register links carry a role the register page accepts), the provider link only
 * shows when PROVIDER_LISTING_ENABLED is on, and the tour dialog hands focus back to its button on close.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GetStartedPanel from '@/components/marketing/GetStartedPanel';
import { getStartedLinks } from '@/lib/marketing/get-started-links';

jest.mock('next/image', () => function Image(p: any) {
  return require('react').createElement('img', { alt: p.alt, src: p.src, width: p.width, height: p.height, sizes: p.sizes, className: p.className, 'data-testid': p['data-testid'] });
});

const root = path.join(__dirname, '..');
const pageFor = (pathname: string) => path.join(root, 'src/app', pathname, 'page.tsx');
const registerSrc = fs.readFileSync(pageFor('/auth/register'), 'utf8');
const VIDEO = { src: '/demo/tour.mp4', poster: '/demo/tour-poster.jpg', captions: '/demo/tour.vtt' };

const EXPECTED: Record<string, { label: string; href: string }> = {
  families: { label: 'Find care near you', href: '/search' },
  'care-homes': { label: 'Claim your free listing', href: '/cleveland/assisted-living' },
  'discharge-planners': { label: 'Send a referral', href: '/discharge-planner/concierge' },
  caregivers: { label: 'Explore caregiver opportunities', href: '/auth/register?role=caregiver' },
  providers: { label: 'List your services free', href: '/auth/register?role=provider' },
};

describe('role links reach their intended routes', () => {
  const links = getStartedLinks({ providerListingOn: true });

  it.each(links.map((l) => [l.key, l] as const))('%s', (key, link) => {
    expect({ label: link.label, href: link.href }).toEqual(EXPECTED[key]);
    const url = new URL(link.href, 'https://getcarelinkai.com');
    expect(fs.existsSync(pageFor(url.pathname))).toBe(true);
    const role = url.searchParams.get('role');
    if (role) {
      // The register page upper-cases ?role= and accepts it only from VALID_ROLES.
      expect(registerSrc).toMatch(/get\("role"\)\s*\?\.toUpperCase\(\)/);
      expect(registerSrc.slice(registerSrc.indexOf('const VALID_ROLES'), registerSrc.indexOf('];', registerSrc.indexOf('const VALID_ROLES')))).toContain(`"${role.toUpperCase()}"`);
    }
  });

  it('the rendered panel uses the same hrefs, plus /help and /contact', () => {
    render(<GetStartedPanel tourVideo={VIDEO} providerListingOn />);
    for (const [key, { label, href }] of Object.entries(EXPECTED)) {
      const a = screen.getByTestId(`get-started-link-${key}`);
      expect(a.getAttribute('href')).toBe(href);
      expect(a.textContent).toContain(label);
    }
    expect(screen.getByTestId('get-started-guides').getAttribute('href')).toBe('/help');
    expect(screen.getByRole('link', { name: 'send us a message' }).getAttribute('href')).toBe('/contact');
    expect(fs.existsSync(pageFor('/help'))).toBe(true);
    expect(fs.existsSync(pageFor('/contact'))).toBe(true);
  });
});

describe('provider link follows PROVIDER_LISTING_ENABLED', () => {
  it('off: hidden', () => {
    expect(getStartedLinks({ providerListingOn: false }).map((l) => l.key)).toEqual(['families', 'care-homes', 'discharge-planners', 'caregivers']);
    render(<GetStartedPanel tourVideo={VIDEO} providerListingOn={false} />);
    expect(screen.queryByTestId('get-started-link-providers')).toBeNull();
    expect(screen.queryByText('List your services free')).toBeNull();
  });
  it('on: shown', () => {
    render(<GetStartedPanel tourVideo={VIDEO} providerListingOn />);
    expect(screen.getByTestId('get-started-link-providers')).toBeTruthy();
  });
});

describe('copy and the tour dialog', () => {
  it('heading, subhead, button and footer copy', () => {
    render(<GetStartedPanel tourVideo={VIDEO} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Get started on your own');
    expect(screen.getByTestId('get-started-subhead').textContent).toBe('Watch the 90-second tour, then jump straight to what you need. Getting started is free.');
    expect(screen.getByTestId('get-started-footer').textContent).toBe('Questions? Call (216) 245-9482 or send us a message.');
  });

  it('the tour is one thumbnail <button>: poster via next/image (16:9), CSS play button + "1:32" chip, label underneath', () => {
    render(<GetStartedPanel tourVideo={VIDEO} />);
    const btn = screen.getByRole('button', { name: 'Watch the 90-second product tour (1 minute 32 seconds)' });
    expect(btn).toBe(screen.getByTestId('get-started-watch-tour'));
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
    const img = screen.getByTestId('get-started-tour-thumbnail');
    expect(btn.contains(img)).toBe(true);
    expect([img.getAttribute('src'), img.getAttribute('width'), img.getAttribute('height')]).toEqual(['/demo/tour-poster.jpg', '1600', '900']);
    expect(img.getAttribute('alt')).toBe(''); // the button's aria-label names it
    expect(img.getAttribute('sizes')).toBe('(min-width: 768px) 720px, 100vw');
    expect(btn.className).toContain('max-w-[720px]');
    expect(btn.querySelector('.aspect-video')).not.toBeNull();
    // Overlay is markup + CSS, inside the button, hidden from assistive tech (the label says it).
    expect(btn.contains(screen.getByTestId('get-started-tour-play'))).toBe(true);
    expect(screen.getByTestId('get-started-tour-duration').textContent).toBe('1:32');
    expect(screen.getByTestId('get-started-tour-label').textContent).toBe('Watch the 90-second tour');
    expect(btn.contains(screen.getByTestId('get-started-tour-label'))).toBe(true);
    // Exactly one control for the tour; no leftover "▶" text button.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(btn.textContent).not.toContain('▶');
  });

  it('no tour video: no thumbnail', () => {
    render(<GetStartedPanel />);
    expect(screen.queryByTestId('get-started-watch-tour')).toBeNull();
    expect(screen.queryByTestId('get-started-tour-thumbnail')).toBeNull();
  });

  it('the modal player shows the same poster', () => {
    render(<GetStartedPanel tourVideo={VIDEO} />);
    fireEvent.click(screen.getByTestId('get-started-watch-tour'));
    expect(screen.getByTestId('tour-video').getAttribute('poster')).toBe('/demo/tour-poster.jpg');
  });

  it('opens by keyboard-focusable button, closes on Escape, and focus returns to the button', () => {
    render(<GetStartedPanel tourVideo={VIDEO} />);
    const btn = screen.getByTestId('get-started-watch-tour');
    btn.focus();
    fireEvent.click(btn);
    expect(screen.getByTestId('tour-video-modal')).toBeTruthy();
    expect(document.activeElement?.textContent).toContain('Close');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('tour-video-modal')).toBeNull();
    expect(document.activeElement).toBe(btn);
  });
});
