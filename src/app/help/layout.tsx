"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout title="Help & Support" showSearch={false}>
      {children}
    </DashboardLayout>
  );
}
