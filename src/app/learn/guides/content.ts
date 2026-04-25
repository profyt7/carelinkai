export interface GuideSection {
  heading: string;
  body: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  category: string;
  icon: string;
  intro: string;
  sections: GuideSection[];
  cta: { text: string; href: string };
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-choose-assisted-living',
    title: 'How to Choose an Assisted Living Home',
    description: 'A step-by-step guide to evaluating homes, asking the right questions, and making a confident decision for your loved one.',
    readTime: '8 min read',
    category: 'Getting Started',
    icon: '🏠',
    intro: 'Choosing an assisted living home for a parent or loved one is one of the most significant decisions a family makes. There is no perfect formula, but there is a process that makes the decision clearer and more confident.',
    sections: [
      {
        heading: 'Step 1: Understand what level of care is needed',
        body: 'Before you look at any homes, get clear on what your loved one actually needs today — and what they are likely to need in the next 1–3 years. Talk to their primary care physician. Get a care needs assessment if possible. The spectrum runs from independent living (minimal support) to assisted living (help with daily activities) to memory care (dementia-specific) to skilled nursing (medical-level 24/7 care). Choosing the wrong level costs money and causes upheaval when a move is needed.',
      },
      {
        heading: 'Step 2: Set a realistic budget',
        body: 'Assisted living in the Cleveland area averages $3,500–$5,500/month. Memory care typically runs $1,000–$2,000/month higher. Know what your loved one can pay before you tour — it prevents falling in love with a home that is out of reach. See our cost guide for a full breakdown of what is and is not covered.',
      },
      {
        heading: 'Step 3: Make a shortlist of 4–6 homes',
        body: 'Use CareLinkAI to filter by care level, location, price range, and amenities. Aim for 4–6 candidates before scheduling tours — enough to compare but not so many you get overwhelmed. Prioritize homes within 15–20 minutes of family who will visit regularly; proximity to visitors meaningfully improves resident wellbeing.',
      },
      {
        heading: 'Step 4: Tour in person — twice if possible',
        body: 'Visit once scheduled and once unannounced (most homes allow drop-in visits during business hours). Observe meal time. Talk to staff AND residents (not just the admissions director). Notice smells, noise levels, and whether residents look engaged or isolated. Download our tour checklist to make sure you cover everything.',
      },
      {
        heading: 'Step 5: Review the contract carefully',
        body: 'Before signing, read the residency agreement in full or have an elder law attorney review it. Key things to check: what triggers a mandatory move-out, how rates increase each year (average is 3–7% annually), what is included vs. billed as an add-on, and the 30-day notice policy.',
      },
      {
        heading: 'Step 6: Involve your loved one as much as possible',
        body: 'Even when cognitive decline is present, give your loved one a role in the decision. Bring them on the tour. Ask what matters to them. Research consistently shows that residents who feel they had a choice in the placement adjust faster and have better outcomes.',
      },
    ],
    cta: { text: 'Search Cleveland Homes', href: '/search' },
  },
  {
    slug: 'assisted-living-cost-guide',
    title: 'Understanding Assisted Living Costs in 2026',
    description: 'What you will actually pay, what is covered, and how to use Medicare, Medicaid, and long-term care insurance to offset costs.',
    readTime: '6 min read',
    category: 'Finances',
    icon: '💰',
    intro: 'Cost is the number-one concern families have when exploring assisted living. This guide breaks down the real numbers, what is and is not covered by insurance, and where families in Ohio typically find financial help.',
    sections: [
      {
        heading: 'What does assisted living actually cost?',
        body: 'In Greater Cleveland, assisted living averages $3,800–$5,200/month for a standard room with daily assistance. Memory care averages $5,000–$6,800/month. These are base rates. Add-ons for medication management, incontinence care, or specialized therapy can add $200–$800/month to your bill.',
      },
      {
        heading: 'Does Medicare cover assisted living?',
        body: 'No. Medicare does not cover assisted living room and board. It may cover short-term skilled nursing stays (up to 100 days after a qualifying hospital stay) or specific medical services, but the ongoing monthly cost of assisted living is not a Medicare benefit. This surprises many families.',
      },
      {
        heading: 'Does Medicaid cover assisted living in Ohio?',
        body: 'Ohio\'s PASSPORT Medicaid waiver can help pay for assisted living services (not room and board) for eligible individuals. Eligibility is income and asset-based, and there are waitlists. If Medicaid is a likely pathway, apply early — do not wait until savings are depleted.',
      },
      {
        heading: 'Long-term care insurance',
        body: 'If your loved one has a long-term care insurance policy, review it carefully. Most policies have an elimination period (typically 90 days) before benefits begin, and a daily benefit cap (commonly $150–$300/day). Understand the inflation protection clause — a $200/day benefit bought 15 years ago may not cover today\'s costs.',
      },
      {
        heading: 'Veterans benefits',
        body: 'The VA Aid & Attendance benefit can provide $1,200–$2,200/month to eligible veterans (and surviving spouses) who need help with daily activities. This is an underutilized resource. Apply through a VA-accredited claims agent — the application process takes 3–6 months.',
      },
      {
        heading: 'Questions to ask every home about billing',
        body: 'Ask: What is the average annual rate increase? What triggers a level-of-care fee increase? What happens if my loved one runs out of funds — do you accept Medicaid? Get answers in writing before signing.',
      },
    ],
    cta: { text: 'Compare Homes by Price', href: '/search' },
  },
  {
    slug: 'memory-care-vs-assisted-living',
    title: 'Memory Care vs. Assisted Living: What is the Difference?',
    description: 'How to tell when a loved one with dementia needs memory care, and what to look for in a specialized facility.',
    readTime: '5 min read',
    category: 'Care Types',
    icon: '🧠',
    intro: 'If your loved one has been diagnosed with Alzheimer\'s disease or another form of dementia, you will face a choice: standard assisted living or a specialized memory care unit. Understanding the difference can protect both your loved one\'s safety and your family\'s finances.',
    sections: [
      {
        heading: 'What assisted living provides',
        body: 'Standard assisted living supports residents who need help with activities of daily living — bathing, dressing, medication management, meals — but who are largely oriented and can participate in community life. Staff ratios are lower, and the environment is more open.',
      },
      {
        heading: 'What memory care adds',
        body: 'Memory care units are secured environments designed specifically for people with dementia. They have higher staff-to-resident ratios (often 1:5 vs. 1:8), staff trained specifically in dementia care, structured daily routines that reduce agitation, secured perimeters to prevent wandering, and programming designed for cognitive engagement at each disease stage.',
      },
      {
        heading: 'Signs your loved one needs memory care, not just assisted living',
        body: 'Wandering or exit-seeking behavior is the most urgent indicator — this is a safety emergency in a standard AL. Other signs: inability to recognize family members consistently, significant behavioral symptoms (aggression, sundowning, paranoia), inability to manage ADLs even with staff prompting, or getting lost within a familiar building.',
      },
      {
        heading: 'Can you start in assisted living and move to memory care?',
        body: 'Many communities have both on the same campus (called a "continuing care" model). Starting in AL and moving to memory care when needed is common and often smoother than moving between different campuses. Ask every home: "Do you have a memory care unit on-site, and what triggers a required move?"',
      },
      {
        heading: 'Questions to ask a memory care unit',
        body: 'What is your staff-to-resident ratio on nights and weekends? What is your dementia training certification for direct care staff? How do you handle behavioral episodes? What does a typical day look like for a resident with moderate dementia? Can you share your state inspection report?',
      },
    ],
    cta: { text: 'Find Memory Care in Cleveland', href: '/search?careLevel=MEMORY_CARE' },
  },
  {
    slug: 'assisted-living-tour-checklist',
    title: 'The Assisted Living Tour Checklist',
    description: 'Print this before your visit. 30 questions to ask, 10 red flags to watch for, and what to observe when nobody is guiding you.',
    readTime: '4 min read',
    category: 'Touring',
    icon: '✅',
    intro: 'The tour is your best chance to see a home as it really is — not just as the admissions director wants you to see it. Come prepared. These are the things that matter.',
    sections: [
      {
        heading: 'What to observe as soon as you walk in',
        body: 'Smell is the most honest indicator of a well-run home — any persistent odor of urine or stale food is a red flag. Notice whether staff acknowledge residents and visitors warmly. Look at residents: are they dressed, engaged, and moving around? Or parked in front of a TV in pajamas at 2pm? Ask yourself: would I be comfortable here?',
      },
      {
        heading: 'Questions about staffing',
        body: 'What is your staff-to-resident ratio during the day? At night? On weekends? What is your staff turnover rate in the past year? How do you handle call-outs — do you use agency staff? Are all direct care staff background-checked? These questions reveal the stability of care your loved one will actually receive.',
      },
      {
        heading: 'Questions about care',
        body: 'How do you assess care needs at move-in and on an ongoing basis? What triggers a level-of-care fee increase? If my loved one\'s needs exceed what you can provide, what is the process — how much notice do we get? Who is the on-call nurse overnight? Is there a physician affiliated with the community?',
      },
      {
        heading: 'Questions about daily life',
        body: 'What does a typical day look like? What activities are available? Can residents personalize their room? Are outside visitors welcome at any time? Can my loved one keep a pet? What is the food like — can we stay for a meal? Is there a resident council?',
      },
      {
        heading: 'Red flags to watch for',
        body: 'Staff who avoid eye contact or seem rushed and stressed. Residents who appear unkempt or under-stimulated. Evasive or vague answers to direct questions about staffing. A dining room that smells bad or looks unappetizing. Pressure to sign quickly or put down a deposit on the first visit. Recent state inspection deficiencies that have not been explained. An admissions director who cannot tell you what state surveys revealed.',
      },
      {
        heading: 'After the tour: what to do',
        body: 'Look up the home\'s state inspection history on the Ohio Department of Health website. Cross-reference any cited deficiencies against what you observed. Call back unannounced within 48 hours and ask to visit during dinner. Compare your top 2–3 options side by side. Trust your gut — you know your loved one.',
      },
    ],
    cta: { text: 'Book a Tour Through CareLinkAI', href: '/search' },
  },
  {
    slug: 'transitioning-parent-to-assisted-living',
    title: 'How to Help a Parent Transition to Assisted Living',
    description: 'The emotional, logistical, and practical steps to make the move as smooth as possible — for them and for you.',
    readTime: '7 min read',
    category: 'Transitions',
    icon: '❤️',
    intro: 'Moving a parent to assisted living is one of the most emotionally complex things an adult child does. Grief, guilt, relief, and love can coexist in the same moment. This guide focuses on what actually helps.',
    sections: [
      {
        heading: 'Start the conversation early — before a crisis forces it',
        body: 'The best transitions are planned, not reactive. If your parent is still able to participate in the conversation, start it now — while there is time to visit multiple homes, involve them in the choice, and move on their timeline rather than an emergency\'s. Families who have these conversations early report significantly less conflict and guilt than those who wait.',
      },
      {
        heading: 'Acknowledge their resistance',
        body: 'Most people do not want to move to assisted living. They associate it with loss of independence, proximity to death, and leaving home. Do not argue with that. Acknowledge it. "I know this is not what you wanted. I do not want it to be necessary either." Resistance softens when people feel heard, not when they feel overruled.',
      },
      {
        heading: 'Let them make choices where they can',
        body: 'Give your parent agency in the areas where they have it. Which home? Which room? What furniture do they want to bring? When do they want to move? When people feel in control of some things, they are more able to accept the things they cannot control.',
      },
      {
        heading: 'The move-in day',
        body: 'Do not disappear immediately after getting them settled. Plan to spend the first meal together. Help them unpack and personalize the room. Then come back the next day, and the day after that. The first two weeks are the hardest. Frequent short visits are better than infrequent long ones during this period.',
      },
      {
        heading: 'What to expect in the first 30 days',
        body: 'Most residents experience a period of adjustment that can look like depression — withdrawal, tearfulness, complaints about the food or staff. This is normal. Staff call it "the 30-day adjustment." Research shows most residents who were initially resistant rate their quality of life positively at 90 days. If you see signs of true clinical depression, talk to the home\'s nursing staff.',
      },
      {
        heading: 'Taking care of yourself through the transition',
        body: 'Caregiver guilt is nearly universal. You are not abandoning your parent — you are getting them the level of care they need, often more than you could provide at home. Find a support group for adult children of assisted living residents (AARP and Area Agency on Aging both run these). Let yourself grieve what this transition represents.',
      },
    ],
    cta: { text: 'Find a Home That Feels Right', href: '/search' },
  },
  {
    slug: 'discharge-planning-hospital-guide',
    title: 'Hospital to Assisted Living: A Discharge Planning Guide',
    description: 'What happens when a family member is discharged from a hospital or rehab facility and needs ongoing care.',
    readTime: '6 min read',
    category: 'Discharge Planning',
    icon: '🏥',
    intro: 'When a loved one is hospitalized — from a fall, a stroke, a surgery — the clock starts ticking on discharge. Most families have 24–72 hours to make decisions they were not prepared for. Here is what to know before it happens.',
    sections: [
      {
        heading: 'Who is the discharge planner and what do they do?',
        body: 'Every hospital has a discharge planner (also called a care coordinator or social worker). Their job is to help your loved one transition safely out of the hospital. They are NOT neutral — hospitals are incentivized to discharge patients efficiently. The discharge planner works for the hospital. Advocate for your loved one by understanding what is and is not medically appropriate.',
      },
      {
        heading: 'The three common discharge pathways',
        body: 'Home with services: the patient returns home with visiting nurses, physical therapy, or home health aides. Short-term rehab (SNF): a skilled nursing facility provides intensive therapy before a return home or a move to assisted living. Assisted living or memory care: when the patient cannot safely return home and does not need the medical intensity of a SNF.',
      },
      {
        heading: 'How fast do you have to decide?',
        body: 'Often very fast. Medicare allows hospitals to discharge a patient once they are "medically stable," not fully recovered. You can ask for more time, but the hospital may start billing at the patient rate if you refuse a safe discharge. Use CareLinkAI\'s discharge planner portal to search available assisted living beds immediately — same-day matching is possible.',
      },
      {
        heading: 'Questions to ask the hospital discharge team',
        body: 'What is the expected discharge date? What level of care does my loved one need after discharge? What are the three options you are recommending, and why? What will Medicare cover, and for how long? What happens if we do not agree with the discharge plan?',
      },
      {
        heading: 'Your rights as a family',
        body: 'You have the right to appeal a hospital discharge decision. The hospital must give you a written "Important Message from Medicare" notice 48 hours before discharge. You can request a review by a Quality Improvement Organization (QIO) — this delays discharge while the appeal is considered. Do not be rushed into an unsafe discharge.',
      },
    ],
    cta: { text: 'Search Available Beds Now', href: '/search' },
  },
  {
    slug: 'caregiver-hiring-guide',
    title: 'How to Hire a Home Caregiver in Cleveland',
    description: 'When assisted living is not the right fit yet, hiring an in-home caregiver can bridge the gap.',
    readTime: '5 min read',
    category: 'Caregivers',
    icon: '👩‍⚕️',
    intro: 'Not everyone needs assisted living — at least not yet. An in-home caregiver can provide meaningful support while your loved one remains in a familiar environment. Here is how to hire well.',
    sections: [
      {
        heading: 'Agency vs. private hire',
        body: 'A home care agency handles background checks, scheduling, backup coverage, insurance, and taxes — for a premium (typically $28–$45/hour). Hiring privately is cheaper ($18–$28/hour) but puts legal and logistical responsibility on you. For most families, an agency or a platform like CareLinkAI\'s caregiver marketplace offers the best balance of safety and cost.',
      },
      {
        heading: 'What to check before hiring anyone',
        body: 'Background check (criminal, sex offender registry, abuse registry). Reference check — call at least two prior employers. CPR/first aid certification if relevant. CNA certification if medication management is needed. Experience with your loved one\'s specific condition (dementia, Parkinson\'s, post-stroke). Do not skip these steps, even for someone referred by a friend.',
      },
      {
        heading: 'How many hours do you need?',
        body: 'Start with an honest assessment of daily needs: morning routine help, meal preparation, medication reminders, light housekeeping, companionship, transportation. Most families underestimate hours initially. Budget for 20–40 hours/week for moderate care needs. Live-in care runs $180–$280/day for a 24-hour arrangement.',
      },
      {
        heading: 'The trial period',
        body: 'No matter how good a caregiver looks on paper, plan for a 2-week paid trial before committing. Have a family member present for the first shift. Get feedback from your loved one after the first week. Watch for red flags: a caregiver who takes phone calls during care time, discourages family visits, or asks for loans.',
      },
      {
        heading: 'When home care is no longer enough',
        body: 'Home care works until it does not. Signs that assisted living may be the next step: the caregiver is managing more than they were hired for, safety incidents are increasing, the cost of home care is approaching assisted living rates, or your loved one is isolated and would benefit from a community environment.',
      },
    ],
    cta: { text: 'Browse Caregivers on CareLinkAI', href: '/marketplace' },
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
