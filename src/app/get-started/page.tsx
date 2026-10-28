'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Role = 'family' | 'operator' | 'caregiver' | null;
type Need = 'find-home' | 'understand-options' | 'urgent' | 'costs' | null;
type Timeline = 'now' | '1-3months' | '3-6months' | 'researching' | null;

const STEPS = ['Who are you?', 'What do you need?', 'What\'s your timeline?'];

export default function GetStartedPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>(null);
  const [need, setNeed] = useState<Need>(null);
  const [timeline, setTimeline] = useState<Timeline>(null);

  const progress = ((step) / STEPS.length) * 100;

  const handleRole = (r: Role) => { setRole(r); if (r !== 'family') return; setStep(1); };
  const handleNeed = (n: Need) => { setNeed(n); setStep(2); };

  const handleTimeline = (t: Timeline) => {
    setTimeline(t);
    // Build destination URL based on answers
    let dest = '/search';
    if (need === 'understand-options') dest = '/learn';
    else if (need === 'costs') dest = '/learn/guides/assisted-living-cost-guide';
    else if (need === 'urgent' || t === 'now') dest = '/search?urgent=true';
    router.push(dest);
  };

  // Non-family roles redirect immediately
  if (role === 'operator') { router.push('/operator'); return null; }
  if (role === 'caregiver') { router.push('/shifts'); return null; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-neutral-400 mb-2">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? 'text-primary-600 font-medium' : ''}>{s}</span>
            ))}
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step 0: Role */}
        {step === 0 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 text-center">Welcome to CareLinkAI</h1>
            <p className="text-neutral-500 text-center mb-8">Let's help you find exactly what you need. Who are you?</p>
            <div className="space-y-3">
              {[
                { id: 'family' as Role, icon: '👨‍👩‍👧', label: 'A family member or caregiver', sub: 'Looking for care options for a parent or loved one' },
                { id: 'operator' as Role, icon: '🏡', label: 'An assisted living operator', sub: 'Managing homes, staff, and residents' },
                { id: 'caregiver' as Role, icon: '👩‍⚕️', label: 'A caregiver or aide', sub: 'Looking for shifts or employment opportunities' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleRole(opt.id)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-neutral-200 hover:border-primary-400 hover:shadow-md transition-all text-left"
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <p className="font-semibold text-neutral-900">{opt.label}</p>
                    <p className="text-sm text-neutral-500">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Need */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2 text-center">What are you trying to do?</h2>
            <p className="text-neutral-500 text-center mb-8">We'll point you to exactly the right resources.</p>
            <div className="space-y-3">
              {[
                { id: 'find-home' as Need, icon: '🔍', label: 'Find an assisted living home', sub: 'Browse and compare homes near me' },
                { id: 'understand-options' as Need, icon: '📚', label: 'Understand my options first', sub: 'I\'m new to senior care and need to learn the basics' },
                { id: 'urgent' as Need, icon: '⚡', label: 'I need help urgently', sub: 'Hospital discharge, sudden change in needs, or safety concern' },
                { id: 'costs' as Need, icon: '💰', label: 'Understand costs and funding', sub: 'Medicare, Medicaid, veterans benefits, and pricing' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleNeed(opt.id)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-neutral-200 hover:border-primary-400 hover:shadow-md transition-all text-left"
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <p className="font-semibold text-neutral-900">{opt.label}</p>
                    <p className="text-sm text-neutral-500">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(0)} className="mt-4 text-sm text-neutral-400 hover:text-neutral-600 w-full text-center">← Back</button>
          </div>
        )}

        {/* Step 2: Timeline */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2 text-center">What's your timeline?</h2>
            <p className="text-neutral-500 text-center mb-8">This helps us show you what's available now vs. what to plan for.</p>
            <div className="space-y-3">
              {[
                { id: 'now' as Timeline, icon: '🚨', label: 'Right now / this week', sub: 'Immediate placement needed' },
                { id: '1-3months' as Timeline, icon: '📅', label: 'Within 1–3 months', sub: 'Planning ahead but moving soon' },
                { id: '3-6months' as Timeline, icon: '🗓️', label: '3–6 months from now', sub: 'Time to research and tour carefully' },
                { id: 'researching' as Timeline, icon: '🔭', label: 'Just researching for now', sub: 'No immediate urgency — learning the landscape' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleTimeline(opt.id)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-neutral-200 hover:border-primary-400 hover:shadow-md transition-all text-left"
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <p className="font-semibold text-neutral-900">{opt.label}</p>
                    <p className="text-sm text-neutral-500">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-4 text-sm text-neutral-400 hover:text-neutral-600 w-full text-center">← Back</button>
          </div>
        )}

        {/* Bottom link */}
        <p className="text-center text-sm text-neutral-400 mt-8">
          Already know what you need?{' '}
          <Link href="/search" className="text-primary-600 hover:underline">Browse homes directly →</Link>
        </p>
      </div>
    </div>
  );
}
