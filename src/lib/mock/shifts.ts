// Mock shifts data for runtime demo mode

export type MockShift = {
  id: string;
  homeId: string;
  homeName: string;
  address: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  hourlyRate: number;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
};

function isoAt(hoursFromNow: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
}

const HOMES = [
  { id: 'home_1', name: 'Golden Meadows', addr: '123 Meadow Ln, Seattle, WA' },
  { id: 'home_2', name: 'Bayview Lodge', addr: '42 Bay St, Bellevue, WA' },
  { id: 'home_3', name: 'Cedar Grove', addr: '77 Cedar Ave, Redmond, WA' },
  { id: 'home_4', name: 'Maple Care', addr: '9 Maple Rd, Kirkland, WA' },
] as const;

export function getMockOpenShifts(): MockShift[] {
  return [
    { id: 'shift_1', homeId: HOMES[0].id, homeName: HOMES[0].name, address: HOMES[0].addr, startTime: isoAt(24), endTime: isoAt(32), hourlyRate: 28, status: 'OPEN' },
    { id: 'shift_2', homeId: HOMES[1].id, homeName: HOMES[1].name, address: HOMES[1].addr, startTime: isoAt(48), endTime: isoAt(56), hourlyRate: 30, status: 'OPEN' },
    { id: 'shift_3', homeId: HOMES[2].id, homeName: HOMES[2].name, address: HOMES[2].addr, startTime: isoAt(12), endTime: isoAt(20), hourlyRate: 27, status: 'OPEN' },
  ];
}

export function getMockMyShifts(): MockShift[] {
  return [
    { id: 'shift_m1', homeId: HOMES[3].id, homeName: HOMES[3].name, address: HOMES[3].addr, startTime: isoAt(6), endTime: isoAt(14), hourlyRate: 29, status: 'ASSIGNED' },
    { id: 'shift_m2', homeId: HOMES[0].id, homeName: HOMES[0].name, address: HOMES[0].addr, startTime: isoAt(-10), endTime: isoAt(-2), hourlyRate: 28, status: 'COMPLETED' },
  ];
}

