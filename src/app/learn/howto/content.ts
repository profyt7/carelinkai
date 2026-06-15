/**
 * How-To Guides content model for the Education Hub.
 *
 * The shape mirrors the source guides authored in the ChrisOS vault
 * (`04_CareLinkAI/howto/`): title, "who it's for", a 30-second summary,
 * numbered steps (each with an optional image placeholder), tips, an FAQ,
 * and a narration script used for video voiceover.
 *
 * IMPORTANT (role-gating + public exposure):
 *  - `narrationScript` is for internal video production ONLY and is never
 *    rendered to end users. It lives here behind the render layer.
 *  - Admin-internal and Affiliate guides are intentionally excluded from the
 *    public hub (see HowToAudience — there is no "admin"/"affiliate" audience).
 *
 * The starter guides below are authored from CareLinkAI's actual flows. The
 * full set of 25 guides lives in the vault and should be ported into this
 * array (the field shape already matches), excluding the internal admin
 * overview and any affiliate guides, and stripping NARRATION SCRIPT blocks
 * into `narrationScript`.
 */

export type HowToAudience =
  | 'getting-started'
  | 'family'
  | 'operator'
  | 'caregiver'
  | 'provider'
  | 'discharge-planner';

export interface HowToStep {
  /** Numbered step instruction. */
  text: string;
  /**
   * Optional image placeholder key (the vault guides use `(img: …)` markers).
   * The actual asset files are not captured yet, so the render layer must
   * degrade gracefully when the file is missing — see howtoImageUrl().
   */
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
  /** Audiences allowed to see this guide. */
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

export const HOWTO_GUIDES: HowToGuide[] = [
  {
    slug: 'creating-your-carelinkai-account',
    title: 'Creating Your CareLinkAI Account',
    audiences: ['getting-started'],
    icon: '🚀',
    whoFor: 'Anyone new to CareLinkAI — families, operators, caregivers, and partners.',
    summary:
      'Sign up, verify your email, choose your role, and land on the dashboard built for how you use CareLinkAI.',
    readTime: '2 min',
    steps: [
      { text: 'Go to the sign-up page and enter your name, email, and a password.', image: 'signup-form.png', imageAlt: 'Sign-up form' },
      { text: 'Choose the role that fits you: Family, Operator, Caregiver, Provider, or Discharge Planner.' },
      { text: 'Check your email for a verification link and confirm your address.' },
      { text: 'Sign in — you will be taken to the dashboard tailored to your role.' },
    ],
    tips: [
      'Use the email address you check most often — important updates and inquiry notifications are sent there.',
      'You can update your profile and notification preferences any time from Settings.',
    ],
    faq: [
      { q: 'Can I change my role later?', a: 'Roles are tied to how your account is set up. Contact support if you signed up under the wrong role.' },
    ],
    narrationScript:
      'Welcome to CareLinkAI. In this short guide we will create your account and get you to the right dashboard...',
  },
  {
    slug: 'finding-a-home-as-a-family',
    title: 'Finding the Right Home for Your Loved One',
    audiences: ['family'],
    icon: '🔎',
    whoFor: 'Families searching for assisted living, memory care, or skilled nursing.',
    summary:
      'Search homes by location, care level, and budget, compare your shortlist, and reach out to the homes that fit.',
    readTime: '3 min',
    steps: [
      { text: 'Open Search and enter the city or area you are looking in.', image: 'search-location.png', imageAlt: 'Home search by location' },
      { text: 'Filter by care level (assisted living, memory care, skilled nursing) and your monthly budget.' },
      { text: 'Open a listing to see photos, amenities, pricing, and the care levels the home supports.' },
      { text: 'Save the homes you like to build a shortlist you can compare side by side.' },
    ],
    tips: [
      'Prioritize homes within a 15–20 minute drive of family who will visit — proximity meaningfully improves resident wellbeing.',
      'Read our family guides on touring and costs before you reach out.',
    ],
  },
  {
    slug: 'sending-an-inquiry-and-booking-a-tour',
    title: 'Sending an Inquiry and Booking a Tour',
    audiences: ['family'],
    icon: '📨',
    whoFor: 'Families ready to contact a home and schedule a visit.',
    summary:
      'Send an inquiry from any listing, share what your loved one needs, and request a tour time — the operator is notified instantly.',
    readTime: '2 min',
    steps: [
      { text: 'On a home listing, click "Send Inquiry" / "Contact".', image: 'inquiry-button.png', imageAlt: 'Contact home button' },
      { text: 'Fill in your name, email, the resident’s name, move-in timeframe, and the care services you need.' },
      { text: 'Optionally pick a tour date and time, then submit.' },
      { text: 'You will see a confirmation, and the home’s operator receives your inquiry as a new lead.' },
    ],
    tips: [
      'Add a short note about your situation — it helps the operator respond with relevant information.',
    ],
    faq: [
      { q: 'Do I need an account to send an inquiry?', a: 'You can browse without one, but signing in lets you track your inquiries and responses in one place.' },
    ],
  },
  {
    slug: 'managing-inquiries-as-an-operator',
    title: 'Managing Inquiries in Your Pipeline',
    audiences: ['operator'],
    icon: '📥',
    whoFor: 'Operators handling incoming family inquiries and leads.',
    summary:
      'Every inquiry lands in your pipeline as NEW. Review it, respond, and move it through your stages to a tour or move-in.',
    readTime: '3 min',
    steps: [
      { text: 'Open the Inquiries / pipeline view from your operator dashboard.', image: 'operator-pipeline.png', imageAlt: 'Operator inquiry pipeline' },
      { text: 'Open a NEW inquiry to see the family’s contact info, the resident’s needs, and any requested tour time.' },
      { text: 'Respond to the family and add internal notes (notes are private to your team).' },
      { text: 'Update the inquiry status as it progresses (e.g., contacted, tour scheduled, converted).' },
    ],
    tips: [
      'Respond quickly — speed of first response is the strongest predictor of converting an inquiry.',
      'Use internal notes to keep your team aligned without exposing anything to the family.',
    ],
  },
  {
    slug: 'keeping-your-listing-current',
    title: 'Keeping Your Listing Accurate and Attractive',
    audiences: ['operator'],
    icon: '🏠',
    whoFor: 'Operators who want their homes to show up well in family searches.',
    summary:
      'Complete pricing, care levels, amenities, and photos so your listing ranks well and sets accurate expectations.',
    readTime: '3 min',
    steps: [
      { text: 'Open your home’s profile from the operator dashboard.', image: 'operator-listing-edit.png', imageAlt: 'Edit listing' },
      { text: 'Set the care levels you support, capacity, and current pricing range.' },
      { text: 'Add or update amenities and upload high-quality photos.' },
      { text: 'Publish — make sure the status is ACTIVE so families can find you in search.' },
    ],
    tips: [
      'Listings with accurate pricing and several photos receive substantially more qualified inquiries.',
    ],
  },
  {
    slug: 'setting-up-your-caregiver-profile',
    title: 'Setting Up Your Caregiver Profile',
    audiences: ['caregiver'],
    icon: '👩‍⚕️',
    whoFor: 'Caregivers offering services through the CareLinkAI marketplace.',
    summary:
      'Build a profile that wins shifts: add your experience, certifications, availability, and the care types you specialize in.',
    readTime: '3 min',
    steps: [
      { text: 'Open your caregiver profile from your dashboard.', image: 'caregiver-profile.png', imageAlt: 'Caregiver profile' },
      { text: 'Add your experience, specialties, and upload your certifications (e.g., CNA, CPR/first aid).' },
      { text: 'Set your availability and the areas you are willing to work in.' },
      { text: 'Save and publish your profile so operators and families can find and hire you.' },
    ],
    tips: [
      'Keep your certifications current — expired credentials can hide you from search.',
    ],
  },
  {
    slug: 'finding-and-accepting-shifts',
    title: 'Finding and Accepting Shifts',
    audiences: ['caregiver'],
    icon: '🗓️',
    whoFor: 'Caregivers looking for open shifts.',
    summary:
      'Browse open shifts that match your availability and specialties, accept the ones you want, and track your assignments.',
    readTime: '2 min',
    steps: [
      { text: 'Open the shifts marketplace from your dashboard.', image: 'shift-list.png', imageAlt: 'Open shifts' },
      { text: 'Filter by location, date, and care type.' },
      { text: 'Open a shift to review the details and pay, then accept it.' },
      { text: 'Track your accepted shifts and submit your timesheet after each one.' },
    ],
  },
  {
    slug: 'getting-started-as-a-provider',
    title: 'Getting Started as a Service Provider',
    audiences: ['provider'],
    icon: '🤝',
    whoFor: 'Service providers (transport, therapy, and other senior-care services) partnering with CareLinkAI.',
    summary:
      'Set up your provider profile and services so operators and families can find and request you.',
    readTime: '3 min',
    steps: [
      { text: 'Complete your provider profile with your company details and service area.', image: 'provider-profile.png', imageAlt: 'Provider profile' },
      { text: 'List the services you offer and how you price them.' },
      { text: 'Set your availability and contact preferences.' },
      { text: 'Publish your profile to start receiving requests.' },
    ],
  },
  {
    slug: 'ai-placement-search-for-discharge-planners',
    title: 'Running an AI Placement Search',
    audiences: ['discharge-planner'],
    icon: '🏥',
    whoFor: 'Hospital and rehab discharge planners placing patients quickly.',
    summary:
      'Describe the patient’s needs in plain language and let CareLinkAI parse the request and rank matching homes with available beds.',
    readTime: '3 min',
    steps: [
      { text: 'Open the discharge planner search and click "Start New Search".', image: 'dp-search.png', imageAlt: 'Discharge planner search' },
      { text: 'Describe the patient in plain language — e.g., "memory care in Boston for a 78-year-old with moderate Alzheimer’s, budget ~$6,000/month."' },
      { text: 'Click "Search with AI". CareLinkAI extracts the care level, location, and other criteria automatically.' },
      { text: 'Review the ranked matches with reasoning, available beds, and contact details, then reach out or create a placement request.' },
    ],
    tips: [
      'Include the city and state, care level, budget, and any urgent timeline to get the most relevant matches.',
    ],
    faq: [
      { q: 'What care levels can I search?', a: 'Independent living, assisted living, memory care, and skilled nursing.' },
    ],
  },
];

export function getHowToGuide(slug: string): HowToGuide | undefined {
  return HOWTO_GUIDES.find((g) => g.slug === slug);
}
