/**
 * Discharge Planner Dashboard
 * Main landing page for social workers and case managers
 */

import { Metadata } from "next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DischargePlannerDashboard from "./_components/DischargePlannerDashboard";

export const metadata: Metadata = {
  title: "Discharge Planner Dashboard | CareLinkAI",
  description: "AI-powered placement assistance for social workers and case managers",
};

export default function DischargePlannerPage() {
  return (
    <DashboardLayout title="Discharge Planner Dashboard" showSearch={false}>
      <DischargePlannerDashboard />
    </DashboardLayout>
  );
}
