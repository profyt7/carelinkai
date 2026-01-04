"use client";

import { ReactNode } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface OperatorLayoutProps {
  children: ReactNode;
}

export default function OperatorLayout({ children }: OperatorLayoutProps) {
  return (
    <DashboardLayout title="Operator">
      {children}
    </DashboardLayout>
  );
}
