'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { usePaidFeature } from "@/hooks/usePaidFeatures";
import { 
  FiArrowRight, FiCheck, FiShield, FiUsers, FiHeart, FiActivity,
  FiSearch, FiStar, FiZap, FiBriefcase, FiMessageCircle, FiCalendar,
  FiFileText, FiClock, FiTarget, FiTrendingUp, FiAward, FiHome,
  FiGlobe, FiBarChart, FiChevronDown, FiPhone, FiMail, FiMapPin,
  FiMenu, FiX, FiPlay, FiTruck, FiCreditCard, FiLayers, FiRefreshCw
} from "react-icons/fi";
import { nowLiveItems, comingSoonItems, type RoadmapFlags, type RoadmapIcon } from "@/lib/marketing/roadmap";
import { BOOST_PROMO_LINE } from "@/lib/providers/boost";
import { PROVIDER_CATEGORIES, PROVIDER_CATEGORY_SUMMARY } from "@/lib/providers/categories";
import { prefersReducedMotion, durations, easings } from "@/lib/animations";

/** Must equal AVAILABILITY_FRESH_DAYS (src/lib/availability/availability.ts, server-only); pinned by __tests__/homepage-hero.unit.test.tsx. */
const VERIFIED_AVAILABILITY_DAYS = 10;
import DemoRequestForm from "@/components/marketing/DemoRequestForm";
import DemoVideoModal from "@/components/marketing/DemoVideoModal";
import ProductTour from "@/components/marketing/ProductTour";
import TourVideo from "@/components/marketing/TourVideo";
import type { Tour, TourVideo as TourVideoData } from "@/lib/marketing/product-tour-data";
import { demoSectionCapabilities } from "@/lib/marketing/demo-section";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";
import { CONCIERGE_OFFER } from "@/lib/concierge/offer";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardHover = {
  initial: { scale: 1, y: 0 },
  hover: { scale: 1.03, y: -5 },
};

/**
 * Provider pricing flags (10/29), read on the server and passed in:
 *   providerListingOn → the Providers persona card + "free listing" copy;
 *   providerBoostOn   → Boost price copy ($39/mo).
 * Both off → the page renders exactly as before, except the retired $99 listing price.
 */
const ROADMAP_ICONS: Record<RoadmapIcon, React.ReactNode> = {
  briefcase: <FiBriefcase />, users: <FiUsers />, award: <FiAward />, activity: <FiActivity />, trending: <FiTrendingUp />,
  shield: <FiShield />, globe: <FiGlobe />, calendar: <FiCalendar />, zap: <FiZap />, chart: <FiBarChart />,
  wallet: <FiCreditCard />, star: <FiStar />, layers: <FiLayers />, refresh: <FiRefreshCw />,
};

export default function HomePage({
  providerListingOn = false,
  providerBoostOn = false,
  ridesPaymentsOn = false,
  backgroundChecksOn = false,
  operatorPlansOn = false,
  complianceKitsOn = false,
  caregiverProOn = false,
  tour = null,
  tourVideo = null,
}: {
  providerListingOn?: boolean;
  providerBoostOn?: boolean;
  ridesPaymentsOn?: boolean;
  backgroundChecksOn?: boolean;
  operatorPlansOn?: boolean;
  complianceKitsOn?: boolean;
  caregiverProOn?: boolean;
  /** /public/demo/tour.json slides (read on the server); none → no tour. */
  tour?: Tour | null;
  /** Self-hosted narrated tour (public/demo/tour.mp4, read on the server); none → no video, button or modal. */
  tourVideo?: TourVideoData | null;
} = {}) {
  // "Now Live" / "Coming Soon" follow the same flags as the product (src/lib/marketing/roadmap.ts).
  const roadmapFlags: RoadmapFlags = { providerListingOn, ridesPaymentsOn, backgroundChecksOn, operatorPlansOn, complianceKitsOn };
  const { enabled: kitsEnabled } = usePaidFeature('COMPLIANCE_KITS');
  const [activeBenefitTab, setActiveBenefitTab] = useState('families');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoVideoOpen, setDemoVideoOpen] = useState(false);
  const demoCapabilities = demoSectionCapabilities();

  useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Animation wrapper helper
  const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    
    if (!mounted || reducedMotion) {
      return <div className={className}>{children}</div>;
    }
    
    return (
      <motion.div
        ref={ref}
        initial="initial"
        animate={isInView ? "animate" : "initial"}
        variants={fadeInUp}
        transition={{ duration: durations.slow, ease: easings.easeOut  }}
        className={className}
      >
        {children}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Top row */}
          {/* One row at every width: the logo shrinks below sm so the CTA and the menu button always fit (390: no wrap, no clip). */}
          <div className="flex justify-between items-center gap-3 py-4" data-testid="home-header-row">
            <Link href="/" className="flex min-w-0 items-center group">
              <div className="relative h-12 w-40 sm:h-16 sm:w-64">
                <Image
                  src="/images/logo.png"
                  alt="CareLinkAI"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </Link>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link href="#features" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">Features</Link>
              <Link href="#how-it-works" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">How It Works</Link>
              <Link href="#benefits" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">Who It Serves</Link>
              <Link href="#pricing" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">Pricing</Link>
              <Link href="#roadmap" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">Roadmap</Link>
              <Link href="/learn" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">Learn</Link>
            </div>

            {/* Right side: auth buttons + hamburger */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/auth/login"
                className="hidden lg:block text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="whitespace-nowrap bg-gradient-to-r from-primary-500 to-secondary-500 hover:opacity-90 text-white px-3 py-2.5 sm:px-5 rounded-lg font-medium transition-opacity shadow-lg text-sm"
                data-testid="home-header-signup"
              >
                Sign up free
              </Link>
              <button
                className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors"
                data-testid="home-header-menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-neutral-100 pb-5">
              <div className="space-y-1 pt-3">
                {[
                  { href: '#features', label: 'Features' },
                  { href: '#how-it-works', label: 'How It Works' },
                  { href: '#benefits', label: 'Who It Serves' },
                  { href: '#pricing', label: 'Pricing' },
                  { href: '#roadmap', label: 'Roadmap' },
                  { href: '/learn', label: 'Learn' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-3 rounded-lg text-neutral-700 hover:bg-primary-50 hover:text-primary-600 font-medium transition-colors text-base"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-neutral-100 pt-4 mt-2 flex flex-col gap-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center py-3 rounded-lg border-2 border-primary-500 text-primary-500 font-semibold hover:bg-primary-50 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center py-3 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold shadow-lg hover:opacity-90 transition-opacity"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 1. HERO SECTION - Enhanced */}
      <section className="relative py-20 md:py-28 overflow-hidden" data-testid="home-hero">
        {/* Background image (the original hero photo; the made-up match card that sat on it stays removed) */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero-bg2.jpg"
            alt=""
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
            data-testid="hero-photo"
          />
          {/* Light gradient — image already has a bright background so minimal overlay needed */}
          <div className="absolute inset-0 bg-gradient-to-r from-white from-35% via-white/75 via-55% to-white/10" />
        </div>

        {/* Subtle decorative blobs on top of image */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-500 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500 rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Trust badge */}
              <div className="inline-flex items-center bg-white rounded-full px-4 py-2 shadow-sm mb-6 border border-neutral-200">
                <FiStar className="text-secondary-500 mr-2" />
                <span className="text-sm font-semibold text-neutral-900">Senior care, simplified for Northeast Ohio families</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight" data-testid="home-hero-headline">
                Cleveland assisted living, with every fact clearly labeled.
              </h1>
              
              <p className="mt-6 text-xl text-neutral-700 max-w-xl leading-relaxed" data-testid="home-hero-subhead">
                Assisted living and memory care communities, plus in-home care and service providers for seniors living at home. We&apos;re confirming open beds, starting prices and Medicaid waiver status directly with communities, and we show you exactly what&apos;s verified and when. <span className="font-semibold text-neutral-900">Free for families.</span> Built with HIPAA-aligned safeguards.
              </p>
              
              {/* CTAs */}
              <motion.div 
                className="mt-8 flex flex-col sm:flex-row gap-4"
                initial={mounted && !reducedMotion ? { opacity: 0, y: 20 } : undefined}
                animate={mounted && !reducedMotion ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <motion.div
                  whileHover={reducedMotion ? undefined : { scale: 1.02, y: -2 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                >
                  <Link
                    href="/auth/register"
                    className="group bg-gradient-to-r from-primary-500 to-secondary-500 hover:shadow-xl text-white px-8 py-4 rounded-lg font-semibold text-center flex items-center justify-center shadow-lg transition-all duration-300"
                  >
                    Get Started — It&apos;s Free
                    <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={reducedMotion ? undefined : { scale: 1.02, y: -2 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                >
                  <Link 
                    href="/search" 
                    className="bg-white hover:bg-neutral-50 text-neutral-900 px-8 py-4 rounded-lg font-semibold border-2 border-neutral-300 text-center flex items-center justify-center transition-all duration-300 hover:border-primary-500"
                  >
                    <FiSearch className="mr-2" />
                    Find Care Now
                  </Link>
                </motion.div>
              </motion.div>
              
              {/* Trust indicators */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-neutral-500">
                <div className="flex items-center">
                  <FiCheck className="text-secondary-500 mr-2 flex-shrink-0" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center">
                  <FiShield className="text-secondary-500 mr-2 flex-shrink-0" />
                  <span>HIPAA-aligned safeguards</span>
                </div>
                <div className="flex items-center">
                  <FiZap className="text-secondary-500 mr-2 flex-shrink-0" />
                  <span>Free AI matching</span>
                </div>
                <div className="flex items-center font-semibold text-success-700 bg-success-50 border border-success-200 rounded-full px-3 py-1">
                  <FiHeart className="mr-1.5 flex-shrink-0" />
                  <span>Free for families &amp; caregivers</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 1a. WHAT WE VERIFY — moved out of the hero (the photo has the right half). Every line is a qualified
          claim the product backs: ODH license where matched, ODH inspection facts, and "Verified" availability
          only within VERIFIED_AVAILABILITY_DAYS (= AVAILABILITY_FRESH_DAYS) of the community confirming it. */}
      <section className="relative z-10 border-b border-neutral-200 bg-white py-10" aria-labelledby="hero-trust-heading">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div data-testid="hero-trust-panel" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
            <p id="hero-trust-heading" className="text-xs font-semibold uppercase tracking-widest text-neutral-500">What we verify</p>
            <ul className="mt-5 grid gap-6 md:grid-cols-3 md:gap-8">
              <li className="flex gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><FiShield aria-hidden="true" className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-neutral-900">Licensed by ODH</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">We show a home&apos;s Ohio Department of Health license once we&apos;ve matched it to the state record.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-700"><FiFileText aria-hidden="true" className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-neutral-900">State inspection facts</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">Ohio survey and citation history, linked to the public source. No grades, no paid rankings.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700"><FiCheck aria-hidden="true" className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-neutral-900">Verified availability</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">{`Open beds say Verified only when the community confirmed them with us in the last ${VERIFIED_AVAILABILITY_DAYS} days. Everything else is labelled unverified.`}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 1b. FAMILY CONCIERGE (sprint W5-3, G1) — between hero/search and the directory. Renders logged-out. */}
      <section className="py-14 bg-primary-50 border-y border-primary-100" data-testid="home-concierge-section">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Family Concierge · Greater Cleveland</p>
              {/* OL-165: the headline is the mistake, not the time saved. One line + the guarantee + the link. */}
              <h2 className="mt-2 text-3xl md:text-4xl font-bold text-neutral-900" data-testid="home-concierge-headline">
                {CONCIERGE_OFFER.headline}
              </h2>
              <p className="mt-4 text-lg text-neutral-800">{CONCIERGE_OFFER.oneLine}</p>
              <p className="mt-3 flex gap-3 text-neutral-800" data-testid="home-concierge-guarantee">
                <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                <span>
                  <strong>{CONCIERGE_OFFER.subhead}</strong> {CONCIERGE_OFFER.priceDisplay} flat, one time. {CONCIERGE_OFFER.guarantee}
                </span>
              </p>
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-primary-200 bg-white p-6 shadow-sm">
              <p className="text-neutral-700">
                Optional, for families paying privately. Searching, prices, waiver status and inspection history on
                CareLinkAI are free for every family.
              </p>
              <Link
                href="/concierge"
                data-testid="home-concierge-cta"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
              >
                See the Family Concierge
                <FiArrowRight />
              </Link>
              <p className="mt-4 text-sm text-neutral-600" data-testid="home-concierge-free-line">
                Paying with Medicaid, Medicare or the VA? Our help is always free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION SECTION */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Why CareLinkAI?
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              The only platform connecting families, care homes, caregivers, and healthcare professionals 
              through intelligent AI-powered matching
            </p>
          </div>
          
          {/* Four-segment strategy (five with the Providers card: 3+2 centered at md/lg, 5-up at xl, never an orphan stretched alone) */}
          <div
            data-testid="persona-row"
            data-cards={providerListingOn ? 5 : 4}
            className={providerListingOn
              ? 'mt-12 flex flex-wrap justify-center gap-8 [&>*]:w-full md:[&>*]:w-[calc((100%-4rem)/3)] xl:[&>*]:w-[calc((100%-8rem)/5)] xl:[&>*]:p-6 [&>*>div.flex]:flex-wrap [&>*>div.flex]:gap-y-2 xl:[&_h3]:text-xl'
              : 'grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12'}
          >
            <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-500/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mb-6">
                <FiUsers className="text-white text-3xl" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-2xl font-bold text-neutral-900">For Families</h3>
                <span className="text-xs font-bold bg-success-100 text-success-700 border border-success-200 rounded-full px-2.5 py-1 uppercase tracking-wide">Always Free</span>
              </div>
              <p className="text-neutral-500 mb-4">
                Find the perfect care home or caregiver for your loved one through our AI matching engine.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-primary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">AI-powered matching to care homes</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Direct connection to qualified caregivers</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">{backgroundChecksOn ? 'Run background checks from search — Basic free' : 'Every fact labeled verified or not, with the date'}</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">24/7 CareBot support</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-secondary-50 to-white p-8 rounded-2xl border border-secondary-500/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-400 flex items-center justify-center mb-6">
                <FiActivity className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">For Operators</h3>
              <p className="text-neutral-500 mb-4">
                Receive qualified inquiries and manage your facility with comprehensive tools.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-secondary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">AI-generated inquiry responses</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-secondary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Post open shifts and review caregiver bids</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-secondary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Direct-hire caregivers from the marketplace</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-secondary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Resident and document management</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8 rounded-2xl border border-primary-500/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-6">
                <FiBriefcase className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">For Healthcare Pros</h3>
              <p className="text-neutral-500 mb-4">
                Discharge planners and case managers can send one placement request to several matching homes.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-primary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">AI placement search</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Multi-facility requests</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Bed availability marked verified or not, with the date</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-success-50 to-white p-8 rounded-2xl border border-success-500/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-success-500 to-success-400 flex items-center justify-center mb-6">
                <FiHeart className="text-white text-3xl" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-2xl font-bold text-neutral-900">For Caregivers</h3>
                <span className="text-xs font-bold bg-success-100 text-success-700 border border-success-200 rounded-full px-2.5 py-1 uppercase tracking-wide">Always Free</span>
              </div>
              <p className="text-neutral-500 mb-4">
                Find shifts, build your career, and get matched to care homes that need your skills.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-success-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">AI job matching to nearby shifts</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-success-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Build your professional profile</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-success-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">In-app shift notifications</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-success-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-neutral-500">Apply directly to care homes</span>
                </li>
              </ul>
            </div>

            {providerListingOn && (
              <div data-testid="persona-providers" className="bg-gradient-to-br from-warning-50 to-white p-8 rounded-2xl border border-warning-500/20 hover:shadow-lg transition-shadow flex flex-col">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-warning-500 to-warning-400 flex items-center justify-center mb-6">
                  <FiTruck className="text-white text-3xl" />
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-2xl font-bold text-neutral-900">For Providers</h3>
                  <span className="text-xs font-bold bg-warning-100 text-warning-800 border border-warning-200 rounded-full px-2.5 py-1 uppercase tracking-wide">Free Listing</span>
                </div>
                <p className="text-neutral-900 font-semibold">List your services free.</p>
                <p className="text-sm text-neutral-500 mb-4">{`${PROVIDER_CATEGORY_SUMMARY}.`}</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start">
                    <FiCheck className="text-warning-600 mt-1 mr-2 flex-shrink-0" />
                    <span className="text-sm text-neutral-500">Get found by families who need help at home</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheck className="text-warning-600 mt-1 mr-2 flex-shrink-0" />
                    <span className="text-sm text-neutral-500">Inquiries straight to your dashboard</span>
                  </li>
                  {providerBoostOn && (
                    <li className="flex items-start" data-testid="persona-providers-boost">
                      <FiCheck className="text-warning-600 mt-1 mr-2 flex-shrink-0" />
                      <span className="text-sm text-neutral-500">{BOOST_PROMO_LINE}</span>
                    </li>
                  )}
                </ul>
                <Link href="/auth/register?role=provider" className="mt-auto inline-flex items-center font-semibold text-warning-800 hover:underline underline-offset-2">
                  List your services free <FiArrowRight className="ml-1" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. AI FEATURES SHOWCASE (THE STAR!) */}
      <section id="features" className="py-20 bg-gradient-to-br from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full px-4 py-2 shadow-lg mb-6">
              <FiZap className="text-white mr-2" />
              <span className="text-sm font-bold text-white">LIVE TODAY</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Tools Built for Senior Care Operators and Planners
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              Our proprietary AI technology transforms how senior care connections are made
            </p>
          </div>
          
          {/* 8 features: only what an operator, family or planner can use today */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-primary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiTarget className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                AI Resident Matching Engine
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                Scores each home on budget, health needs, care level, location and amenities.
              </p>
              <p className="text-xs font-semibold text-primary-500">
                ✓ Multi-factor AI match scoring
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-secondary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiFileText className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                AI Home Profile Generator
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                Drafts your facility description, amenities and care specialties from what you tell it.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ Free with your listing
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-primary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiCalendar className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                AI Tour Scheduling
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                Suggests tour times from the home&apos;s availability. Families request a time, the home confirms, and both get a confirmation email.
              </p>
              <p className="text-xs font-semibold text-primary-500">
                ✓ Email confirmations
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-secondary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiMessageCircle className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                AI Inquiry Response System
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                AI drafts a personalized reply to each family inquiry. You review it and send it by email.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ You approve every reply
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-secondary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiBriefcase className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                Direct Caregiver Hire
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                Operators browse the marketplace and hire caregivers directly, with no job posting. The caregiver gets an in-app notification.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ No job posting needed
              </p>
            </div>
            
            {/* Feature 7 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-primary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiMessageCircle className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                CareBot for Families
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                AI chatbot that answers questions and points families to the right resources, any time of day.
              </p>
              <p className="text-xs font-semibold text-primary-500">
                ✓ Always available
              </p>
            </div>
            
            {/* Feature 8 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-secondary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiBriefcase className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                AI for Discharge Planners
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                Search homes by care level and payer. Availability is marked verified, with the date, or not verified.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ Free for discharge planners
              </p>
            </div>

            {/* Feature 9 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-primary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiCalendar className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                Household Shift Scheduling
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                Families who hire caregivers directly can schedule, track, and manage private shifts — all in one place. Mark shifts complete or cancelled and keep a full history.
              </p>
              <p className="text-xs font-semibold text-primary-500">
                ✓ Built for home care families
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              {providerListingOn
                ? 'Free for families, caregivers and discharge planners. Free to list for care homes and providers.'
                : 'Free for families, caregivers and discharge planners. Free to list for care homes.'}
            </p>
          </div>
          
          {/* 4 cards: 2×2 at md, 4-up at lg. 5 (Providers on): 2+2+1 at md, 3+2 from lg (max-w-7xl is too narrow for 5-up); rows centered, no card stretched alone. */}
          <div
            data-testid="how-it-works-cards"
            data-cards={providerListingOn ? 5 : 4}
            className={`flex flex-wrap justify-center gap-8 [&>*]:w-full md:[&>*]:w-[calc((100%-2rem)/2)] ${
              providerListingOn ? 'lg:[&>*]:w-[calc((100%-4rem)/3)]' : 'lg:[&>*]:w-[calc((100%-6rem)/4)]'
            }`}
          >
            {/* For Families */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-2xl border border-primary-500/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 items-center justify-center mb-4">
                  <FiUsers className="text-white text-2xl" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-bold text-neutral-900">For Families</h3>
                  <span className="text-xs font-bold bg-success-100 text-success-700 border border-success-200 rounded-full px-2.5 py-1 uppercase tracking-wide">Free</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Tell Us Your Needs</h4>
                    <p className="text-sm text-neutral-500">Share your loved one's care requirements</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Get AI Matches</h4>
                    <p className="text-sm text-neutral-500">Receive personalized care home matches</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Schedule Tours</h4>
                    <p className="text-sm text-neutral-500">Request a visit; the home confirms the time</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* For Care Homes */}
            <div className="bg-gradient-to-br from-secondary-50 to-white p-6 rounded-2xl border border-secondary-500/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-400 items-center justify-center mb-4">
                  <FiActivity className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">For Care Homes</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Create Your Profile</h4>
                    <p className="text-sm text-neutral-500">AI generates your facility profile</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Receive Inquiries</h4>
                    <p className="text-sm text-neutral-500">Get matched with qualified families</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Fill Your Beds</h4>
                    <p className="text-sm text-neutral-500">Convert inquiries into residents</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <p className="text-xs text-neutral-500 text-center" data-testid="how-care-homes-footer">
                  Free to list. Claim your community&apos;s listing or add a new one.
                </p>
              </div>
            </div>

            {/* For Caregivers */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-2xl border border-primary-500/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 items-center justify-center mb-4">
                  <FiHeart className="text-white text-2xl" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-bold text-neutral-900">For Caregivers</h3>
                  <span className="text-xs font-bold bg-success-100 text-success-700 border border-success-200 rounded-full px-2.5 py-1 uppercase tracking-wide">Free</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Build Your Profile</h4>
                    <p className="text-sm text-neutral-500">Showcase your skills and experience</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Get Matched</h4>
                    <p className="text-sm text-neutral-500">Connect with families seeking care</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Start Caring</h4>
                    <p className="text-sm text-neutral-500">Begin your rewarding caregiving job</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* For Healthcare Pros */}
            <div className="bg-gradient-to-br from-secondary-50 to-white p-6 rounded-2xl border border-secondary-500/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-secondary-500 to-primary-500 items-center justify-center mb-4">
                  <FiBriefcase className="text-white text-2xl" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-bold text-neutral-900">For Discharge Planners</h3>
                  <span className="text-xs font-bold bg-success-100 text-success-700 border border-success-200 rounded-full px-2.5 py-1 uppercase tracking-wide">Free</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Send a Case Securely</h4>
                    <p className="text-sm text-neutral-500">Care level, payer and timing through the portal</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Get Verified Options</h4>
                    <p className="text-sm text-neutral-500">Homes that match the care level and payer</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">See What&apos;s Confirmed</h4>
                    <p className="text-sm text-neutral-500">Each opening and price shows when it was confirmed</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-secondary-500/20 text-xs text-neutral-500 text-center">
                Always free — no card required.
              </div>
            </div>

            {/* For Providers — only while PROVIDER_LISTING_ENABLED is on (same flag as the free listing). */}
            {providerListingOn && (
              <div data-testid="how-providers" className="bg-gradient-to-br from-warning-50 to-white p-6 rounded-2xl border border-warning-500/20">
                <div className="text-center mb-6">
                  <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-warning-500 to-warning-400 items-center justify-center mb-4">
                    <FiTruck className="text-white text-2xl" />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <h3 className="text-xl font-bold text-neutral-900">For Providers</h3>
                    <span className="text-xs font-bold bg-success-100 text-success-700 border border-success-200 rounded-full px-2.5 py-1 uppercase tracking-wide">Free</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    ['List your services free', 'Home health, personal care, therapy, rides, meals or equipment'],
                    ['Get found by families and care homes', 'In your area, by the services you offer'],
                    ['Respond to inquiries', 'Requests arrive on your dashboard'],
                  ].map(([t, d], i) => (
                    <div key={t} className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-warning-500 text-white flex items-center justify-center font-bold mr-3">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900">{t}</h4>
                        <p className="text-sm text-neutral-500">{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. BENEFITS BY USER TYPE */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Built for Everyone in Senior Care
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              CareLinkAI serves 6 different user types — each with a dedicated portal and tailored features
            </p>
          </div>

          {/* Tab Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={() => setActiveBenefitTab('families')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                activeBenefitTab === 'families'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-lg'
                  : 'bg-white text-neutral-500 border-2 border-neutral-200 hover:border-primary-500'
              }`}
            >
              🏠 Families
            </button>
            <button
              onClick={() => setActiveBenefitTab('operators')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                activeBenefitTab === 'operators'
                  ? 'bg-gradient-to-r from-secondary-500 to-secondary-400 text-white shadow-lg'
                  : 'bg-white text-neutral-500 border-2 border-neutral-200 hover:border-secondary-500'
              }`}
            >
              🏢 Care Home Operators
            </button>
            <button
              onClick={() => setActiveBenefitTab('caregivers')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                activeBenefitTab === 'caregivers'
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                  : 'bg-white text-neutral-500 border-2 border-neutral-200 hover:border-primary-500'
              }`}
            >
              🩺 Caregivers
            </button>
            <button
              onClick={() => setActiveBenefitTab('healthcare')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                activeBenefitTab === 'healthcare'
                  ? 'bg-gradient-to-r from-secondary-500 to-primary-500 text-white shadow-lg'
                  : 'bg-white text-neutral-500 border-2 border-neutral-200 hover:border-secondary-500'
              }`}
            >
              🏥 Discharge Planners
            </button>
            <button
              onClick={() => setActiveBenefitTab('providers')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                activeBenefitTab === 'providers'
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                  : 'bg-white text-neutral-500 border-2 border-neutral-200 hover:border-primary-500'
              }`}
            >
              🚐 Service Providers
            </button>
            <button
              onClick={() => setActiveBenefitTab('affiliates')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                activeBenefitTab === 'affiliates'
                  ? 'bg-gradient-to-r from-secondary-500 to-primary-500 text-white shadow-lg'
                  : 'bg-white text-neutral-500 border-2 border-neutral-200 hover:border-secondary-500'
              }`}
            >
              🤝 Affiliates
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-neutral-200">
            {activeBenefitTab === 'families' && (
              <div>
              <div className="mb-8 bg-success-50 border border-success-200 rounded-xl px-6 py-4 flex items-start gap-3">
                <FiCheck className="text-success-600 flex-shrink-0 text-xl mt-0.5" />
                <div>
                  <span className="font-bold text-success-800 text-base">100% free for families — no subscription, no credit card, no catch.</span>
                  <span className="text-success-700 ml-2 text-sm">Search care homes, connect with caregivers, and book tours at absolutely no cost. CareLinkAI is funded by care home operators, not families.</span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiTarget className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Perfect Matches</h4>
                    <p className="text-neutral-500">AI matches homes to your budget, health needs, care level, location and preferred amenities.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiClock className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Save Time</h4>
                    <p className="text-neutral-500">Search, compare and contact homes in one place, with every fact labeled verified or not.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">HIPAA-Aligned Security</h4>
                    <p className="text-neutral-500">Your health information is protected with encryption in transit and at rest, access controls, and audit logging.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiMessageCircle className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">24/7 Support</h4>
                    <p className="text-neutral-500">CareBot is always available to answer questions and guide you through the process.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Transparent Pricing</h4>
                    <p className="text-neutral-500">See costs upfront with no hidden fees. Compare options side-by-side easily.</p>
                  </div>
                </div>
                {ridesPaymentsOn && (
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiCalendar className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Book Transport Rides</h4>
                    <p className="text-neutral-500">Find and book NEMT and transportation providers directly on the platform — secure payment, ride confirmation, and day-of reminders handled for you.</p>
                  </div>
                </div>
                )}
                {backgroundChecksOn && (
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Order Background Checks</h4>
                    <p className="text-neutral-500">Run Checkr-powered checks on any caregiver or provider directly from search results — no waiting for an invite. Basic is free; Enhanced, Motor Vehicle, and Premium bundles available from $19.99.</p>
                  </div>
                </div>
                )}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiCalendar className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Household Shift Management</h4>
                    <p className="text-neutral-500">Post caregiver job listings, hire directly, then schedule and track private household shifts — perfect for families managing in-home care for a loved one.</p>
                  </div>
                </div>
              </div>
              </div>
            )}

            {activeBenefitTab === 'operators' && (
              <div>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {[
                    { icon: <FiTrendingUp />, title: 'Inquiry Pipeline', desc: 'Manage every inquiry from first contact to move-in. AI ranks leads by urgency and fit.' },
                    { icon: <FiZap />, title: 'AI Inquiry Responses', desc: 'AI drafts a personalized email reply to each inquiry. Review it, then send it to the family.' },
                    { icon: <FiActivity />, title: 'Resident Management', desc: 'Track health, medications, assessments, documents, and family communication in one place.' },
                    { icon: <FiUsers />, title: 'Caregiver Staffing', desc: 'Post shifts, manage applications and bids, and track timesheets.' },
                    { icon: <FiCalendar />, title: 'Tour Scheduling', desc: 'AI-suggested tour times. Families request a visit online and you confirm it.' },
                    { icon: <FiBarChart />, title: 'Analytics & Reporting', desc: 'Occupancy trends, inquiry conversion rates, revenue tracking, and compliance reports.' },
                    { icon: <FiFileText />, title: 'Document Management', desc: 'Store and classify resident documents with AI. No more lost paperwork.' },
                    { icon: <FiShield />, title: 'Compliance Tracking', desc: backgroundChecksOn ? 'Track certifications, background checks and regulatory requirements.' : 'Track certifications, licenses and regulatory requirements.' },
                    { icon: <FiMessageCircle />, title: 'Messaging & Notifications', desc: 'In-platform messaging with families. Real-time notifications for new inquiries and tours.' },
                    ...(operatorPlansOn ? [{ icon: <FiZap />, title: 'AI Shift Auto-fill', desc: 'Describe a shift in plain words and get matching available caregivers, ranked (Professional plan).' }] : []),
                    { icon: <FiAward />, title: 'Direct Caregiver Hire', desc: 'Browse the marketplace and hire caregivers to your facility, with no job posting required.' },
                    { icon: <FiCalendar />, title: 'Resident Transport Requests', desc: ridesPaymentsOn ? 'Request NEMT and transport rides for residents. The provider confirms and sets the fare, and the ride is paid online.' : 'Request NEMT and transport rides for residents. The provider confirms and sets the fare; online payment is coming soon.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-secondary-500 to-secondary-400 flex items-center justify-center text-white">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 mb-1">{item.title}</h4>
                        <p className="text-sm text-neutral-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-secondary-500/10 to-primary-500/10 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-secondary-500/20">
                  <div>
                    <div className="font-bold text-neutral-900 text-lg">{operatorPlansOn ? 'Plans from $99/mo · 14-day free trial' : 'Free to list your community'}</div>
                    <div className="text-sm text-neutral-500 mt-1">{operatorPlansOn ? 'No credit card required to start. Cancel anytime.' : 'Claim your listing or add a new one. No credit card required.'}</div>
                  </div>
                  <Link href="/auth/register?role=operator" className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                    {operatorPlansOn ? "Start Free Trial →" : "List Your Community Free →"}
                  </Link>
                </div>
              </div>
            )}
            
            {activeBenefitTab === 'caregivers' && (
              <div>
              <div className="mb-8 bg-success-50 border border-success-200 rounded-xl px-6 py-4 flex items-start gap-3">
                <FiCheck className="text-success-600 flex-shrink-0 text-xl mt-0.5" />
                <div>
                  <span className="font-bold text-success-800 text-base">Free to join — create your profile, apply for jobs, and get hired at no cost.</span>
                  <span className="text-success-700 ml-2 text-sm">{caregiverProOn ? 'Build your reputation, earn points, and grow your career. Optional: upgrade to Pro ($19/mo) for boosted search placement, a Pro badge, and unlimited applications.' : 'Build your reputation, earn points, and grow your career.'}</span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <FiSearch className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Find Great Jobs</h4>
                    <p className="text-neutral-500">Connect directly with families seeking caregivers in your area with your skills.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <FiTarget className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Perfect Matches</h4>
                    <p className="text-neutral-500">AI matches you with families whose needs align with your expertise and availability.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Verified Profiles</h4>
                    <p className="text-neutral-500">Background checks and credential verification build trust with families.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <FiCalendar className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Flexible Scheduling</h4>
                    <p className="text-neutral-500">Choose jobs that fit your schedule and availability preferences.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <FiAward className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Points & Tier Rewards</h4>
                    <p className="text-neutral-500">Earn points for every shift, on-time arrival, and 5-star review. Climb from BRONZE to PLATINUM and unlock higher pay rates.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <FiTrendingUp className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Reliability Score</h4>
                    <p className="text-neutral-500">Your 0-100 reliability score is visible to operators — built from reviews, shift history, and on-time record. High scores mean more job offers.</p>
                  </div>
                </div>
              </div>
              </div>
            )}

            {activeBenefitTab === 'healthcare' && (
              <div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiZap className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Concierge Placement Help</h4>
                    <p className="text-neutral-500">Send a case securely and get options that match the care level and payer, with what&apos;s confirmed and when.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiTarget className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Accurate Matches</h4>
                    <p className="text-neutral-500">AI considers care level, location, insurance, and availability for perfect fits.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiUsers className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Multi-Facility Requests</h4>
                    <p className="text-neutral-500">Send placement requests to multiple facilities simultaneously with one click.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiActivity className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Availability, Honestly Labeled</h4>
                    <p className="text-neutral-500">Open beds show as Verified only with the date a community confirmed them; everything else is marked unverified, so you know who to call first.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">HIPAA-Aligned</h4>
                    <p className="text-neutral-500">Patient information is handled with HIPAA-aligned safeguards — encryption, access controls, and audit logging.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiBarChart className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Placement History & Analytics</h4>
                    <p className="text-neutral-500">Track every placement request, response time, and outcome in one dashboard.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 bg-gradient-to-r from-secondary-50 to-success-50 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-success-300">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-neutral-900 text-lg">Always free for discharge planners &amp; case managers</span>
                    <span className="bg-success-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Free</span>
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">Full access to AI placement search — no subscription, no credit card.</div>
                </div>
                <Link href="/auth/register?role=discharge_planner" className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                  Get Free Access →
                </Link>
              </div>
              </div>
            )}

            {activeBenefitTab === 'providers' && (
              <div>
                <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-start gap-3">
                  <FiZap className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-neutral-900">Senior Service Provider Marketplace</div>
                    <p className="text-sm text-neutral-500 mt-1">
                      CareLinkAI connects senior service providers — transportation companies, housekeepers, meal services, home health aides, and more — directly with care homes and families in their area. Starting in Cleveland, expanding nationwide.
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                      <FiSearch className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Marketplace Listing</h4>
                      <p className="text-neutral-500">List your services where care homes and families are already searching. Get discovered by clients who need exactly what you offer.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                      <FiTarget className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Real Bookings — Not Just Referrals</h4>
                      <p className="text-neutral-500">Transport providers receive actual ride bookings with Stripe payment — not just leads. Confirm the fare, get paid, and manage every ride in one dashboard.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                      <FiShield className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Verified Provider Profile</h4>
                      <p className="text-neutral-500">Build trust with a verified business profile including certifications, service area, and client reviews.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                      <FiMessageCircle className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Direct Messaging</h4>
                      <p className="text-neutral-500">Communicate directly with care homes and families through the platform. All in one place.</p>
                    </div>
                  </div>
                </div>
                {/* The six launch categories: each can be picked at signup and found in provider search. */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6" data-testid="provider-category-chips">
                  {PROVIDER_CATEGORIES.map((c) => c.label).map((s) => (
                    <div key={s} className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-center text-neutral-500 font-medium">{s}</div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-primary-500/20">
                  <div>
                    {/* 10/29: the $99/mo listing price is retired; the listing is free when PROVIDER_LISTING_ENABLED is on. */}
                    <div className="font-bold text-neutral-900">{providerListingOn ? 'Marketplace listing — free' : 'List your business on CareLinkAI'}</div>
                    <div className="text-sm text-neutral-500 mt-1">
                      Get discovered by care homes and families searching in your area.
                      {providerListingOn && providerBoostOn ? ` ${BOOST_PROMO_LINE}.` : ''}
                    </div>
                  </div>
                  <Link href="/auth/register?role=provider" className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                    List Your Business →
                  </Link>
                </div>
              </div>
            )}

            {activeBenefitTab === 'affiliates' && (
              <div>
                <div className="mb-6 p-4 bg-secondary-50 border border-secondary-200 rounded-xl flex items-start gap-3">
                  <FiHeart className="text-secondary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-neutral-900">Earn by Referring Care Homes and Families</div>
                    <p className="text-sm text-neutral-500 mt-1">
                      Senior care advocates, social workers, geriatric care managers, and community organizations {operatorPlansOn ? 'can earn recurring commissions by referring operators and families to CareLinkAI.' : 'can refer families and care homes to CareLinkAI with their own link and track every referral.'}
                    </p>
                  </div>
                </div>
                {operatorPlansOn && (
                <div className="mb-6 grid grid-cols-3 gap-4">
                  {[
                    { tier: 'STANDARD', rate: '20%', desc: 'New affiliates', color: 'border-neutral-300 bg-neutral-50' },
                    { tier: 'SILVER', rate: '25%', desc: '5+ active referrals', color: 'border-secondary-300 bg-secondary-50' },
                    { tier: 'GOLD', rate: '30%', desc: '15+ active referrals', color: 'border-warning-400 bg-warning-50' },
                  ].map((t) => (
                    <div key={t.tier} className={`rounded-xl border-2 p-4 text-center ${t.color}`}>
                      <div className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">{t.tier}</div>
                      <div className="text-3xl font-bold text-neutral-900">{t.rate}</div>
                      <div className="text-xs text-neutral-500 mt-1">{t.desc}</div>
                    </div>
                  ))}
                </div>
                )}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                      <FiTrendingUp className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">{operatorPlansOn ? 'Tiered Recurring Commissions' : 'Referral Tracking'}</h4>
                      <p className="text-neutral-500">{operatorPlansOn ? 'Earn 20–30% of every subscription payment from operators and families you refer. Rates increase automatically as you grow your referral network.' : 'Every family and care home that signs up through your link is credited to you.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                      <FiBarChart className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Affiliate Dashboard</h4>
                      <p className="text-neutral-500">Track your referrals and conversions in one dashboard.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                      <FiGlobe className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Unique Referral Link</h4>
                      <p className="text-neutral-500">Share your personal link anywhere — email, social media, your website — and get credited for every signup.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                      <FiBriefcase className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Marketing Materials</h4>
                      <p className="text-neutral-500">Access ready-made flyers, email templates, and talking points to share CareLinkAI with your network.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-secondary-500/10 to-primary-500/10 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-secondary-500/20">
                  <div>
                    <div className="font-bold text-neutral-900">Affiliate program — apply now</div>
                    <div className="text-sm text-neutral-500 mt-1">Best fit for social workers, care managers, senior advocates, and community organizations.</div>
                  </div>
                  <Link href="/auth/register?role=affiliate" className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                    Apply as Affiliate →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. PRICING SECTION */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center bg-success-100 text-success-800 rounded-full px-4 py-2 mb-6 text-sm font-semibold">
              <FiCheck className="mr-2" /> {operatorPlansOn ? '14-day free trial · No credit card required' : 'No credit card required'}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              {[
                'Families, caregivers and discharge planners are free.',
                caregiverProOn ? 'Caregiver Pro is optional.' : '',
                operatorPlansOn ? 'Care home operators subscribe.' : 'Care homes list free.',
                providerListingOn ? 'Providers list free.' : '',
              ].filter(Boolean).join(' ')}
            </p>
          </div>

          {/* Free tier callout */}
          <div className="max-w-6xl mx-auto mb-10">
            <div className="bg-gradient-to-r from-success-50 to-success-100 border-2 border-success-300 rounded-2xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-success-500 flex items-center justify-center shadow-lg">
                    <FiHeart className="text-white text-2xl" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-success-900">{caregiverProOn ? 'Families Always Free · Caregivers Free to Start' : 'Families & Caregivers Always Free'}</h3>
                      <span className="bg-success-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">$0 to Join</span>
                    </div>
                    <p className="text-success-800 text-sm leading-relaxed max-w-xl">
                      Families search, request tours, and connect at no cost — forever. Caregivers create profiles, apply for jobs, and get hired free.{caregiverProOn ? ' Caregivers can optionally upgrade to Pro ($19/mo) for boosted search placement and unlimited applications.' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Link href="/auth/register?role=family" className="bg-success-600 hover:bg-success-700 text-white px-6 py-3 rounded-lg font-semibold text-center transition-colors shadow-md whitespace-nowrap">
                    I&apos;m a Family →
                  </Link>
                  <Link href="/auth/register?role=caregiver" className="bg-white hover:bg-success-50 text-success-700 border-2 border-success-400 px-6 py-3 rounded-lg font-semibold text-center transition-colors whitespace-nowrap">
                    I&apos;m a Caregiver →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Operator plan prices show only with OPERATOR_PLANS; until then homes list free (homepage truth audit). */}
          {operatorPlansOn ? (
          <>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-neutral-500 text-sm">
              <div className="h-px w-16 bg-neutral-200"></div>
              <span className="font-semibold uppercase tracking-widest text-xs">Care Home Operator Plans</span>
              <div className="h-px w-16 bg-neutral-200"></div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Starter */}
            <div className="border-2 border-neutral-200 rounded-2xl p-7 flex flex-col hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="mb-6">
                <div className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Starter</div>
                <div className="text-4xl font-bold text-neutral-900">$99<span className="text-lg font-normal text-neutral-500">/mo</span></div>
                <div className="text-sm text-neutral-500 mt-1">1 home · Billed monthly</div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Inquiry pipeline', 'Resident management', 'Caregiver management', 'Document storage', 'Email support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-neutral-500">
                    <FiCheck className="text-success-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?role=operator&plan=starter" className="w-full text-center border-2 border-primary-500 text-primary-500 px-6 py-3 rounded-lg font-semibold hover:bg-primary-500 hover:text-white transition-all">
                Start Free Trial
              </Link>
            </div>

            {/* Professional — highlighted */}
            <div className="border-2 border-secondary-500 rounded-2xl p-7 flex flex-col shadow-xl relative bg-gradient-to-b from-secondary-50 to-white">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">MOST POPULAR</span>
              </div>
              <div className="mb-6">
                <div className="text-sm font-semibold text-secondary-500 uppercase tracking-wide mb-2">Professional</div>
                <div className="text-4xl font-bold text-neutral-900">$249<span className="text-lg font-normal text-neutral-500">/mo</span></div>
                <div className="text-sm text-neutral-500 mt-1">Up to 3 homes · Billed monthly</div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Everything in Starter', 'AI inquiry responses', 'AI shift auto-fill', 'Tour scheduling', 'Analytics dashboard', 'Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-neutral-500">
                    <FiCheck className="text-secondary-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?role=operator&plan=professional" className="w-full text-center bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-lg">
                Start Free Trial
              </Link>
            </div>

            {/* Growth */}
            <div className="border-2 border-neutral-200 rounded-2xl p-7 flex flex-col hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="mb-6">
                <div className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Growth</div>
                <div className="text-4xl font-bold text-neutral-900">$499<span className="text-lg font-normal text-neutral-500">/mo</span></div>
                <div className="text-sm text-neutral-500 mt-1">Up to 10 homes · Billed monthly</div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Everything in Professional', 'Discharge planner integration', 'Advanced analytics & reports', 'Compliance kit access', 'Priority phone support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-neutral-500">
                    <FiCheck className="text-success-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?role=operator&plan=growth" className="w-full text-center border-2 border-primary-500 text-primary-500 px-6 py-3 rounded-lg font-semibold hover:bg-primary-500 hover:text-white transition-all">
                Start Free Trial
              </Link>
            </div>

            {/* Agency */}
            <div className="border-2 border-neutral-200 rounded-2xl p-7 flex flex-col hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="mb-6">
                <div className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Agency</div>
                <div className="text-4xl font-bold text-neutral-900">$799<span className="text-lg font-normal text-neutral-500">/mo</span></div>
                <div className="text-sm text-neutral-500 mt-1">Multi-location · Billed monthly</div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Everything in Growth', 'Agency staffing dashboard', 'Bulk caregiver hiring', 'Contractor & W2 management', 'Volume hire discounts', 'Dedicated account manager'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-neutral-500">
                    <FiCheck className="text-success-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?role=operator&plan=agency" className="w-full text-center border-2 border-primary-500 text-primary-500 px-6 py-3 rounded-lg font-semibold hover:bg-primary-500 hover:text-white transition-all">
                Start Free Trial
              </Link>
            </div>
          </div>

          <div className="text-center mt-10">
            <p className="text-neutral-500">
              Running more than one location type or need white-label?{' '}
              <a href="mailto:hello@getcarelinkai.com" className="text-primary-500 font-semibold hover:underline">Contact us for Enterprise pricing.</a>
            </p>
            <p className="text-sm text-neutral-500 mt-3">
              {caregiverProOn ? 'Families always free. Caregivers free to start — Pro optional at $19/mo.' : 'Families and caregivers always free.'}
            </p>
          </div>
          </>
          ) : (
          <div data-testid="pricing-care-homes-free" className="max-w-6xl mx-auto">
            <div className="border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg">
                  <FiHome className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-1">Care Homes List Free</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed max-w-xl">
                    Claim your community&apos;s listing or add a new one. Manage inquiries, tour requests and residents from your operator dashboard. Homes never pay to be listed.
                  </p>
                </div>
              </div>
              <Link href="/auth/register?role=operator" className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                List Your Community Free
              </Link>
            </div>
          </div>
          )}

          {/* Discharge planners & case managers — FREE */}
          <div className="max-w-2xl mx-auto mt-14">
            <div className="bg-gradient-to-r from-secondary-50 to-success-50 border-2 border-success-300 rounded-2xl p-6 md:p-8 text-center">
              <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🏥</span>
                <h3 className="text-xl font-bold text-neutral-900">Free for Discharge Planners &amp; Case Managers</h3>
                <span className="bg-success-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">$0</span>
              </div>
              <p className="text-neutral-600 text-sm leading-relaxed max-w-xl mx-auto mb-5">
                Hospital social workers and case managers get full access to AI placement search, multi-facility requests, bed availability marked verified or unverified, and placement history &amp; analytics — at no cost, with HIPAA-aligned safeguards.
              </p>
              <Link href="/auth/register?role=discharge_planner" className="inline-block bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-lg">
                Get Free Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ROADMAP SECTION */}
      <section id="roadmap" className="py-20 bg-gradient-to-br from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full px-4 py-2 shadow-lg mb-6">
              <FiTrendingUp className="text-white mr-2" />
              <span className="text-sm font-bold text-white">BUILT &amp; BUILDING</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              What We've Shipped &amp; What's Next
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              What you can use today, and what we&apos;re building next.
            </p>
          </div>
          
          {/* Now Live */}
          <div className="mb-14">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-success-500 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                <FiCheck /> Now Live
              </div>
            </div>
            {/* Only what a real user can do today with production flags as they are. */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="roadmap-now-live">
              {nowLiveItems(roadmapFlags).map((item) => ({ ...item, icon: ROADMAP_ICONS[item.icon] })).map((item) => (
                <div key={item.key} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-success-50 text-success-600 flex items-center justify-center text-lg">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-0.5">{item.title}</h4>
                    <p className="text-xs text-neutral-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coming Soon */}
          <div>
            <div className="flex items-center justify-center mb-8">
              <div className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                <FiTrendingUp /> Coming Soon
              </div>
            </div>
            {/* Real roadmap items, no dates; plus anything whose flag is off. */}
            <div className="flex flex-wrap justify-center gap-5 [&>*]:w-full sm:[&>*]:w-[calc((100%-1.25rem)/2)] lg:[&>*]:w-[calc((100%-3.75rem)/4)]" data-testid="roadmap-coming-soon">
              {comingSoonItems(roadmapFlags).map((item) => ({ ...item, icon: ROADMAP_ICONS[item.icon] })).map((item) => (
                <div key={item.key} className="bg-white p-5 rounded-xl border border-neutral-200 border-dashed shadow-sm flex items-start gap-4 opacity-80">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center text-lg">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-700 mb-0.5">{item.title}</h4>
                    <p className="text-xs text-neutral-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. SOCIAL PROOF SECTION */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Built for Senior Care
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              One platform serving families, operators, and discharge planners
            </p>
          </div>
          
          {/* Trust Statistics */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">Free</div>
              <p className="text-neutral-500 font-medium">To List Your Community</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-secondary-500 mb-2">Dated</div>
              <p className="text-neutral-500 font-medium">Every Verified Fact Shows When</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">6</div>
              <p className="text-neutral-500 font-medium">User Roles Served</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-secondary-500 mb-2">$0</div>
              <p className="text-neutral-500 font-medium">Always Free for Families</p>
            </div>
          </div>
          
          {/* HIPAA Badge */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center bg-white border-2 border-primary-500 rounded-full px-6 py-3 shadow-lg">
              <FiShield className="text-primary-500 text-2xl mr-3" />
              <div className="text-left">
                <p className="font-bold text-neutral-900">HIPAA-Aligned</p>
                <p className="text-xs text-neutral-500">Your data is secured with encryption and audit logging</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-neutral-500">
              Get answers to common questions about CareLinkAI
            </p>
          </div>
          
          <div className="space-y-4">
            {/* FAQ 1 */}
            <motion.div 
              className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden"
              initial={false}
            >
              <button
                onClick={() => toggleFaq(0)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-neutral-900">How does matching work?</span>
                <motion.div
                  animate={{ rotate: openFaqIndex === 0 ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiChevronDown className="text-primary-500 text-xl" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-neutral-500">
                      <p>You tell us who the care is for, what they need day to day, where they need to be, and how care will be paid for. We match that against what communities have told us — open beds, starting prices, care levels they accept, and Medicaid waiver status, each marked verified (with the date) or not — and give you a short list you can act on, not a list of everyone with a website.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* FAQ 2 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button
                onClick={() => toggleFaq(1)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-neutral-900">Is my health information secure?</span>
                <motion.div animate={{ rotate: openFaqIndex === 1 ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <FiChevronDown className="text-primary-500 text-xl" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 1 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500">
                      <p>Yes. Care details you share through the site are encrypted in transit and at rest and are only visible to the communities you choose to contact. Please don’t share health details over the phone line — our front desk takes your name and callback number and a person calls you back, or you can place a request securely at getcarelinkai.com/concierge.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* FAQ 3 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(2)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">How much does CareLinkAI cost?</span>
                <motion.div animate={{ rotate: openFaqIndex === 2 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 2 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Nothing, for families and hospital discharge planners. Searching every Cleveland-area community, seeing starting prices and open beds (marked verified or not), waiver status and inspection history is free. Care homes list free too. One optional service costs money: our Family Concierge, $399 flat, for families paying privately who want a verified shortlist and a person on the phone through the move. If you’re paying with Medicaid, Medicare or the VA, our help is always free. No hidden fees, ever.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* FAQ 4 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(3)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">How quickly can I find care?</span>
                <motion.div animate={{ rotate: openFaqIndex === 3 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 3 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>With the Family Concierge you get a verified shortlist within two business days, or a full refund. If a discharge is already scheduled, tell us the date and we work backward from it. Our directory marks which communities have confirmed open beds, and when, so you’re not calling homes that are full.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* FAQ 5 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(4)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Does CareLinkAI help with Medicaid?</span>
                <motion.div animate={{ rotate: openFaqIndex === 4 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 4 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Yes. Our Cleveland directory flags every community that accepts the Ohio Assisted Living Waiver, and whether that’s for new residents or current residents only. Tell us you’re paying with Medicaid, Medicare or the VA and we route you to the free lane — same search, same verification, no charge.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 6 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(5)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">How do you know a bed is really open?</span>
                <motion.div animate={{ rotate: openFaqIndex === 5 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 5 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>We ask. Communities can update their own listings, and our team is confirming open beds, starting prices and waiver status directly with each community. A listing shows a ‘Verified’ badge only after that check, with the date. If a listing isn’t verified yet, we say so.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 7 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(6)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Can I call someone?</span>
                <motion.div animate={{ rotate: openFaqIndex === 6 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 6 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Yes — <a href={CONTACT_PHONE_TEL} className="text-primary-600 hover:underline" data-testid="faq-phone">{CONTACT_PHONE_DISPLAY}</a>. Our front desk answers around the clock, takes your name and callback number, and a person calls you back within one business hour during the day (Mon–Fri 8–6 ET) or first thing the next morning. Please don’t share patient details on the line; share them securely at getcarelinkai.com/concierge.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 8 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(7)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">What makes CareLinkAI different?</span>
                <motion.div animate={{ rotate: openFaqIndex === 7 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 7 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>We&apos;re confirming open beds, starting prices and Medicaid waiver status directly with Cleveland-area communities, and we show you exactly what&apos;s verified and when: a listing says ‘Verified’ only with the date we confirmed it, and everything else is labeled unverified. Other directories list what a community said once. We never charge families, and we don’t take a cut of your move-in.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* FAQ 9 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(8)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Can I schedule facility tours through CareLinkAI?</span>
                <motion.div animate={{ rotate: openFaqIndex === 8 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 8 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Yes. Families request a tour from the listing page, with suggested times based on the home&apos;s availability. The home confirms the time, and both of you get a confirmation email.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 10 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(9)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Can operators hire caregivers directly from the marketplace?</span>
                <motion.div animate={{ rotate: openFaqIndex === 9 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 9 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Yes. Operators can browse caregiver profiles in the marketplace and hire directly, with no job posting or application process. The caregiver gets an in-app notification and the hire is logged.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 11 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(10)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">How does the affiliate referral program work?</span>
                <motion.div animate={{ rotate: openFaqIndex === 10 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 10 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>{operatorPlansOn ? 'Affiliates get a unique referral link and earn recurring commissions on every operator or family subscription they refer. New affiliates start at 20% commission; reaching 5 active referrals unlocks SILVER tier (25%); 15+ referrals unlocks GOLD tier (30%). Commissions are tracked in your affiliate dashboard and paid monthly.' : 'Affiliates get a unique referral link and a dashboard that tracks the families and care homes they refer.'}</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 12 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(11)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Do you have compliance resources for Ohio ALF operators?</span>
                <motion.div animate={{ rotate: openFaqIndex === 11 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 11 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>{complianceKitsOn ? 'Yes. We offer three downloadable Ohio Assisted Living Facility compliance document kits ($149–$199 one-time purchase) covering state licensing requirements, resident rights, and medication management. Available in your operator portal under Compliance Kits, or from the footer of this page. More states coming soon.' : 'Ohio assisted-living compliance document kits (state licensing, resident rights and medication management) are coming soon. Until then, operators can track certifications and licenses in the operator portal.'}</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 9. REQUEST A DEMO SECTION — the video, its button and its modal exist only when public/demo/tour.mp4 does (self-hosted; no YouTube). */}
      {tourVideo && <DemoVideoModal open={demoVideoOpen} onClose={() => setDemoVideoOpen(false)} video={tourVideo} />}
      <section id="request-demo" className="py-20 bg-white border-t border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 mb-4 uppercase tracking-wide">
              Live Demo
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 leading-tight">
              See CareLinkAI in action
            </h2>
            <p className="text-neutral-500 text-lg mb-8 max-w-2xl mx-auto">
              {tour || tourVideo ? 'Take a 90-second tour, or request a personalized walkthrough.' : 'Request a personalized walkthrough.'} We&apos;ll show families how to find and compare verified communities, and show care homes, caregivers and providers how to manage inquiries, staffing and listings in one place.
            </p>
            {tourVideo && (
              <button
                onClick={() => setDemoVideoOpen(true)}
                className="group inline-flex items-center gap-3 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <span className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <FiPlay className="ml-0.5" />
                </span>
                Watch Demo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-5">
              {tourVideo && (
                <div className="rounded-xl overflow-hidden shadow-lg border border-neutral-200">
                  <TourVideo video={tourVideo} />
                </div>
              )}
              <ProductTour tour={tour} />
              <ul className="space-y-2" data-testid="demo-capabilities">
                {demoCapabilities.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-600">
                    <span className="h-5 w-5 rounded-full bg-success-100 text-success-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — personalized demo request form */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">Request a personalized walkthrough</h3>
              <p className="text-sm text-neutral-400 mb-6">We tailor the demo to your role and facility. Response within one business day.</p>
              <DemoRequestForm />
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA SECTION */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-secondary-500 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 md:px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Cleveland Senior Care, Honestly Labeled
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-10">
            Whether you're a family finding care, an operator managing a facility, a caregiver building a career, or a hospital discharge planner — CareLinkAI was built for you. Start free today.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link 
              href="/auth/register" 
              className="group bg-white hover:bg-neutral-100 text-primary-500 px-10 py-4 rounded-lg font-bold text-lg text-center flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              Get Started Free
              <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#request-demo"
              className="bg-transparent hover:bg-white/10 text-white px-10 py-4 rounded-lg font-bold text-lg text-center border-2 border-white transition-all duration-300"
            >
              Schedule a Demo
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/90 text-sm">
            <div className="flex items-center">
              <FiCheck className="mr-2" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center">
              <FiCheck className="mr-2" />
              <span>Free to list your community</span>
            </div>
            <div className="flex items-center">
              <FiCheck className="mr-2" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* 10. ENHANCED FOOTER */}
      <footer className="bg-neutral-900 text-neutral-300 py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
                <div className="relative h-12 w-48">
                  <Image 
                    src="/images/logo.png" 
                    alt="CareLinkAI"
                    fill
                    className="object-contain object-left brightness-0 invert"
                  />
                </div>
              </div>
              <p className="text-neutral-400 mb-6">
                AI-powered platform connecting families, care homes, caregivers, and healthcare professionals 
                for seamless senior care placement.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-primary-500 flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-primary-500 flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-primary-500 flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Product Column */}
            <div>
              <h3 className="text-white font-bold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#roadmap" className="hover:text-white transition-colors">Roadmap</Link></li>
                <li><Link href="/learn" className="hover:text-white transition-colors">Education Hub</Link></li>
                {kitsEnabled && <li><Link href="/operator/compliance-kits" className="hover:text-white transition-colors">Compliance Kits</Link></li>}
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            {/* Company Column */}
            <div>
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="mailto:hello@getcarelinkai.com" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="mailto:hello@getcarelinkai.com?subject=Press%20Inquiry" className="hover:text-white transition-colors">Press Inquiries</a></li>
                <li><a href="mailto:hello@getcarelinkai.com?subject=Careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
            {/* Support Column */}
            <div>
              <h3 className="text-white font-bold mb-4">Support</h3>
              <ul className="space-y-3">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#request-demo" className="hover:text-white transition-colors">Request a Demo</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="border-t border-neutral-700 pt-8 pb-8">
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-center">
                <FiPhone className="text-primary-500 mr-3" />
                <a href={CONTACT_PHONE_TEL} className="hover:text-white transition-colors" data-testid="footer-phone">
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </div>
              <div className="flex items-center">
                <FiMail className="text-primary-500 mr-3" />
                <a href="mailto:support@getcarelinkai.com" className="hover:text-white transition-colors">
                  support@getcarelinkai.com
                </a>
              </div>
              <div className="flex items-center">
                <FiMapPin className="text-primary-500 mr-3" />
                <span>Cleveland, OH</span>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-neutral-700 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-neutral-500">
            <p>© {new Date().getFullYear()} CareLinkAI. All rights reserved.</p>
            <div className="flex items-center mt-4 md:mt-0">
              <FiShield className="text-primary-500 mr-2" />
              <span>HIPAA-Aligned</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
