/**
 * feat/dp-lead-capture — DP follow-up copy, token gate, and sequence engine.
 *
 * Covers: the pure copy generator (4 touches, founder video placement, greeting
 * fallback, clamping), the shared-secret form gate (fails closed), the master
 * kill switch, and the sequence engine (immediate Touch 1, cron advance,
 * exhaustion, suppression stop, email-address stop) with prisma + email mocked.
 */

import { jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dPLead: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    emailSuppression: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/email', () => ({ sendDpFollowupEmail: jest.fn() }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { dpFollowupCopy, DP_FOLLOWUP_OFFSETS_DAYS, MAX_DP_TOUCHES, VIDEO_LINK_TOKEN } from '@/lib/dp-outreach/copy';
import { leadCaptureTokenValid } from '@/lib/dp-outreach/lead-capture-token';
import {
  dpFollowupEnabled,
  firstNameOf,
  founderVideoUrl,
  startDpSequenceOnLead,
  advanceDpSequences,
  stopDpLeadsForEmail,
} from '@/lib/dp-outreach/dp-followup';
import { prisma } from '@/lib/prisma';
import { sendDpFollowupEmail } from '@/lib/email';

const findUnique = prisma.dPLead.findUnique as jest.Mock;
const update = prisma.dPLead.update as jest.Mock;
const updateMany = prisma.dPLead.updateMany as jest.Mock;
const findMany = prisma.dPLead.findMany as jest.Mock;
const suppFind = prisma.emailSuppression.findUnique as jest.Mock;
const sendMock = sendDpFollowupEmail as jest.Mock;

const VIDEO = 'https://app.heygen.com/videos/founder-04841e9bef8f49cdac30a1b2d9934f9e';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'test-secret';
  process.env.COMPANY_POSTAL_ADDRESS = '1234 Main St, Cleveland, OH 44114';
  process.env.DP_FOLLOWUP_ENABLED = '1';
  delete process.env.FOUNDER_VIDEO_URL;
  delete process.env.LEAD_CAPTURE_TOKEN;
  sendMock.mockResolvedValue(true as never);
  update.mockResolvedValue({} as never);
  updateMany.mockResolvedValue({ count: 0 } as never);
  suppFind.mockResolvedValue(null as never);
});

// ------------------------------------------------------------------ copy
describe('dpFollowupCopy', () => {
  const input = { plannerFirstName: 'Maria', videoUrl: VIDEO };

  it('renders all 4 touches with a subject and non-empty body', () => {
    for (let t = 1; t <= MAX_DP_TOUCHES; t++) {
      const c = dpFollowupCopy(t, input);
      expect(c.subject).toBeTruthy();
      expect(c.paragraphs.length).toBeGreaterThan(1);
      expect(c.paragraphs.join(' ')).toContain('Maria');
    }
  });

  it('surfaces the founder video (as a link token) on Touch 1 and Touch 3', () => {
    for (const t of [1, 3]) {
      const c = dpFollowupCopy(t, input);
      expect(c.videoUrl).toBe(VIDEO); // resolved URL exposed for the renderers
      expect(c.paragraphs.join(' ')).toContain(VIDEO_LINK_TOKEN); // link placeholder, not the raw URL
      expect(c.paragraphs.join(' ')).not.toContain(VIDEO); // raw URL never embedded in the copy text
    }
  });

  it('falls back to a neutral greeting when the name is blank', () => {
    const c = dpFollowupCopy(1, { plannerFirstName: '', videoUrl: VIDEO });
    expect(c.paragraphs[0]).toBe('Hi there,');
  });

  it('clamps out-of-range touch numbers into 1..MAX', () => {
    expect(dpFollowupCopy(0, input).subject).toBe(dpFollowupCopy(1, input).subject);
    expect(dpFollowupCopy(99, input).subject).toBe(dpFollowupCopy(MAX_DP_TOUCHES, input).subject);
  });

  it('cadence constant is 0/3/7/14', () => {
    expect(DP_FOLLOWUP_OFFSETS_DAYS).toEqual([0, 3, 7, 14]);
  });
});

// ------------------------------------------------------------ token gate
describe('leadCaptureTokenValid — fails closed', () => {
  it('is false when LEAD_CAPTURE_TOKEN is unset (form inert)', () => {
    delete process.env.LEAD_CAPTURE_TOKEN;
    expect(leadCaptureTokenValid('anything')).toBe(false);
  });
  it('is false for a wrong or empty token', () => {
    process.env.LEAD_CAPTURE_TOKEN = 'super-secret-value';
    expect(leadCaptureTokenValid('nope')).toBe(false);
    expect(leadCaptureTokenValid('')).toBe(false);
    expect(leadCaptureTokenValid(null)).toBe(false);
  });
  it('is true only for the exact token', () => {
    process.env.LEAD_CAPTURE_TOKEN = 'super-secret-value';
    expect(leadCaptureTokenValid('super-secret-value')).toBe(true);
  });
});

// --------------------------------------------------------------- helpers
describe('helpers', () => {
  it('firstNameOf takes the first token', () => {
    expect(firstNameOf('Maria Gonzalez')).toBe('Maria');
    expect(firstNameOf('  Chris ')).toBe('Chris');
    expect(firstNameOf('')).toBe('');
    expect(firstNameOf(null)).toBe('');
  });
  it('founderVideoUrl defaults to the verified HeyGen link', () => {
    expect(founderVideoUrl()).toBe(VIDEO);
    process.env.FOUNDER_VIDEO_URL = 'https://example.com/v';
    expect(founderVideoUrl()).toBe('https://example.com/v');
  });
  it('dpFollowupEnabled is OFF unless explicitly truthy', () => {
    for (const v of ['', '0', 'false', 'off']) {
      process.env.DP_FOLLOWUP_ENABLED = v;
      expect(dpFollowupEnabled()).toBe(false);
    }
    for (const v of ['1', 'true', 'YES', 'on']) {
      process.env.DP_FOLLOWUP_ENABLED = v;
      expect(dpFollowupEnabled()).toBe(true);
    }
  });
});

// ------------------------------------------------------- start (Touch 1)
describe('startDpSequenceOnLead', () => {
  const lead = {
    id: 'lead-1',
    name: 'Maria Gonzalez',
    email: 'maria@hospital.org',
    createdAt: new Date('2026-07-15T12:00:00Z'),
    touchStep: 0,
    status: 'active',
  };

  it('is a no-op when the sequence is disabled', async () => {
    process.env.DP_FOLLOWUP_ENABLED = '';
    await startDpSequenceOnLead({ leadId: 'lead-1' });
    expect(findUnique).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends Touch 1 and records touchStep=1 + nextTouchAt (+3d)', async () => {
    findUnique.mockResolvedValue(lead as never);
    await startDpSequenceOnLead({ leadId: 'lead-1' });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0] as any;
    expect(arg.touch).toBe(1);
    expect(arg.plannerFirstName).toBe('Maria');
    const data = (update.mock.calls[0][0] as any).data;
    expect(data.touchStep).toBe(1);
    expect(new Date(data.nextTouchAt).toISOString()).toBe(new Date('2026-07-18T12:00:00Z').toISOString());
  });

  it('does not start twice (touchStep already > 0)', async () => {
    findUnique.mockResolvedValue({ ...lead, touchStep: 1 } as never);
    await startDpSequenceOnLead({ leadId: 'lead-1' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('stops instead of starting when the address is suppressed', async () => {
    findUnique.mockResolvedValue(lead as never);
    suppFind.mockResolvedValue({ reason: 'bounce' } as never);
    await startDpSequenceOnLead({ leadId: 'lead-1' });
    expect(sendMock).not.toHaveBeenCalled();
    expect((update.mock.calls[0][0] as any).data).toMatchObject({ status: 'stopped', stoppedReason: 'bounce' });
  });

  it('refuses to send (leaves unstarted) when postal address is missing', async () => {
    delete process.env.COMPANY_POSTAL_ADDRESS;
    findUnique.mockResolvedValue(lead as never);
    sendMock.mockResolvedValue(false as never);
    await startDpSequenceOnLead({ leadId: 'lead-1' });
    // send attempt returns false → no advance write
    expect(update).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------------- advance (cron)
describe('advanceDpSequences', () => {
  it('returns disabled without touching the DB when the flag is off', async () => {
    process.env.DP_FOLLOWUP_ENABLED = '0';
    const res = await advanceDpSequences();
    expect(res).toMatchObject({ disabled: true });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('sends the next touch and schedules the following one', async () => {
    findMany.mockResolvedValue([
      { id: 'l', name: 'Sam Lee', email: 's@h.org', createdAt: new Date('2026-07-15T12:00:00Z'), touchStep: 1 },
    ] as never);
    const res = await advanceDpSequences();
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ touch: 2 }));
    const data = (update.mock.calls[0][0] as any).data;
    expect(data.touchStep).toBe(2);
    // touch 3 due at +7d from creation
    expect(new Date(data.nextTouchAt).toISOString()).toBe(new Date('2026-07-22T12:00:00Z').toISOString());
    expect(res.sent).toBe(1);
  });

  it('marks the sequence exhausted after the final touch', async () => {
    findMany.mockResolvedValue([
      { id: 'l', name: 'Sam Lee', email: 's@h.org', createdAt: new Date('2026-07-15T12:00:00Z'), touchStep: 3 },
    ] as never);
    await advanceDpSequences();
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ touch: MAX_DP_TOUCHES }));
    const data = (update.mock.calls[0][0] as any).data;
    expect(data.touchStep).toBe(MAX_DP_TOUCHES);
    expect(data.nextTouchAt).toBeNull();
    expect(data.stoppedReason).toBe('exhausted');
  });

  it('stops a lead whose address became suppressed instead of emailing', async () => {
    findMany.mockResolvedValue([
      { id: 'l', name: 'Sam Lee', email: 's@h.org', createdAt: new Date(), touchStep: 1 },
    ] as never);
    suppFind.mockResolvedValue({ reason: 'unsubscribe' } as never);
    const res = await advanceDpSequences();
    expect(sendMock).not.toHaveBeenCalled();
    expect((update.mock.calls[0][0] as any).data).toMatchObject({ status: 'stopped', stoppedReason: 'unsubscribe' });
    expect(res.stopped).toBe(1);
  });
});

// -------------------------------------------------------- unsubscribe stop
describe('stopDpLeadsForEmail', () => {
  it('halts only ACTIVE leads for the address', async () => {
    updateMany.mockResolvedValue({ count: 2 } as never);
    const n = await stopDpLeadsForEmail('Maria@Hospital.org');
    expect(n).toBe(2);
    const where = (updateMany.mock.calls[0][0] as any).where;
    expect(where.status).toBe('active');
    expect(where.email).toMatchObject({ equals: 'maria@hospital.org' });
  });
  it('no-ops on an empty email', async () => {
    const n = await stopDpLeadsForEmail('');
    expect(n).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
