"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DischargePlannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout title="Discharge Planner" showSearch={false}>
      {children}
    </DashboardLayout>
  );
}
