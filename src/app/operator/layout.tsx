"use client";

/**
 * Operator Layout
 * 
 * This layout provides the sidebar navigation and header for all Operator pages.
 * It wraps all children in a DashboardLayout component that includes:
 * - Sidebar navigation
 * - Top header
 * - Content wrapper with consistent styling
 * 
 * IMPORTANT: Individual Operator pages (page.tsx files) should NOT wrap themselves
 * in another DashboardLayout, AppShell, or similar layout component. This layout 
 * already provides that structure. Pages should only return their main content 
 * wrapped in appropriate padding/containers.
 * 
 * ✅ CORRECT Pattern:
 * ```tsx
 * export default function OperatorSubPage() {
 *   return (
 *     <div className="p-6">
 *       <h1>Page Title</h1>
 *       // Page content
 *     </div>
 *   );
 * }
 * ```
 * 
 * ❌ WRONG Pattern (creates double sidebar):
 * ```tsx
 * export default function OperatorSubPage() {
 *   return (
 *     <DashboardLayout> // DON'T DO THIS!
 *       <div className="p-6">
 *         <h1>Page Title</h1>
 *         // Page content
 *       </div>
 *     </DashboardLayout>
 *   );
 * }
 * ```
 */

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout title="Operator" showSearch={false}>
      {children}
    </DashboardLayout>
  );
}
