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
  {
    slug: 'signs-parent-needs-more-care',
    title: 'Signs Your Parent Needs More Care Than You Can Provide',
    description: 'How to recognize when home care is no longer safe — and what to do when you reach that moment.',
    readTime: '5 min read',
    category: 'Getting Started',
    icon: '🔍',
    intro: 'One of the hardest parts of being an adult child is recognizing the line between "I can manage this" and "this is no longer safe." This guide helps you see that line clearly — without guilt, without denial.',
    sections: [
      {
        heading: 'Physical safety warning signs',
        body: 'Unexplained bruises or injuries that suggest falls. Burns on hands from cooking mishaps. Expired medication or missed doses piling up. Noticeable weight loss from missed meals. A home that has become unsafe — cluttered pathways, broken appliances, spoiled food in the refrigerator. Any one of these is a signal. Several together mean act now.',
      },
      {
        heading: 'Cognitive warning signs',
        body: 'Getting lost in a familiar neighborhood. Forgetting recent conversations but remembering decades-old ones clearly. Leaving the stove on or doors unlocked at night. Confusion about time — believing it is a different year or that a deceased spouse is still living. Difficulty managing finances — unpaid bills, duplicate purchases, susceptibility to scams.',
      },
      {
        heading: 'Social and emotional warning signs',
        body: 'Withdrawal from activities and friends they previously enjoyed. Increasing irritability, paranoia, or emotional volatility that is new. Signs of depression — persistent sadness, hopelessness, loss of interest in food or hygiene. These changes are often early indicators of cognitive decline or undertreated depression.',
      },
      {
        heading: 'When the caregiver is the warning sign',
        body: 'If you are the primary caregiver and you are exhausted, resentful, missing work, or your own health is declining — that is a signal too. Caregiver burnout is a medical reality. When a caregiver breaks down, the person receiving care is also at risk. Getting help is not giving up.',
      },
      {
        heading: 'What to do next',
        body: 'Schedule a physician visit and share your observations — physicians can trigger formal cognitive and physical assessments. Contact your local Area Agency on Aging for a free needs assessment. Use CareLinkAI to explore assisted living options before a crisis forces a rushed decision. Having a plan gives everyone more control.',
      },
    ],
    cta: { text: 'Start Your Home Search', href: '/search' },
  },
  {
    slug: 'power-of-attorney-guide',
    title: 'Power of Attorney: What Every Family Needs to Know',
    description: 'The legal document that gives you the authority to make decisions for a parent who can no longer make them alone — and why you must get it while they still can.',
    readTime: '6 min read',
    category: 'Legal & Planning',
    icon: '⚖️',
    intro: 'Power of attorney is one of the most important legal documents an aging parent can create — and one of the most commonly delayed. Families often wait until a crisis to think about it. By then, it is sometimes too late.',
    sections: [
      {
        heading: 'What is a power of attorney?',
        body: 'A power of attorney (POA) is a legal document that authorizes another person (the "agent") to make decisions on behalf of the person who signs it (the "principal"). A financial POA covers banking, bills, and asset management. A healthcare POA (also called a healthcare proxy or medical POA) covers medical decisions. Both are essential.',
      },
      {
        heading: 'What is a durable power of attorney?',
        body: 'A standard POA becomes void if the principal loses mental capacity. A durable POA remains in effect even if the principal becomes incapacitated — which is precisely when you need it most. Always use a durable POA for aging parents. Ohio law governs durable POAs and requires specific language to make them legally valid.',
      },
      {
        heading: 'Why timing matters',
        body: 'To sign a valid POA, your parent must have legal capacity — meaning they understand what they are signing and its consequences. Once dementia or another condition has progressed to the point of incapacity, it is too late to create a POA. At that point, families must pursue guardianship through a court — a lengthy, expensive, and stressful process. Get the POA done while your parent is still cognitively able.',
      },
      {
        heading: 'What a healthcare POA covers',
        body: 'A healthcare POA allows your agent to make medical decisions — including treatment decisions, surgery consents, and end-of-life choices — when you cannot. It is different from a living will (advance directive), which expresses your own wishes directly. Ideally, your parent has both: a healthcare POA naming an agent AND a living will documenting their specific wishes.',
      },
      {
        heading: 'How to get it done',
        body: 'Contact an elder law attorney in Ohio — this is not a DIY situation. A qualified attorney ensures the document is properly executed, witnessed, and notarized, and will flag issues specific to your parent\'s situation. Many elder law attorneys offer flat-fee estate planning packages ($300–$800) that include POA, living will, and basic will. It is one of the highest-ROI legal investments a family can make.',
      },
    ],
    cta: { text: 'Find Assisted Living Near You', href: '/search' },
  },
  {
    slug: 'understanding-dementia-family-guide',
    title: 'Understanding Dementia: A Practical Family Guide',
    description: 'What dementia actually is, how it progresses, and what care your loved one will need at each stage.',
    readTime: '8 min read',
    category: 'Care Conditions',
    icon: '🧬',
    intro: 'Dementia is not a single disease — it is an umbrella term for a group of conditions that cause cognitive decline severe enough to interfere with daily life. Alzheimer\'s disease accounts for 60–80% of cases. Understanding what you are dealing with changes how you plan for care.',
    sections: [
      {
        heading: 'Early stage: mild impairment',
        body: 'In early-stage dementia, your loved one can still function independently in most areas. Symptoms include forgetting recent events or conversations, difficulty with complex tasks like managing finances, some personality changes, and getting lost in unfamiliar places. At this stage, home care or standard assisted living is often appropriate. Focus on legal planning (POA, advance directives) while your loved one still has capacity.',
      },
      {
        heading: 'Middle stage: moderate impairment',
        body: 'The middle stage is typically the longest and most demanding. Increasing memory loss and confusion, difficulty recognizing family members, need for help with daily activities (bathing, dressing, toileting), significant personality and behavioral changes — agitation, paranoia, sleep disturbances, wandering. This stage often marks the transition point where memory care becomes necessary for safety.',
      },
      {
        heading: 'Late stage: severe impairment',
        body: 'In late-stage dementia, individuals lose the ability to respond to their environment, communicate verbally, or control movement. They require round-the-clock assistance with all personal care. Swallowing difficulties and susceptibility to infections are common. Care focuses on comfort, dignity, and quality of remaining time. Hospice care is appropriate and underutilized in late-stage dementia.',
      },
      {
        heading: 'What good memory care looks like',
        body: 'Enclosed, secure environment to prevent wandering. High staff-to-resident ratio (1:5 or better, 24/7). Staff trained specifically in dementia care techniques. Structured daily routines that reduce confusion and agitation. Activities designed for cognitive engagement at each stage. Family communication and education programs. A calm, low-stimulation physical environment.',
      },
      {
        heading: 'Taking care of yourself as a caregiver',
        body: 'Dementia caregiving is a marathon with no clear finish line. Caregiver depression and burnout rates among dementia caregivers are among the highest of any caregiver population. The Alzheimer\'s Association 24/7 helpline (800-272-3900) is a genuine resource. Respite care — short breaks for caregivers — is available through most assisted living communities and should be used regularly, not saved for emergencies.',
      },
    ],
    cta: { text: 'Find Memory Care Near Cleveland', href: '/search?careLevel=MEMORY_CARE' },
  },
  {
    slug: 'veterans-benefits-assisted-living',
    title: "Veterans Benefits for Assisted Living: What You're Missing",
    description: 'The VA Aid & Attendance benefit pays up to $2,200/month for eligible veterans in assisted living. Most families never apply.',
    readTime: '5 min read',
    category: 'Finances',
    icon: '🎖️',
    intro: 'If your parent or loved one is a veteran — or a surviving spouse of a veteran — there may be significant VA benefits available to help pay for assisted living. The Aid & Attendance pension benefit is one of the most underutilized senior care resources in the country.',
    sections: [
      {
        heading: 'What is Aid & Attendance?',
        body: 'Aid & Attendance (A&A) is a VA pension benefit for wartime veterans (and surviving spouses) who need help with activities of daily living due to a disability, age, or illness. It is paid monthly on top of the basic VA pension. In 2026, the maximum monthly amounts are approximately $2,300 for a veteran, $1,478 for a surviving spouse, and $2,727 for a veteran with a sick spouse. These figures adjust annually.',
      },
      {
        heading: 'Basic eligibility requirements',
        body: 'The veteran must have served at least 90 days of active duty with at least one day during a wartime period (WWII, Korea, Vietnam, Gulf War are the common ones). The veteran or surviving spouse must need regular assistance with daily activities. There are income and asset limits — net worth generally must be below approximately $155,000 (adjusted annually), though a primary residence and vehicle are excluded.',
      },
      {
        heading: 'How to apply',
        body: 'Apply through a VA-accredited claims agent or attorney (never pay anyone a percentage of your benefit — that is illegal). The Ohio Department of Veterans Services and county veterans service offices provide free assistance with applications. The application process typically takes 3–6 months, so apply as soon as eligibility is established — benefits do not backdate to before the application date.',
      },
      {
        heading: 'What it can pay for',
        body: 'Aid & Attendance can be used to pay for assisted living, memory care, in-home care, or adult day programs. It is not facility-specific — the money goes to the veteran or their family to use for qualified care expenses. Combined with Social Security and any pension income, A&A can meaningfully close the gap between what a family can afford and what quality care actually costs.',
      },
      {
        heading: 'Other VA benefits to explore',
        body: 'The VA Community Living Centers (VA nursing homes) provide free care for eligible veterans. Home-based primary care brings VA physicians and nurses to the home. Homemaker/Home Health Aide services can be provided through the VA. Each benefit has its own eligibility criteria — contact your local VA regional office or county veterans service office to get a full picture.',
      },
    ],
    cta: { text: 'Search Veteran-Friendly Homes', href: '/search' },
  },
  {
    slug: 'talking-to-parent-about-assisted-living',
    title: 'How to Talk to Your Parent About Moving to Assisted Living',
    description: 'The conversation most families dread — and how to have it in a way that preserves dignity and keeps the relationship intact.',
    readTime: '6 min read',
    category: 'Family Support',
    icon: '💬',
    intro: 'There is no perfect script for this conversation. But there are approaches that work better than others — that keep the door open, preserve dignity, and give your parent a genuine role in what happens next.',
    sections: [
      {
        heading: 'Do not have the conversation after a crisis',
        body: 'The worst time to introduce assisted living is in the emergency room, or the week after a fall, or when your parent is at their most frightened and vulnerable. Crises create urgency that feels like attack. If at all possible, start the conversation when things are relatively stable — when it can be a discussion rather than a directive.',
      },
      {
        heading: 'Lead with observation, not conclusion',
        body: 'Say what you have noticed rather than what you have decided. "I noticed the refrigerator had spoiled food last time I visited" is different from "You can\'t take care of yourself anymore." The first invites a conversation. The second triggers defensiveness. Describe specific things you have seen. Ask your parent what they have noticed.',
      },
      {
        heading: 'Ask about their fears',
        body: 'Most resistance to assisted living is rooted in specific fears: losing independence, dying alone, being forgotten, losing a familiar home. Ask directly: "What worries you most about this?" Then listen without interrupting or reassuring too quickly. When people feel their fears are understood, they are more able to engage with practical options.',
      },
      {
        heading: 'Involve them in the research',
        body: 'Invite your parent to look at homes with you — virtually or in person. Even if cognitive decline limits how much they can participate, the act of being included changes the dynamic. "I found a few places I\'d like us to look at together" is a very different invitation than presenting a decision that has already been made.',
      },
      {
        heading: 'When your parent refuses',
        body: 'Some parents will refuse any conversation about assisted living. If the situation is still safe, you may not be able to force the issue — and forcing it damages trust. Keep visiting. Keep the door open. Get your own legal and clinical support in place (POA, physician documentation of needs). When a crisis eventually makes action necessary, you will be better prepared to move quickly with authority.',
      },
    ],
    cta: { text: 'Tour a Home Together', href: '/search' },
  },
  {
    slug: 'avoiding-caregiver-burnout',
    title: 'Caregiver Burnout Is Real — And It Affects Your Loved One',
    description: 'Recognizing the signs of burnout and why getting help is not giving up.',
    readTime: '5 min read',
    category: 'Family Support',
    icon: '🌿',
    intro: 'Family caregiving is one of the most meaningful things a person can do. It is also one of the most exhausting — and one of the least supported. Burnout among family caregivers is common, serious, and often goes unrecognized until a crisis forces a change.',
    sections: [
      {
        heading: 'What caregiver burnout looks like',
        body: 'Persistent exhaustion that sleep does not fix. Increasing resentment or irritability — toward the person you care for, toward siblings who are not helping, toward anyone who does not understand. Withdrawing from your own life: friends, hobbies, your own health appointments. A growing sense of hopelessness, or feeling that nothing you do is ever enough. Physical symptoms: headaches, frequent illness, changes in appetite or sleep.',
      },
      {
        heading: 'Why it happens',
        body: 'Caregiving is often invisible and unpaid work that expands without clear limits. There is no performance review, no vacation, no sick days. Family caregivers frequently report feeling isolated — others around them cannot relate to the complexity of what they are managing. And there is usually grief layered into the caregiving: watching someone you love lose themselves gradually.',
      },
      {
        heading: 'What actually helps',
        body: 'Respite care: time off, provided by another person or facility, while you recover. Even a few hours a week makes a measurable difference. Support groups for caregivers — in-person or online — reduce isolation and provide practical strategies. Therapy, particularly with a therapist who has experience with grief and family systems. And honest conversations with siblings or other family members about sharing responsibility.',
      },
      {
        heading: 'Getting help is not abandonment',
        body: 'The most common obstacle to getting help is guilt. "I should be able to handle this." "What kind of child puts their parent in a home?" These feelings are normal — and they are not accurate. A caregiver who is burned out is less able to provide good care. Moving a parent to assisted living is often an act of love, not abandonment — it provides professional care, community, activities, and safety that a lone family caregiver cannot replicate.',
      },
      {
        heading: 'Resources in Ohio',
        body: 'The Area Agency on Aging (AAA) serves every county in Ohio and provides free care coordination, respite options, and support group referrals. Call 1-866-243-5678 (Ohio Senior Helpline) to reach your local AAA. The Caregiver Action Network (caregiveraction.org) offers online community and resources. AARP has a caregiving resource center at aarp.org/caregiving.',
      },
    ],
    cta: { text: 'Explore Assisted Living Options', href: '/search' },
  },
  {
    slug: 'what-medicare-covers',
    title: 'What Medicare Covers in Senior Care (And What It Does Not)',
    description: 'Medicare pays for far less senior care than most families expect. Here is the actual breakdown.',
    readTime: '5 min read',
    category: 'Finances',
    icon: '🏦',
    intro: 'Medicare is the most misunderstood program in senior care. Most families assume it covers assisted living. It does not. Understanding exactly what Medicare does and does not cover prevents devastating financial surprises.',
    sections: [
      {
        heading: 'What Medicare Part A covers in senior care',
        body: 'Medicare Part A covers inpatient hospital stays and, in limited circumstances, skilled nursing facility (SNF) care. SNF coverage requires a 3-day qualifying hospital stay and covers up to 100 days — but only for skilled care (physical therapy, wound care, IV medications). It does NOT cover custodial care: help with bathing, dressing, eating, toileting. Days 1–20 are fully covered; days 21–100 require a daily copay ($200/day in 2026); days 101+ are not covered at all.',
      },
      {
        heading: 'What Medicare does not cover',
        body: 'Medicare does not cover assisted living, memory care, or any type of residential care where the primary need is help with daily activities rather than skilled medical treatment. It also does not cover 24-hour home care, adult day care, or most in-home custodial services. This surprises nearly every family navigating senior care for the first time.',
      },
      {
        heading: 'What Medicare Advantage (Part C) might cover',
        body: 'Some Medicare Advantage plans include limited home care, adult day services, or respite care benefits — but coverage varies widely by plan. Check your specific plan\'s Evidence of Coverage document. Do not assume because you have Medicare Advantage that assisted living is covered — it almost never is.',
      },
      {
        heading: 'What actually pays for long-term care',
        body: 'Private pay (personal savings and income) funds 52% of assisted living nationwide. Long-term care insurance covers another significant portion for those who have it. Medicaid pays for those who qualify based on income and assets — but has waitlists in Ohio. Veterans\' benefits (Aid & Attendance) are available for eligible veterans. Social Security income can partially offset costs but rarely covers them fully.',
      },
      {
        heading: 'Planning ahead: the only real protection',
        body: 'The families who navigate senior care costs most successfully are the ones who planned before a crisis: they purchased long-term care insurance while still insurable, explored VA benefits before they were needed, established proper legal documents (POA, advance directives), and had honest conversations about finances and preferences before cognitive decline made those conversations impossible.',
      },
    ],
    cta: { text: 'Compare Affordable Homes Near You', href: '/search' },
  },
  {
    slug: 'fall-prevention-senior-safety',
    title: 'Fall Prevention and Senior Safety: What Good Facilities Do Differently',
    description: 'Falls are the leading cause of injury death in adults over 65. Here is what separates safe homes from dangerous ones.',
    readTime: '4 min read',
    category: 'Safety',
    icon: '🛡️',
    intro: 'One in four adults over 65 falls each year. Falls are the leading cause of both fatal and nonfatal injuries in older Americans. Choosing a facility with strong fall prevention practices is one of the most important decisions a family can make.',
    sections: [
      {
        heading: 'What causes falls in senior care settings',
        body: 'Medication side effects — particularly blood pressure medications, sedatives, and certain antidepressants — are the single largest preventable cause of falls. Poor lighting, slippery floors, and cluttered pathways are environmental factors. Dehydration and urinary urgency (rushing to the bathroom) cause a significant share of nighttime falls. Muscle weakness, poor balance, and vision problems compound all of these.',
      },
      {
        heading: 'What a good facility does proactively',
        body: 'Falls risk assessments at admission and after any health change. Personalized care plans that address individual risk factors. Non-slip flooring throughout, grab bars in bathrooms, adequate lighting in hallways at night. Regular medication reviews by a pharmacist or physician to identify high-risk drug combinations. Fall prevention exercise programs (balance training, strength work).',
      },
      {
        heading: 'Questions to ask during a tour',
        body: 'What is your falls rate per 1,000 resident-days? (Ask for the number — do not accept "we have a great program.") What is your protocol after a fall — who is notified, what is assessed, and what changes are made to prevent recurrence? Do you have a falls prevention committee? What is your policy on bed and chair alarms?',
      },
      {
        heading: 'What to look for during the visit',
        body: 'Clean, dry floors in common areas and bathrooms. Call lights within easy reach of every bed and toilet. Adequate lighting in hallways, especially at night. No clutter or tripping hazards in resident rooms and corridors. Staff who walk alongside residents rather than rushing ahead.',
      },
      {
        heading: 'After a fall: what to expect',
        body: 'Any fall in an assisted living facility should trigger a written incident report, a physician notification, a reassessment of the resident\'s care plan, and a family notification within 24 hours. If a facility minimizes falls, dismisses your concerns, or cannot produce incident documentation — that is a serious red flag about how they manage risk and transparency.',
      },
    ],
    cta: { text: 'Find Safe, Well-Staffed Homes', href: '/search' },
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
