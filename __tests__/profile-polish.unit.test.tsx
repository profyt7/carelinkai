/**
 * @jest-environment jsdom
 *
 * Pre-launch profile polish (PR B). These fail if:
 *   - the listing page repeats availability / price outside the point of inquiry (stat tiles,
 *     About quick facts), or drops them from the inquiry panel or the < lg CTA bar, or the bar stops covering
 *     the first phone screen (it shows until the panel's own facts are on screen);
 *   - the no-photo placeholder starts to look like a photograph (uses a photo, a building) or
 *     loses its accessible label;
 *   - the operator metric grid goes back to fixed columns (empty slot with 5 tiles);
 *   - the icon rail loses its hover/focus labels.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeImagePlaceholder from '@/components/homes/HomeImagePlaceholder';
import SidebarShell, { type SidebarNavItem } from '@/components/layout/SidebarShell';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const page = read('src/app/homes/[id]/page.tsx');

describe('listing: price and availability live at the point of inquiry', () => {
  it('no availability or pricing stat tile, no availability in the About quick facts', () => {
    expect(page).not.toContain('data-testid="listing-availability-tile"');
    expect(page).not.toContain('data-testid="listing-pricing-tile"');
    expect(page).not.toContain('data-testid="quick-facts-availability"');
  });

  it('the inquiry panel keeps availability (badge, sr line, detail) and price (+ Transparent chip)', () => {
    const panel = page.slice(page.indexOf('const inquiryPanel = ('), page.indexOf('{bookingStep === 1 && ('));
    for (const s of ['data-testid="sidebar-availability"', '<AvailabilityBadge availability={availability} />', 'data-testid="panel-availability-detail"', '<PriceLine pricing={realHome.pricing} />', 'Transparent Pricing']) {
      expect(panel).toContain(s);
    }
  });

  it('the < lg CTA bar shows availability and price next to its buttons', () => {
    const bar = page.slice(page.indexOf('data-testid="listing-cta-bar"'), page.indexOf('{/* Tour request modal'));
    expect(bar).toContain('data-testid="cta-bar-facts"');
    expect(bar).toContain('<AvailabilityBadge availability={availability} />');
    expect(bar).toContain('<PriceLine pricing={realHome.pricing} />');
  });

  it('the bar shows until the panel facts block (availability + price) is on screen, not only once scrolled past', () => {
    expect(page).toContain('<div className="mt-3 space-y-2" data-panel-facts>');
    expect(page).toContain('panelEl.querySelector<HTMLElement>("[data-panel-facts]")');
    expect(page).toContain('setPanelInView(r.top >= top - 1 && r.bottom <= bottom + 1)');
  });

  it('the Pricing section (detail, source note, what it includes) stays', () => {
    expect(page).toContain('id="listing-pricing"');
    expect(page).toContain('data-testid="pricing-range-source"');
  });
});

describe('no-photo placeholder', () => {
  it('is an illustration: dot pattern + heart mark, labelled, never a photo or a building', () => {
    const { container } = render(<HomeImagePlaceholder label="Photos coming soon" subtitle="No photos yet" />);
    const el = screen.getByRole('img', { name: 'Photos coming soon' });
    expect(el.getAttribute('style')).toContain('background-size: 18px 18px'); // jsdom drops the gradient image itself
    const imgs = Array.from(container.querySelectorAll('img')).map((i) => decodeURIComponent(i.getAttribute('src') || ''));
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toContain('/images/logo-mark.png');
    expect(screen.getByText('No photos yet')).toBeTruthy();
    const src = read('src/components/homes/HomeImagePlaceholder.tsx');
    expect(src).toContain('radial-gradient(circle');
    expect(src).not.toMatch(/Building2|\/images\/homes\/|unsplash|\.jpg/);
  });
});

describe('operator metric grid', () => {
  it('fills the last row (flex-grow) instead of fixed columns that leave a gap', () => {
    const src = read('src/components/dashboard/OperatorDashboardContent.tsx');
    const grid = src.slice(src.indexOf('data-testid="operator-metric-grid"'), src.indexOf('{metrics?.totalResidents'));
    expect(grid).toContain('flex flex-wrap');
    expect(grid).toContain('[&>*]:grow');
    expect(grid).not.toMatch(/grid-cols-/);
  });
});

describe('icon rail labels', () => {
  const items: SidebarNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <span>D</span>, href: '/dashboard' },
    { id: 'reports', label: 'Reports & Insights', icon: <span>R</span>, children: [{ id: 'r1', label: 'Occupancy', icon: null, href: '/r1' }] },
  ];
  const renderRail = () => render(<SidebarShell tone="navy" items={items} activeId="dashboard" viewport="tablet" mobileTopBar={false}><p>x</p></SidebarShell>);

  it('hovering an icon shows its label; leaving hides it', () => {
    renderRail();
    const link = screen.getAllByRole('link', { name: 'Dashboard' })[0];
    fireEvent.mouseEnter(link);
    expect(screen.getByTestId('rail-tooltip').textContent).toBe('Dashboard');
    fireEvent.mouseLeave(link);
    expect(screen.queryByTestId('rail-tooltip')).toBeNull();
  });

  it('keyboard focus shows the label too (groups included), and it is not announced twice', () => {
    renderRail();
    const group = screen.getAllByRole('button', { name: 'Reports & Insights' })[0];
    fireEvent.focus(group);
    const tip = screen.getByTestId('rail-tooltip');
    expect(tip.textContent).toBe('Reports & Insights');
    expect(tip.getAttribute('aria-hidden')).toBe('true');
    fireEvent.blur(group);
    expect(screen.queryByTestId('rail-tooltip')).toBeNull();
  });
});
