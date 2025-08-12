'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function FamilyPage() {
  return (
    <DashboardLayout title="Family Collaboration">
      <div className="space-y-6">
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
          <h1 className="text-2xl font-bold md:text-3xl">Family Collaboration</h1>
          <p className="mt-1 text-primary-100">Temporary scaffold while we restore full functionality.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-md border bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-lg font-semibold">Documents</h2>
            <p className="text-sm text-gray-600">
              Document list, viewer, comments, and @mentions will return here shortly.
            </p>
          </div>
          <div className="rounded-md border bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Details</h2>
            <p className="text-sm text-gray-600">Sidebar content temporarily disabled.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}