/**
 * fix/public-api-truth-privacy: FacilityResponse.declineText is screened before it is stored.
 * Names, DOB / dates, ages, diagnoses, phone and email → the whole note becomes PHI_REDACTED.
 */
import fs from 'node:fs';
import path from 'node:path';
import { guardDeclineText, PHI_REDACTED } from '@/lib/phi-guard';

describe('guardDeclineText', () => {
  it.each([
    ['name with honorific', 'Mrs. Johnson needs more help than we can give'],
    ['relation + name', 'Her daughter Karen asked about a room'],
    ['patient + name', 'patient Robert would need a two-person assist'],
    ['"name is"', 'The resident name is Walter'],
    ['DOB slash date', 'DOB 3/14/1941, too high acuity'],
    ['ISO date', 'admitted 2026-10-01 to Metro'],
    ['long-form date', 'born March 14, 1941'],
    ['age', '92 year old with high fall risk'],
    ['age "yo"', '88yo female'],
    ['diagnosis: dementia', 'We cannot take advanced dementia'],
    ['diagnosis: Alzheimer’s', "Alzheimer's with wandering"],
    ['diagnosis: COPD / oxygen', 'COPD on 4L'],
    ['diagnosis: CHF', 'CHF exacerbation last month'],
    ['diagnosis: schizophrenia', 'history of schizophrenia'],
    ['phone', 'call me at (216) 555-0142'],
    ['phone dotted', 'cell 216.555.0142'],
    ['email', 'send records to intake@somehome.example'],
    ['base list: MRN', 'MRN 00012345'],
    ['base list: ICD code', 'dx F03.90'],
  ])('redacts %s', (_label, text) => {
    expect(guardDeclineText(text)).toMatchObject({ text: PHI_REDACTED, flagged: true });
  });

  it.each([
    'No beds open this month',
    'We are full until January',
    'Our waiver slots are taken',
    'Price is above the family budget we were given',
    'We only take private pay right now',
  ])('keeps a clean business note: %s', (text) => {
    expect(guardDeclineText(text)).toEqual({ text, flagged: false, matched: [] });
  });

  it('empty → null; clean text is trimmed and capped at 500', () => {
    expect(guardDeclineText('   ').text).toBeNull();
    expect(guardDeclineText(undefined).text).toBeNull();
    expect(guardDeclineText(`  ${'x'.repeat(600)}  `).text).toHaveLength(500);
  });

  it('the facility-response engine stores the screened note, never the raw text', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/concierge/facility-response-engine.ts'), 'utf8');
    expect(src).toContain('declineText: guardDeclineText(args.text, 500).text');
    expect(src).not.toContain('args.text?.trim().slice(0, 500)');
  });
});
