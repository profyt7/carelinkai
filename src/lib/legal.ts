import { prisma } from '@/lib/prisma';

export const BAA_CURRENT_VERSION = 'draft-2026-05-15';
export const DPA_CURRENT_VERSION = 'draft-2026-05-15';

/**
 * Returns true if the operator has accepted the current BAA and DPA versions.
 * ADMIN accounts skip this check — call-sites gate by role before calling.
 */
export async function isOperatorAcceptanceCurrent(operatorId: string): Promise<boolean> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: {
      baaTemplateVersion: true,
      baaAcceptedAt: true,
      dpaTemplateVersion: true,
      dpaAcceptedAt: true,
    },
  });

  if (!operator) return false;

  return (
    operator.baaTemplateVersion === BAA_CURRENT_VERSION &&
    operator.baaAcceptedAt !== null &&
    operator.dpaTemplateVersion === DPA_CURRENT_VERSION &&
    operator.dpaAcceptedAt !== null
  );
}
