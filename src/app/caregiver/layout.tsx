"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout title="Caregiver" showSearch={false}>
      {children}
    </DashboardLayout>
  );
}
