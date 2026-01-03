"use client";

import { ReactNode } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SentryTestButton from "@/components/debug/SentryTestButton";

interface OperatorLayoutProps {
  children: ReactNode;
}

export default function OperatorLayout({ children }: OperatorLayoutProps) {
  return (
    <DashboardLayout title="Operator">
      {children}
      {/* Debug tools - only shown in development or when explicitly enabled */}
      <SentryTestButton />
    </DashboardLayout>
  );
}
