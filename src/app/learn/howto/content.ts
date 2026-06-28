/**
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
export const AVAILABLE_HOWTO_IMAGES: ReadonlySet<string> = new Set([]);

export const HOWTO_GUIDES: HowToGuide[] = [
  {
    slug: "signup-and-login",
    title: "Sign Up & Log In",
    audiences: ["getting-started"],
    icon: "🔐",
    whoFor: "Anyone creating a CareLinkAI account or signing in — families, operators, caregivers, providers, and partners.",
    summary: "Create an account by choosing your role and entering your email and a password, verify your email, then sign in at the login page. Forgot your password? Reset it from the same page.",
    readTime: "2 min",
    steps: [
      { section: "Create an account", text: "Go to getcarelinkai.com and choose Sign Up / Get Started." },
      { text: "Select the role that fits you — Family, Operator, Caregiver/Aide, Provider, or partner role. Your role shapes the dashboard and tools you'll see." },
      { text: "Enter your email and a password, then submit to create the account." },
      { text: "Verify your email: open the verification email CareLinkAI sends and click the confirmation link. This activates your account." },
      { section: "Log in", text: "Go to getcarelinkai.com/auth/login." },
      { text: "Enter your email and password and click Sign in." },
      { text: "You'll land on My Dashboard, tailored to your role." },
      { section: "Reset a forgotten password", text: "On the login page, click Forgot password?" },
      { text: "Enter your account email; CareLinkAI sends a reset link." },
      { text: "Open the email, click the link, and set a new password. Then sign in normally." },
    ],
    tips: ["Your dashboard's Quick Links (e.g., Search Homes, My Inquiries, Saved Homes for families) are the fastest way into common tasks.","Use the email address you check most often — verification and password-reset links go there.","If a sign-in doesn't seem to \"take,\" confirm both fields are filled and try again; make sure your email is verified."],
    faq: [
      { q: "Do I have to verify my email?", a: "Yes — verification activates the account before you can fully use it." },
      { q: "Can I change my role later?", a: "Roles drive your tools; contact support if you signed up under the wrong one." },
    ],
    images: ["01_register.png","02_login.png","03_dashboard.png"],
  },
  {
    slug: "messaging",
    title: "Messaging",
    audiences: ["getting-started"],
    icon: "💬",
    whoFor: "Anyone communicating through CareLinkAI — families talking to homes and caregivers, operators replying to leads, providers responding to inquiries.",
    summary: "Open **Messages** to see all your conversations in one inbox. Pick a conversation to read and reply, search to find an old thread, or start a fresh one with **New message**.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Messages (in the left menu, or Residents & Family → Messages for families)." },
      { text: "Your conversations list on the left shows each contact, the latest message preview, and the date. Unread threads are marked." },
      { text: "Click a conversation to open it on the right, read the full history, and type your reply at the bottom." },
      { text: "Use Search messages to find a thread by name or keyword." },
      { text: "Click New message to start a conversation with a new contact." },
    ],
    tips: ["Replies to your inquiries and tour requests land here, so check Messages after reaching out to a home.","Keep care decisions and quotes in Messages so there's a written record; store sensitive documents in the Family Portal's Documents tab instead.","The \"Select a conversation\" panel on the right is just a prompt — click any thread on the left to begin."],
    faq: [
      { q: "Where do home/caregiver replies appear?", a: "Right here in Messages, with a notification." },
      { q: "Can I start a conversation cold?", a: "Yes, via New message — or it starts automatically when you send an inquiry." },
    ],
    images: ["01_inbox.png","02_conversation.png"],
  },
  {
    slug: "settings-profile-and-notifications",
    title: "Settings — Profile, Account & Notifications",
    audiences: ["getting-started"],
    icon: "⚙️",
    whoFor: "Any user managing their profile, account security, notification preferences, or app setup.",
    summary: "**Settings** is the hub for your personal info, password and security, notification preferences, billing/payouts, and app/device setup. Open the card you need, make your changes, and save.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Settings (left menu → Settings → Settings). The hub shows cards for each area." },
      { text: "Choose the card you need:" },
      { text: "Update your profile: open Profile, edit your name, contact info, and photo, then Save." },
      { text: "Manage notifications: open Notifications, toggle which email and in-app alerts you want (e.g., inquiry replies, tour confirmations), then Save." },
      { text: "Change your password: open Account, enter your current and new password, and save." },
    ],
    tips: ["Families: filling in the Family Profile (care context) sharpens AI Match results — it's worth a few minutes.","Turn on notifications for inquiry replies and tour confirmations so you never miss a response from a home.","The role badge under your name (e.g., FAMILY) in the top-right confirms which account type you're in."],
    faq: [
      { q: "What's in Notifications?", a: "Email and in-app toggles for the events that matter to you." },
      { q: "Is CareLinkAI Plus required?", a: "No — it's an optional upgrade for priority matching and unlimited saved homes." },
    ],
    images: ["01_settings_hub.png"],
  },
  {
    slug: "search-homes",
    title: "Search for a Care Home",
    audiences: ["family"],
    icon: "🔎",
    whoFor: "Families looking for assisted living, memory care, independent living, or skilled nursing for a loved one.",
    summary: "Sign in, open Search Homes, filter by care level / budget / location, compare options, and open any listing to see details, photos, pricing, and contact options.",
    readTime: "2 min",
    steps: [
      { text: "Sign in at getcarelinkai.com with your family account." },
      { text: "From My Dashboard, click Search Homes in the Quick Links (or \"Listings → Search Homes\" in the left menu)." },
      { text: "The search page lists available homes. Use the Filters panel on the left: care level (Independent / Assisted / Memory Care / Skilled Nursing), monthly budget, location + radius, and gender preference. You can also type natural language into the search bar — e.g., \"Memory care near Cleveland\" or \"Assisted living under $5000.\"" },
      { text: "Toggle Grid / List / Map views (top right). Click Personalize to tune results to your needs." },
      { text: "Each card shows a Match %, availability, care types, and starting price. Click the heart to save a home to your shortlist, Compare to evaluate side-by-side, or View Listing for full details." },
      { text: "On a listing page you'll see capacity, availability, monthly cost, staffing, photo gallery, amenities, pricing, location map, and contact info. From here you can Schedule a Tour or Send Inquiry — no obligation or fees." },
    ],
    tips: ["Saved homes live under My Saved; inquiries you send are tracked under My Inquiries.","\"Contact us\" pricing means the facility quotes per care needs — sending an inquiry is the fastest way to get a number.","The Ask a Care Advisor bubble (bottom right) is available on every page."],
    images: ["01_login.png","02_dashboard.png","03_search_results.png","04_listing_detail.png"],
  },
  {
    slug: "save-and-compare",
    title: "Save Favorites & Compare Homes",
    audiences: ["family"],
    icon: "💛",
    whoFor: "Families narrowing a long list of care homes down to a short list of real contenders.",
    summary: "Tap the heart on any home to save it, switch on Compare to evaluate two or more side-by-side, then review everything you've shortlisted under My Favorites — organized by Homes, Caregivers, Providers, and Jobs.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Search Homes (Listings → Search Homes)." },
      { text: "On any result card, click the heart icon to save the home to your shortlist. The heart fills in and the saved counter in the top bar updates." },
      { text: "To compare options, click Compare on two or more cards. A banner appears at the top: \"X homes selected for comparison — select at least 2.\" Click Compare in that banner to open the side-by-side view." },
      { text: "Open My Favorites (the heart icon in the top bar, or Listings → My Saved). Everything you've saved lives here, grouped into tabs: All, Homes, Caregivers, Providers, Jobs." },
      { text: "Each saved card shows the home name, location, monthly price range, and a short description. Click a card to reopen the full listing, or tap the filled heart again to remove it from your list." },
    ],
    tips: ["The saved counter (heart badge) in the top navigation bar follows you on every page, so you always know how many homes are on your shortlist.","Compare is the fastest way to weigh price, care level, and availability across your top contenders without flipping between tabs.","Favorites are organized by type — if you also save caregivers or providers later, they file themselves under the right tab automatically."],
    faq: [
      { q: "Do saved homes expire?", a: "No — they stay on your list until you remove them." },
      { q: "Is there a limit?", a: "Free accounts can save homes; CareLinkAI Plus adds unlimited saved homes plus priority matching." },
    ],
    images: ["01_search_results.png","02_heart_saved.png","03_compare_banner.png","04_favorites.png"],
  },
  {
    slug: "send-inquiry",
    title: "Send an Inquiry to a Care Home",
    audiences: ["family"],
    icon: "📨",
    whoFor: "Families ready to reach out to a specific community to ask about availability, pricing, or care services.",
    summary: "Open any listing, click **Send Inquiry**, fill in your contact details, who the care is for, your move-in timeframe, and the care services you need, then submit. The home receives it instantly and it shows up in your inquiry tracker.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open a listing page for the home you're interested in." },
      { text: "In the \"Interested in [Home]?\" panel, click Send Inquiry. A contact form titled \"Contact [Home]\" slides in." },
      { text: "Fill in the form:" },
      { text: "Click Send / Submit Request. You'll get a confirmation, and the home's team is notified right away." },
      { text: "Track the status anytime under Leads & Inquiries → My Inquiries. Each inquiry shows the home, your contact info, the inquiry date, current status (e.g., New), and the next action the home should take." },
    ],
    tips: ["\"Contact us\" pricing means the home quotes based on care needs — an inquiry is the fastest way to get a real number.","There's no obligation or fee to inquire. You can reach out to several homes and compare responses.","After a home replies, the conversation continues in Messages."],
    faq: [
      { q: "Required fields:", a: "name, email, and the care recipient's name must be filled in or the form won't submit." },
      { q: "Where do replies go?", a: "Into your in-app Messages, and you'll see a notification." },
    ],
    images: ["01_listing_detail.png","02_inquiry_form.png","03_inquiry_filled.png","04_my_inquiries.png"],
  },
  {
    slug: "schedule-tour",
    title: "Schedule a Tour",
    audiences: ["family"],
    icon: "📅",
    whoFor: "Families who want to visit a community in person (or virtually) before making a decision.",
    summary: "On any listing, click **Schedule a Tour**, pick a preferred date and time, submit the request, and track it under My Tours. The home confirms and you'll see the status update from Pending to confirmed.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open the listing page for the home you want to visit." },
      { text: "In the \"Interested in [Home]?\" panel, click Schedule a Tour." },
      { text: "Provide your contact details if prompted, then the Schedule Your Tour step appears with:" },
      { text: "Click Submit Request. (Use Back if you need to fix your details first.)" },
      { text: "View and manage everything under Leads & Inquiries → My Tours. Tabs show All Tours / Upcoming / Past, and each tour card lists the home, address, requested time slot(s), and a status badge (Pending until the home confirms). From here you can View Details or Cancel Tour." },
    ],
    tips: ["You can request more than one time slot to give the home options.","Tour tips on the page remind you to arrive 10–15 minutes early and bring a list of questions.","Pending means the request is in — the home will confirm the slot that works for them."],
    faq: [
      { q: "Can I cancel?", a: "Yes — each tour card has a Cancel Tour link." },
      { q: "In-person or virtual?", a: "Request the slot here; confirm the format with the home in Messages." },
    ],
    images: ["01_listing_panel.png","02_tour_datetime.png","03_my_tours.png"],
  },
  {
    slug: "ai-match",
    title: "Use AI Match to Find Your Best Homes",
    audiences: ["family"],
    icon: "✨",
    whoFor: "Families who'd rather answer a few questions and get a ranked, personalized shortlist than browse listings one by one.",
    summary: "Open AI Match, answer a short 4-step questionnaire (budget & care level, medical conditions, lifestyle preferences, location & timeline), and CareLinkAI returns your **Top 4 Matches** — each with a match score, a category-by-category breakdown, and a plain-English explanation of *why* it fits.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open AI Tools → AI Match (also reachable from the dashboard as \"Find Care\"). The wizard is titled Find Your Perfect Care Home." },
      { text: "Step 1 — Budget & Care Level: enter a minimum and maximum monthly budget, then select the required care level (Independent Living, Assisted Living, Memory Care, or Skilled Nursing). Click Next." },
      { text: "Step 2 — Medical Conditions: select any relevant conditions so matches account for them. Click Next." },
      { text: "Step 3 — Preferences (Lifestyle): choose lifestyle preferences and amenities that matter to you. Click Next." },
      { text: "Step 4 — Location & Timeline: enter a ZIP code, a maximum search distance, and a move-in timeline (Immediate, 1–3 Months, 3–6 Months, Just Exploring). Click Find My Perfect Match." },
      { text: "Review your Top 4 Matches. Each result shows a match %, a \"Why This Match\" write-up, and per-category scores for Budget, Condition, Care Level, Location, and Amenities, plus the amenity list, price range, and availability. From each match you can View Full Profile or Schedule Tour." },
    ],
    tips: ["The \"Why This Match\" explanation is written in plain language — it tells you what's strong about the fit and flags the one trade-off to consider (for example, distance).","Per-category scores let you see *where* a home wins: a 100 on Care Level with a 90 on Budget tells you it's a strong clinical fit that's also affordable.","You can rerun the questionnaire anytime as your needs or budget change."],
    faq: [
      { q: "How many results?", a: "Up to four ranked matches per run." },
      { q: "Is my info shared?", a: "The page notes your information is used only to find care options. Use only demo data in demo accounts." },
    ],
    images: ["01_aimatch_start.png","02_step1_budget.png","03_step4_location.png","04_results.png"],
  },
  {
    slug: "family-portal",
    title: "Use the Family Portal",
    audiences: ["family"],
    icon: "👨‍👩‍👧",
    whoFor: "Families coordinating a loved one's care who want documents, updates, photos, and conversations in one shared place.",
    summary: "The Family Portal (**Residents & Family → Family**) is your loved one's care hub. Upload and store documents, follow a running activity timeline, share photos, keep notes, message the care team, manage who has access, view billing, and store emergency info.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Residents & Family → Family. The header reads \"Family Portal — Stay connected with your loved one's care journey.\"" },
      { text: "Use the tabs across the top to move between sections:" },
      { text: "To add a document, click Upload Document, choose the file, and it appears in Documents and on the Activity timeline." },
      { text: "To give a relative access, open Members → Invite Member and assign a role; each role carries its own permissions (shown under Role Permissions)." },
    ],
    tips: ["The Activity timeline doubles as an audit trail — you can see who uploaded what and when.","Sensitive files (medical records, insurance) belong in Documents, where they're stored securely — not in chat.","Use Members roles to give siblings or a power-of-attorney the right level of access without handing over your login."],
    faq: [
      { q: "Who can see this?", a: "Only the members you invite, according to their assigned role." },
      { q: "What documents should I add?", a: "Care plans, medical records, insurance cards, and anything the care team may need." },
    ],
    images: ["01_portal_home.png","02_documents.png","03_activity.png","04_members.png"],
  },
  {
    slug: "claim-your-listing",
    title: "Claim Your Listing",
    audiences: ["operator"],
    icon: "🏷️",
    whoFor: "Owners and administrators of an assisted living community, memory care unit, or care home whose facility already appears on CareLinkAI and who want to take ownership of the listing.",
    summary: "Find your facility on CareLinkAI, claim it to prove you're the operator, and once verified the listing becomes yours to manage — moving from a CareLinkAI-seeded draft to an operator-owned, editable listing.",
    readTime: "2 min",
    steps: [
      { text: "Find your facility. Search CareLinkAI for your community by name and location. Many Cleveland/Ohio facilities are already pre-listed as unclaimed." },
      { text: "Start the claim. On the listing (or via the link in your outreach email), choose Claim this listing. You'll confirm you represent the facility." },
      { text: "Verify ownership. Provide the requested verification details so the CareLinkAI team can confirm you're the legitimate operator. The listing moves to Pending Review." },
      { text: "Get approved. Once CareLinkAI approves the claim, the listing is transferred to your operator account and its status becomes editable by you." },
      { text: "Take over management. The home now appears under Listings → Your Homes, where you can edit details, add photos, set availability, and start receiving inquiries and tours." },
    ],
    tips: ["If you received a claim link in a CareLinkAI outreach email, that's the fastest path — it ties the claim straight to your facility.","Claiming is free; it's how you convert a pre-populated directory entry into a listing you control.","After approval, complete your profile and add photos right away — listings with real photos and accurate availability convert far more family inquiries."],
    faq: [
      { q: "My facility isn't listed.", a: "Use Add Home from Your Homes to create it." },
      { q: "Someone else claimed it.", a: "Contact CareLinkAI support to resolve ownership." },
    ],
  },
  {
    slug: "operator-dashboard",
    title: "Your Operator Dashboard",
    audiences: ["operator"],
    icon: "📊",
    whoFor: "Operators who want a single at-a-glance command center for their community's occupancy, inquiries, and daily tasks.",
    summary: "The operator dashboard shows your headline metrics (Homes, Open Inquiries, Active Residents, Occupancy Rate), an **Ask AI About Your Dashboard** assistant you can query in plain English, Quick Actions, and a Recent Activity feed.",
    readTime: "2 min",
    steps: [
      { text: "Sign in with your operator account. You land on the Operator dashboard." },
      { text: "Read your headline metrics across the top: Homes, Open Inquiries, Active Residents, and Occupancy Rate." },
      { text: "Use Ask AI About Your Dashboard — type a question like \"How many residents do I have?\", \"Show me caregivers with reliability below 60\", \"What shifts are unassigned this week?\", or \"How is my occupancy rate?\" and get an instant answer drawn from your own data." },
      { text: "Use Quick Actions to jump straight into common tasks: Add Resident (onboard a new resident) or View Inquiries (manage leads)." },
      { text: "Scroll Recent Activity to see the latest events — new inquiries, status changes (e.g., Converted, Closed Lost, Tour Completed) — and click View all for the full history." },
    ],
    tips: ["The Ask-AI box is the fastest way to answer operational questions without digging through menus — it understands residents, caregivers, shifts, and occupancy.","Occupancy Rate is your north-star number; if it dips, check the Inquiry pipeline and Tour requests next.","Recent Activity is a quick daily standup — skim it each morning to see what needs attention."],
    faq: [
      { q: "Where does the AI get its answers?", a: "From your own facility's data in CareLinkAI (residents, shifts, inquiries)." },
      { q: "Can I customize the metrics?", a: "The four headline tiles are standard; deeper cuts live in Analytics and Reports." },
    ],
    images: ["01_dashboard.png","02_ask_ai.png"],
  },
  {
    slug: "manage-home-and-photos",
    title: "Manage Your Home & Photos",
    audiences: ["operator"],
    icon: "🏠",
    whoFor: "Operators keeping a listing accurate and attractive — updating availability, amenities, description, and photos.",
    summary: "Open **Listings → Your Homes**, click **Manage** on a home, and edit its status, current occupancy, and amenities, review the AI-Enhanced Profile and Key Highlights, and upload photos (mark one as Primary). Save to publish your changes.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Listings → Your Homes. Each home shows its name, location, open-inquiry count, and status, with a Manage link. Use Add Home to create a new listing." },
      { text: "Click Manage to open the home editor." },
      { text: "In Quick Actions (right side), update:" },
      { text: "Review the AI-Enhanced Profile — a polished, AI-written description of your community — and the Key Highlights bullets that families see." },
      { text: "Add photos: under the gallery, click Choose File, select an image, optionally check Primary to make it the cover photo, then click Upload." },
      { text: "Check Alerts & Notifications lower on the page for anything needing attention." },
    ],
    tips: ["Keep Current Occupancy accurate — it drives the \"spots available\" families see and the occupancy rate on your dashboard.","The first/Primary photo is your cover image; choose your most inviting, well-lit shot.","The AI-Enhanced Profile gives you a strong starting description; tweak amenities and highlights so they match your community exactly."],
    faq: [
      { q: "No photos yet?", a: "New/seeded listings start empty — adding real photos significantly lifts inquiry rates." },
      { q: "How do I take a listing offline?", a: "Change Status away from ACTIVE and Save." },
    ],
    images: ["01_your_homes.png","02_manage_home.png","03_photo_upload.png"],
  },
  {
    slug: "leads-and-inquiries-pipeline",
    title: "Manage Leads & the Inquiries Pipeline",
    audiences: ["operator"],
    icon: "📥",
    whoFor: "Operators tracking family inquiries from first contact through tour to placement.",
    summary: "The **Pipeline Dashboard** is a Kanban board that moves each inquiry through stages — New → Contacted → Tour Scheduled → Tour Completed → Qualified — with KPIs across the top (Total Inquiries, New This Week, Requires Attention, Conversion Rate, Pending Follow-ups). Switch to List view, filter, or open any card for details.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Leads & Inquiries → Pipeline (/operator/inquiries/pipeline)." },
      { text: "Read the KPI tiles: Total Inquiries, New This Week, Requires Attention, Conversion Rate, Pending Follow-ups." },
      { text: "Work the Kanban columns left to right — New, Contacted, Tour Scheduled, Tour Completed, Qualified. Each card shows the contact, care recipient, home, source (e.g., Website), priority (e.g., Medium), date, and any scheduled tour." },
      { text: "Move an inquiry forward by dragging its card to the next stage as you make progress." },
      { text: "Toggle Kanban / List (top right) for a sortable table view, use Filters to narrow the board, or click New Inquiry to log one manually." },
      { text: "Click any card to open the full inquiry — contact details, notes, and the next recommended action." },
    ],
    tips: ["Requires Attention and Pending Follow-ups are your daily to-do list — clear those first.","Conversion Rate tells you how well inquiries turn into placements; watch the trend over time.","Keep cards moving — an inquiry sitting in \"Contacted\" too long is a follow-up waiting to happen."],
    faq: [
      { q: "Where do website inquiries land?", a: "Automatically in New, tagged with their source." },
      { q: "Difference between Leads and Inquiries?", a: "Both feed this pipeline; the board is the single place to manage them." },
    ],
    images: ["01_pipeline.png","02_kanban_cards.png"],
  },
  {
    slug: "tour-management",
    title: "Manage Tour Requests",
    audiences: ["operator"],
    icon: "🗓️",
    whoFor: "Operators responding to family tour requests and keeping their visit schedule organized.",
    summary: "**Tour Management** lists every tour request with its status (Pending / Confirmed / Completed) and counters at the top. Open a request to respond and confirm a time, or decline — and search/filter to find any visit fast.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Leads & Inquiries → Tours (/operator/tours)." },
      { text: "Read the counters: Pending Requests, Confirmed Tours, Completed." },
      { text: "Each request card shows the home, the family's name and email, the address, how many time slots they requested, and any note they left." },
      { text: "Click View & Respond to open the request, pick a time that works, and confirm it — the family is notified and the tour moves to Confirmed." },
      { text: "If you can't host it, click Decline." },
      { text: "Use the search bar (by family name or home) and the status filter (All Statuses) to find specific tours." },
    ],
    tips: ["Respond to Pending requests quickly — fast confirmations are a major trust signal for families choosing a community.","When a family offers multiple time slots, pick the one that fits your staffing and confirm it in one step.","Completed tours flow into your pipeline as Tour Completed, keeping your conversion tracking accurate."],
    faq: [
      { q: "Can I propose a different time?", a: "Use View & Respond to coordinate the slot, then confirm." },
      { q: "Where do confirmations go?", a: "To the family via notification and Messages." },
    ],
    images: ["01_tour_management.png","02_tour_request.png"],
  },
  {
    slug: "residents",
    title: "Manage Residents",
    audiences: ["operator"],
    icon: "🧑‍🦳",
    whoFor: "Operators maintaining resident profiles and care information for their community.",
    summary: "The **Residents** page is your roster — search and filter residents, view or edit each profile, onboard a new resident, switch to an Analytics view, and export the list.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Residents & Family → Residents (/operator/residents)." },
      { text: "Search by name, room, or ID, and filter by Status or Home. Check Show Archived to include past residents." },
      { text: "The roster table shows each resident's name + home, Age, Room, Status (e.g., Inquiry, Active), and Admission date, with View and Edit actions." },
      { text: "Click New Resident to onboard someone — fill in their profile and care information. *(also reachable from the dashboard Quick Action \"Add Resident\")*" },
      { text: "Switch to the Analytics view for resident-level insights, or click Export to download the roster." },
    ],
    tips: ["Status flows from Inquiry to Active as a prospect becomes a resident — keep it current so occupancy and reporting stay accurate.","Use Show Archived when you need history without cluttering the active roster.","Export is handy for audits, state surveys, or sharing with your team offline."],
    faq: [
      { q: "Where do new residents come from?", a: "Either onboard manually via New Resident, or convert a qualified inquiry." },
      { q: "Can I store care details?", a: "Yes — each resident profile holds care information; keep sensitive records handled per your compliance policies." },
    ],
    images: ["01_residents.png","02_resident_row.png"],
  },
  {
    slug: "shifts-and-oncall-ai",
    title: "Shifts & On-Call AI Coverage",
    audiences: ["operator"],
    icon: "📞",
    whoFor: "Operators scheduling caregivers and filling open or last-minute shifts.",
    summary: "Use **Shifts** to create and assign caregiver shifts (with an **AI Shift Auto-fill** option), and **On-Call AI** to automatically text and call your caregivers to fill an open shift — the first to reply YES gets it, and everyone else is told it's filled.",
    readTime: "2 min",
    steps: [
      { section: "Shifts", text: "Sign in and open Operations → Shifts (/operator/shifts)." },
      { text: "Click Create Shift to schedule a caregiver — set the home, time, and assignment. New accounts start with \"No shifts scheduled yet.\"" },
      { text: "Use AI Shift Auto-fill to let CareLinkAI propose assignments for open shifts." },
      { text: "Switch to the Calendar view (top right) to see shifts laid out by day/week." },
      { section: "On-Call AI (open-shift coverage)", text: "Open Operations → On-Call AI (/operator/oncall). The banner explains: CareLinkAI automatically texts and calls your caregivers to fill open shifts; the first to reply YES gets the shift and the rest are notified it's filled." },
      { text: "The On-Call AI Queue lists active coverage needs — each shows the home, status (e.g., FILLING, which Wave it's on), the role (e.g., memory care), how many contacts were sent, and when it was created." },
      { text: "Controls per item: Send Next Wave (reach more caregivers), View Attempts, and Cancel. Start a new one with + New Coverage Need." },
    ],
    tips: ["On-Call AI works in waves — it contacts a first group, and if no one accepts, Send Next Wave expands the outreach.","View Attempts is your audit trail of who was reached and how they responded.","Reliability scoring helps prioritize which caregivers get contacted first."],
    faq: [
      { q: "What if nobody replies?", a: "Use Send Next Wave to widen the pool, or fall back to manual assignment in Shifts." },
      { q: "How does a caregiver claim a shift?", a: "By replying YES to the text/call — first response wins." },
    ],
    images: ["01_shifts.png","02_oncall.png"],
  },
  {
    slug: "compliance-kits",
    title: "Compliance Document Kits",
    audiences: ["operator"],
    icon: "📋",
    whoFor: "Ohio assisted living operators who need ready-made, regulation-aware compliance templates.",
    summary: "**Compliance Document Kits** are one-time-purchase bundles of Ohio ALF compliance templates — startup policies, state-survey prep, and memory-care-unit documentation — reviewed against ODH regulations and yours to keep forever.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Operations → Compliance Kits (/operator/compliance-kits)." },
      { text: "Review the available kits, each with its contents listed and a one-time price:" },
      { text: "Click Buy Now on the kit you need to purchase it (one-time). Purchased kits are yours to keep." },
    ],
    tips: ["The Startup Kit is built for opening a new licensed ALF; the Survey Prep Kit is for staying audit-ready year-round.","Templates are a strong starting point — the page notes they're provided as-is for reference; consult a licensed attorney or Ohio ALF consultant before submitting to ODH.","One-time purchase means no recurring cost — buy once, reuse across surveys."],
    faq: [
      { q: "Are these legal advice?", a: "No — they're reference templates reviewed against ODH regulations; have a professional review before official use." },
      { q: "Do they expire?", a: "No — once purchased, they're yours forever." },
    ],
    images: ["01_compliance_kits.png"],
  },
  {
    slug: "analytics-and-billing",
    title: "Analytics & Billing",
    audiences: ["operator"],
    icon: "💳",
    whoFor: "Operators tracking performance metrics and managing their CareLinkAI subscription and invoices.",
    summary: "**Analytics** shows your occupancy and inquiry funnel with a CSV export; **Billing** shows your current plan, invoice history, MRR/volume, and recent payments, with controls to change plan or manage billing.",
    readTime: "2 min",
    steps: [
      { section: "Analytics", text: "Sign in and open Analytics (/operator/analytics)." },
      { text: "Read the Occupancy donut (occupied % against capacity and number of homes)." },
      { text: "Review the Inquiry Funnel chart — inquiries by stage (New → Contacted → Tour Scheduled → Tour Completed → Placement Offered → Placement Accepted → Closed Lost) over a selectable range (e.g., 30 days)." },
      { text: "Click Export Inquiries CSV to download the underlying data." },
      { text: "For deeper cuts, open Reports in the left menu." },
      { section: "Billing", text: "Open Billing (/operator/billing)." },
      { text: "Your Subscription shows your current plan (e.g., Professional — $249/mo, up to 3 homes), status, and next billing date." },
      { text: "Invoice History lists each period, amount, status (e.g., Paid), and a View / PDF action for each invoice." },
      { text: "Review the 30-day Volume, MRR, and Recent Payments panels." },
      { text: "Use Change Plan to switch tiers or Manage Billing to update payment details (opens the secure billing portal)." },
    ],
    tips: ["The Inquiry Funnel shows exactly where prospects drop off — a narrowing between Tour Scheduled and Completed means tighten your tour follow-up.","Download the CSV for board updates, investor reports, or your own spreadsheets.","Keep an eye on the next billing date so renewals are never a surprise."],
    faq: [
      { q: "Where do invoices download?", a: "Each row in Invoice History has a PDF link." },
      { q: "Can I see revenue?", a: "MRR and 30-day Volume panels summarize it; Reports has more detail." },
    ],
    images: ["01_analytics.png","02_billing.png"],
  },
  {
    slug: "caregiver-dashboard",
    title: "Your Caregiver Dashboard",
    audiences: ["caregiver"],
    icon: "📊",
    whoFor: "Caregivers and aides who want one place to see their marketplace status, rating, requests, and next actions.",
    summary: "The caregiver dashboard shows your **Profile Visibility**, **Background Check** status, **Active Requests**, and **My Rating**, plus Quick Actions (Applications, Edit Profile, Upload Documents, Messages), your reviews, and recent inquiries.",
    readTime: "2 min",
    steps: [
      { text: "Sign in with your caregiver account — you land on the Caregiver dashboard (\"Welcome back, [name]\")." },
      { text: "Check your status tiles:" },
      { text: "Use Quick Actions: My Applications (track job applications), Edit Profile (bio, skills, availability), Upload Documents (certifications/credentials), Messages (conversations)." },
      { text: "Scroll My Reviews to read recent family feedback, and View public profile to see what families see." },
      { text: "Review Recent Inquiries for new family interest." },
    ],
    tips: ["A cleared Background Check badge is one of the strongest trust signals families look for — keep it current.","Respond to Active Requests quickly; fast replies win placements.","Your rating and reviews are your reputation — every completed shift and kind review compounds."],
    faq: [
      { q: "What makes my profile visible?", a: "The marketplace-visibility toggle in your profile settings." },
      { q: "Where do inquiries come from?", a: "Families browsing the caregiver marketplace and job applicants you've matched with." },
    ],
    images: ["01_dashboard.png","02_status_tiles.png"],
  },
  {
    slug: "profile-and-credentials",
    title: "Build Your Profile & Add Credentials",
    audiences: ["caregiver"],
    icon: "🪪",
    whoFor: "Caregivers setting up the profile families see — bio, skills, rate, availability in the marketplace, and professional credentials.",
    summary: "In **Profile Settings** add your photo, bio, specialties, settings, and care types, set your experience and hourly rate, toggle marketplace visibility, and upload licenses/certifications under **Credentials**.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Settings → Profile (/settings/profile)." },
      { text: "Basic Information: upload a photo and confirm your name and phone. (Email is fixed — contact support to change it.)" },
      { text: "Professional Bio: write a short, warm summary of your experience and approach." },
      { text: "Skills & Tags — these power marketplace search, so be thorough:" },
      { text: "Marketplace Visibility: toggle \"Show my profile in marketplace search\" on to appear to families (pause anytime without deleting your account)." },
      { text: "Set Years of Experience and Hourly Rate ($)." },
      { text: "Credentials: add licenses/certifications either in the embedded section or the full page (Settings → Credentials, /settings/credentials). For each: Credential Type (e.g., CPR, CNA License), Issue Date, Expiration Date, and a document upload. Click Add Credential." },
    ],
    tips: ["The more accurate your specialties and care types, the better you match the families and jobs that fit you.","Keep credentials current — expired certifications weaken the trust your profile signals.","Your hourly rate and experience show on your public profile, so set them deliberately."],
    faq: [
      { q: "Will I show up in search immediately?", a: "Yes, once marketplace visibility is on and your profile is filled out." },
      { q: "Where do uploaded credentials appear?", a: "Under Your Credentials, and they support your verified status." },
    ],
    images: ["01_profile.png","02_skills.png","03_rate.png","04_credentials.png"],
  },
  {
    slug: "marketplace-jobs-and-applications",
    title: "Find Jobs & Track Applications",
    audiences: ["caregiver"],
    icon: "🧰",
    whoFor: "Caregivers looking for work — browsing open jobs, applying, and tracking where each application stands.",
    summary: "Open the **Marketplace → Jobs** tab to browse recommended jobs with an AI match score, filter by setting/care type/location, and apply. Track every application under **My Applications**.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Marketplace (/marketplace), then the Jobs tab." },
      { text: "Browse Recommended Jobs — each card shows the role, location, pay range (e.g., $26–$40/hr), a short description, and an AI match % with an Explain button that tells you *why* it fits you." },
      { text: "Narrow results with the filters: Search, City/State, ZIP + Radius, Setting (In-home, Assisted Living, Memory Care, Skilled Nursing, Hospice…), Care Types, and Sort (Most recent, etc.)." },
      { text: "Click View on a job to see full details and apply." },
      { text: "Track everything under My Applications (/caregiver/applications) — applied positions and their status. New caregivers see \"No applications yet\" with a Browse Jobs button." },
    ],
    tips: ["The match % and Explain save you time — focus on the jobs the system already thinks fit your skills.","A complete profile (specialties, care types, rate) directly improves your match scores.","Use ZIP + Radius to keep your commute realistic."],
    faq: [
      { q: "How many jobs are there?", a: "The Jobs tab shows the live count (e.g., \"Jobs (26)\")." },
      { q: "Who posts these?", a: "Families and operators using Post a Job; you apply directly." },
    ],
    images: ["01_jobs.png","02_job_card.png","03_applications.png"],
  },
  {
    slug: "shifts-and-timesheets",
    title: "Pick Up Shifts & Track Your Hours",
    audiences: ["caregiver"],
    icon: "⏱️",
    whoFor: "Caregivers who want to claim open per-diem shifts and keep track of the shifts they've worked.",
    summary: "The **Shifts** page has two tabs — **Open Shifts** (available shifts you can claim) and **My Shifts** (shifts you've claimed and your hours). Browse open shifts, claim the ones that fit, and they move to My Shifts.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Operations → Shifts (/shifts)." },
      { text: "Open Shifts lists available shifts with a count (\"X shifts available\"). When there are none, it shows \"No open shifts available at this time.\"" },
      { text: "Claim a shift that fits your availability — it then appears under My Shifts." },
      { text: "Switch to the My Shifts tab to see everything you've claimed and track your hours. New caregivers see \"You haven't claimed any shifts yet\" with a Browse Open Shifts button." },
    ],
    tips: ["Check Open Shifts regularly — operators post coverage needs here, and good shifts get claimed fast.","Reliability matters: completing shifts and arriving on time builds your reliability points and your rating.","Keep your profile's availability and rate current so the shifts you see are the right fit."],
    faq: [
      { q: "How do I get offered shifts directly?", a: "Operators' On-Call AI can text/call you when a shift opens — reply YES to claim it first." },
      { q: "Where are my worked hours?", a: "Under My Shifts." },
    ],
    images: ["01_open_shifts.png","02_my_shifts.png"],
  },
  {
    slug: "reliability-points",
    title: "Earn Reliability Points & Rewards",
    audiences: ["caregiver"],
    icon: "🏆",
    whoFor: "Caregivers who want to build their reputation, climb tiers, and earn rewards for dependable, high-quality work.",
    summary: "**My Points & Rewards** tracks the points you earn for reliability, great reviews, and consistent work, shows your current tier (Bronze → up), and lists exactly how to earn more.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open My Points & Rewards (/caregiver/points)." },
      { text: "See Your Tier (e.g., 🥉 Bronze), your Available Points, your lifetime points, and how many points until the next tier (e.g., \"100 for next tier\")." },
      { text: "Review How to Earn Points:" },
    ],
    tips: ["The biggest single boost is 30 days with no call-off (+20) — reliability is the fastest path up the tiers.","Stack a 5-shift streak (+10) with on-time arrivals (+5 each) to climb quickly.","Great care earns great reviews — and every 4+ star review is +15 points."],
    faq: [
      { q: "What do tiers unlock?", a: "Higher tiers reflect proven reliability, which strengthens your standing with families and operators." },
      { q: "Do points reset?", a: "You have available points and lifetime points; lifetime points track your overall standing." },
    ],
    images: ["01_points.png","02_tier.png"],
  },
  {
    slug: "public-profile-and-background-checks",
    title: "Your Public Profile & Background Checks",
    audiences: ["caregiver"],
    icon: "🛡️",
    whoFor: "Caregivers who want to understand what families see on their public profile and how background checks strengthen it.",
    summary: "Your **public profile** shows your rating, badges, rate, experience, bio, specialties, per-diem booking, and a **Safety & Background Checks** panel (powered by Checkr). Families can Request Care or Message you from here.",
    readTime: "2 min",
    steps: [
      { text: "From your dashboard, click View public profile (or open your marketplace caregiver page)." },
      { text: "The header shows your name, star rating + review count, and trust badges (e.g., Background Checked, Experienced), plus your Hourly Rate and Experience." },
      { text: "About shows your bio; Specialties shows your tagged skills (e.g., Alzheimer's Care, Dementia Care, Medication Management, Companionship)." },
      { text: "Safety & Background Checks (Verified, powered by Checkr) lists check types and their status:" },
      { text: "Families use Request Care (starts an inquiry) or Message to reach you; a Book a per-diem shift / Request Shift option lets them book you directly." },
    ],
    tips: ["A Basic Check on file earns your \"Background Checked\" badge — a top trust signal for families.","Adding higher-tier checks (Enhanced, MVR) can make you eligible for more roles, especially transportation-related care.","Keep your bio and specialties polished — this page is your first impression."],
    faq: [
      { q: "Who runs the checks?", a: "Checkr; results are shared with you and shown on your profile." },
      { q: "Do I have to buy the higher checks?", a: "No — Basic establishes your badge; the others are optional upgrades." },
    ],
    images: ["01_public_profile.png","02_background_checks.png"],
  },
  {
    slug: "provider-dashboard-and-onboarding",
    title: "Your Provider Dashboard & Getting Listed",
    audiences: ["provider"],
    icon: "🤝",
    whoFor: "Home-care agencies, transportation/NEMT providers, and other care-service organizations setting up and running their CareLinkAI presence.",
    summary: "The provider dashboard shows a **\"Get listed on the marketplace\"** onboarding checklist (with % complete), key metrics (New/Active Inquiries, Marketplace Listing status, Dispatch Reliability), and Quick Actions to manage your profile, credentials, billing, and rides.",
    readTime: "2 min",
    steps: [
      { text: "Sign in with your provider account — you land on the Provider dashboard (\"Welcome back, [name]\" with your business name)." },
      { text: "Work the \"Get listed on the marketplace\" checklist to 100%. Steps include: Business name set, Bio written, Service types selected, Coverage area set, Rate set, 1+ credential uploaded, 3 credentials (Certified), Listing activated. Each incomplete item has a Fix → link." },
      { text: "Review your metric tiles: New Inquiries (last 7 days), Active Inquiries (open conversations), Marketplace Listing (Active = visible in search), Dispatch Reliability (completion + on-time %)." },
      { text: "Use Quick Actions: Messages, Edit Profile, Credentials, Listing & Billing, View Marketplace (your public profile), Ride Dispatch (manage today's runs)." },
    ],
    tips: ["Finish the onboarding checklist — items like uploaded/certified credentials unlock your verified status and stronger marketplace placement.","Dispatch Reliability is your operational reputation (completion and on-time rate) — protect it.","Use View Marketplace to see your public profile the way families do."],
    faq: [
      { q: "Why is my listing only partially complete?", a: "Uploading credentials (1+, then 3 certified) are the common remaining steps." },
      { q: "What is Ride Dispatch?", a: "For transportation providers, it manages the day's scheduled rides." },
    ],
    images: ["01_dashboard.png","02_onboarding_checklist.png"],
  },
  {
    slug: "profile-services-and-pricing",
    title: "Set Up Your Provider Profile, Services & Pricing",
    audiences: ["provider"],
    icon: "🧾",
    whoFor: "Providers configuring the business info, services, transportation capabilities, and pricing that families see in the marketplace.",
    summary: "In **Provider Profile** enter your business information and bio, select the **services you offer**, fill in **transportation capabilities** (if applicable), set your **service radius** and **instant-booking pricing**, then **Save Profile**.",
    readTime: "2 min",
    steps: [
      { text: "Sign in and open Settings → Provider Profile (/settings/provider)." },
      { text: "Business Information: Business Name, Contact Name, Contact Phone, Contact Email, Website, License Number, Years in Business, and a Bio/Description." },
      { text: "Services Offered: check all that apply — Home Care, Personal Care, Companionship, Skilled Nursing, Transportation/NEMT, Hospice Support, Memory Care, Adult Day Services." },
      { text: "Transportation Capabilities (for transport/NEMT providers): vehicle/ride types (Sedan, SUV, Van, Wheelchair Van, Stretcher Transport), Wheelchair Accessible Vehicles, Accepts Medicaid/Medicaid Waiver, Accepts Recurring Ride Schedules, and Service Radius (miles)." },
      { text: "Vehicle & Capacity: Max Passengers per run." },
      { text: "Instant Booking Pricing: set Base Fare ($), Per Mile Rate ($/mi), and Wait Rate ($/hr), then toggle Enable Instant Booking so families can see the fare upfront and pay at booking — no back-and-forth." },
      { text: "Click Save Profile." },
    ],
    tips: ["Accurate services and transportation capabilities drive the marketplace filters families use (e.g., wheelchair, Medicaid) — complete them fully.","Instant Booking turns lookers into confirmed, paid rides; it requires a base fare and per-mile rate.","A clear bio and a valid license number boost trust and verified eligibility."],
    faq: [
      { q: "Do I need transportation fields?", a: "Only if you offer Transportation/NEMT; otherwise focus on care services." },
      { q: "Where do these details show?", a: "On your public marketplace profile and in family search filters." },
    ],
    images: ["01_profile.png","02_services.png","03_transport.png","04_pricing.png"],
  },
  {
    slug: "marketplace-listing-and-presence",
    title: "Your Marketplace Listing & Public Presence",
    audiences: ["provider"],
    icon: "📣",
    whoFor: "Providers who want to be discoverable by families — understanding the marketplace listing subscription and how their public profile appears.",
    summary: "A **Provider Marketplace Listing** subscription ($99/mo) makes you visible to families searching for care, with inquiries delivered to your dashboard, capability filters, and verified-badge eligibility. Your **public profile** shows your verified badge, services, reviews, and contact options.",
    readTime: "2 min",
    steps: [
      { section: "Marketplace listing subscription", text: "Sign in and open Listing & Billing (/settings/provider/billing)." },
      { text: "Review the Provider Marketplace Listing plan — $99/month — which includes: listed in the provider marketplace, visible to searching families, inquiries delivered to your dashboard, transportation capability filters (wheelchair, Medicaid), verified badge eligibility, and priority support." },
      { text: "Click Subscribe for $99/mo to activate (secured by Stripe; cancel anytime from the billing portal)." },
      { section: "Your public profile (what families see)", text: "Open View Marketplace from your dashboard, or your public provider page (/marketplace/providers/[id])." },
      { text: "It shows your business name + Verified badge, contact, years in business, Visit Website, Reviews (with Write a Review), About, Services Offered, an About This Listing summary (verified credentials count, services offered), and a Safety & Background Checks panel." },
      { text: "Families reach you via Request Care (starts an inquiry) or Send Message." },
    ],
    tips: ["Your listing's capability filters (wheelchair, Medicaid) only help you if your profile's services/transportation fields are complete — fill those first.","A Verified badge and uploaded credentials lift you in family trust and search.","Gather reviews — they're social proof that converts."],
    faq: [
      { q: "What happens if I don't subscribe?", a: "Your visibility in the provider marketplace depends on an active listing subscription." },
      { q: "How do inquiries reach me?", a: "Directly to your provider dashboard (and Messages)." },
    ],
    images: ["01_listing_billing.png","02_public_profile.png"],
  },
  {
    slug: "placement-search",
    title: "AI Placement Search",
    audiences: ["discharge-planner"],
    icon: "🏥",
    whoFor: "Hospital and SNF discharge planners, case managers, and social workers placing patients into senior care quickly.",
    summary: "From your **Discharge Planner Dashboard**, click **Start New Search**, describe your patient's needs in plain language, and let the AI surface suitable assisted living / memory care / skilled nursing homes. Track your searches from the dashboard, and any care-team shortlists on the **Concierge** tab.",
    readTime: "2 min",
    steps: [
      { text: "Sign in with your discharge-planner account — you land on the Discharge Planner Dashboard." },
      { text: "Read your metrics and Recent Searches. When a care-team shortlist is ready, a \"shortlist ready\" banner appears here, and the details live on your Concierge tab." },
      { text: "Click Start New Search to open AI-Powered Placement Search." },
      { text: "In \"Describe your patient's needs,\" type a natural-language request — for example, *\"I need a memory care facility in Boston for a 78-year-old with moderate Alzheimer's, budget around $6,000/month.\"* Tap an Example search to prefill one." },
      { text: "Click Search with AI. Matching homes appear under Search Results with a Refresh Availability option." },
      { text: "Review the results, then click **Request a shortlist** — CareLinkAI's care team confirms availability and curates options for you (see *Request a Care-Team Shortlist (Concierge)*). Track them on your **Concierge** tab." },
    ],
    tips: ["Be specific: include location, care level, budget, and key needs (e.g., 24/7 nursing, Medicaid, speech therapy) — the AI uses all of it.","Use Recent Searches to re-run or reference prior placements.","Refresh Availability re-checks bed availability before you request a shortlist."],
    faq: [
      { q: "What care types are covered?", a: "Assisted living, memory care, skilled nursing, and more." },
      { q: "Does it send anything automatically?", a: "No — searching only finds homes. When you're ready, click Request a shortlist and our care team curates options for you; nothing is emailed to facilities." },
    ],
    images: ["01_dashboard.png","02_search.png","03_results.png"],
  },
  {
    slug: "refer-and-inquire-on-behalf",
    title: "Request a Care-Team Shortlist (Concierge)",
    audiences: ["discharge-planner"],
    icon: "📋",
    whoFor: "Discharge planners who want a curated, availability-checked shortlist for a specific patient — without cold-calling facilities.",
    summary: "After running a placement search, click **Request a shortlist**. CareLinkAI's care team confirms real-time availability and sends you a **curated shortlist in the app** — patient details stay private and are never emailed. Review your shortlist and request tours; we help coordinate them on the patient's behalf. Track status (**Submitted → Matching → Shortlist ready**) on your **Concierge** tab.",
    readTime: "2 min",
    steps: [
      { text: "Run an AI Placement Search and review the Search Results." },
      { text: "Click **Request a shortlist** (or **Request via CareLinkAI** on a specific home you'd prefer). Your request routes to CareLinkAI's care team — it is NOT emailed to facilities." },
      { text: "Add the patient's needs — care level, area / ZIP, budget, payment source, timeline, key needs, plus initials and a callback. Share only the minimum necessary; everything stays in-app (HIPAA-aligned) and is never emailed out." },
      { text: "Submit. Track status on your **Concierge** tab: **Submitted → Matching → Shortlist ready**. You'll also get a bell notification and an email the moment your shortlist is ready." },
      { text: "Open your curated shortlist — each option shows confirmed availability and a care-team note. Click **View & request a tour**; we help coordinate tours on the patient's behalf." },
    ],
    tips: ["You don't pick or contact facilities yourself — describe the patient once and the care team does the legwork, real-time availability included.","Patient details live only in the app and are never emailed; the notification we send you names a count and a link, never clinical detail.","Watch your Concierge tab — and the \"shortlist ready\" banner on your dashboard — for finished shortlists."],
    faq: [
      { q: "Does this email facilities directly?", a: "No. Concierge requests route to CareLinkAI's care team, who curate a shortlist for you. Patient details are never emailed out." },
      { q: "How do I know when my shortlist is ready?", a: "You get an in-app bell notification and an email, and a \"shortlist ready\" item appears on your dashboard and Concierge tab." },
      { q: "Is the patient's family involved?", a: "You're acting on the patient's behalf; coordinate consent and family involvement per your facility's process." },
    ],
  },
];

export function getHowToGuide(slug: string): HowToGuide | undefined {
  return HOWTO_GUIDES.find((g) => g.slug === slug);
}
