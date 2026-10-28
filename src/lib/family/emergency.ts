/**
 * Shared types + normalizer for the family emergency-preferences page.
 *
 * Extracted so the data-contract logic is unit-testable without React. The
 * /api/family/emergency GET returns `{ preferences }` which is `null` when a
 * family has none yet, and whose `escalationChain` is free-form JSON — passing
 * that straight into React state crashed the page (the "Something went wrong"
 * error boundary). normalizePreference() coerces any input into the strict
 * shape the UI renders.
 */

export interface EscalationContact {
  name: string;
  phone: string;
}

export interface EmergencyPreference {
  escalationChain: EscalationContact[];
  notifyMethods: string[];
  careInstructions: string;
}

export const EMPTY_PREFERENCE: EmergencyPreference = {
  escalationChain: [],
  notifyMethods: [],
  careInstructions: '',
};

export function normalizePreference(raw: any): EmergencyPreference {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PREFERENCE };
  const chain = Array.isArray(raw.escalationChain) ? raw.escalationChain : [];
  return {
    escalationChain: chain.map((c: any) => ({
      name: typeof c?.name === 'string' ? c.name : '',
      phone: typeof c?.phone === 'string' ? c.phone : '',
    })),
    notifyMethods: Array.isArray(raw.notifyMethods)
      ? raw.notifyMethods.filter((m: any): m is string => typeof m === 'string')
      : [],
    careInstructions: typeof raw.careInstructions === 'string' ? raw.careInstructions : '',
  };
}
