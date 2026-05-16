"use client";

import { ReactNode } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AcceptanceGate } from "@/components/operator/AcceptanceGate";

interface OperatorLayoutProps {
  children: ReactNode;
}

export default function OperatorLayout({ children }: OperatorLayoutProps) {
  return (
    <AcceptanceGate>
      <DashboardLayout title="Operator">
        {children}
      </DashboardLayout>
    </AcceptanceGate>
  );
}
