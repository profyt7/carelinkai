"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout title="Provider" showSearch={false}>
      {children}
    </DashboardLayout>
  );
}
