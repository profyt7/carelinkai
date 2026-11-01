/**
 * The published phone line (216) 245-9482 is answered by an automated AI front desk (ElevenLabs) 24/7
 * (fix/phone-copy-automated). Every description of the line says it is automated and that a person calls back
 * within one business day; "answers around the clock" is banned unless the same sentence says "automated".
 */
import fs from 'fs';
import path from 'path';
import { CONTACT_FOOTER_LINE, CONTACT_HOURS_LINE, CONTACT_NO_PHI_LINE, CONTACT_PHONE_DISPLAY } from '@/lib/contact';

const root = path.join(__dirname, '..', 'src');
const files: string[] = [];
const walk = (d: string) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
};
walk(root);

describe('phone line copy', () => {
  it('footer: "Call (216) 245-9482 — our automated front desk answers 24/7 and takes your message. A person calls you back within one business day."', () => {
    expect(`Call ${CONTACT_PHONE_DISPLAY} ${CONTACT_FOOTER_LINE}`).toBe(
      'Call (216) 245-9482 — our automated front desk answers 24/7 and takes your message. A person calls you back within one business day.',
    );
    const footer = fs.readFileSync(path.join(root, 'components/site/SiteFooter.tsx'), 'utf8');
    expect(footer).toContain('{CONTACT_FOOTER_LINE}');
  });

  it('the shared hours line says automated and a one-business-day callback; the no-PHI line is kept', () => {
    expect(CONTACT_HOURS_LINE).toMatch(/automated front desk answers 24\/7/);
    expect(CONTACT_HOURS_LINE).toMatch(/A person calls you back within one business day\./);
    expect(CONTACT_NO_PHI_LINE).toMatch(/^Please don’t share patient details on the line/);
  });

  it('banned: "answers around the clock" unless the same sentence says "automated"', () => {
    const hits = files.flatMap((f) =>
      fs.readFileSync(f, 'utf8')
        .split(/(?<=[.!?])\s+|\n/)
        .filter((sentence) => /answers around the clock/i.test(sentence) && !/automated/i.test(sentence))
        .map((sentence) => `${path.relative(root, f)}: ${sentence.trim().slice(0, 100)}`),
    );
    expect(hits).toEqual([]);
  });

  it('no user-facing text claims a person answers the phone', () => {
    const hits = files.flatMap((f) =>
      fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (/a person answers|live person answers|real person answers/i.test(line) ? [`${path.relative(root, f)}:${i + 1}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it('every "front desk" mention in user-facing copy says automated', () => {
    const userFacing = ['app/contact/page.tsx', 'app/concierge/ConciergeScreener.tsx', 'app/HomePageClient.tsx', 'app/cleveland/home-care-agencies/page.tsx', 'lib/seo/llms-txt.ts', 'lib/seo/jsonld.ts', 'lib/contact.ts', 'components/site/SiteFooter.tsx'];
    for (const rel of userFacing) {
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      for (const m of text.matchAll(/[^.`'"]*front desk[^.`'"]*/gi)) {
        if (/^\s*\*/.test(m[0]) || /ELEVENLABS/i.test(m[0])) continue;
        expect(`${rel}: ${m[0]}`).toMatch(/automated|AI front desk/i);
      }
    }
  });
});
