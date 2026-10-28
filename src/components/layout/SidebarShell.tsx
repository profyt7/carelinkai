'use client';

import { useEffect, useRef, useState, type ElementType, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { FiChevronRight, FiChevronsLeft, FiChevronsRight, FiMenu, FiMoreHorizontal, FiX } from 'react-icons/fi';

/**
 * OL-202 / OL-206 — the logged-in app shell ("CareLinkAI Signature").
 *   tone="navy"  → OPERATOR, STAFF, ADMIN, DISCHARGE_PLANNER
 *   tone="light" → FAMILY, CAREGIVER, PROVIDER, AFFILIATE
 * One role, one nav: no workspace switcher. Desktop = full sidebar, tablet =
 * icon rail, mobile = drawer + bottom tab bar (4 items + More).
 *
 * Items may carry `children` (OL-206): the parent row toggles a collapsible
 * group (a parent with its own href navigates from the label, toggles from the
 * chevron). Sidebar: a `defaultCollapsed` group starts closed unless it holds
 * the active item; a manual toggle is saved in localStorage['carelinkai-nav-collapsed']
 * (keyed by parent id) and wins on later visits. In the icon rail a group opens a
 * flyout; the mobile drawer starts every group expanded unless
 * `drawerDefaultCollapsed`. Flat items render exactly as before.
 *
 * `viewport` forces a layout (design-preview frames, tests); leave it unset in
 * the app and the shell follows the real breakpoints (md rail, lg full).
 */
export type SidebarNavItem = {
  id: string;
  label: string;
  /** Bottom-bar label when `label` is too long for a phone tab (e.g. "Inquiries"). */
  shortLabel?: string;
  icon: ReactNode;
  href?: string;
  /** Small count pill, e.g. unread messages. */
  badge?: number | string;
  /** Collapsible group (OL-206). */
  children?: SidebarNavItem[];
  /** Sidebar: group starts collapsed unless it holds the active item (a saved toggle wins). */
  defaultCollapsed?: boolean;
  /** Mobile drawer: group starts collapsed (e.g. "More"). */
  drawerDefaultCollapsed?: boolean;
};

type Viewport = 'desktop' | 'tablet' | 'mobile';

type Props = {
  tone: 'light' | 'navy';
  items: SidebarNavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Desktop only: collapse the full sidebar to the icon rail. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Ids for the 4 bottom-bar slots (default: the first four items). May name group children. */
  mobileTabIds?: string[];
  brand?: ReactNode;
  user?: { name: string; roleLabel: string; /** Badge classes for the role label (DashboardLayout's roleBadgeColors). */ roleClassName?: string };
  /** Extra sidebar content under the nav (e.g. the family "Need help?" card). */
  sidebarFooter?: ReactNode;
  viewport?: Viewport;
  /**
   * Embedded in another page (design-preview frames): no <main>/<aside>
   * landmarks, and `navLabel` keeps each nav's accessible name unique.
   */
  embedded?: boolean;
  navLabel?: string;
  className?: string;
  /** Workspace background, e.g. "bg-white" or the family ivory. */
  workspaceClassName?: string;
  /** Link element for items with an href (e.g. next/link). Default <a>. */
  linkAs?: ElementType;
  /** Controlled mobile drawer (the host renders its own menu button). */
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  /** Built-in mobile top bar (brand + menu button). Off when the host has its own header. */
  mobileTopBar?: boolean;
  /** Built-in drawer backdrop. Off when the host renders its own. */
  drawerBackdrop?: boolean;
  /** Extra classes for the bottom tab bar (e.g. the app's "mobile-tab-bar safe-bottom"). */
  mobileTabBarClassName?: string;
  /** Wrap children in the shell's scrolling <main>. Off when the host renders its own header + <main>. */
  mainLandmark?: boolean;
  /** localStorage key for collapsed groups; null = don't persist. */
  collapseStorageKey?: string | null;
  children: ReactNode;
};

const TONE = {
  navy: {
    aside: 'bg-surface-sidebar text-neutral-300',
    border: 'border-white/10',
    item: 'text-neutral-300 hover:bg-white/10 hover:text-white',
    active: 'bg-primary-600 text-white',
    groupActive: 'text-white',
    ring: 'focus-visible:ring-primary-300 focus-visible:ring-offset-neutral-950',
    brandText: 'text-white',
    muted: 'text-neutral-300',
    badge: 'bg-white/15 text-white',
    flyout: 'border-white/10 bg-surface-sidebar text-neutral-300',
  },
  light: {
    aside: 'bg-surface-raised text-neutral-700',
    border: 'border-line',
    item: 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
    active: 'bg-primary-50 text-primary-700',
    groupActive: 'text-primary-700',
    ring: 'focus-visible:ring-primary-500 focus-visible:ring-offset-white',
    brandText: 'text-neutral-900',
    muted: 'text-neutral-600',
    badge: 'bg-primary-100 text-primary-800',
    flyout: 'border-line bg-surface-raised text-neutral-700',
  },
} as const;

export const NAV_COLLAPSED_KEY = 'carelinkai-nav-collapsed';

export function BrandMark({ textClass, rail }: { textClass: string; rail: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white" aria-hidden="true">
        C
      </span>
      <span className={`text-sm font-semibold tracking-tight ${textClass} ${rail ? 'sr-only' : ''}`}>CareLinkAI</span>
    </div>
  );
}

const flatten = (items: SidebarNavItem[]): SidebarNavItem[] => items.flatMap((i) => (i.children ? flatten(i.children) : [i]));
const contains = (item: SidebarNavItem, id: string): boolean => !!item.children?.some((c) => c.id === id || contains(c, id));
const domId = (id: string) => `nav-group-${id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export default function SidebarShell({
  tone,
  items,
  activeId,
  onSelect,
  collapsed = false,
  onToggleCollapse,
  mobileTabIds,
  brand,
  user,
  sidebarFooter,
  viewport,
  embedded = false,
  navLabel = 'Main navigation',
  className = '',
  workspaceClassName = 'bg-surface-raised',
  linkAs: LinkAs = 'a',
  drawerOpen: drawerOpenProp,
  onDrawerOpenChange,
  mobileTopBar = true,
  drawerBackdrop = true,
  mobileTabBarClassName = '',
  collapseStorageKey = NAV_COLLAPSED_KEY,
  mainLandmark = true,
  children,
}: Props) {
  const t = TONE[tone];
  const [drawerOpenState, setDrawerOpenState] = useState(false);
  const drawerOpen = drawerOpenProp ?? drawerOpenState;
  const setDrawerOpen = (open: boolean) => {
    if (drawerOpenProp === undefined) setDrawerOpenState(open);
    onDrawerOpenChange?.(open);
  };
  const drawerRef = useRef<HTMLDivElement>(null);
  const hasGroups = items.some((i) => i.children?.length);

  // Collapsed groups (sidebar: persisted; drawer: session-only, starts expanded).
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [drawerCollapsed, setDrawerCollapsed] = useState<Record<string, boolean>>({});
  // Rail flyout for a group.
  const [flyout, setFlyout] = useState<{ id: string; top: number; left: number } | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  // Responsive mode: is the md–lg icon rail showing right now?
  const [mqRail, setMqRail] = useState(false);

  useEffect(() => {
    if (!hasGroups || !collapseStorageKey) return;
    try {
      const saved = localStorage.getItem(collapseStorageKey);
      if (saved) setCollapsedGroups(JSON.parse(saved));
    } catch {
      /* unreadable or blocked storage → everything expanded */
    }
  }, [hasGroups, collapseStorageKey]);

  useEffect(() => {
    if (!hasGroups || viewport || collapsed) return;
    const mq = window.matchMedia('(min-width: 768px) and (max-width: 1023.98px)');
    const update = () => setMqRail(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [hasGroups, viewport, collapsed]);

  useEffect(() => {
    if (!drawerOpen) return;
    setDrawerCollapsed({});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the drawer opens/closes
  }, [drawerOpen]);

  useEffect(() => {
    if (!flyout) return;
    const close = () => setFlyout(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!flyoutRef.current?.contains(el) && !el.closest(`[data-flyout-trigger="${flyout.id}"]`)) close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('resize', close);
    flyoutRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', close);
    };
  }, [flyout]);

  // Forced viewport → fixed classes; otherwise real breakpoints.
  const rail = viewport ? viewport === 'tablet' || (viewport === 'desktop' && collapsed) : collapsed;
  const responsiveRail = !viewport && !collapsed; // md: rail, lg: full
  const railNow = rail || (responsiveRail && mqRail); // groups switch to flyouts in the rail
  const asideVisible = viewport ? (viewport === 'mobile' ? 'hidden' : 'flex') : 'hidden md:flex';
  const asideWidth = rail ? 'w-16' : viewport ? 'w-64' : 'w-16 lg:w-64';
  const labelCls = rail ? 'sr-only' : responsiveRail ? 'sr-only lg:not-sr-only' : '';
  const mobileOnly = viewport ? (viewport === 'mobile' ? 'flex' : 'hidden') : 'flex md:hidden';

  const leaves = flatten(items);
  const tabs = (mobileTabIds?.length ? mobileTabIds.map((id) => leaves.find((i) => i.id === id)).filter(Boolean) : items.slice(0, 4)) as SidebarNavItem[];

  const Aside = embedded ? 'div' : 'aside';
  const Main = embedded ? 'div' : 'main';

  const select = (id: string) => {
    onSelect?.(id);
    setFlyout(null);
    setDrawerOpen(false);
  };

  // A saved toggle wins. Otherwise: drawer → drawerDefaultCollapsed; sidebar → the
  // group holding the active item is open, the rest follow defaultCollapsed.
  const isCollapsed = (state: Record<string, boolean>, id: string, inDrawer: boolean) => {
    if (state[id] !== undefined) return state[id];
    const item = items.find((i) => i.id === id);
    if (!item) return false;
    if (inDrawer) return !!item.drawerDefaultCollapsed;
    return contains(item, activeId) ? false : !!item.defaultCollapsed;
  };

  const toggleGroup = (id: string, inDrawer: boolean) => {
    if (inDrawer) {
      setDrawerCollapsed((prev) => ({ ...prev, [id]: !isCollapsed(prev, id, true) }));
      return;
    }
    setCollapsedGroups((prev) => {
      const next = { ...prev, [id]: !isCollapsed(prev, id, false) };
      if (collapseStorageKey) {
        try {
          // Merge so keys from the old menu (e.g. "Listings") survive.
          const saved = JSON.parse(localStorage.getItem(collapseStorageKey) || '{}');
          localStorage.setItem(collapseStorageKey, JSON.stringify({ ...saved, [id]: next[id] }));
        } catch {
          /* storage unavailable: state still toggles for this page */
        }
      }
      return next;
    });
  };

  const navItem = (item: SidebarNavItem, opts: { inDrawer?: boolean; nested?: boolean } = {}) => {
    const active = item.id === activeId;
    const showLabel = opts.inDrawer || opts.nested ? '' : labelCls;
    const cls = `flex w-full items-center gap-3 rounded-lg px-3 ${opts.nested ? 'py-2' : 'py-2.5'} text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-safe:transition-colors ${t.ring} ${
      active ? t.active : t.item
    } ${rail && !opts.inDrawer && !opts.nested ? 'justify-center px-0' : ''}`;
    const inner = (
      <>
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center" aria-hidden="true">{item.icon}</span>
        <span className={`flex-1 truncate text-left ${showLabel}`}>{item.label}</span>
        {item.badge != null && !(rail && !opts.inDrawer && !opts.nested) && (
          <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${active ? 'bg-white/20 text-current' : t.badge} ${showLabel}`}>{item.badge}</span>
        )}
      </>
    );
    const common = { className: cls, 'aria-current': active ? ('page' as const) : undefined, title: rail && !opts.inDrawer && !opts.nested ? item.label : undefined };
    return item.href ? (
      <LinkAs key={item.id} href={item.href} {...common} onClick={() => select(item.id)}>{inner}</LinkAs>
    ) : (
      <button key={item.id} type="button" {...common} onClick={() => select(item.id)}>{inner}</button>
    );
  };

  const navGroup = (item: SidebarNavItem, opts: { inDrawer?: boolean } = {}) => {
    const kids = item.children ?? [];
    const has = contains(item, activeId);
    const listId = `${domId(item.id)}${opts.inDrawer ? '-menu' : ''}`;

    // Icon rail: the group is an icon button that opens a flyout of its children.
    if (railNow && !opts.inDrawer) {
      const open = flyout?.id === item.id;
      return (
        <div key={item.id} data-nav-group={item.id}>
          <button
            type="button"
            data-flyout-trigger={item.id}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-haspopup="true"
            title={item.label}
            onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
              const r = e.currentTarget.getBoundingClientRect();
              setFlyout(open ? null : { id: item.id, top: r.top, left: r.right + 8 });
            }}
            className={`flex w-full items-center justify-center rounded-lg px-0 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-safe:transition-colors ${t.ring} ${
              has ? t.active : t.item
            }`}
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center" aria-hidden="true">{item.icon}</span>
            <span className="sr-only">{item.label}</span>
          </button>
          {open && (
            <div
              ref={flyoutRef}
              id={listId}
              role="group"
              aria-label={item.label}
              className={`fixed z-50 w-60 rounded-xl border p-2 shadow-lg ${t.flyout}`}
              style={{ top: flyout.top, left: flyout.left }}
            >
              <p className={`px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide ${t.muted}`}>{item.label}</p>
              <ul className="space-y-1">
                {kids.map((c) => <li key={c.id}>{navItem(c, { nested: true })}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    }

    const expanded = !isCollapsed(opts.inDrawer ? drawerCollapsed : collapsedGroups, item.id, !!opts.inDrawer);
    const chevron = <FiChevronRight className={`h-4 w-4 flex-shrink-0 motion-safe:transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />;
    const rowCls = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-safe:transition-colors ${t.ring} ${t.item} ${
      has ? t.groupActive : ''
    }`;
    const showLabel = opts.inDrawer ? '' : labelCls;
    return (
      <div key={item.id} data-nav-group={item.id}>
        {item.href ? (
          <div className="flex items-center gap-1">
            <LinkAs href={item.href} className={rowCls} aria-current={item.id === activeId ? 'page' : undefined} onClick={() => select(item.id)}>
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center" aria-hidden="true">{item.icon}</span>
              <span className={`flex-1 truncate text-left ${showLabel}`}>{item.label}</span>
            </LinkAs>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.label}`}
              onClick={() => toggleGroup(item.id, !!opts.inDrawer)}
              className={`flex-shrink-0 rounded-lg p-2.5 focus-visible:outline-none focus-visible:ring-2 ${t.ring} ${t.item}`}
            >
              {chevron}
            </button>
          </div>
        ) : (
          <button type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => toggleGroup(item.id, !!opts.inDrawer)} className={rowCls}>
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center" aria-hidden="true">{item.icon}</span>
            <span className={`flex-1 truncate text-left ${showLabel}`}>{item.label}</span>
            {chevron}
          </button>
        )}
        {expanded && (
          <ul id={listId} className="mt-1 space-y-1 pl-4">
            {kids.map((c) => <li key={c.id}>{navItem(c, { inDrawer: opts.inDrawer, nested: true })}</li>)}
          </ul>
        )}
      </div>
    );
  };

  const renderItems = (opts: { inDrawer?: boolean } = {}) => items.map((i) => (i.children?.length ? navGroup(i, opts) : navItem(i, opts)));

  const userInitials = user?.name.split(' ').map((p) => p[0]).join('').slice(0, 2);
  const roleLabel = (cls: string) =>
    user?.roleClassName ? <p className={`mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-xs ${user.roleClassName}`}>{user.roleLabel}</p> : <p className={`text-xs ${cls}`}>{user?.roleLabel}</p>;

  return (
    <div className={`relative flex h-full min-h-0 w-full overflow-hidden ${className}`}>
      {/* Sidebar (desktop full / tablet rail) */}
      <Aside className={`${asideVisible} ${asideWidth} flex-shrink-0 flex-col border-r ${t.border} ${t.aside}`} data-tone={tone}>
        <div className={`flex h-16 items-center border-b ${t.border} ${rail ? 'justify-center px-2' : 'px-5'}`}>
          {brand ?? <BrandMark textClass={t.brandText} rail={rail || responsiveRail} />}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label={navLabel}>{renderItems()}</nav>
        {sidebarFooter && !rail && <div className="px-3 pb-3">{sidebarFooter}</div>}
        {user && (
          <div className={`flex items-center gap-3 border-t ${t.border} ${rail ? 'justify-center px-2' : 'px-4'} py-3`}>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-800" aria-hidden="true">
              {userInitials}
            </span>
            <div className={`min-w-0 ${labelCls}`}>
              <p className={`truncate text-sm font-semibold ${t.brandText}`}>{user.name}</p>
              {roleLabel(t.muted)}
            </div>
          </div>
        )}
        {onToggleCollapse && viewport !== 'tablet' && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex h-10 items-center justify-center border-t ${t.border} ${t.item} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${t.ring}`}
          >
            {collapsed ? <FiChevronsRight aria-hidden="true" /> : <FiChevronsLeft aria-hidden="true" />}
          </button>
        )}
      </Aside>

      {/* Workspace */}
      <div className={`flex min-w-0 flex-1 flex-col ${workspaceClassName}`}>
        {/* Mobile top bar */}
        {mobileTopBar && (
          <div className={`${mobileOnly} h-14 flex-shrink-0 items-center justify-between border-b px-4 ${tone === 'navy' ? 'border-white/10 bg-surface-sidebar' : 'border-line bg-surface-raised'}`}>
            <BrandMark textClass={t.brandText} rail={false} />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              className={`rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 ${t.ring} ${t.item}`}
            >
              <FiMenu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {mainLandmark ? <Main className="min-h-0 flex-1 overflow-y-auto">{children}</Main> : <div className="flex min-h-0 flex-1 flex-col">{children}</div>}

        {/* Mobile bottom tab bar: 4 + More */}
        <nav
          className={`${mobileOnly} h-16 flex-shrink-0 items-stretch justify-around border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom,0px)] ${mobileTabBarClassName}`}
          aria-label={`${navLabel} (mobile)`}
          {...((drawerOpen && !drawerBackdrop ? { inert: true } : {}) as object)}
        >
          {tabs.map((item) => {
            const active = item.id === activeId;
            const tabCls = `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 motion-safe:transition-colors ${
              active ? 'text-primary-700' : 'text-neutral-600 hover:text-neutral-900'
            }`;
            const inner = (
              <>
                <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">{item.icon}</span>
                <span className="max-w-full truncate px-1">{item.shortLabel ?? item.label}</span>
              </>
            );
            return item.href ? (
              <LinkAs key={item.id} href={item.href} onClick={() => select(item.id)} aria-current={active ? 'page' : undefined} className={tabCls}>
                {inner}
              </LinkAs>
            ) : (
              <button key={item.id} type="button" onClick={() => select(item.id)} aria-current={active ? 'page' : undefined} className={tabCls}>
                {inner}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="More navigation"
            aria-expanded={drawerOpen}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
          >
            <FiMoreHorizontal className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </nav>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className={drawerBackdrop ? 'absolute inset-0 z-40 flex' : 'pointer-events-none absolute inset-0 z-50 flex'}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {drawerBackdrop && <button type="button" className="absolute inset-0 bg-neutral-900/50" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />}
          <div ref={drawerRef} data-nav-drawer className={`pointer-events-auto relative flex h-full w-72 max-w-[85%] flex-col ${t.aside}`} data-tone={tone}>
            <div className={`flex h-14 items-center justify-between border-b px-4 ${t.border}`}>
              <BrandMark textClass={t.brandText} rail={false} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className={`rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 ${t.ring} ${t.item}`}
              >
                <FiX className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label={`${navLabel} (menu)`}>{renderItems({ inDrawer: true })}</nav>
            {sidebarFooter && <div className="px-3 pb-4">{sidebarFooter}</div>}
            {user && !embedded && (
              <div className={`flex items-center gap-3 border-t ${t.border} px-4 py-3`}>
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-800" aria-hidden="true">
                  {userInitials}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${t.brandText}`}>{user.name}</p>
                  {roleLabel(t.muted)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
