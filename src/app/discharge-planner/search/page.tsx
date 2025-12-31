import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SearchInterface from './_components/SearchInterface';
import { Stethoscope } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Placement Search | Discharge Planner',
  description: 'Find the perfect assisted living home for your patient using AI-powered natural language search',
};

export default async function DischargePlannerSearchPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user?.role !== 'DISCHARGE_PLANNER') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Placement Search
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Describe your patient's needs in natural language, and our AI will find the most suitable assisted living homes
          </p>
        </div>

        {/* Search Interface */}
        <SearchInterface />
      </div>
    </div>
  );
}
