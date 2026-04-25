import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Family Education Hub | CareLinkAI',
  description:
    'Free guides and resources to help families find the right assisted living home, understand care costs, and navigate senior care with confidence.',
};

const GUIDES = [
  {
    slug: 'how-to-choose-assisted-living',
    title: 'How to Choose an Assisted Living Home',
    description:
      'A step-by-step guide to evaluating homes, asking the right questions, and making a confident decision for your loved one.',
    readTime: '8 min read',
    category: 'Getting Started',
    icon: '🏠',
  },
  {
    slug: 'assisted-living-cost-guide',
    title: 'Understanding Assisted Living Costs in 2026',
    description:
      'What you will actually pay, what is covered, and how to use Medicare, Medicaid, and long-term care insurance to offset costs.',
    readTime: '6 min read',
    category: 'Finances',
    icon: '💰',
  },
  {
    slug: 'memory-care-vs-assisted-living',
    title: 'Memory Care vs. Assisted Living: What is the Difference?',
    description:
      'How to tell when a loved one with dementia needs memory care, and what to look for in a specialized facility.',
    readTime: '5 min read',
    category: 'Care Types',
    icon: '🧠',
  },
  {
    slug: 'assisted-living-tour-checklist',
    title: 'The Assisted Living Tour Checklist',
    description:
      'Print this before your visit. 30 questions to ask, 10 red flags to watch for, and what to observe when nobody is guiding you.',
    readTime: '4 min read',
    category: 'Touring',
    icon: '✅',
  },
  {
    slug: 'transitioning-parent-to-assisted-living',
    title: 'How to Help a Parent Transition to Assisted Living',
    description:
      'The emotional, logistical, and practical steps to make the move as smooth as possible — for them and for you.',
    readTime: '7 min read',
    category: 'Transitions',
    icon: '❤️',
  },
  {
    slug: 'discharge-planning-hospital-guide',
    title: 'Hospital to Assisted Living: A Discharge Planning Guide',
    description:
      'What happens when a family member is discharged from a hospital or rehab facility and needs ongoing care. Who pays, and how fast do you need to move?',
    readTime: '6 min read',
    category: 'Discharge Planning',
    icon: '🏥',
  },
  {
    slug: 'caregiver-hiring-guide',
    title: 'How to Hire a Home Caregiver in Cleveland',
    description:
      'When an assisted living home is not the right fit yet, hiring an in-home caregiver can bridge the gap. Here is what to know.',
    readTime: '5 min read',
    category: 'Caregivers',
    icon: '👩‍⚕️',
  },
];

const CATEGORIES = [...new Set(GUIDES.map((g) => g.category))];

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
            Free Family Resources
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">
            The CareLinkAI Family Education Hub
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Honest, practical guides to help Cleveland-area families navigate senior care — from first conversations to move-in day.
          </p>
        </div>
      </div>

      {/* Guides grid */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/learn/guides/${guide.slug}`}
              className="group bg-white rounded-xl border border-neutral-200 p-6 hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{guide.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {guide.category}
                    </span>
                    <span className="text-xs text-neutral-400">{guide.readTime}</span>
                  </div>
                  <h2 className="font-semibold text-neutral-900 mb-2 group-hover:text-primary-700 transition-colors">
                    {guide.title}
                  </h2>
                  <p className="text-sm text-neutral-500 leading-relaxed">{guide.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Lead magnet CTA */}
        <div className="mt-12 bg-primary-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Get the Complete Senior Care Toolkit</h2>
          <p className="text-primary-100 mb-6">
            All 7 guides + a printable tour checklist + a cost comparison worksheet — free as a PDF.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            Start Your Home Search
          </Link>
          <p className="text-primary-200 text-sm mt-3">No email required to search</p>
        </div>
      </div>
    </div>
  );
}
