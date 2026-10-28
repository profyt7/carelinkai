/**
 * ElevenLabs agent ids (OL-180) and the outbound phone number id (OL-183).
 * Kept dependency-free so the post-call router and the outbound caller can share them.
 */
export const DEFAULT_FRONT_DESK_AGENT_ID = 'agent_6101m5e81ahffwg9byc0jzw48rpw';
export const DEFAULT_LISTING_UPDATE_AGENT_ID = 'agent_4201m5cre84af80r71nj41g1n603';

export function agentIds(env: NodeJS.ProcessEnv = process.env): { frontDesk: string; listingUpdate: string } {
  return {
    frontDesk: (env['ELEVENLABS_AGENT_ID_FRONT_DESK'] || '').trim() || DEFAULT_FRONT_DESK_AGENT_ID,
    listingUpdate: (env['ELEVENLABS_AGENT_ID_LISTING_UPDATE'] || '').trim() || DEFAULT_LISTING_UPDATE_AGENT_ID,
  };
}

/** +1 216 677 3569 — the number every outbound Listing Update call presents. */
export const LISTING_UPDATE_CALLER_ID = '+12166773569';
export const LISTING_UPDATE_CALLER_ID_DISPLAY = '+1 216 677 3569';

/** The ElevenLabs phone number id outbound calls present (ELEVENLABS_PHONE_NUMBER_ID), or null. */
export function outboundPhoneNumberId(env: NodeJS.ProcessEnv = process.env): string | null {
  return (env['ELEVENLABS_PHONE_NUMBER_ID'] || '').trim() || null;
}
