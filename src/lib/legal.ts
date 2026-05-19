import { prisma } from '@/lib/prisma';

export const BAA_CURRENT_VERSION = 'draft-2026-05-15';
export const DPA_CURRENT_VERSION = 'draft-2026-05-15';

function checkVersions(record: {
  baaTemplateVersion: string | null;
  baaAcceptedAt: Date | null;
  dpaTemplateVersion: string | null;
  dpaAcceptedAt: Date | null;
} | null): boolean {
  if (!record) return false;
  return (
    record.baaTemplateVersion === BAA_CURRENT_VERSION &&
    record.baaAcceptedAt !== null &&
    record.dpaTemplateVersion === DPA_CURRENT_VERSION &&
    record.dpaAcceptedAt !== null
  );
}

const BAA_DPA_SELECT = {
  baaTemplateVersion: true,
  baaAcceptedAt: true,
  dpaTemplateVersion: true,
  dpaAcceptedAt: true,
} as const;

/**
 * Returns true if the operator has accepted the current BAA and DPA versions.
 * ADMIN accounts skip this check — call-sites gate by role before calling.
 */
export async function isOperatorAcceptanceCurrent(operatorId: string): Promise<boolean> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: BAA_DPA_SELECT,
  });
  return checkVersions(operator);
}

/**
 * Generic acceptance check for any PHI-accessing role.
 * Dispatches to the correct profile record based on the user's role.
 * ADMIN and FAMILY always return true (bypass).
 */
export async function isAcceptanceCurrent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return false;

  switch (user.role) {
    case 'OPERATOR': {
      const operator = await prisma.operator.findUnique({ where: { userId }, select: BAA_DPA_SELECT });
      return checkVersions(operator);
    }
    case 'CAREGIVER': {
      const caregiver = await prisma.caregiver.findUnique({ where: { userId }, select: BAA_DPA_SELECT });
      return checkVersions(caregiver);
    }
    case 'DISCHARGE_PLANNER': {
      const profile = await prisma.dischargePlannerProfile.findUnique({ where: { userId }, select: BAA_DPA_SELECT });
      return checkVersions(profile);
    }
    case 'PROVIDER': {
      const provider = await prisma.provider.findUnique({ where: { userId }, select: BAA_DPA_SELECT });
      return checkVersions(provider);
    }
    default:
      return true;
  }
}
