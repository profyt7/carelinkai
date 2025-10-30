export type MockResident = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
};

export const MOCK_RESIDENTS: MockResident[] = [
  { id: 'res_1', firstName: 'Alice', lastName: 'Morgan', status: 'ACTIVE' },
  { id: 'res_2', firstName: 'Benjamin', lastName: 'Lee', status: 'INQUIRY' },
  { id: 'res_3', firstName: 'Carla', lastName: 'Rodriguez', status: 'ACTIVE' },
];

export function getMockResident(id: string): MockResident | undefined {
  return MOCK_RESIDENTS.find(r => r.id === id);
}

export function getMockAssessments(id: string) {
  return {
    items: [
      { id: `${id}_asm_1`, type: 'ADL', score: 18 },
      { id: `${id}_asm_2`, type: 'Cognitive', score: 22 },
    ],
  };
}

export function getMockIncidents(id: string) {
  return {
    items: [
      { id: `${id}_inc_1`, type: 'Fall', severity: 'LOW' },
      { id: `${id}_inc_2`, type: 'Medication', severity: 'MEDIUM' },
    ],
  };
}

export function getMockNotes(id: string) {
  return {
    items: [
      { id: `${id}_note_1`, content: 'Resident enjoyed music therapy.' },
      { id: `${id}_note_2`, content: 'Family visited on Sunday.' },
    ],
  };
}
