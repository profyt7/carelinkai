/**
 * OL-206 — SidebarShell group defaults: a defaultCollapsed group starts closed
 * unless it holds the active item. (A saved toggle winning on later visits is
 * covered by e2e/role-navigation.spec.ts, since it needs localStorage.)
 */
import { renderToString } from 'react-dom/server';
import SidebarShell, { type SidebarNavItem } from '@/components/layout/SidebarShell';

const ITEMS: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: null, href: '/home' },
  { id: 'alpha', label: 'Alpha', icon: null, defaultCollapsed: true, children: [{ id: 'a1', label: 'A one', icon: null, href: '/a1' }] },
  { id: 'beta', label: 'Beta', icon: null, defaultCollapsed: true, children: [{ id: 'b1', label: 'B one', icon: null, href: '/b1' }] },
  { id: 'gamma', label: 'Gamma', icon: null, children: [{ id: 'g1', label: 'G one', icon: null, href: '/g1' }] },
];

const render = (activeId: string) =>
  renderToString(
    <SidebarShell tone="navy" items={ITEMS} activeId={activeId} viewport="desktop">
      <p>content</p>
    </SidebarShell>,
  );

describe('SidebarShell group defaults', () => {
  it('starts defaultCollapsed groups closed when nothing inside is active', () => {
    const html = render('home');
    expect(html).not.toContain('href="/a1"');
    expect(html).not.toContain('href="/b1"');
    expect(html).toContain('href="/g1"'); // no defaultCollapsed → open, as before
  });

  it('opens the group that holds the active item, and only that one', () => {
    const html = render('b1');
    expect(html).toContain('href="/b1"');
    expect(html).not.toContain('href="/a1"');
    expect(html.match(/aria-expanded="true"/g)?.length).toBe(2); // beta + gamma
  });
});
