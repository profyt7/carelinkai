'use client';

import Link from 'next/link';
import { FiUser, FiMail, FiLock, FiExternalLink } from 'react-icons/fi';

interface PersonaCard {
  name: string;
  role: string;
  email: string;
  password: string;
  description: string;
  keyUrls: Array<{ label: string; url: string }>;
  bgColor: string;
  textColor: string;
}

const personas: PersonaCard[] = [
  {
    name: 'Family Member',
    role: 'FAMILY',
    email: 'demo.family@carelinkai.test',
    password: 'DemoUser123!',
    description: 'Jennifer Martinez looking for care for her mother with early-stage Alzheimer\'s',
    keyUrls: [
      { label: 'Family Profile & Care Context', url: '/settings/family' },
      { label: 'Browse Caregivers', url: '/marketplace/aides' },
      { label: 'Browse Providers', url: '/marketplace/providers' },
      { label: 'View Favorites', url: '/favorites' },
      { label: 'Messages', url: '/messages' },
    ],
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    name: 'Operator',
    role: 'OPERATOR',
    email: 'demo.operator@carelinkai.test',
    password: 'DemoUser123!',
    description: 'Michael Chen managing leads and coordinating care matches',
    keyUrls: [
      { label: 'Lead Management Dashboard', url: '/operator/leads' },
      { label: 'Messages & Conversations', url: '/messages' },
      { label: 'Dashboard Overview', url: '/dashboard' },
    ],
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  {
    name: 'Aide/Caregiver',
    role: 'CAREGIVER',
    email: 'demo.aide@carelinkai.test',
    password: 'DemoUser123!',
    description: 'Sarah Thompson with 7 years experience in Alzheimer\'s care',
    keyUrls: [
      { label: 'Caregiver Profile', url: '/settings/aide' },
      { label: 'Credentials & Certifications', url: '/settings/credentials' },
      { label: 'Messages & Inquiries', url: '/messages' },
      { label: 'Dashboard', url: '/dashboard' },
    ],
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  {
    name: 'Provider',
    role: 'PROVIDER',
    email: 'demo.provider@carelinkai.test',
    password: 'DemoUser123!',
    description: 'Robert Williams from Golden Years Home Care with 15 years in business',
    keyUrls: [
      { label: 'Provider Profile', url: '/settings/provider' },
      { label: 'Credentials & Licenses', url: '/settings/credentials' },
      { label: 'Messages & Inquiries', url: '/messages' },
      { label: 'Dashboard', url: '/dashboard' },
    ],
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  {
    name: 'Admin',
    role: 'ADMIN',
    email: 'demo.admin@carelinkai.test',
    password: 'DemoUser123!',
    description: 'Platform administrator with full access to verification and management tools',
    keyUrls: [
      { label: 'Provider Management', url: '/admin/providers' },
      { label: 'Caregiver Management', url: '/admin/aides' },
      { label: 'Dashboard', url: '/dashboard' },
    ],
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
];

export default function DemoPortalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CareLinkAI Demo Portal
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Internal demo portal - use these accounts for live walkthroughs with ALFs, agencies, and investors.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg">
            <FiLock className="text-blue-700" />
            <span className="text-sm text-blue-700 font-medium">
              All accounts use password: <code className="font-mono bg-blue-200 px-2 py-1 rounded">DemoUser123!</code>
            </span>
          </div>
        </div>

        {/* Persona Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((persona) => (
            <div
              key={persona.email}
              className={`${persona.bgColor} border-2 border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden`}
            >
              {/* Card Header */}
              <div className="px-6 py-5 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`${persona.textColor} p-2 rounded-lg bg-white border border-gray-200`}>
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{persona.name}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${persona.textColor} ${persona.bgColor}`}>
                      {persona.role}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{persona.description}</p>
              </div>

              {/* Card Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Credentials */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <FiMail className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium mb-1">Email</p>
                      <p className="text-sm text-gray-900 font-mono break-all">{persona.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiLock className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium mb-1">Password</p>
                      <p className="text-sm text-gray-900 font-mono">{persona.password}</p>
                    </div>
                  </div>
                </div>

                {/* Login Button */}
                <Link
                  href="/auth/login"
                  className={`block w-full text-center px-4 py-3 ${persona.textColor} ${persona.bgColor} border-2 border-current rounded-lg font-semibold hover:bg-white transition-colors duration-200`}
                >
                  Login as {persona.name}
                </Link>

                {/* Key URLs */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Demo URLs:</h4>
                  <ul className="space-y-1.5">
                    {persona.keyUrls.map((link) => (
                      <li key={link.url}>
                        <Link
                          href={link.url}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:underline group"
                        >
                          <FiExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <div className="inline-block px-6 py-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">📚 Demo Resources</h3>
            <p className="text-sm text-gray-600 max-w-2xl">
              For a scripted walkthrough guide, see <code className="font-mono bg-gray-100 px-2 py-1 rounded">docs/DEMO_FLOW.md</code>.
              For account details, see <code className="font-mono bg-gray-100 px-2 py-1 rounded">docs/DEMO_ACCOUNTS.md</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
