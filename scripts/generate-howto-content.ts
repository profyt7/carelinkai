/**
 * Codegen: transform the cleaned How-To guide bundle into the data module the
 * /learn How-To hub renders (src/app/learn/howto/content.ts).
 *
 * Source of truth: _app_content_bundle/manifest.json + content/<role>/*.md
 * (frontmatter + a "## Steps / ## Tips / ## FAQ" body). Re-run after the
 * bundle changes:
 *
 *   npx tsx scripts/generate-howto-content.ts
 *
 * Images: each guide's frontmatter lists screenshot filenames, but the PNGs
 * are not in the repo yet. We emit the full desired list on each guide AND a
 * build-time AVAILABLE_HOWTO_IMAGES set (scanned from public/howto). The
 * renderer only shows images that actually exist, so nothing 404s today and
 * screenshots light up automatically once dropped into public/howto.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..');
const BUNDLE = path.join(REPO, '_app_content_bundle');
const OUT = path.join(REPO, 'src', 'app', 'learn', 'howto', 'content.ts');
const PUBLIC_HOWTO = path.join(REPO, 'public', 'howto');

type Audience =
  | 'getting-started'
  | 'family'
  | 'operator'
  | 'caregiver'
  | 'provider'
  | 'discharge-planner';

const ROLE_TO_AUDIENCE: Record<string, Audience> = {
  shared: 'getting-started',
  family: 'family',
  operator: 'operator',
  caregiver: 'caregiver',
  provider: 'provider',
  'discharge-planner': 'discharge-planner',
};

// Per-guide icons (fall back to a role default).
const ROLE_DEFAULT_ICON: Record<string, string> = {
  shared: '🚀',
  family: '🏠',
  operator: '🏢',
  caregiver: '🧑‍⚕️',
  provider: '🤝',
  'discharge-planner': '🏥',
};
const SLUG_ICON: Record<string, string> = {
  'signup-and-login': '🔐',
  messaging: '💬',
  'settings-profile-and-notifications': '⚙️',
  'search-homes': '🔎',
  'save-and-compare': '💛',
  'send-inquiry': '📨',
  'schedule-tour': '📅',
  'ai-match': '✨',
  'family-portal': '👨‍👩‍👧',
  'claim-your-listing': '🏷️',
  'operator-dashboard': '📊',
  'manage-home-and-photos': '🏠',
  'leads-and-inquiries-pipeline': '📥',
  'tour-management': '🗓️',
  residents: '🧑‍🦳',
  'shifts-and-oncall-ai': '📞',
  'compliance-kits': '📋',
  'analytics-and-billing': '💳',
  'caregiver-dashboard': '📊',
  'profile-and-credentials': '🪪',
  'marketplace-jobs-and-applications': '🧰',
  'shifts-and-timesheets': '⏱️',
  'reliability-points': '🏆',
  'public-profile-and-background-checks': '🛡️',
  'provider-dashboard-and-onboarding': '🤝',
  'profile-services-and-pricing': '🧾',
  'marketplace-listing-and-presence': '📣',
  'placement-search': '🏥',
  'refer-and-inquire-on-behalf': '📨',
};

interface Manifest {
  roles: { role: string; label: string; guides: { slug: string; order: number; file: string }[] }[];
}

interface Frontmatter {
  title: string;
  role: string;
  slug: string;
  order: number;
  audience: string;
  summary: string;
  images: string[];
  source: string;
}

interface OutStep {
  section?: string;
  text: string;
}
interface OutFaq {
  q: string;
  a: string;
}
interface OutGuide {
  slug: string;
  title: string;
  audiences: Audience[];
  icon: string;
  whoFor: string;
  summary: string;
  readTime: string;
  steps: OutStep[];
  tips: string[];
  faq: OutFaq[];
  images: string[];
}

/** Strip inline markdown + internal cross-file references to clean reader text. */
function cleanInline(s: string): string {
  return s
    // drop "*(See `xx.md`.)*" style internal cross-refs
    .replace(/\*?\(See[^)]*\)\*?/gi, '')
    // drop bare `something.md` code refs
    .replace(/`[^`]*\.md`/g, '')
    // markdown links -> link text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // inline code -> text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s{2,}/g, ' ')
    // tidy stray space before punctuation left by removed cross-refs
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function parseFrontmatter(raw: string): { fm: Frontmatter; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('missing frontmatter');
  const block = m[1];
  const body = m[2];
  const get = (key: string): string => {
    const line = block.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    return line ? line[1].trim() : '';
  };
  const unquote = (v: string) => v.replace(/^"(.*)"$/s, '$1');
  const imagesRaw = get('images') || '[]';
  let images: string[] = [];
  try {
    images = JSON.parse(imagesRaw);
  } catch {
    images = [];
  }
  return {
    fm: {
      title: unquote(get('title')),
      role: get('role'),
      slug: get('slug'),
      order: parseInt(get('order') || '0', 10),
      audience: unquote(get('audience')),
      summary: unquote(get('summary')),
      images,
      source: unquote(get('source')),
    },
    body,
  };
}

/** Split the body into its "## Section" blocks. */
function sections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = body.split(/^##\s+/m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const name = p.slice(0, nl).trim().toLowerCase();
    out[name] = p.slice(nl + 1);
  }
  return out;
}

function parseSteps(stepsBody: string): OutStep[] {
  const steps: OutStep[] = [];
  let currentSection: string | undefined;
  let sectionUsed = false;
  const lines = stepsBody.split('\n');
  for (const line of lines) {
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      currentSection = cleanInline(h3[1]);
      sectionUsed = false;
      continue;
    }
    const num = line.match(/^\s*\d+\.\s+(.*)$/);
    if (num) {
      const text = cleanInline(num[1]);
      if (!text) continue;
      const step: OutStep = { text };
      if (currentSection && !sectionUsed) {
        step.section = currentSection;
        sectionUsed = true;
      }
      steps.push(step);
    }
  }
  return steps;
}

function parseTips(tipsBody = ''): string[] {
  return tipsBody
    .split('\n')
    .map((l) => l.match(/^[-*]\s+(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => cleanInline(m[1]))
    .filter(Boolean);
}

function parseFaq(faqBody = ''): OutFaq[] {
  const out: OutFaq[] = [];
  for (const line of faqBody.split('\n')) {
    const m = line.match(/^[-*]\s+(.*)$/);
    if (!m) continue;
    // "**Question?** Answer text" — bold lead is the question.
    const qm = m[1].match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (qm) {
      out.push({ q: cleanInline(qm[1]), a: cleanInline(qm[2]) });
    } else {
      const text = cleanInline(m[1]);
      const qi = text.indexOf('?');
      if (qi > -1 && qi < text.length - 1) {
        out.push({ q: text.slice(0, qi + 1).trim(), a: text.slice(qi + 1).trim() });
      } else {
        out.push({ q: text, a: '' });
      }
    }
  }
  return out;
}

function readTime(body: string): string {
  const words = body.split(/\s+/).filter(Boolean).length;
  return `${Math.max(2, Math.round(words / 180))} min`;
}

function buildGuide(fm: Frontmatter, body: string): OutGuide {
  const secs = sections(body);
  return {
    slug: fm.slug,
    title: fm.title,
    audiences: [ROLE_TO_AUDIENCE[fm.role]],
    icon: SLUG_ICON[fm.slug] || ROLE_DEFAULT_ICON[fm.role] || '📘',
    whoFor: fm.audience,
    summary: fm.summary,
    readTime: readTime(body),
    steps: parseSteps(secs['steps'] || ''),
    tips: parseTips(secs['tips']),
    faq: parseFaq(secs['faq']),
    images: fm.images,
  };
}

function availableImages(): string[] {
  if (!fs.existsSync(PUBLIC_HOWTO)) return [];
  return fs
    .readdirSync(PUBLIC_HOWTO)
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .sort();
}

function emit(guides: OutGuide[]): string {
  const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: _app_content_bundle (manifest.json + content/<role>/*.md).
 * Regenerate: npx tsx scripts/generate-howto-content.ts
 *
 * How-To Guides content model for the Education Hub (/learn).
 *
 *  - Role-gating lives in src/lib/howto/access.ts (audiences -> roles).
 *  - 'getting-started' + 'family' are visible to everyone; each role also sees
 *    its own audience. Admin-internal and Affiliate content are intentionally
 *    NOT part of HowToAudience, so they can never appear in the public hub.
 *  - 'images' lists the screenshots a guide wants. The actual files may not be
 *    in the repo yet; AVAILABLE_HOWTO_IMAGES (scanned from public/howto at
 *    codegen time) lets the renderer show only images that exist — text-first,
 *    no broken links.
 */

export type HowToAudience =
  | 'getting-started'
  | 'family'
  | 'operator'
  | 'caregiver'
  | 'provider'
  | 'discharge-planner';

export interface HowToStep {
  /** Optional group heading (a "### ..." section in the source guide). */
  section?: string;
  text: string;
  /** Optional per-step image (unused for now — images render as a gallery). */
  image?: string;
  imageAlt?: string;
}

export interface HowToFaq {
  q: string;
  a: string;
}

export interface HowToGuide {
  slug: string;
  title: string;
  audiences: HowToAudience[];
  icon: string;
  /** "Who it's for" line. */
  whoFor: string;
  /** 30-second summary. */
  summary: string;
  readTime: string;
  steps: HowToStep[];
  tips?: string[];
  faq?: HowToFaq[];
  /** Screenshot filenames this guide wants (may not be in the repo yet). */
  images?: string[];
  /** Internal video voiceover script — never rendered publicly. */
  narrationScript?: string;
}

export const AUDIENCE_LABELS: Record<HowToAudience, string> = {
  'getting-started': 'Getting Started',
  family: 'For Families',
  operator: 'For Operators',
  caregiver: 'For Caregivers',
  provider: 'For Providers',
  'discharge-planner': 'For Discharge Planners',
};

/** Display order for the grouped sections on the hub page. */
export const AUDIENCE_ORDER: HowToAudience[] = [
  'getting-started',
  'family',
  'operator',
  'caregiver',
  'provider',
  'discharge-planner',
];

/**
 * Screenshot filenames that actually exist under public/howto at build time.
 * The renderer only shows images in this set, so missing screenshots never
 * 404 or break layout. Re-run the codegen after adding files to public/howto.
 */
export const AVAILABLE_HOWTO_IMAGES: ReadonlySet<string> = new Set(${JSON.stringify(
    availableImages()
  )});

export const HOWTO_GUIDES: HowToGuide[] = ${serializeGuides(guides)};

export function getHowToGuide(slug: string): HowToGuide | undefined {
  return HOWTO_GUIDES.find((g) => g.slug === slug);
}
`;
  return header;
}

function serializeGuides(guides: OutGuide[]): string {
  const lines: string[] = ['['];
  for (const g of guides) {
    lines.push('  {');
    lines.push(`    slug: ${JSON.stringify(g.slug)},`);
    lines.push(`    title: ${JSON.stringify(g.title)},`);
    lines.push(`    audiences: ${JSON.stringify(g.audiences)},`);
    lines.push(`    icon: ${JSON.stringify(g.icon)},`);
    lines.push(`    whoFor: ${JSON.stringify(g.whoFor)},`);
    lines.push(`    summary: ${JSON.stringify(g.summary)},`);
    lines.push(`    readTime: ${JSON.stringify(g.readTime)},`);
    lines.push(`    steps: [`);
    for (const s of g.steps) {
      const parts = [`text: ${JSON.stringify(s.text)}`];
      if (s.section) parts.unshift(`section: ${JSON.stringify(s.section)}`);
      lines.push(`      { ${parts.join(', ')} },`);
    }
    lines.push(`    ],`);
    if (g.tips.length) {
      lines.push(`    tips: ${JSON.stringify(g.tips)},`);
    }
    if (g.faq.length) {
      lines.push(`    faq: [`);
      for (const f of g.faq) {
        lines.push(`      { q: ${JSON.stringify(f.q)}, a: ${JSON.stringify(f.a)} },`);
      }
      lines.push(`    ],`);
    }
    if (g.images.length) {
      lines.push(`    images: ${JSON.stringify(g.images)},`);
    }
    lines.push('  },');
  }
  lines.push(']');
  return lines.join('\n');
}

function main() {
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(BUNDLE, 'manifest.json'), 'utf8'));
  const guides: OutGuide[] = [];
  for (const role of manifest.roles) {
    const ordered = [...role.guides].sort((a, b) => a.order - b.order);
    for (const g of ordered) {
      const raw = fs.readFileSync(path.join(BUNDLE, g.file), 'utf8');
      const { fm, body } = parseFrontmatter(raw);
      guides.push(buildGuide(fm, body));
    }
  }
  fs.writeFileSync(OUT, emit(guides));
  console.log(`Wrote ${guides.length} guides to ${path.relative(REPO, OUT)}`);
  console.log(`Available images: ${availableImages().length}`);
}

main();
