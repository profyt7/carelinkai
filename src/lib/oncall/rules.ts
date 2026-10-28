export interface OnCallRules {
  priority_weights: {
    credentials_match: number;
    skills_overlap: number;
    proximity_km: number;
    reliability_score: number;
    experience_months: number;
    hourly_rate: number;
    bg_check: number;
  };
  eligibility: {
    max_proximity_km: number;
    require_credentials: boolean;
    require_bg_clear: boolean;
  };
  contact_strategy: {
    parallel_batch: number;
    wave_cooldown_minutes: number;
    max_waves: number;
    channels: ('SMS' | 'VOICE' | 'EMAIL')[];
    confirm_keywords: string[];
    decline_keywords: string[];
  };
}

export const defaultRules: OnCallRules = {
  priority_weights: {
    credentials_match: 5,
    skills_overlap: 4,
    proximity_km: 3,
    reliability_score: 4,
    experience_months: 2,
    hourly_rate: 1,
    bg_check: 5,
  },
  eligibility: {
    max_proximity_km: 50,
    require_credentials: false,
    require_bg_clear: false,
  },
  contact_strategy: {
    parallel_batch: 8,
    wave_cooldown_minutes: 10,
    max_waves: 3,
    channels: ['SMS'],
    confirm_keywords: ['YES', 'Y', 'ACCEPT', '1'],
    decline_keywords: ['NO', 'N', 'DECLINE', '2'],
  },
};

export function loadRules(): OnCallRules {
  return defaultRules;
}
