/**
 * OL-172 (c) — FAQ content for /cleveland, each care-type hub and each suburb
 * page. Pure: every answer is built from facts the directory already holds
 * (live counts passed in by the page, the Medicaid waiver rules, what the
 * "Verified" badge means in src/lib/availability/availability.ts). No promises
 * of outcomes, savings or placement; no facility fees. The page renders the
 * SAME array visibly (FaqSection) and as FAQPage JSON-LD, so they never drift.
 */

import { AVAILABILITY_FRESH_DAYS } from '@/lib/availability/availability';
import { CONTACT_PHONE_DISPLAY } from '@/lib/contact';

export type Faq = { q: string; a: string };

export type DirectoryStats = {
  /** Live count of matching, non-demo, ACTIVE listings. */
  total: number;
  /** Of those, how many are recorded as accepting new Medicaid Assisted Living Waiver residents. */
  acceptingWaiver: number;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const FAQ_OPEN_BED: Faq = {
  q: 'How do I know a bed is really open?',
  a: `Look for the Verified Availability badge on a listing. It means the home itself told us how many beds were open within the last ${AVAILABILITY_FRESH_DAYS} days — through its operator account, a reply to our weekly availability email, or a phone call our team reviewed — and the badge shows the date. Without the badge, availability is unconfirmed: call the home, or call us at ${CONTACT_PHONE_DISPLAY}, before you plan a tour.`,
};

export const FAQ_VERIFIED: Faq = {
  q: 'What does “Verified” mean on CareLinkAI?',
  a: 'It means one specific fact was confirmed with the home on the date shown — for example the number of open beds or the Medicaid waiver status, with its source named on the listing. It is not a rating, an endorsement or a promise about care quality. Inspection lines are separate: they are facts copied from Ohio Department of Health survey records, and we do not grade homes.',
};

export function waiverFaq(scope: string, stats?: DirectoryStats): Faq {
  const counts =
    stats && stats.total > 0
      ? stats.acceptingWaiver > 0
        ? ` Right now ${plural(stats.acceptingWaiver, 'home', 'homes')} of the ${plural(stats.total, 'listing', 'listings')} ${scope} ${stats.acceptingWaiver === 1 ? 'is' : 'are'} recorded as accepting new waiver residents.`
        : ` None of the ${plural(stats.total, 'listing', 'listings')} ${scope} is currently recorded as accepting new waiver residents.`
      : '';
  return {
    q: `Which homes ${scope} accept the Medicaid Assisted Living Waiver?`,
    a: `Each listing shows its waiver status and where that status came from (for most homes, the Area Agency on Aging list), and the “Accepts Medicaid waiver” filter on the assisted living page narrows the directory to homes accepting new waiver residents.${counts} Ohio’s Assisted Living Waiver can pay for care services, not room and board, and enrollment runs through your Area Agency on Aging — status changes often, so confirm with the home.`,
  };
}

const MEDICARE_AL: Faq = {
  q: 'Does Medicare pay for assisted living in Ohio?',
  a: 'No. Medicare covers short-term skilled nursing after a qualifying hospital stay, not ongoing assisted living or memory care. Families usually pay privately or with long-term care insurance; veterans may qualify for VA benefits; and Ohio’s Medicaid Assisted Living Waiver can cover care services for residents who qualify medically and financially.',
};

const AL_VS_NURSING: Faq = {
  q: 'How is assisted living different from a nursing home?',
  a: 'Assisted living provides help with daily activities — bathing, dressing, medication management, meals — in a residential setting. A nursing home (skilled nursing facility) provides 24-hour medical care such as wound care, IV therapy and rehabilitation after a hospital stay. Ohio licenses them separately, and most people moving from home need assisted living rather than nursing-home care.',
};

export function hubFaqs(suburbCount: number): Faq[] {
  return [
    {
      q: 'Which areas does the Cleveland directory cover?',
      a: `Cuyahoga, Summit, Lake, Lorain, Medina, Geauga and Portage counties, with a dedicated assisted living page for ${suburbCount} suburbs where we list at least two licensed homes. Every listing starts from the Ohio Department of Health roster of licensed residential care facilities; demo or placeholder homes are never shown.`,
    },
    waiverFaq('in Greater Cleveland'),
    FAQ_OPEN_BED,
    FAQ_VERIFIED,
    MEDICARE_AL,
  ];
}

export type CareTypeKey = 'assisted-living' | 'memory-care' | 'independent-living' | 'nursing-homes' | 'home-care-agencies';

export function careTypeFaqs(type: CareTypeKey, stats: DirectoryStats & { label: string; fallbackNote?: string | null }): Faq[] {
  const countFaq: Faq = {
    q: `How many ${stats.label} listings are in the Cleveland directory?`,
    a:
      stats.total > 0
        ? `${plural(stats.total, 'licensed home', 'licensed homes')} in Greater Cleveland ${stats.total === 1 ? 'is' : 'are'} listed with ${stats.label} today. Each one is a real facility from the Ohio Department of Health roster with its most recent inspection facts; there are no demo or placeholder listings.`
        : `None yet. ${stats.fallbackNote ?? 'We only list homes we can match to the state roster, so this page shows the nearest real alternative instead of placeholder listings.'}`,
  };
  switch (type) {
    case 'nursing-homes':
      return [
        countFaq,
        AL_VS_NURSING,
        {
          q: 'Who pays for a nursing home in Ohio?',
          a: 'Medicare can cover a short skilled-nursing stay after a qualifying hospital admission. Longer stays are paid privately, by long-term care insurance, or by Ohio Medicaid for residents who qualify. Medicare’s Care Compare website lists every Medicare-certified nursing home with its federal inspection results.',
        },
        FAQ_OPEN_BED,
      ];
    case 'home-care-agencies':
      return [
        {
          q: 'Does CareLinkAI list home care agencies?',
          a: 'Not as searchable listings yet. Greater Cleveland agencies can claim a free listing on this page; until agencies are verified, the directory shows licensed residential care homes, which are the nearest care setting we can list with real data.',
        },
        {
          q: 'Can Medicaid pay for care at home in Ohio?',
          a: 'Yes, for people who qualify. Ohio’s PASSPORT Medicaid waiver pays for in-home services such as personal care aides and homemaker help, and enrollment runs through your local Area Agency on Aging. Medicare covers only short-term, doctor-ordered home health care, not ongoing daily help.',
        },
        FAQ_VERIFIED,
      ];
    case 'independent-living':
      return [
        countFaq,
        {
          q: 'Is independent living licensed in Ohio?',
          a: 'Independent living apartments on their own are not licensed as care settings in Ohio. When a community also provides personal care, that part is licensed as a residential care facility (assisted living), and those are the homes this directory can verify and list.',
        },
        FAQ_OPEN_BED,
        FAQ_VERIFIED,
      ];
    case 'memory-care':
      return [countFaq, waiverFaq('with memory care', stats), FAQ_OPEN_BED, FAQ_VERIFIED];
    case 'assisted-living':
    default:
      return [countFaq, waiverFaq('in Greater Cleveland', stats), FAQ_OPEN_BED, FAQ_VERIFIED, MEDICARE_AL];
  }
}

export function suburbFaqs(name: string, cities: readonly string[], stats: DirectoryStats): Faq[] {
  const where = `in ${name}`;
  return [
    {
      q: `How many licensed assisted living homes are listed ${where}?`,
      a:
        stats.total > 0
          ? `${plural(stats.total, 'licensed home', 'licensed homes')} in ${cities.join(' / ')} ${stats.total === 1 ? 'is' : 'are'} listed today. Each is a real facility from the Ohio Department of Health roster, shown with its most recent state inspection date and citation count — no demo or placeholder listings.`
          : `We are still verifying the ${name} homes from the state roster, so none is listed yet. The assisted living page for Greater Cleveland lists every verified home in the meantime.`,
    },
    waiverFaq(where, stats),
    FAQ_OPEN_BED,
    FAQ_VERIFIED,
  ];
}
