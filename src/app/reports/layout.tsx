"use client";

import { ReactNode } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface ReportsLayoutProps {
  children: ReactNode;
}

export default function ReportsLayout({ children }: ReportsLayoutProps) {
  return (
    <DashboardLayout title="Reports & Analytics">
      {children}
    </DashboardLayout>
  );
}
