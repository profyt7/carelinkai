/**
 * Provider launch taxonomy (10/29). Six categories a provider can pick (more than one: the
 * existing `Provider.serviceTypes String[]`) and families can search by. See docs/PROVIDER_TAXONOMY.md.
 *
 * Existing providers are never rewritten. Their stored legacy values map onto a launch category
 * through `aliases`, so search and labels treat them as that category. Legacy values with no safe
 * mapping (`medical-services`, which may or may not be skilled care; `home-modification`, a future
 * category) still show on the profile but match no launch filter until the provider re-picks.
 *
 * Skilled (licensed, clinical) and non-medical categories are labelled apart on purpose: a family
 * must never read companionship or homemaking as nursing. Pure data; safe in client components.
 */

export type ProviderCategoryKind = 'skilled' | 'non-medical' | 'service';

export type ProviderCategory = {
  value: string;
  label: string;
  /** Short qualifier shown with the label wherever a family picks or reads a category. */
  kind: ProviderCategoryKind;
  description: string;
  /** Legacy stored values that count as this category. */
  aliases: readonly string[];
};

export const PROVIDER_CATEGORIES: readonly ProviderCategory[] = [
  {
    value: 'home-health',
    label: 'Home Health Care',
    kind: 'skilled',
    description: 'Skilled, licensed care at home: nursing, wound care, medication management',
    aliases: [],
  },
  {
    value: 'personal-care',
    label: 'Personal Care & Home Assistance',
    kind: 'non-medical',
    description: 'Non-medical help: bathing, dressing, companionship, homemaking, respite',
    aliases: ['companionship', 'housekeeping', 'meal-prep', 'respite-care'],
  },
  {
    value: 'therapy',
    label: 'Physical & Rehabilitation Therapy',
    kind: 'skilled',
    description: 'Licensed physical, occupational and speech therapy',
    aliases: [],
  },
  {
    value: 'transportation',
    label: 'Medical Transportation',
    kind: 'service',
    description: 'Non-emergency medical rides, wheelchair transport, appointments',
    aliases: [],
  },
  {
    value: 'meal-delivery',
    label: 'Meal Delivery & Nutrition',
    kind: 'service',
    description: 'Prepared meals delivered, special diets, nutrition support',
    aliases: [],
  },
  {
    value: 'medical-equipment',
    label: 'Medical Equipment & Supplies',
    kind: 'service',
    description: 'Mobility aids, hospital beds, oxygen, incontinence and other supplies',
    aliases: [],
  },
] as const;

export const PROVIDER_CATEGORY_VALUES = PROVIDER_CATEGORIES.map((c) => c.value);

export const KIND_LABEL: Record<ProviderCategoryKind, string | null> = {
  skilled: 'Skilled, licensed',
  'non-medical': 'Non-medical',
  service: null,
};

/** Legacy values with no launch category. Shown on profiles, never matched by a launch filter. */
export const LEGACY_SERVICE_LABELS: Record<string, string> = {
  'medical-services': 'Medical services (unspecified)',
  'home-modification': 'Home modification',
};

/** "Home Health Care (skilled, licensed)" / "Personal Care & Home Assistance (non-medical)". */
export function categoryDisplayLabel(c: ProviderCategory): string {
  const k = KIND_LABEL[c.kind];
  return k ? `${c.label} (${k.toLowerCase()})` : c.label;
}

/** The launch category a stored value belongs to (itself or via an alias), if any. */
export function categoryFor(stored: string): ProviderCategory | undefined {
  const v = stored.toLowerCase();
  return PROVIDER_CATEGORIES.find((c) => c.value === v || c.aliases.includes(v));
}

/**
 * Stored values a filter must match: a launch category (or an old link's alias) expands to the
 * category plus its aliases; anything else matches only itself.
 */
export function storedValuesFor(filters: string[]): string[] {
  const out = new Set<string>();
  for (const f of filters) {
    const v = f.toLowerCase();
    const c = categoryFor(v);
    if (!c) {
      out.add(v);
      continue;
    }
    out.add(c.value);
    c.aliases.forEach((a) => out.add(a));
  }
  return Array.from(out);
}

/** Display labels for a provider's stored values: launch categories first (deduped), then legacy. */
export function serviceLabels(stored: string[] | null | undefined): string[] {
  const cats: string[] = [];
  const legacy: string[] = [];
  for (const s of stored ?? []) {
    const c = categoryFor(s);
    if (c) {
      const l = categoryDisplayLabel(c);
      if (!cats.includes(l)) cats.push(l);
    } else {
      const l = LEGACY_SERVICE_LABELS[s.toLowerCase()] ?? s;
      if (!legacy.includes(l)) legacy.push(l);
    }
  }
  return [...cats, ...legacy];
}

/** Parse the search param (`serviceTypes=a,b`; `serviceType`/`services` kept for old links). */
export function parseCategoryParam(sp: URLSearchParams): string[] {
  const raw = [sp.get('serviceTypes'), sp.get('services'), sp.get('serviceType')]
    .filter(Boolean)
    .join(',');
  return Array.from(new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)));
}

export const DELIVERY_MODES = [
  { value: 'in-home', label: 'In-home' },
  { value: 'facility', label: 'At a facility' },
  { value: 'remote', label: 'Remote' },
] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number]['value'];
export const DELIVERY_MODE_VALUES: readonly string[] = DELIVERY_MODES.map((m) => m.value);

/** Short list for the homepage Providers card: exactly the six selectable, searchable categories. */
export const PROVIDER_CATEGORY_SUMMARY =
  'Home health care, personal care, therapy, medical transportation, meal delivery and medical equipment';
