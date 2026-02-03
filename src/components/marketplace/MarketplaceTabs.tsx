"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

type MarketplaceTab = "caregivers" | "jobs" | "providers";

interface MarketplaceTabsProps {
  activeTab: MarketplaceTab;
  caregiversCount?: number;
  jobsCount?: number;
  providersCount?: number;
  onTabChange?: (tab: MarketplaceTab) => void;
}

export default function MarketplaceTabs({
  activeTab,
  caregiversCount,
  jobsCount,
  providersCount,
  onTabChange,
}: MarketplaceTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Handle tab click - use callback if provided (parent manages state/URL), otherwise navigate
  const handleTabClick = (e: React.MouseEvent, tab: MarketplaceTab) => {
    console.log('[MarketplaceTabs] handleTabClick called for tab:', tab);
    e.preventDefault();
    e.stopPropagation(); // Prevent any parent handlers from interfering
    
    if (onTabChange) {
      console.log('[MarketplaceTabs] Calling onTabChange callback');
      // Parent component handles state management and URL sync
      onTabChange(tab);
      return;
    }
    
    console.log('[MarketplaceTabs] No onTabChange callback, using router.push');
    // Only navigate when no callback - build URL based on tab
    let url = "/marketplace";
    if (tab === "jobs") {
      url = "/marketplace?tab=jobs";
    } else if (tab === "providers") {
      url = "/marketplace?tab=providers";
    } else {
      url = "/marketplace?tab=caregivers";
    }
    
    // Use router.push with scroll: false to prevent scroll reset
    router.push(url, { scroll: false });
  };

  const getTabClass = (tab: MarketplaceTab) =>
    "whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors cursor-pointer " +
    (activeTab === tab
      ? "border-primary-600 text-primary-600"
      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300");

  return (
    <div className="mb-4 border-b border-gray-200">
      <nav className="-mb-px flex space-x-6" aria-label="Marketplace Tabs">
        {/* Caregivers Tab */}
        <a
          href="/marketplace?tab=caregivers"
          onClick={(e) => handleTabClick(e, "caregivers")}
          className={getTabClass("caregivers")}
        >
          Caregivers{caregiversCount ? ` (${caregiversCount})` : ""}
        </a>

        {/* Jobs Tab */}
        <a
          href="/marketplace?tab=jobs"
          onClick={(e) => handleTabClick(e, "jobs")}
          className={getTabClass("jobs")}
        >
          Jobs{jobsCount ? ` (${jobsCount})` : ""}
        </a>

        {/* Providers Tab */}
        <a
          href="/marketplace?tab=providers"
          onClick={(e) => handleTabClick(e, "providers")}
          className={getTabClass("providers")}
        >
          Providers{providersCount ? ` (${providersCount})` : ""}
        </a>
      </nav>
    </div>
  );
}
