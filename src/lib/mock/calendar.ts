import type { Appointment, CalendarFilter } from "@/lib/types/calendar";`r`nimport { AppointmentStatus, AppointmentType } from "@/lib/types/calendar";
import { UserRole } from "@prisma/client";

// Generate relative ISO times
function isoAt(hoursFromNow: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
}

function creator(role: UserRole = UserRole.ADMIN) {
  return { id: "demo-user", name: "Demo User", role };
}

export function getMockAppointments(): Appointment[] {
  return [
    {
      id: "apt_1",
      type: AppointmentType.FACILITY_TOUR,
      status: AppointmentStatus.CONFIRMED,
      title: "Facility Tour – Golden Meadows",
      description: "Guided tour for family to review amenities and care programs.",
      startTime: isoAt(24),
      endTime: isoAt(25),
      location: { address: "123 Meadow Ln, San Jose, CA" },
      homeId: "home_1",
      createdBy: creator(UserRole.ADMIN),
      participants: [
        { userId: "u_admin", name: "Alex Admin", role: UserRole.ADMIN, status: "ACCEPTED" },
        { userId: "u_family", name: "Jamie Smith", role: UserRole.FAMILY, status: "PENDING" }
      ],
      metadata: { createdAt: isoAt(-48), updatedAt: isoAt(-1) }
    },
    {
      id: "apt_2",
      type: AppointmentType.CARE_EVALUATION,
      status: AppointmentStatus.PENDING,
      title: "Care Evaluation – Resident Intake",
      description: "Initial care needs assessment with RN.",
      startTime: isoAt(48),
      endTime: isoAt(49),
      location: { address: "CareLink Clinic, 55 Oak St, SF" },
      createdBy: creator(UserRole.STAFF),
      participants: [
        { userId: "u_nurse", name: "Dana RN", role: UserRole.STAFF, status: "TENTATIVE" }
      ],
      metadata: { createdAt: isoAt(-24), updatedAt: isoAt(-2) }
    },
    {
      id: "apt_3",
      type: AppointmentType.FAMILY_VISIT,
      status: AppointmentStatus.CONFIRMED,
      title: "Family Visit – Community Room",
      startTime: isoAt(72),
      endTime: isoAt(74),
      location: { address: "Community Room A" },
      createdBy: creator(UserRole.OPERATOR),
      participants: [
        { userId: "u_operator", name: "Olivia Operator", role: UserRole.OPERATOR, status: "ACCEPTED" }
      ],
      metadata: { createdAt: isoAt(-12), updatedAt: isoAt(-1) }
    },
    {
      id: "apt_4",
      type: AppointmentType.CAREGIVER_SHIFT,
      status: AppointmentStatus.CONFIRMED,
      title: "Caregiver Shift – Night",
      startTime: isoAt(6),
      endTime: isoAt(14),
      createdBy: creator(UserRole.STAFF),
      participants: [
        { userId: "u_cg", name: "Chris Caregiver", role: UserRole.STAFF, status: "ACCEPTED" }
      ],
      metadata: { createdAt: isoAt(-6), updatedAt: isoAt(-2) }
    },
    {
      id: "apt_5",
      type: AppointmentType.MEDICAL_APPOINTMENT,
      status: AppointmentStatus.RESCHEDULED,
      title: "Medical Appointment – Dr. Lee",
      startTime: isoAt(96),
      endTime: isoAt(97),
      location: { address: "Downtown Clinic" },
      createdBy: creator(UserRole.STAFF),
      participants: [],
      metadata: { createdAt: isoAt(-72), updatedAt: isoAt(-4) }
    }
  ];
}

export function filterMockAppointments(all: Appointment[], filter?: Partial<CalendarFilter>): Appointment[] {
  if (!filter) return all;
  let res = all.slice();
  if (filter.dateRange?.start) {
    const start = new Date(filter.dateRange.start).getTime();
    res = res.filter(a => new Date(a.startTime).getTime() >= start);
  }
  if (filter.dateRange?.end) {
    const end = new Date(filter.dateRange.end).getTime();
    res = res.filter(a => new Date(a.endTime).getTime() <= end);
  }
  if (filter.appointmentTypes?.length) {
    const set = new Set(filter.appointmentTypes);
    res = res.filter(a => set.has(a.type));
  }
  if (filter.status?.length) {
    const set = new Set(filter.status);
    res = res.filter(a => set.has(a.status));
  }
  if (filter.searchText) {
    const q = filter.searchText.toLowerCase();
    res = res.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.description?.toLowerCase().includes(q) ?? false) ||
      (a.location?.address?.toLowerCase().includes(q) ?? false)
    );
  }
  return res;
}


