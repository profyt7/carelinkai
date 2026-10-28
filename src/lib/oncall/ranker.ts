import { kmBetween } from '@/lib/geo/haversine';
import type { OnCallRules } from './rules';

export interface CaregiverCandidate {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  specialties: string[];
  careTypes: string[];
  backgroundCheckStatus: string;
  reliabilityScore: number | null;
  yearsExperience: number | null;
  hourlyRate: number | null;
  homeLat: number | null;
  homeLng: number | null;
}

export interface RankedCandidate extends CaregiverCandidate {
  score: number;
  proximityKm: number | null;
}

export function rankCandidates(
  candidates: CaregiverCandidate[],
  requiredCerts: string[],
  requiredSkills: string[],
  homeLat: number | null,
  homeLng: number | null,
  rules: OnCallRules,
): RankedCandidate[] {
  const reqCertSet = new Set(requiredCerts.map((s) => s.toLowerCase()));
  const reqSkillSet = new Set(requiredSkills.map((s) => s.toLowerCase()));

  const scored = candidates.map((cg) => {
    const cgSkills = new Set([...cg.specialties, ...cg.careTypes].map((s) => s.toLowerCase()));
    const skillOverlap = reqSkillSet.size > 0
      ? [...reqSkillSet].filter((s) => cgSkills.has(s)).length / reqSkillSet.size
      : 1;

    const certMatch = reqCertSet.size > 0
      ? [...reqCertSet].every((c) => cgSkills.has(c)) ? 1 : 0
      : 1;

    const bgScore = cg.backgroundCheckStatus === 'CLEAR' ? 1
      : cg.backgroundCheckStatus === 'PENDING' ? 0.5
      : 0;

    let proximityKm: number | null = null;
    let proxScore = 0.5;
    if (homeLat != null && homeLng != null && cg.homeLat != null && cg.homeLng != null) {
      proximityKm = kmBetween(cg.homeLat, cg.homeLng, homeLat, homeLng);
      proxScore = Math.max(0, 1 - proximityKm / rules.eligibility.max_proximity_km);
    }

    if (rules.eligibility.require_credentials && certMatch === 0) return null;
    if (rules.eligibility.require_bg_clear && bgScore < 1) return null;

    const w = rules.priority_weights;
    const score =
      w.credentials_match * certMatch +
      w.skills_overlap * skillOverlap +
      w.proximity_km * proxScore +
      w.reliability_score * norm(cg.reliabilityScore ?? 50, 0, 100) +
      w.experience_months * norm((cg.yearsExperience ?? 0) * 12, 0, 120) +
      w.hourly_rate * (1 - norm(cg.hourlyRate ?? 25, 10, 60)) +
      w.bg_check * bgScore;

    return { ...cg, score, proximityKm };
  });

  return (scored.filter(Boolean) as RankedCandidate[]).sort((a, b) => b.score - a.score);
}

function norm(v: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}
