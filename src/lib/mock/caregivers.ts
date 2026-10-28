export type MockCaregiver = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  hourlyRate?: number | null;
  yearsExperience?: number | null;
  specialties: string[];
  bio?: string | null;
  backgroundCheckStatus?: 'PENDING' | 'CLEAR' | 'FLAGGED';
  photoUrl?: string | null;
};

const mockCaregivers: MockCaregiver[] = [
  {
    id: 'cg_alex_johnson',
    name: 'Alex Johnson, CNA',
    city: 'Columbus',
    state: 'OH',
    hourlyRate: 28,
    yearsExperience: 6,
    specialties: ['memory-care', 'adl-support'],
    bio: 'Certified Nursing Assistant with 6+ years experience in memory care and ADL support. Compassionate and dependable.',
    backgroundCheckStatus: 'CLEAR',
    photoUrl: 'https://randomuser.me/api/portraits/men/12.jpg',
  },
  {
    id: 'cg_sophia_lee',
    name: 'Sophia Lee, HHA',
    city: 'Austin',
    state: 'TX',
    hourlyRate: 24,
    yearsExperience: 4,
    specialties: ['companionship', 'transport'],
    bio: 'Home health aide focused on companionship, medication reminders, and safe transport.',
    backgroundCheckStatus: 'CLEAR',
    photoUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
  },
  {
    id: 'cg_michael_brown',
    name: 'Michael Brown, LPN',
    city: 'Tampa',
    state: 'FL',
    hourlyRate: 36,
    yearsExperience: 8,
    specialties: ['med-management', 'wound-care'],
    bio: 'Licensed Practical Nurse with experience in medication management and wound care in assisted living settings.',
    backgroundCheckStatus: 'CLEAR',
    photoUrl: 'https://randomuser.me/api/portraits/men/28.jpg',
  },
];

export function getMockCaregiverById(id: string): MockCaregiver | null {
  return mockCaregivers.find((c) => c.id === id) || null;
}

export function listMockCaregivers(): MockCaregiver[] {
  return mockCaregivers;
}
