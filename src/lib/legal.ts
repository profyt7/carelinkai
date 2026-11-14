import { prisma } from '@/lib/prisma';

import { acceptanceIsCurrent } from '@/lib/legal-versions';

export { BAA_CURRENT_VERSION, DPA_CURRENT_VERSION, acceptanceIsCurrent } from '@/lib/legal-versions';

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

  return acceptanceIsCurrent(operator);
}
