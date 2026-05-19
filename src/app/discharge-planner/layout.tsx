"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AcceptanceGate } from "@/components/operator/AcceptanceGate";

export default function DischargePlannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AcceptanceGate>
      <DashboardLayout title="Discharge Planner" showSearch={false}>
        {children}
      </DashboardLayout>
    </AcceptanceGate>
  );
}
