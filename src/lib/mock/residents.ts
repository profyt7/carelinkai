export type MockResident = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  dateOfBirth?: string;
  admissionDate?: string | null;
  dischargeDate?: string | null;
  photoUrl?: string | null;
  careNeeds?: {
    roomNumber?: string;
    careLevel?: string;
    specialNotes?: string;
  };
  home?: { id: string; name: string } | null;
  familyId?: string;
  _count?: {
    assessments: number;
    incidents: number;
    caregiverAssignments: number;
  };
};

export const MOCK_RESIDENTS: MockResident[] = [
  { 
    id: 'res_1', 
    firstName: 'Alice', 
    lastName: 'Morgan', 
    status: 'ACTIVE',
    dateOfBirth: '1945-03-15',
    admissionDate: '2024-06-15',
    photoUrl: null,
    careNeeds: { roomNumber: '101A', careLevel: 'INTERMEDIATE', specialNotes: 'Requires assistance with mobility' },
    home: { id: 'home_1', name: 'Golden Meadows Care Home' },
    familyId: 'fam_1',
    _count: { assessments: 3, incidents: 1, caregiverAssignments: 2 }
  },
  { 
    id: 'res_2', 
    firstName: 'Benjamin', 
    lastName: 'Lee', 
    status: 'INQUIRY',
    dateOfBirth: '1938-07-22',
    admissionDate: null,
    photoUrl: null,
    careNeeds: { careLevel: 'MEMORY_CARE' },
    home: null,
    familyId: 'fam_2',
    _count: { assessments: 1, incidents: 0, caregiverAssignments: 0 }
  },
  { 
    id: 'res_3', 
    firstName: 'Carla', 
    lastName: 'Rodriguez', 
    status: 'ACTIVE',
    dateOfBirth: '1950-11-08',
    admissionDate: '2024-01-10',
    photoUrl: null,
    careNeeds: { roomNumber: '205B', careLevel: 'INDEPENDENT', specialNotes: 'Very social, enjoys group activities' },
    home: { id: 'home_2', name: 'Sunrise Senior Living' },
    familyId: 'fam_3',
    _count: { assessments: 5, incidents: 2, caregiverAssignments: 3 }
  },
];

export function getMockResident(id: string): MockResident | undefined {
  return MOCK_RESIDENTS.find(r => r.id === id);
}

export function getMockAssessments(id: string) {
  return {
    items: [
      { id: `${id}_asm_1`, type: 'ADL', score: 18, createdAt: new Date().toISOString(), notes: 'Patient shows improvement in daily activities' },
      { id: `${id}_asm_2`, type: 'Cognitive', score: 22, createdAt: new Date().toISOString(), notes: 'Regular cognitive exercises recommended' },
    ],
  };
}

export function getMockIncidents(id: string) {
  return {
    items: [
      { id: `${id}_inc_1`, type: 'Fall', severity: 'LOW', createdAt: new Date().toISOString(), description: 'Minor slip in hallway, no injuries' },
      { id: `${id}_inc_2`, type: 'Medication', severity: 'MEDIUM', createdAt: new Date().toISOString(), description: 'Missed afternoon medication dose' },
    ],
  };
}

export function getMockNotes(id: string) {
  return {
    items: [
      { id: `${id}_note_1`, content: 'Resident enjoyed music therapy session today. Very engaged and responsive.', createdAt: new Date().toISOString(), createdBy: { firstName: 'Sarah', lastName: 'Nurse' } },
      { id: `${id}_note_2`, content: 'Family visited on Sunday. Patient was in good spirits and ate well.', createdAt: new Date().toISOString(), createdBy: { firstName: 'John', lastName: 'Caregiver' } },
    ],
  };
}

export function getMockContacts(id: string) {
  return {
    items: [
      { id: `${id}_contact_1`, name: 'Mary Smith', relationship: 'Daughter', phone: '(555) 123-4567', email: 'mary.smith@email.com', isPrimary: true },
      { id: `${id}_contact_2`, name: 'John Smith', relationship: 'Son', phone: '(555) 987-6543', email: 'john.smith@email.com', isPrimary: false },
    ],
  };
}

export function getMockAppointments(residentId: string) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return [
    { 
      id: `${residentId}_apt_1`, 
      title: 'Physical Therapy Session', 
      startTime: tomorrow.toISOString(),
      type: 'MEDICAL_APPOINTMENT',
      location: { address: 'Therapy Room 1' }
    },
    { 
      id: `${residentId}_apt_2`, 
      title: 'Family Visit', 
      startTime: nextWeek.toISOString(),
      type: 'FAMILY_VISIT',
      location: { address: 'Community Room A' }
    },
  ];
}

export function getMockComplianceSummary(residentId: string) {
  return {
    openCount: 2,
    completedCount: 8,
    dueSoonCount: 1,
    overdueCount: 0,
  };
}
