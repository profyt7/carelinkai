"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type MarketplaceTab = "caregivers" | "jobs" | "providers";

interface MarketplaceTabsProps {
  activeTab: MarketplaceTab;
  caregiversCount?: number;
  jobsCount?: number;
  providersCount?: number;
}

export default function MarketplaceTabs({
  activeTab,
  caregiversCount,
  jobsCount,
  providersCount,
}: MarketplaceTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine if we're on a detail page (e.g., /marketplace/providers/[id])
  const isDetailPage = pathname.includes("/marketplace/") && pathname.split("/").length > 3;

  return (
    <div className="mb-4 border-b border-gray-200">
      <nav className="-mb-px flex space-x-6" aria-label="Marketplace Tabs">
        {/* Caregivers Tab */}
        <Link
          href="/marketplace"
          className={
            "whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors " +
            (activeTab === "caregivers"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
          }
        >
          Caregivers{caregiversCount ? ` (${caregiversCount})` : ""}
        </Link>

        {/* Jobs Tab */}
        <Link
          href="/marketplace?tab=jobs"
          className={
            "whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors " +
            (activeTab === "jobs"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
          }
        >
          Jobs{jobsCount ? ` (${jobsCount})` : ""}
        </Link>

        {/* Providers Tab */}
        <Link
          href="/marketplace/providers"
          className={
            "whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors " +
            (activeTab === "providers"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
          }
        >
          Providers{providersCount ? ` (${providersCount})` : ""}
        </Link>
      </nav>
    </div>
  );
}
