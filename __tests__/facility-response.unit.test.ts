/**
 * Sprint W4-2 — facility accept / decline:
 *  - the outbound email carries ONLY care level / payer lane / timeline —
 *    the body is asserted against a patientInfo fixture full of PHI;
 *  - the PHI-minimal summary never copies raw intake text through;
 *  - the response token signs / verifies / expires like a claim link;
 *  - decline reasons roll up to "acceptance criteria (observed)" in a
 *    separate JSON that never touches operator-entered fields;
 *  - the fixed decline-reason list has the acuity sub-reasons.
 */

import {
  DECLINE_REASONS,
  buildFacilitySummary,
  describeObservedCriteria,
  isDeclineReason,
  renderFacilityResponseEmail,
  rollupObservedAccept,
  rollupObservedCriteria,
  signFacilityResponseToken,
  verifyFacilityResponseToken,
} from '@/lib/concierge/facility-response';

const PHI = {
  patientName: 'Jane Doe',
  patientAge: '82',
  medicalNeeds: 'advanced dementia with wandering; insulin-dependent diabetes; wound care',
  timeline: 'within 2 weeks',
  paymentType: 'private pay',
  additionalNotes: 'POA is daughter Mary Doe, 216-555-0100',
  dob: '1944-03-02',
};
const SECRET = 'test-secret';
const NOW = new Date('2026-10-13T12:00:00Z').getTime();

describe('buildFacilitySummary (PHI-minimal)', () => {
  it('derives a care LEVEL, payer lane and timeline — never the raw intake', () => {
    const s = buildFacilitySummary({ parsedCriteria: {}, patientInfo: PHI, payerSource: 'PRIVATE_FUNDS', queryText: 'memory care near 44114' });
    expect(s.careLevel).toBe('Memory care');
    expect(s.timeline).toBe('within 2 weeks');
    expect(s.feeLane).toBe('FEE_ELIGIBLE');
    const json = JSON.stringify(s);
    for (const phi of ['Jane', 'Doe', 'Mary', 'insulin', 'dementia', 'wound', '216-555', '1944', 'POA']) expect(json).not.toContain(phi);
  });

  it('prefers the parsed care level, maps legacy paymentType, defaults when blank', () => {
    expect(buildFacilitySummary({ parsedCriteria: { careLevel: 'SKILLED_NURSING' }, patientInfo: PHI }).careLevel).toBe('Skilled nursing');
    expect(buildFacilitySummary({ patientInfo: { paymentType: 'medicaid' } })).toMatchObject({ careLevel: 'Assisted living', payerLane: 'Medicaid', feeLane: 'UNKNOWN', timeline: 'Not specified' });
    expect(buildFacilitySummary({ payerSource: 'MEDICAID_WAIVER' }).feeLane).toBe('FREE_LANE');
  });
});

describe('renderFacilityResponseEmail', () => {
  const summary = buildFacilitySummary({ patientInfo: PHI, payerSource: 'PRIVATE_FUNDS' });
  const mail = renderFacilityResponseEmail({
    facilityName: 'Maple Grove', summary, appUrl: 'https://getcarelinkai.com', token: 'tok.sig',
    postalAddress: '123 Main St, Cleveland, OH 44113', unsubscribeUrl: 'https://getcarelinkai.com/api/outreach/unsubscribe?token=u', dpOrganization: 'County Hospital',
  });

  it('has NO PHI in subject, text or html', () => {
    const all = mail.subject + mail.text + mail.html;
    for (const phi of ['Jane', 'Doe', 'Mary', 'insulin', 'dementia', 'wound', 'diabetes', '216-555', '1944', 'POA', 'age 82']) {
      expect(all).not.toContain(phi);
    }
  });

  it('carries care level / payer / timeline, the one-tap link, and the CAN-SPAM footer in text AND html', () => {
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('Memory care');
      expect(body).toContain('Private funds / savings');
      expect(body).toContain('within 2 weeks');
      expect(body).toContain('/facility/respond?token=tok.sig');
      expect(body).toContain('123 Main St, Cleveland, OH 44113');
      expect(body).toContain('/api/outreach/unsubscribe?token=u');
      expect(body).toMatch(/unsubscribe/i);
      expect(body).toContain('County Hospital');
    }
    expect(mail.subject).toContain('Maple Grove');
  });
});

describe('response token (claim-link pattern)', () => {
  it('signs, verifies, binds to one home × request, expires at 30 days, rejects tampering', () => {
    const t = signFacilityResponseToken({ responseId: 'r1', searchId: 's1', homeId: 'h1' }, SECRET, NOW);
    expect(verifyFacilityResponseToken(t, SECRET, NOW)).toMatchObject({ responseId: 'r1', searchId: 's1', homeId: 'h1', type: 'facility_response' });
    expect(verifyFacilityResponseToken(t, 'other', NOW)).toBeNull();
    expect(verifyFacilityResponseToken(t, SECRET, NOW + 31 * 86_400_000)).toBeNull();
    expect(verifyFacilityResponseToken(t, SECRET, NOW + 29 * 86_400_000)).not.toBeNull();
    const [data, sig] = t.split('.');
    const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data as string, 'base64url').toString()), homeId: 'h2' })).toString('base64url');
    expect(verifyFacilityResponseToken(`${tampered}.${sig}`, SECRET, NOW)).toBeNull();
    expect(verifyFacilityResponseToken('garbage', SECRET, NOW)).toBeNull();
  });
});

describe('observed acceptance criteria roll-up', () => {
  it('counts declines per reason, keeps totals, never touches other keys', () => {
    const at = new Date('2026-10-13T12:00:00Z');
    const once = rollupObservedCriteria(null, 'ACUITY_WANDERING', at);
    expect(once).toEqual({ version: 1, declines: { ACUITY_WANDERING: { count: 1, lastAt: at.toISOString() } }, totalDeclines: 1, totalAccepts: 0, lastDeclinedAt: at.toISOString(), lastAcceptedAt: null });
    const twice = rollupObservedCriteria(once, 'ACUITY_WANDERING', new Date('2026-10-14T12:00:00Z'));
    expect(twice.declines.ACUITY_WANDERING).toEqual({ count: 2, lastAt: '2026-10-14T12:00:00.000Z' });
    const mixed = rollupObservedCriteria(twice, 'NO_BED', at);
    expect(mixed.totalDeclines).toBe(3);
    const accepted = rollupObservedAccept(mixed, at);
    expect(accepted.totalAccepts).toBe(1);
    expect(accepted.declines.ACUITY_WANDERING?.count).toBe(2);
    expect(describeObservedCriteria(accepted)[0]).toMatch(/wandering.*2×/);
    // Operator-entered fields are a different column entirely — the roll-up has no key for them.
    expect(Object.keys(accepted)).toEqual(['version', 'declines', 'totalDeclines', 'totalAccepts', 'lastDeclinedAt', 'lastAcceptedAt']);
    // Garbage in → clean structure out.
    expect(rollupObservedCriteria('not json', 'OTHER', at).totalDeclines).toBe(1);
  });

  it('decline reasons are the fixed list with the acuity sub-reasons', () => {
    const values = DECLINE_REASONS.map((r) => r.value);
    expect(values).toEqual([
      'NO_BED', 'ACUITY_TWO_PERSON_ASSIST', 'ACUITY_WANDERING', 'ACUITY_OXYGEN', 'ACUITY_INSULIN', 'ACUITY_BARIATRIC',
      'ACUITY_BEHAVIORAL', 'ACUITY_HOSPICE', 'PAYER_NOT_ACCEPTED', 'MEDICAID_PENDING_NOT_ACCEPTED', 'OUTSIDE_AREA', 'OTHER',
    ]);
    expect(DECLINE_REASONS.filter((r) => r.acuity)).toHaveLength(7);
    expect(isDeclineReason('ACUITY_OXYGEN')).toBe(true);
    expect(isDeclineReason('nope')).toBe(false);
  });
});
