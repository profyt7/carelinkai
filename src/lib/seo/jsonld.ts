/**
 * schema.org JSON-LD builders (sprint W3 item 6 — agent-readable listings).
 *
 * Goal: the verified facts CareLinkAI holds about a Cleveland home are what
 * AI answer engines and Google read, in a shape they already understand.
 *
 * Rules every builder follows:
 *   - business data only — never PHI, never family data, never an operator
 *     contact email; telephone only once the listing is claimed (the public
 *     listing view already enforces that);
 *   - demo listings are excluded by the CALLERS (layout / pages query
 *     isDemo:false) — the builders never see them;
 *   - facts, no grades: inspection data is counts + dates;
 *   - a field with no data is OMITTED, never an empty string / null / [] —
 *     `compact()` strips those recursively and the unit test proves it.
 *
 * Pure + dependency-free apart from the PublicListing view (W3-4), so the
 * same object that renders a card also feeds the JSON-LD.
 */

import type { PublicListing } from '@/lib/directory/public-listings';

export const SITE_URL = 'https://getcarelinkai.com';
export const ORG_NAME = 'CareLinkAI';

/**
 * The one-line fee model, as published on /llms.txt and in the Organization
 * JSON-LD (decided 2026-10-17, OL-158). Families search and contact homes free;
 * homes never pay to be listed or ranked; the only paid product is the optional
 * family-paid concierge. No facility move-in fee is mentioned (not active).
 */
export const FEE_MODEL_LINE =
  'Free for families to search and contact homes. Homes never pay to be listed or ranked. Optional Family Concierge: $399 flat for private-pay families, refunded if there is no verified shortlist within 2 business days. Families paying through Medicaid, Medicare or the VA always get our help free.';

type Json = Record<string, unknown>;

/** How a listing's availability was last verified (OL-163d) — plain words for agents. */
export const AVAILABILITY_SOURCE_LABEL: Record<string, string> = {
  OPERATOR: 'Entered by the operator',
  SMS: 'Text reply from the home',
  EMAIL: 'Email reply from the home',
  VOICE: 'Automated phone call to the home',
  CONCIERGE: 'Confirmed by a CareLinkAI concierge call',
  PING: 'One-tap weekly reply from the home',
  AI_CALL: "Phone call to the home's business line by CareLinkAI's automated assistant, reviewed by a person before publishing",
};

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'number') return !Number.isFinite(v);
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/**
 * Recursively drop null / undefined / '' / NaN / [] / {} so the emitted
 * document never carries an empty value. Arrays keep their order.
 */
export function compact<T>(value: T): T {
  if (Array.isArray(value)) {
    const out = value.map((v) => compact(v)).filter((v) => !isEmpty(v));
    return out as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Json = {};
    for (const [k, v] of Object.entries(value as Json)) {
      const c = compact(v);
      if (!isEmpty(c)) out[k] = c;
    }
    return out as unknown as T;
  }
  return value;
}

export const CARE_TYPE_SERVICE_NAME: Record<PublicListing['careLevels'][number], string> = {
  INDEPENDENT: 'Independent Living',
  ASSISTED: 'Assisted Living',
  MEMORY_CARE: 'Memory Care',
  SKILLED_NURSING: 'Skilled Nursing',
};

function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

/** LocalBusiness document for one public, non-demo listing page. */
export function buildListingJsonLd(l: PublicListing, opts: { description?: string | null } = {}): Json {
  const url = `${SITE_URL}${l.href}`;
  const description = (opts.description ?? l.description ?? '').trim();

  const address =
    l.street || l.city || l.state || l.zipCode
      ? {
          '@type': 'PostalAddress',
          streetAddress: l.street ?? undefined,
          addressLocality: l.city ?? undefined,
          addressRegion: l.state ?? undefined,
          postalCode: l.zipCode ?? undefined,
          addressCountry: 'US',
        }
      : undefined;

  const geo =
    typeof l.latitude === 'number' && typeof l.longitude === 'number'
      ? { '@type': 'GeoCoordinates', latitude: l.latitude, longitude: l.longitude }
      : undefined;

  // Care types offered → one Offer per Service. A published starting price is
  // attached to the first offer (it is the facility's "from" price).
  const startingPrice = l.pricing.hasPrice && l.pricing.source !== 'FAMILY_AVG' ? l.pricing.amount : null;
  const makesOffer = l.careLevels.map((c, i) => ({
    '@type': 'Offer',
    itemOffered: { '@type': 'Service', name: CARE_TYPE_SERVICE_NAME[c] ?? c, serviceType: 'Senior care' },
    ...(i === 0 && startingPrice
      ? {
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: startingPrice,
            priceCurrency: 'USD',
            unitText: 'MONTH',
            name: l.pricing.sourceLabel ? `Starting price (${l.pricing.sourceLabel})` : 'Starting price',
          },
        }
      : {}),
  }));

  const additionalPropertyCandidates: Array<Json | undefined> = [
    {
      '@type': 'PropertyValue',
      name: 'Verified availability',
      value: l.availability.fresh ? 'Verified' : 'Contact to confirm',
      description: l.availability.label,
    },
    l.availability.fresh && l.availability.verifiedAt
      ? { '@type': 'PropertyValue', name: 'Availability verified at', value: l.availability.verifiedAt }
      : undefined,
    l.availability.fresh && l.availability.count != null
      ? { '@type': 'PropertyValue', name: 'Openings (verified)', value: l.availability.count }
      : undefined,
    // OL-163d: agent-readable keys. Only a QA-approved source ever sets
    // availabilityVerifiedAt, so these are reviewed facts, never a guess.
    l.availability.fresh && l.availability.verifiedAt
      ? { '@type': 'PropertyValue', name: 'availabilityVerifiedAt', value: l.availability.verifiedAt }
      : undefined,
    l.availability.fresh && l.availability.source
      ? { '@type': 'PropertyValue', name: 'availabilitySource', value: l.availability.source, description: AVAILABILITY_SOURCE_LABEL[l.availability.source] ?? l.availability.source }
      : undefined,
    l.medicaidWaiver.line
      ? { '@type': 'PropertyValue', name: 'medicaidWaiverStatus', value: l.medicaidWaiver.status, description: `${l.medicaidWaiver.line}. ${l.medicaidWaiver.note ?? ''}`.trim() }
      : undefined,
    l.medicaidWaiver.pendingAccepted !== null
      ? { '@type': 'PropertyValue', name: 'medicaidPendingAccepted', value: l.medicaidWaiver.pendingAccepted ? 'yes' : 'no', description: l.medicaidWaiver.pendingLine ?? undefined }
      : undefined,
    { '@type': 'PropertyValue', name: 'ODH surveys on file', value: l.inspections.surveyCount },
    l.inspections.latestSurveyDate
      ? { '@type': 'PropertyValue', name: 'Most recent ODH survey date', value: l.inspections.latestSurveyDate }
      : undefined,
    l.inspections.latestSurveyType
      ? { '@type': 'PropertyValue', name: 'Most recent ODH survey type', value: l.inspections.latestSurveyType }
      : undefined,
    l.inspections.latestCitationCount != null
      ? { '@type': 'PropertyValue', name: 'Citations on most recent ODH survey', value: l.inspections.latestCitationCount }
      : undefined,
    l.inspections.surveyCount > 0
      ? { '@type': 'PropertyValue', name: 'Total ODH citations on file', value: l.inspections.totalCitations }
      : undefined,
    {
      '@type': 'PropertyValue',
      name: 'Free Medicaid lane',
      value: 'No CareLinkAI fee when care is paid through Medicaid, Medicare or the VA',
    },
    { '@type': 'PropertyValue', name: 'Listing verified by operator', value: l.claimed ? 'Yes' : 'No (public-records listing)' },
  ];
  const additionalProperty = additionalPropertyCandidates.filter((p): p is Json => p !== undefined);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    url,
    name: l.name,
    description: description || undefined,
    image: l.photoIsPlaceholder ? undefined : l.photoUrl,
    telephone: l.phone ?? undefined, // claimed listings only (view enforces it)
    sameAs: l.websiteUrl ?? undefined,
    address,
    geo,
    identifier: l.odhLicenseNumber
      ? { '@type': 'PropertyValue', propertyID: 'Ohio Department of Health license number', value: l.odhLicenseNumber }
      : undefined,
    priceRange: startingPrice ? `From ${money(startingPrice)}/month` : undefined,
    makesOffer,
    additionalProperty,
    areaServed: l.city ? { '@type': 'City', name: `${l.city}, ${l.state ?? 'OH'}` } : undefined,
    isAccessibleForFree: false,
    publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: ORG_NAME, url: SITE_URL },
  });
}

/**
 * The embedded LocalBusiness for one carousel entry (sprint W5-4, G6). Google's
 * Carousel rich result wants EITHER a summary ListItem (url + name) OR an
 * all-in-one ListItem whose `item` carries the full entity — never both, so the
 * ListItem itself carries only `position` + `item`. `image`, `priceRange` and
 * `telephone` are added only when the fact exists (placeholder photos, unclaimed
 * phones and family-reported averages are not published).
 */
export function buildListItemBusiness(l: PublicListing): Json {
  const url = `${SITE_URL}${l.href}`;
  const startingPrice = l.pricing.hasPrice && l.pricing.source !== 'FAMILY_AVG' ? l.pricing.amount : null;
  return compact({
    '@type': 'LocalBusiness',
    '@id': url,
    name: l.name,
    url,
    image: l.photoIsPlaceholder ? undefined : l.photoUrl,
    telephone: l.phone ?? undefined, // claimed listings only (view enforces it)
    priceRange: startingPrice ? `From ${money(startingPrice)}/month` : undefined,
    address:
      l.street || l.city || l.state || l.zipCode
        ? {
            '@type': 'PostalAddress',
            streetAddress: l.street ?? undefined,
            addressLocality: l.city ?? undefined,
            addressRegion: l.state ?? undefined,
            postalCode: l.zipCode ?? undefined,
            addressCountry: 'US',
          }
        : undefined,
  });
}

/** ItemList (Carousel) of listing pages for a directory page (W3 item 6b, W5-4). */
export function buildListingsItemListJsonLd(args: { url: string; name: string; listings: readonly PublicListing[] }): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${args.url}#listings`,
    url: args.url,
    name: args.name,
    numberOfItems: args.listings.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    // All-in-one ListItems: position + item ONLY (no url/name on the ListItem).
    itemListElement: args.listings.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: buildListItemBusiness(l),
    })),
  });
}

/** ItemList of directory PAGES (the /cleveland hub). */
export function buildPagesItemListJsonLd(args: { url: string; name: string; pages: ReadonlyArray<{ url: string; name: string }> }): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${args.url}#directory`,
    url: args.url,
    name: args.name,
    numberOfItems: args.pages.length,
    itemListElement: args.pages.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: p.url, name: p.name })),
  });
}

/** Organization document for the home page (W3 item 6d). No contact email. */
export function buildOrganizationJsonLd(): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: ORG_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'A Cleveland-built senior care directory: licensed assisted living, memory care, independent living and nursing homes with Ohio Department of Health inspection facts, verified availability and published pricing. Families contact homes directly; no broker fees.',
    foundingLocation: { '@type': 'Place', name: 'Cleveland, Ohio' },
    founder: { '@type': 'Person', name: 'Chris Tolliver' },
    address: { '@type': 'PostalAddress', addressLocality: 'Cleveland', addressRegion: 'OH', addressCountry: 'US' },
    areaServed: ['Cuyahoga', 'Summit', 'Lake', 'Lorain', 'Medina', 'Geauga', 'Portage'].map((c) => ({
      '@type': 'AdministrativeArea',
      name: `${c} County, Ohio`,
    })),
    knowsAbout: ['Assisted living', 'Memory care', 'Independent living', 'Skilled nursing', 'Home care', 'Ohio Department of Health inspections'],
    slogan: 'Verified senior care in Cleveland. No broker fees.',
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Fee model', value: FEE_MODEL_LINE },
      { '@type': 'PropertyValue', name: 'Machine-readable overview', value: `${SITE_URL}/llms.txt` },
    ],
  });
}
