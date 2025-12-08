"use client";

import Link from "next/link";
import { FiChevronRight, FiHome } from "react-icons/fi";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
}

export default function Breadcrumbs({ items, showHomeIcon = true }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {showHomeIcon && (
          <>
            <li>
              <Link
                href="/operator"
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors duration-200"
                aria-label="Dashboard Home"
              >
                <FiHome className="w-4 h-4" />
              </Link>
            </li>
            {items.length > 0 && (
              <li aria-hidden="true">
                <FiChevronRight className="w-4 h-4 text-gray-400" />
              </li>
            )}
          </>
        )}
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 transition-colors duration-200 truncate max-w-[200px] sm:max-w-none"
                >
                  {item.label}
                </Link>
              ) : (
                <span 
                  className={`${
                    isLast 
                      ? "text-gray-900 font-medium" 
                      : "text-gray-600"
                  } truncate max-w-[200px] sm:max-w-none`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              
              {!isLast && (
                <FiChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
