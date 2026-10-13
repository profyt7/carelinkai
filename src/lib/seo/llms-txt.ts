/**
 * /llms.txt content (sprint W3 item 6c) — plain-text overview for AI agents.
 * Served by src/app/llms.txt/route.ts; kept here so it is unit-testable.
 * Public, no PHI, no contact emails.
 */

import { SUBURBS, suburbPath } from '@/lib/directory/suburbs';
import { AVAILABILITY_FRESH_DAYS } from '@/lib/availability/availability';
import { FEE_MODEL_LINE, SITE_URL } from '@/lib/seo/jsonld';

export function buildLlmsTxt(): string {
  const lines: string[] = [
    '# CareLinkAI',
    '',
    '> A Cleveland, Ohio senior care directory, staffing marketplace and operations platform. Founder-run from Cleveland. Families and hospital discharge planners use it to find licensed assisted living, memory care, independent living and nursing homes across Greater Cleveland (Cuyahoga, Summit, Lake, Lorain, Medina, Geauga and Portage counties) and to contact homes directly. No broker fees, no lead resale, no call center.',
    '',
    `Site: ${SITE_URL}`,
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
    '## What is verified vs self-reported',
    '',
    '- Licensing: every residential care facility listed starts from the public Ohio Department of Health (ODH) roster; the ODH license number is published on the listing and in its JSON-LD.',
    '- Inspections: ODH survey records (survey date, survey type, citation count) are public-records FACTS. CareLinkAI does not grade, rank or editorialise inspection history.',
    `- Availability: a listing carries a "Verified Availability" badge only when the operator confirmed open beds with CareLinkAI (SMS poll, email magic link, voice or concierge call) within the last ${AVAILABILITY_FRESH_DAYS} days; the verification timestamp is published. Older or missing confirmations read "Contact to confirm" — a count is never shown as fact once stale.`,
    '- Pricing: labelled by source on every listing — operator-provided, estimated (public / discharge-planner estimate) or families-report (average of verified family quotes). "Contact for pricing" when nothing is published.',
    '- Claimed vs public-records listings: an unclaimed listing is built from public records only; once an operator claims it, the operator confirms services, contact details and photos. Only claimed listings publish a telephone number.',
    '- Ratings: Google aggregate rating + count only (no review text); never seeded.',
    '- Demo / tutorial listings are never part of the public directory.',
    '',
    '## How availability is confirmed',
    '',
    `CareLinkAI never stores "live" availability. It stores an open-bed count plus an honest timestamp and source, written only by the operator or a CareLinkAI concierge. Anything older than ${AVAILABILITY_FRESH_DAYS} days is shown as "Contact to confirm availability".`,
    '',
    '## Fee model',
    '',
    FEE_MODEL_LINE,
    '',
    '## Directory pages',
    '',
    `- Cleveland senior care hub: ${SITE_URL}/cleveland`,
    `- Assisted living in Greater Cleveland (server-rendered listings): ${SITE_URL}/cleveland/assisted-living`,
    ...SUBURBS.map((s) => `- Assisted living in ${s.name}, OH: ${SITE_URL}${suburbPath(s)}`),
    `- Memory care: ${SITE_URL}/cleveland/memory-care`,
    `- Independent living: ${SITE_URL}/cleveland/independent-living`,
    `- Nursing homes: ${SITE_URL}/cleveland/nursing-homes`,
    `- Home care agencies (aides + families): ${SITE_URL}/cleveland/home-care-agencies`,
    `- Family concierge (private pay; free lane for Medicaid/Medicare/VA): ${SITE_URL}/concierge`,
    `- Search every home: ${SITE_URL}/search`,
    `- Senior care guides: ${SITE_URL}/learn`,
    '',
    '## Structured data',
    '',
    '- Every public listing page (/homes/<id>) embeds schema.org LocalBusiness JSON-LD: name, address, geo, telephone (claimed listings only), care types offered, verified-availability status + timestamp, starting price where published, ODH license number, inspection summary (counts + most recent survey date), and the free Medicaid-lane note.',
    '- Directory pages embed schema.org ItemList JSON-LD of the listings they show.',
    '- The home page embeds schema.org Organization JSON-LD.',
    '',
    '## Not published',
    '',
    'No resident, patient or family data (ever), no operator contact emails, no review text.',
    '',
  ];
  return lines.join('\n');
}
