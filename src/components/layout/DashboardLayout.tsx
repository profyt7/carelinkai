"use client";

import { useState, useEffect, useRef } from "react";
import type { TouchEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCalendar, 
  FiMessageSquare, 
  FiSettings, 
  FiTool,
  FiHelpCircle,
  FiMenu,
  FiX,
  FiBell,
  FiSearch,
  FiUser,
  FiFileText,
  FiChevronDown,
  FiLogOut,
  FiArrowUp,
  FiMoreHorizontal
} from "react-icons/fi";
// Real-time notification center
import NotificationCenter from "../notifications/NotificationCenter";
// PWA helpers
import PWAInstallButton from "../pwa/PWAInstallButton";
import PWAStatus from "../pwa/PWAStatus";

// Role badge colors
const roleBadgeColors = {
  ADMIN: { bg: "bg-purple-100", text: "text-purple-800" },
  OPERATOR: { bg: "bg-blue-100", text: "text-blue-800" },
  CAREGIVER: { bg: "bg-green-100", text: "text-green-800" },
  FAMILY: { bg: "bg-amber-100", text: "text-amber-800" },
  AFFILIATE: { bg: "bg-pink-100", text: "text-pink-800" },
};

// ---------------------------------------------
// Navigation
// ---------------------------------------------

// Strongly-typed navigation item interface
interface NavItem {
  name: string;
  icon: React.ReactNode;
  href: string;
  showInMobileBar: boolean;
  /**
   * If provided, restricts visibility to the given user roles.
   * Omitting this property makes the item visible to everyone.
   */
  roleRestriction?: string[];
}

// Navigation items
const navItems: NavItem[] = [
  { name: "Dashboard", icon: <FiHome size={20} />, href: "/dashboard", showInMobileBar: true },
  { name: "Search Homes", icon: <FiSearch size={20} />, href: "/search", showInMobileBar: false },
  { name: "AI Match", icon: <FiSearch size={20} />, href: "/homes/match", showInMobileBar: false, roleRestriction: ["FAMILY", "OPERATOR", "ADMIN"] },
  // Marketplace (feature-flagged)
  { name: "Marketplace", icon: <FiUsers size={20} />, href: "/marketplace", showInMobileBar: true },
  { name: "Operator", icon: <FiHome size={20} />, href: "/operator", showInMobileBar: false, roleRestriction: ["OPERATOR", "ADMIN"] },
  { name: "Inquiries", icon: <FiFileText size={20} />, href: "/dashboard/inquiries", showInMobileBar: false },
  { name: "Residents", icon: <FiUsers size={20} />, href: "/residents", showInMobileBar: true },
  { name: "Caregivers", icon: <FiUsers size={20} />, href: "/caregivers", showInMobileBar: false },
  { name: "Calendar", icon: <FiCalendar size={20} />, href: "/calendar", showInMobileBar: true },
  // Shifts page
  { name: "Shifts", icon: <FiCalendar size={20} />, href: "/shifts", showInMobileBar: true },
  // Family collaboration (visible to all)
  { name: "Family", icon: <FiUsers size={20} />, href: "/family", showInMobileBar: true },
  { name: "Finances", icon: <FiDollarSign size={20} />, href: "/finances", showInMobileBar: true },
  { name: "Messages", icon: <FiMessageSquare size={20} />, href: "/messages", showInMobileBar: true },
  { name: "Settings", icon: <FiSettings size={20} />, href: "/settings", showInMobileBar: false },
  // Admin-only tools section
  { 
    name: "Admin Tools", 
    icon: <FiTool size={20} />, 
    href: "/admin/tools", 
    showInMobileBar: false,
    roleRestriction: ["ADMIN", "STAFF"] 
  },
  { name: "Help", icon: <FiHelpCircle size={20} />, href: "/help", showInMobileBar: false },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  showSearch?: boolean;
}

export default function DashboardLayout({
  children,
  title,
  showSearch = true,
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  // Feature flags
  const marketplaceEnabled =
    process.env['NEXT_PUBLIC_MARKETPLACE_ENABLED'] !== 'false';

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [sessionStall, setSessionStall] = useState(false);
  
  // Touch gesture handling
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [pullDownDistance, setPullDownDistance] = useState(0);
  
  // Refs for DOM elements
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Check if component is mounted (to prevent hydration issues)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check responsive breakpoints on mount and window resize
  useEffect(() => {
    const checkBreakpoints = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024); // between sm and lg
    };
    
    checkBreakpoints();
    window.addEventListener("resize", checkBreakpoints);
    
    return () => {
      window.removeEventListener("resize", checkBreakpoints);
    };
  }, []);

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close user menu if clicked outside
      if (userMenuOpen && !target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
      
      // Close sidebar on mobile if clicked outside
      if (isMobile && sidebarOpen && !target.closest('.sidebar') && !target.closest('.sidebar-toggle')) {
        setSidebarOpen(false);
      }
      
      // Close mobile search if clicked outside
      if (showMobileSearch && !target.closest('.mobile-search-container') && !target.closest('.search-toggle')) {
        setShowMobileSearch(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen, sidebarOpen, showMobileSearch, isMobile]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  // Focus search input when mobile search opens
  useEffect(() => {
    if (showMobileSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  }, [showMobileSearch]);

  // Compute E2E bypass (env flag OR cookie set by middleware)
  const e2eEnvBypass = process.env['NODE_ENV'] !== 'production' && process.env['NEXT_PUBLIC_E2E_AUTH_BYPASS'] === '1';
  const e2eCookieBypass = typeof window !== 'undefined' && document.cookie.includes('e2e-bypass=1');
  const e2eBypass = e2eEnvBypass || e2eCookieBypass;

  // Note: NextAuth session cookies are HttpOnly in production, so client JS cannot read them.
  // Instead of relying on cookies, add a short timeout fallback to prevent indefinite spinners.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (status === 'loading') {
      timer = setTimeout(() => setSessionStall(true), 2000);
    } else if (status === 'unauthenticated') {
      timer = setTimeout(() => setSessionStall(true), 2500);
    } else {
      // Reset stall when authenticated
      setSessionStall(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status]);

  // Redirect to login if not authenticated (skip during e2e to allow mocking; add short grace period)
  useEffect(() => {
    if (e2eBypass) return;
    // Only redirect if unauthenticated and we've waited past the stall window
    if (status === "unauthenticated" && !sessionStall) {
      router.push("/auth/login");
    }
  }, [status, router, e2eBypass, sessionStall]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Toggle user menu
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  // Toggle mobile search
  const toggleMobileSearch = () => {
    setShowMobileSearch(!showMobileSearch);
    if (!showMobileSearch) {
      setSearchQuery("");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };
  
  // Touch event handlers for swipe gestures
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const firstTouch = e.touches?.item(0);
    if (firstTouch) {
      setTouchStartX(firstTouch.clientX);
      setTouchStartY(firstTouch.clientY);
    }
    setIsSwiping(true);
  };
  
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const firstTouch = e.touches?.item(0);
    if (!isSwiping || !firstTouch) return;
    
    const currentX = firstTouch.clientX;
    const currentY = firstTouch.clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;
    
    // Handle horizontal swipes for sidebar
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      if (deltaX > 0 && !sidebarOpen) {
        // Swipe right to open sidebar
        setSidebarOpen(true);
      } else if (deltaX < 0 && sidebarOpen) {
        // Swipe left to close sidebar
        setSidebarOpen(false);
      }
      setIsSwiping(false);
    }
    
    // Handle pull-down for search
    if (deltaY > 50 && Math.abs(deltaY) > Math.abs(deltaX) && !showMobileSearch && window.scrollY === 0) {
      setPullDownDistance(deltaY);
      if (deltaY > 120) {
        setShowMobileSearch(true);
        setPullDownDistance(0);
        setIsSwiping(false);
      }
    }
  };
  
  const handleTouchEnd = () => {
    setIsSwiping(false);
    setPullDownDistance(0);
  };

  // Get user display name
  const displayName = session?.user?.firstName || session?.user?.name?.split(' ')[0] || 'User';
  const fullName = session?.user?.name || `${session?.user?.firstName || ''} ${session?.user?.lastName || ''}`.trim();
  const userRole = session?.user?.role || 'USER';

  /* ----------------------------
   * Resolve profile image (if any)
   * ---------------------------- */
  const profileImage: string | null = (() => {
    const img = session?.user?.profileImageUrl;
    if (!img) return null;
    if (typeof img === "string") return img;
    // object format: prefer medium > thumbnail > large
    return img.medium || img.thumbnail || img.large || null;
  })();

  /* ---------- DEBUG: inspect profile image values ---------- */
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[DashboardLayout] session.user.profileImageUrl:", session?.user?.profileImageUrl);
    // eslint-disable-next-line no-console
    console.log("[DashboardLayout] resolved profileImage:", profileImage);
  }

  // Show loading state when session is loading
  if ((status === "loading" && !sessionStall) || !mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-t-primary-500 border-neutral-200 animate-spin"></div>
          <p className="text-neutral-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const contentEl = (!e2eBypass && status === "unauthenticated" && !sessionStall) ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4 py-12">
        <div className="h-10 w-10 rounded-full border-4 border-t-primary-500 border-neutral-200 animate-spin"></div>
        <p className="text-neutral-600 font-medium">Signing you in...</p>
      </div>
    </div>
  ) : (
    <>{children}</>
  );

  return (
    <div 
      className="flex h-screen bg-neutral-50 overflow-hidden"
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Backdrop overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`sidebar ${
          isMobile 
            ? 'fixed transform transition-transform duration-300 ease-in-out z-50 w-[280px]' 
            : isTablet 
              ? 'fixed transform transition-transform duration-300 ease-in-out z-50 w-[240px]' 
              : 'relative w-sidebar'
        } ${
          (isMobile || isTablet) && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
        aria-label="Main navigation"
        aria-hidden={isMobile && !sidebarOpen}
      >
        {/* Logo */}
        <div className="sidebar-logo px-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-md bg-primary-500 flex items-center justify-center mr-2">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-white font-semibold text-lg">CareLinkAI</span>
          </div>
          {(isMobile || isTablet) && (
            <button 
              onClick={toggleSidebar}
              className="text-white p-2 rounded-md hover:bg-neutral-700 transition-colors"
              aria-label="Close sidebar"
            >
              <FiX size={24} />
            </button>
          )}
        </div>

        {/* Navigation */}
        {/*
          Filter navigation items once based on optional roleRestriction.
          Items without a roleRestriction are always shown.
        */}
        {(() => {
          const normalizedRole = String(userRole || '').toUpperCase();
          const visibleNavItems = navItems.filter(
            (item) =>
              !("roleRestriction" in item) ||
              !item.roleRestriction ||
              item.roleRestriction.map(r => r.toUpperCase()).includes(normalizedRole)
            // Feature-flag gate for Marketplace
            ).filter(
              (item) =>
                item.name !== "Marketplace" || marketplaceEnabled
          );
          return (
            <nav className="sidebar-nav mt-4" aria-label="Sidebar navigation">
              {visibleNavItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-nav-item ${
                pathname === item.href || pathname?.startsWith(`${item.href}/`) 
                  ? "sidebar-nav-item-active" 
                  : ""
              }`}
              onClick={() => isMobile && setSidebarOpen(false)}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
              ))}
            </nav>
          );
        })()}
        
        {/* User info in sidebar (mobile only) */}
        {isMobile && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-700">
            <div className="flex items-center">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-neutral-600 flex items-center justify-center">
                  <FiUser size={20} className="text-white" />
                </div>
              )}
              <div className="ml-3">
                <p className="text-white font-medium">{fullName}</p>
                <div className={`text-xs px-1.5 py-0.5 rounded-sm ${roleBadgeColors[userRole as keyof typeof roleBadgeColors]?.bg || 'bg-neutral-100'} ${roleBadgeColors[userRole as keyof typeof roleBadgeColors]?.text || 'text-neutral-800'}`}>
                  {userRole}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-auto p-2 text-neutral-400 hover:text-white"
                aria-label="Sign out"
              >
                <FiLogOut size={20} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div 
        ref={mainContentRef}
        className={`flex-1 flex flex-col overflow-hidden ${
          isMobile ? 'pb-16' : ''
        }`}
      >
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 h-header flex items-center px-4 md:px-6 shadow-sm">
          {(isMobile || isTablet) && (
            <button 
              onClick={toggleSidebar}
              className="mr-4 p-2 rounded-md hover:bg-neutral-100 sidebar-toggle"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
            >
              <FiMenu size={24} />
            </button>
          )}
          
          <h1 className="text-lg sm:text-xl font-semibold text-neutral-800 truncate">{title}</h1>
          
          <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
            {/* Mobile search button */}
            {showSearch && isMobile && (
              <button
                onClick={toggleMobileSearch}
                className="p-2 rounded-md hover:bg-neutral-100 search-toggle"
                aria-label="Search"
                aria-expanded={showMobileSearch}
              >
                <FiSearch size={22} />
              </button>
            )}
            
            {/* Desktop search bar */}
            {showSearch && !isMobile && (
              <form
                className="relative hidden sm:block"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery("");
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Search homes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-10 py-2 pr-4 rounded-full border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-600 focus:outline-none"
                  aria-label="Search homes"
                >
                  <FiSearch size={18} />
                </button>
              </form>
            )}
            
            {/* Real-time notifications */}
            <NotificationCenter />

            {/* PWA Install button (desktop only) */}
            {!isMobile && (
              <PWAInstallButton
                showLabel={false}
                variant="text"
                className="hidden sm:inline-flex"
              />
            )}
            
            {/* User Menu */}
            <div className="relative user-menu-container">
              <button 
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-neutral-100"
                aria-label="Open user menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt="Profile photo"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center">
                    <FiUser size={16} className="text-neutral-600" />
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{fullName}</span>
                    <FiChevronDown size={16} className={`ml-1 text-neutral-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`text-xs px-1.5 py-0.5 rounded-sm ${roleBadgeColors[userRole as keyof typeof roleBadgeColors]?.bg || 'bg-neutral-100'} ${roleBadgeColors[userRole as keyof typeof roleBadgeColors]?.text || 'text-neutral-800'}`}>
                    {userRole}
                  </div>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-md shadow-lg overflow-hidden z-50 animate-fade-in animate-slide-up"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div className="p-4 border-b border-neutral-100">
                    <p className="text-sm font-medium">{fullName}</p>
                    <p className="text-xs text-neutral-500">{session?.user?.email}</p>
                    <div className={`mt-1 text-xs px-1.5 py-0.5 inline-block rounded-sm ${roleBadgeColors[userRole as keyof typeof roleBadgeColors]?.bg || 'bg-neutral-100'} ${roleBadgeColors[userRole as keyof typeof roleBadgeColors]?.text || 'text-neutral-800'}`}>
                      {userRole}
                    </div>
                  </div>
                  <div className="py-1">
                    <Link 
                      href="/settings/profile" 
                      className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <Link 
                      href="/settings/account" 
                      className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Account Settings
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-neutral-100 transition-colors flex items-center"
                      role="menuitem"
                    >
                      <FiLogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Search Overlay */}
        {isMobile && showMobileSearch && (
          <div 
            className="fixed inset-x-0 top-0 bg-white z-40 animate-slide-up mobile-search-container"
            style={{
              height: 'auto',
              maxHeight: '80%',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            ref={mobileSearchRef}
          >
            <div className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery("");
                    setShowMobileSearch(false);
                  }
                }}
                className="flex items-center"
              >
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search homes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input w-full pl-10 py-3 pr-4 rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <FiSearch size={20} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileSearch(false)}
                  className="ml-2 p-3 text-neutral-500"
                  aria-label="Close search"
                >
                  <FiX size={24} />
                </button>
              </form>
              
              {/* Recent searches or suggestions could go here */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-neutral-500 mb-2">Recent Searches</h3>
                <div className="space-y-2">
                  {['Assisted living', 'Memory care', 'San Francisco'].map((term) => (
                    <button 
                      key={term}
                      className="flex items-center w-full p-2 hover:bg-neutral-50 rounded-md"
                      onClick={() => {
                        setSearchQuery(term);
                        searchInputRef.current?.focus();
                      }}
                    >
                      <FiSearch size={16} className="text-neutral-400 mr-2" />
                      <span className="text-neutral-700">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pull-to-search indicator */}
        {isMobile && pullDownDistance > 0 && pullDownDistance < 120 && (
          <div 
            className="fixed top-0 inset-x-0 flex justify-center items-center bg-white bg-opacity-90 z-30"
            style={{ height: `${pullDownDistance}px` }}
          >
            <div className="flex flex-col items-center">
              <FiArrowUp 
                size={20} 
                className="text-neutral-500 mb-1"
                style={{ 
                  transform: `rotate(${180 * (pullDownDistance / 120)}deg)`,
                  opacity: pullDownDistance / 120
                }}
              />
              <span className="text-xs text-neutral-500">Pull down to search</span>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main 
          className={`flex-1 overflow-y-auto ${
            isMobile ? 'pb-16' : ''
          }`}
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch' // For iOS momentum scrolling
          }}
        >
          {contentEl}
        </main>
      </div>
      
      {/* Mobile Tab Bar */}
      {isMobile && (
        <nav 
          className="mobile-tab-bar safe-bottom"
          aria-label="Mobile navigation"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)' // iOS safe area
          }}
        >
          {navItems
            .filter(
              (item) =>
                item.showInMobileBar &&
                (item.name !== "Marketplace" || marketplaceEnabled)
            )
            .map((item) => (
            <Link 
              key={item.name}
              href={item.href}
              className={`mobile-tab-item ${
                pathname === item.href || pathname?.startsWith(`${item.href}/`) 
                  ? 'mobile-tab-item-active' 
                  : ''
              }`}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.icon}
              <span className="mt-1">{item.name}</span>
            </Link>
          ))}
          
          {/* More menu button */}
          <button
            onClick={toggleSidebar}
            className="mobile-tab-item"
            aria-label="More options"
            aria-expanded={sidebarOpen}
          >
            <FiMoreHorizontal size={20} />
            <span className="mt-1">More</span>
          </button>
        </nav>
      )}
      
      {/* iOS safe area padding for notched devices */}
      <style jsx global>{`
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        
        @supports (padding-top: env(safe-area-inset-top)) {
          .has-safe-area {
            padding-top: env(safe-area-inset-top);
          }
        }
        
        /* Improve touch interactions */
        @media (max-width: 640px) {
          button, a {
            touch-action: manipulation;
          }
          
          .touch-target {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}
