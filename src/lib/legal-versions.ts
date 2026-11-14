/**
 * BAA / DPA template versions and the "is this acceptance current" rule. Pure (no Prisma), so
 * the session guard, client pages and edge code can share it. src/lib/legal.ts re-exports these.
 */
export const BAA_CURRENT_VERSION = 'draft-2026-05-15';
export const DPA_CURRENT_VERSION = 'draft-2026-05-15';

export type OperatorAcceptanceFields = {
  baaTemplateVersion: string | null;
  baaAcceptedAt: Date | string | null;
  dpaTemplateVersion: string | null;
  dpaAcceptedAt: Date | string | null;
};

/** True when both the current BAA and the current DPA have been accepted. */
export function acceptanceIsCurrent(op: OperatorAcceptanceFields | null | undefined): boolean {
  if (!op) return false;
  return (
    op.baaTemplateVersion === BAA_CURRENT_VERSION &&
    op.baaAcceptedAt != null &&
    op.dpaTemplateVersion === DPA_CURRENT_VERSION &&
    op.dpaAcceptedAt != null
  );
}
