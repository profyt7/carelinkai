export interface OutreachContext {
  caregiverFirstName?: string;
  homeName: string;
  startAt: string;
  endAt: string;
  confirmKeyword?: string;
  declineKeyword?: string;
  notes?: string;
}

export const templates = {
  smsOutreach: (ctx: OutreachContext) => {
    const confirm = ctx.confirmKeyword ?? 'YES';
    const decline = ctx.declineKeyword ?? 'NO';
    const noteLine = ctx.notes ? ` Note: ${ctx.notes}.` : '';
    return (
      `CareLinkAI: Hi ${ctx.caregiverFirstName ?? 'there'}! ` +
      `Coverage needed at ${ctx.homeName} from ${ctx.startAt} to ${ctx.endAt}.${noteLine} ` +
      `Reply ${confirm} to accept or ${decline} to decline.`
    );
  },

  smsSlotFilled: (ctx: { caregiverFirstName?: string }) =>
    `CareLinkAI: Thanks for responding, ${ctx.caregiverFirstName ?? 'there'}. The shift has already been filled. We'll reach out for future openings!`,

  smsConfirmed: (ctx: OutreachContext) =>
    `CareLinkAI: You're confirmed for ${ctx.homeName} from ${ctx.startAt} to ${ctx.endAt}. Thank you!`,

  smsNoMatch: (homeName: string) =>
    `CareLinkAI: Unfortunately we were unable to fill a shift at ${homeName}. Please arrange coverage manually or post to the marketplace.`,

  voiceScript: (ctx: OutreachContext) =>
    `CareLinkAI calling about a shift at ${ctx.homeName} from ${ctx.startAt} to ${ctx.endAt}. ` +
    `Press 1 to accept. Press 2 to decline. Press 3 to repeat this message.`,
};
