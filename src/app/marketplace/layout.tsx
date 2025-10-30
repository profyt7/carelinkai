 "use client";

 import React from "react";
 import DashboardLayout from "@/components/layout/DashboardLayout";

 export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
   return <DashboardLayout title="Marketplace">{children}</DashboardLayout>;
 }
