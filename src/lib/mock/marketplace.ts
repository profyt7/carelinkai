export type Caregiver = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  hourlyRate: number | null;
  yearsExperience: number | null;
  specialties: string[];
  bio: string | null;
  photoUrl: string | null;
  backgroundCheckStatus: string;
  distanceMiles?: number;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  city: string | null;
  state: string | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  createdAt: string;
  status?: string;
  applicationCount?: number;
  hireCount?: number;
  distanceMiles?: number;
  appliedByMe?: boolean;
};

export type Provider = {
  id: string;
  name: string;
  city: string;
  state: string;
  services: string[];
  hourlyRate: number | null;
  perMileRate: number | null;
  ratingAverage: number;
  reviewCount: number;
  badges: string[];
  distanceMiles?: number;
  description?: string;
  coverageRadius?: number;
  availableHours?: string;
};

export const MOCK_CATEGORIES: Record<string, { slug: string; name: string }[]> = {
  SERVICE: [
    { slug: "transportation", name: "Transportation" },
    { slug: "meal-prep", name: "Meal Prep" },
    { slug: "housekeeping", name: "Housekeeping" },
    { slug: "companionship", name: "Companionship" },
    { slug: "medication-management", name: "Medication Management" },
  ],
  CARE_TYPE: [
    { slug: "assisted-living", name: "Assisted Living" },
    { slug: "memory-care", name: "Memory Care" },
    { slug: "skilled-nursing", name: "Skilled Nursing" },
    { slug: "in-home-care", name: "In-Home Care" },
  ],
  SPECIALTY: [
    { slug: "dementia", name: "Dementia" },
    { slug: "parkinsons", name: "Parkinson's" },
    { slug: "alzheimers", name: "Alzheimer's" },
    { slug: "mobility", name: "Mobility Support" },
    { slug: "wound-care", name: "Wound Care" },
    { slug: "companionship", name: "Companionship" },
    { slug: "medication-management", name: "Medication Management" },
  ],
  SETTING: [
    { slug: "in-home", name: "In-Home" },
    { slug: "facility", name: "Facility" },
    { slug: "respite", name: "Respite" },
  ],
};

export const MOCK_CAREGIVERS: Caregiver[] = [
  { id: "cg_1", name: "Ava Johnson", city: "Seattle", state: "WA", hourlyRate: 28, yearsExperience: 5, specialties: ["dementia","medication-management","companionship"], bio: "Experienced caregiver focused on dignity and independence.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 2.3 },
  { id: "cg_2", name: "Noah Williams", city: "Bellevue", state: "WA", hourlyRate: 25, yearsExperience: 3, specialties: ["companionship"], bio: "Friendly and reliable with flexible evenings/weekends.", photoUrl: null, backgroundCheckStatus: "PENDING", distanceMiles: 7.8 },
  { id: "cg_3", name: "Sophia Martinez", city: "Redmond", state: "WA", hourlyRate: 32, yearsExperience: 7, specialties: ["memory-care","dementia"], bio: "Memory care specialist with a calm, supportive approach.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 12.1 },
  { id: "cg_4", name: "Liam Smith", city: "Kirkland", state: "WA", hourlyRate: 27, yearsExperience: 4, specialties: ["companionship","mobility"], bio: "Patient and attentive, great with mobility support.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 5.2 },
  { id: "cg_5", name: "Olivia Brown", city: "Tacoma", state: "WA", hourlyRate: 29, yearsExperience: 6, specialties: ["medication-management","companionship"], bio: "Medication reminders and compassionate companionship.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 28.6 },
  { id: "cg_6", name: "Ethan Davis", city: "Lynnwood", state: "WA", hourlyRate: 24, yearsExperience: 2, specialties: ["companionship"], bio: "Great conversationalist, enjoys walks and board games.", photoUrl: null, backgroundCheckStatus: "PENDING", distanceMiles: 14.4 },
  { id: "cg_7", name: "Mia Garcia", city: "Renton", state: "WA", hourlyRate: 31, yearsExperience: 8, specialties: ["alzheimers","medication-management"], bio: "Alzheimer's experience with focus on routines and safety.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 10.9 },
  { id: "cg_8", name: "James Miller", city: "Seattle", state: "WA", hourlyRate: 26, yearsExperience: 3, specialties: ["transportation","companionship"], bio: "Safe driver with reliable transportation.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 3.9 },
  { id: "cg_9", name: "Charlotte Wilson", city: "Bellevue", state: "WA", hourlyRate: 33, yearsExperience: 9, specialties: ["wound-care","medication-management"], bio: "Clinical background with wound care experience.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 8.7 },
  { id: "cg_10", name: "Benjamin Moore", city: "Issaquah", state: "WA", hourlyRate: 23, yearsExperience: 2, specialties: ["companionship"], bio: "College student caregiver with flexible hours.", photoUrl: null, backgroundCheckStatus: "PENDING", distanceMiles: 18.2 },
  { id: "cg_11", name: "Amelia Taylor", city: "Shoreline", state: "WA", hourlyRate: 30, yearsExperience: 6, specialties: ["medication-management","mobility"], bio: "Detail-oriented caregiver, strong communication.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 9.4 },
  { id: "cg_12", name: "Lucas Anderson", city: "Seattle", state: "WA", hourlyRate: 34, yearsExperience: 10, specialties: ["dementia","alzheimers"], bio: "Decade of experience in memory care settings.", photoUrl: null, backgroundCheckStatus: "CLEAR", distanceMiles: 1.8 },
];

export const MOCK_LISTINGS: Listing[] = [
  { id: "job_1", title: "Evening Companion Needed", description: "Seeking a kind caregiver for light conversation, walks, and meal prep.", city: "Seattle", state: "WA", hourlyRateMin: 22, hourlyRateMax: 28, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 3, hireCount: 0, distanceMiles: 3.4, appliedByMe: false },
  { id: "job_2", title: "Overnight Care (Fri-Sun)", description: "Provide overnight support and safety checks for an elder with mild dementia.", city: "Kirkland", state: "WA", hourlyRateMin: 25, hourlyRateMax: 30, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 8, hireCount: 1, distanceMiles: 9.1, appliedByMe: false },
  { id: "job_3", title: "Transportation to Appointments", description: "Help with weekly appointments and occasional errands.", city: "Bellevue", state: "WA", hourlyRateMin: 20, hourlyRateMax: 24, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 1, hireCount: 0, distanceMiles: 6.0, appliedByMe: false },
  { id: "job_4", title: "Weekend Respite Care", description: "Relief for primary caregiver; companionship and safety checks.", city: "Seattle", state: "WA", hourlyRateMin: 24, hourlyRateMax: 28, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 2, hireCount: 0, distanceMiles: 4.5, appliedByMe: false },
  { id: "job_5", title: "Meal Prep and Light Housekeeping", description: "Looking for help with healthy meals and tidying up.", city: "Redmond", state: "WA", hourlyRateMin: 21, hourlyRateMax: 25, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 5, hireCount: 0, distanceMiles: 11.0, appliedByMe: false },
  { id: "job_6", title: "Memory Care Companion", description: "Engaging activities and gentle reminders for memory support.", city: "Bellevue", state: "WA", hourlyRateMin: 26, hourlyRateMax: 32, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 4, hireCount: 1, distanceMiles: 7.2, appliedByMe: false },
  { id: "job_7", title: "Post-Op Support (2 weeks)", description: "Assistance with ADLs during recovery period.", city: "Renton", state: "WA", hourlyRateMin: 27, hourlyRateMax: 33, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 6, hireCount: 1, distanceMiles: 10.5, appliedByMe: false },
  { id: "job_8", title: "Morning Routine Help", description: "Help with getting ready for the day, light exercise.", city: "Lynnwood", state: "WA", hourlyRateMin: 22, hourlyRateMax: 26, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 1, hireCount: 0, distanceMiles: 14.0, appliedByMe: false },
  { id: "job_9", title: "Overnight Safety Check", description: "Quiet overnight presence for peace of mind.", city: "Tacoma", state: "WA", hourlyRateMin: 25, hourlyRateMax: 30, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 0, hireCount: 0, distanceMiles: 28.1, appliedByMe: false },
  { id: "job_10", title: "Transportation + Companionship", description: "Drive to senior center and accompany for social time.", city: "Seattle", state: "WA", hourlyRateMin: 23, hourlyRateMax: 27, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 3, hireCount: 0, distanceMiles: 2.8, appliedByMe: false },
  { id: "job_11", title: "Weekend Live-In (Trial)", description: "Short-term live-in trial weekend with private room.", city: "Shoreline", state: "WA", hourlyRateMin: 28, hourlyRateMax: 36, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 2, hireCount: 0, distanceMiles: 9.7, appliedByMe: false },
  { id: "job_12", title: "Medication Reminders", description: "Daily check-ins for medication adherence.", city: "Seattle", state: "WA", hourlyRateMin: 20, hourlyRateMax: 23, createdAt: new Date().toISOString(), status: "OPEN", applicationCount: 4, hireCount: 0, distanceMiles: 3.1, appliedByMe: false },
];

export const MOCK_PROVIDERS: Provider[] = [
  { id: "pr_1", name: "CarePlus Transport", city: "Seattle", state: "WA", services: ["transportation"], hourlyRate: 40, perMileRate: 1.5, ratingAverage: 4.7, reviewCount: 58, badges: ["Licensed","Insured"], distanceMiles: 4.2, description: "Non-emergency medical transportation across King County.", coverageRadius: 30, availableHours: "Mon–Sun 6am–10pm" },
  { id: "pr_2", name: "Comfort Meals Co.", city: "Redmond", state: "WA", services: ["meal-prep","housekeeping"], hourlyRate: 35, perMileRate: null, ratingAverage: 4.5, reviewCount: 31, badges: ["Background Checked"], distanceMiles: 11.3, description: "Healthy meal preparation and light housekeeping.", coverageRadius: 20, availableHours: "Mon–Fri 8am–6pm" },
  { id: "pr_3", name: "CityCare Housekeeping", city: "Seattle", state: "WA", services: ["housekeeping"], hourlyRate: 30, perMileRate: null, ratingAverage: 4.3, reviewCount: 22, badges: ["Insured"], distanceMiles: 5.6, description: "Home cleaning tailored for seniors.", coverageRadius: 25, availableHours: "Mon–Sat 8am–5pm" },
  { id: "pr_4", name: "Northwest Rides", city: "Bellevue", state: "WA", services: ["transportation"], hourlyRate: 42, perMileRate: 1.7, ratingAverage: 4.6, reviewCount: 40, badges: ["Licensed"], distanceMiles: 9.0, description: "Comfortable wheelchair-accessible vans.", coverageRadius: 35, availableHours: "Mon–Sun 7am–9pm" },
  { id: "pr_5", name: "HomeChef Helpers", city: "Kirkland", state: "WA", services: ["meal-prep"], hourlyRate: 33, perMileRate: null, ratingAverage: 4.2, reviewCount: 15, badges: [], distanceMiles: 8.5, description: "Weekly meal plans and grocery assistance.", coverageRadius: 15, availableHours: "Mon–Fri 9am–5pm" },
  { id: "pr_6", name: "FreshStart Housekeeping", city: "Renton", state: "WA", services: ["housekeeping"], hourlyRate: 28, perMileRate: null, ratingAverage: 4.1, reviewCount: 18, badges: [], distanceMiles: 12.7, description: "Light housekeeping with attention to detail.", coverageRadius: 18, availableHours: "Mon–Sat 9am–4pm" },
  { id: "pr_7", name: "CareRide", city: "Shoreline", state: "WA", services: ["transportation"], hourlyRate: 39, perMileRate: 1.4, ratingAverage: 4.8, reviewCount: 65, badges: ["Licensed","Insured"], distanceMiles: 10.2, description: "On-time, caring transportation for seniors.", coverageRadius: 28, availableHours: "Mon–Sun 6am–8pm" },
  { id: "pr_8", name: "MealMates", city: "Lynnwood", state: "WA", services: ["meal-prep"], hourlyRate: 31, perMileRate: null, ratingAverage: 4.0, reviewCount: 12, badges: [], distanceMiles: 14.8, description: "Affordable home-cooked meals.", coverageRadius: 12, availableHours: "Mon–Fri 10am–6pm" },
];

export function getMockCaregiverById(id: string) {
  return MOCK_CAREGIVERS.find(c => c.id === id) || null;
}

/**
 * Get mock caregiver detail (for /marketplace/caregivers/[id] page)
 * Returns full detail object matching the structure expected by the detail page
 */
export function getMockCaregiverDetail(id: string) {
  const caregiver = getMockCaregiverById(id);
  if (!caregiver) return null;

  // Generate a mock userId (for messaging deep-links)
  const userId = `user_${id}`;

  // Generate mock credentials (2-3 per caregiver)
  const credentials = [];
  if (caregiver.backgroundCheckStatus === 'CLEAR') {
    credentials.push({
      id: `cred_${id}_1`,
      type: 'CNA',
      issueDate: new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 years ago
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      isVerified: true,
    });
    credentials.push({
      id: `cred_${id}_2`,
      type: 'CPR',
      issueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
      expirationDate: new Date(Date.now() + 548 * 24 * 60 * 60 * 1000).toISOString(), // 18 months from now
      isVerified: true,
    });
  }

  // Generate mock availability slots for next 7 days
  const availabilitySlots = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const slotDate = new Date(today);
    slotDate.setDate(today.getDate() + i);
    
    // Morning slot
    const morningStart = new Date(slotDate);
    morningStart.setHours(9, 0, 0, 0);
    const morningEnd = new Date(slotDate);
    morningEnd.setHours(12, 0, 0, 0);
    
    // Afternoon slot (every other day)
    if (i % 2 === 0) {
      const afternoonStart = new Date(slotDate);
      afternoonStart.setHours(14, 0, 0, 0);
      const afternoonEnd = new Date(slotDate);
      afternoonEnd.setHours(18, 0, 0, 0);
      
      availabilitySlots.push({
        id: `slot_${id}_${i}_afternoon`,
        startTime: afternoonStart.toISOString(),
        endTime: afternoonEnd.toISOString(),
      });
    }
    
    availabilitySlots.push({
      id: `slot_${id}_${i}_morning`,
      startTime: morningStart.toISOString(),
      endTime: morningEnd.toISOString(),
    });
  }

  // Generate badges
  const badges: string[] = [];
  if (caregiver.backgroundCheckStatus === 'CLEAR') {
    badges.push('Background Check Clear');
  }
  if (caregiver.yearsExperience && caregiver.yearsExperience >= 5) {
    badges.push('Experienced Professional');
  }
  if (credentials.length >= 2) {
    badges.push('Certified');
  }

  // Calculate mock ratings
  const baseRating = caregiver.backgroundCheckStatus === 'CLEAR' ? 4.5 : 3.8;
  const experienceBonus = Math.min((caregiver.yearsExperience || 0) * 0.05, 0.5);
  const ratingAverage = Math.min(baseRating + experienceBonus, 5.0);
  const reviewCount = Math.floor((caregiver.yearsExperience || 1) * 3.5);

  return {
    id: caregiver.id,
    userId,
    name: caregiver.name,
    city: caregiver.city,
    state: caregiver.state,
    hourlyRate: caregiver.hourlyRate,
    yearsExperience: caregiver.yearsExperience,
    specialties: caregiver.specialties,
    bio: caregiver.bio,
    photoUrl: caregiver.photoUrl,
    backgroundCheckStatus: caregiver.backgroundCheckStatus,
    ratingAverage,
    reviewCount,
    badges,
    credentials,
    availabilitySlots,
  };
}

export function getMockListingById(id: string) {
  return MOCK_LISTINGS.find(l => l.id === id) || null;
}

export function getMockProviderById(id: string) {
  return MOCK_PROVIDERS.find(p => p.id === id) || null;
}
