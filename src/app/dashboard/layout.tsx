"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function FamilyDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout title="Dashboard" showSearch={false}>
      {children}
    </DashboardLayout>
  );
}
