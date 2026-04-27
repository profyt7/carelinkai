'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { 
  FiArrowRight, FiCheck, FiShield, FiUsers, FiHeart, FiActivity, 
  FiSearch, FiStar, FiZap, FiBriefcase, FiMessageCircle, FiCalendar, 
  FiFileText, FiClock, FiTarget, FiTrendingUp, FiAward, FiSmartphone,
  FiVideo, FiGlobe, FiBarChart, FiChevronDown, FiPhone, FiMail, FiMapPin
} from "react-icons/fi";
import { prefersReducedMotion, durations, easings } from "@/lib/animations";
import DemoRequestForm from "@/components/marketing/DemoRequestForm";

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

export default function HomePage() {
  const [activeBenefitTab, setActiveBenefitTab] = useState('families');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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
      <nav className="bg-white border-b border-neutral-200 px-4 md:px-6 py-4 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center group">
            <div className="relative h-16 w-64">
              <Image 
                src="/images/logo.png" 
                alt="CareLinkAI"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center space-x-6">
            <Link href="#features" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">
              How It Works
            </Link>
            <Link href="#benefits" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">
              Who It Serves
            </Link>
            <Link href="#pricing" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">
              Pricing
            </Link>
            <Link href="#roadmap" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">
              Roadmap
            </Link>
            <Link href="/learn" className="text-neutral-500 hover:text-primary-500 font-medium transition-colors">
              Learn
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/auth/login" 
              className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/auth/register" 
              className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:opacity-90 text-white px-6 py-2.5 rounded-lg font-medium transition-opacity shadow-lg"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. HERO SECTION - Enhanced */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20 md:py-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-500 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500 rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Trust badge */}
              <div className="inline-flex items-center bg-white rounded-full px-4 py-2 shadow-sm mb-6 border border-neutral-200">
                <FiStar className="text-secondary-500 mr-2" />
                <span className="text-sm font-semibold text-neutral-900">Trusted by 10,000+ families</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight">
                AI-Powered Senior Care{' '}
                <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              
              <p className="mt-6 text-xl text-neutral-500 max-w-xl leading-relaxed">
                The all-in-one AI platform for senior care — intelligent matching for families, smart shift coverage for operators, and instant placements for discharge planners. HIPAA-compliant and live today.
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
                    Get Started Free
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
                  <span>HIPAA compliant</span>
                </div>
                <div className="flex items-center">
                  <FiZap className="text-secondary-500 mr-2 flex-shrink-0" />
                  <span>Instant matches</span>
                </div>
              </div>
            </div>
            
            {/* Hero visual */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Main card */}
                <div className="bg-white p-6 rounded-2xl shadow-2xl border border-neutral-200 transform hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                      <FiHeart className="text-white text-2xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-neutral-900 text-lg">Perfect Match Found</h3>
                      <p className="text-sm text-neutral-500">Sunshine Valley Care</p>
                    </div>
                    <div className="text-secondary-500 font-bold text-2xl">98%</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-primary-500">24/7</div>
                      <div className="text-xs text-neutral-500 font-medium">Care Available</div>
                    </div>
                    <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-secondary-500">5★</div>
                      <div className="text-xs text-neutral-500 font-medium">Rating</div>
                    </div>
                  </div>
                </div>
                
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white px-4 py-2 rounded-full shadow-lg border border-neutral-200 flex items-center space-x-2">
                  <FiZap className="text-primary-500" />
                  <span className="text-sm font-semibold">AI Matched</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white px-4 py-2 rounded-full shadow-lg border border-neutral-200 flex items-center space-x-2">
                  <FiShield className="text-secondary-500" />
                  <span className="text-sm font-semibold">HIPAA Secure</span>
                </div>
              </div>
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
          
          {/* Three-channel strategy */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-500/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mb-6">
                <FiUsers className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">For Families</h3>
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
                  <span className="text-sm text-neutral-500">On-Call AI fills open shifts in under 15 min</span>
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
                Discharge planners and case managers can place patients quickly and efficiently.
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
                  <span className="text-sm text-neutral-500">Real-time bed availability</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI FEATURES SHOWCASE (THE STAR!) */}
      <section id="features" className="py-20 bg-gradient-to-br from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full px-4 py-2 shadow-lg mb-6">
              <FiZap className="text-white mr-2" />
              <span className="text-sm font-bold text-white">POWERED BY AI</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              AI-Powered Features Built for Senior Care
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              Our proprietary AI technology transforms how senior care connections are made
            </p>
          </div>
          
          {/* 8 Features Grid */}
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
                Analyzes 50+ data points including medical needs, preferences, location, and budget to find perfect matches.
              </p>
              <p className="text-xs font-semibold text-primary-500">
                ✓ 98% match accuracy
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
                Automatically creates compelling facility profiles with optimized descriptions, amenities, and care specialties.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ Saves 5+ hours per profile
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
                Smart scheduling that finds optimal times for families and facilities, with automated reminders and confirmations.
              </p>
              <p className="text-xs font-semibold text-primary-500">
                ✓ 60% faster booking
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
                Intelligent automated responses to family inquiries with personalized information and instant follow-ups.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ Responds in seconds
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-primary-500 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiZap className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                On-Call AI Shift Coverage
              </h3>
              <p className="text-sm text-neutral-500 mb-3">
                When a caregiver calls out, AI instantly reaches the nearest available staff via SMS and IVR — filling the shift in minutes, not hours.
              </p>
              <p className="text-xs font-semibold text-primary-500">
                ✓ Average fill time under 15 min
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
                Operators browse the marketplace and hire caregivers directly — employment records created instantly, caregiver notified in real time.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ Hire in 3 clicks
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
                24/7 AI chatbot that answers questions, provides guidance, and connects families with the right resources instantly.
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
                Specialized AI that helps healthcare professionals quickly place patients with matching availability and care level criteria.
              </p>
              <p className="text-xs font-semibold text-secondary-500">
                ✓ Place patients faster
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
              Simple, fast, and effective for everyone
            </p>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-8">
            {/* For Families */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-2xl border border-primary-500/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 items-center justify-center mb-4">
                  <FiUsers className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">For Families</h3>
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
                    <p className="text-sm text-neutral-500">Book visits and find the perfect fit</p>
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
            </div>
            
            {/* For Caregivers */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-2xl border border-primary-500/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 items-center justify-center mb-4">
                  <FiHeart className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">For Caregivers</h3>
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
                <h3 className="text-xl font-bold text-neutral-900">For Discharge Planners</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Enter Patient Info</h4>
                    <p className="text-sm text-neutral-500">Describe care level and needs</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">AI Finds Matches</h4>
                    <p className="text-sm text-neutral-500">Get available facilities instantly</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Place Patient</h4>
                    <p className="text-sm text-neutral-500">Secure placement in minutes — no phone tag</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-secondary-500/20 text-xs text-neutral-500 text-center">
                Individual license <span className="font-semibold text-neutral-700">$99/mo</span> · Department (unlimited seats) <span className="font-semibold text-neutral-700">$499/mo</span>
              </div>
            </div>
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
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiTarget className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Perfect Matches</h4>
                    <p className="text-neutral-500">AI analyzes 50+ factors to find ideal care homes that meet your specific needs and budget.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiClock className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Save Time</h4>
                    <p className="text-neutral-500">Find the right care in days, not months. Our AI does the heavy lifting for you.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">HIPAA Secure</h4>
                    <p className="text-neutral-500">Your health information is protected with bank-level security and full HIPAA compliance.</p>
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
              </div>
            )}
            
            {activeBenefitTab === 'operators' && (
              <div>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {[
                    { icon: <FiTrendingUp />, title: 'Inquiry Pipeline', desc: 'Manage every inquiry from first contact to move-in. AI ranks leads by urgency and fit.' },
                    { icon: <FiZap />, title: 'AI Inquiry Responses', desc: 'Generate professional, personalized email responses in one click — sent directly to families.' },
                    { icon: <FiActivity />, title: 'Resident Management', desc: 'Track health, medications, assessments, documents, and family communication in one place.' },
                    { icon: <FiUsers />, title: 'Caregiver Staffing', desc: 'Post shifts, manage applications, track timesheets, and process caregiver payments.' },
                    { icon: <FiCalendar />, title: 'Tour Scheduling', desc: 'AI-optimized tour scheduling. Families book online; your calendar stays organized.' },
                    { icon: <FiBarChart />, title: 'Analytics & Reporting', desc: 'Occupancy trends, inquiry conversion rates, revenue tracking, and compliance reports.' },
                    { icon: <FiFileText />, title: 'Document Management', desc: 'Store and classify resident documents with AI. No more lost paperwork.' },
                    { icon: <FiShield />, title: 'Compliance Tracking', desc: 'Track certifications, background checks, and regulatory requirements automatically.' },
                    { icon: <FiMessageCircle />, title: 'Messaging & Notifications', desc: 'In-platform messaging with families. Real-time notifications for new inquiries and tours.' },
                    { icon: <FiSmartphone />, title: 'On-Call AI Shift Coverage', desc: 'Automatically contacts available caregivers via SMS when a shift opens. Average fill time under 15 minutes.' },
                    { icon: <FiZap />, title: 'AI Shift Auto-fill', desc: 'Describe a shift in plain text — AI instantly finds the best-matched available caregivers and ranks them.' },
                    { icon: <FiAward />, title: 'Direct Caregiver Hire', desc: 'Browse the marketplace and hire caregivers to your facility in 3 clicks — no job posting required.' },
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
                    <div className="font-bold text-neutral-900 text-lg">Plans from $99/mo · 14-day free trial</div>
                    <div className="text-sm text-neutral-500 mt-1">No credit card required to start. Cancel anytime.</div>
                  </div>
                  <Link href="/auth/register?role=operator" className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                    Start Free Trial →
                  </Link>
                </div>
              </div>
            )}
            
            {activeBenefitTab === 'caregivers' && (
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
            )}

            {activeBenefitTab === 'healthcare' && (
              <div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiZap className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Fast Placements</h4>
                    <p className="text-neutral-500">Place patients in hours instead of days with instant AI-powered facility matching.</p>
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
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">Real-Time Availability</h4>
                    <p className="text-neutral-500">See which facilities have beds available right now, eliminating endless phone calls.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">HIPAA Compliant</h4>
                    <p className="text-neutral-500">All patient information is securely handled with full HIPAA compliance.</p>
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
              <div className="mt-8 bg-gradient-to-r from-secondary-500/10 to-primary-500/10 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-secondary-500/20">
                <div>
                  <div className="font-bold text-neutral-900 text-lg">Individual license: $99/mo · Department license: $499/mo</div>
                  <div className="text-sm text-neutral-500 mt-1">Individual planners and hospital department teams both covered. Cancel anytime.</div>
                </div>
                <Link href="/auth/register?role=discharge_planner" className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                  Start Free →
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
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Qualified Referrals</h4>
                      <p className="text-neutral-500">Receive referrals from operators and families who have verified needs — no cold prospecting required.</p>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {['Transportation', 'Housekeeping', 'Meal Delivery', 'Home Health', 'Personal Care', 'Companionship', 'Medical Equipment', 'Physical Therapy'].map((s) => (
                    <div key={s} className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-center text-neutral-500 font-medium">{s}</div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-primary-500/20">
                  <div>
                    <div className="font-bold text-neutral-900">Your services, found by the right clients — live now</div>
                    <div className="text-sm text-neutral-500 mt-1">List your business on the CareLinkAI marketplace and get discovered by care homes and families searching in your area.</div>
                  </div>
                  <Link href="/marketplace?tab=providers" className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg">
                    View Provider Listings →
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
                      Senior care advocates, social workers, geriatric care managers, and community organizations can earn recurring commissions by referring operators and families to CareLinkAI.
                    </p>
                  </div>
                </div>
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
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                      <FiTrendingUp className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Tiered Recurring Commissions</h4>
                      <p className="text-neutral-500">Earn 20–30% of every subscription payment from operators and families you refer. Rates increase automatically as you grow your referral network.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                      <FiBarChart className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 mb-2">Affiliate Dashboard</h4>
                      <p className="text-neutral-500">Track your referrals, conversions, and earnings in real time. See exactly what you've earned and when you'll be paid.</p>
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
          <div className="text-center mb-14">
            <div className="inline-flex items-center bg-success-100 text-success-800 rounded-full px-4 py-2 mb-6 text-sm font-semibold">
              <FiCheck className="mr-2" /> 14-day free trial · No credit card required
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              For care home operators. Families and caregivers always search free.
            </p>
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
                {['Everything in Starter', 'AI inquiry responses', 'On-Call AI shift coverage', 'AI shift auto-fill', 'Tour scheduling', 'Analytics dashboard', 'Priority support'].map((f) => (
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
              Families · Caregivers · Discharge Planners — always free to use CareLinkAI
            </p>
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
              We ship fast. Here's what's live today and what's coming next.
            </p>
          </div>
          
          {/* Now Live */}
          <div className="mb-14">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-success-500 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                <FiCheck /> Now Live
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: <FiZap />, title: 'On-Call AI Shift Coverage', desc: 'Auto-dispatches available staff via SMS/IVR when a caregiver calls out' },
                { icon: <FiCalendar />, title: 'AI Shift Auto-fill', desc: 'Claude AI matches free-text shift descriptions to available caregivers instantly' },
                { icon: <FiBriefcase />, title: 'Direct Caregiver Hire', desc: 'Operators hire from the marketplace in 3 clicks — employment record created instantly' },
                { icon: <FiUsers />, title: 'Caregiver Reliability Score', desc: '0–100 score computed from reviews, shifts, background check, and call-off history' },
                { icon: <FiAward />, title: 'Caregiver Points & Tiers', desc: 'Bronze → Platinum gamification with points for reliability, reviews, and consistency' },
                { icon: <FiActivity />, title: 'Discharge Planner Portal', desc: 'AI placement search for social workers with individual ($99) and department ($499) licensing' },
                { icon: <FiBarChart />, title: 'Compliance Document Kits', desc: 'Ohio ALF compliance kits ($149–$199) — one-click purchase, instant access' },
                { icon: <FiTrendingUp />, title: 'Affiliate Program', desc: 'Tiered commissions (20/25/30%) with family referral tracking and live dashboard' },
                { icon: <FiShield />, title: 'Caregiver Marketplace', desc: 'Browse, shortlist, and hire verified caregivers with background check badges and reviews' },
                { icon: <FiGlobe />, title: 'Provider Marketplace', desc: 'Transportation, meal services, housekeeping, and more — listed and discoverable by care homes and families' },
              ].map((item) => (
                <div key={item.title} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-start gap-4">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: <FiSmartphone />, title: 'Mobile App', desc: 'iOS & Android native apps for operators and families' },
                { icon: <FiVideo />, title: 'Video Tours', desc: 'Live-streamed virtual facility tours from home' },
                { icon: <FiGlobe />, title: 'Multi-Language', desc: 'Spanish, Chinese, and additional language support' },
                { icon: <FiActivity />, title: 'EHR Integrations', desc: 'Connect with major electronic health record systems' },
              ].map((item) => (
                <div key={item.title} className="bg-white p-5 rounded-xl border border-neutral-200 border-dashed shadow-sm flex items-start gap-4 opacity-80">
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
              Trusted by Thousands
            </h2>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto">
              See what families, operators, and healthcare professionals are saying
            </p>
          </div>
          
          {/* Trust Statistics */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">&lt; 15 min</div>
              <p className="text-neutral-500 font-medium">On-Call AI Shift Fill</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-secondary-500 mb-2">50+</div>
              <p className="text-neutral-500 font-medium">AI Match Data Points</p>
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
          
          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200">
              <div className="flex items-center mb-4">
                <div className="flex text-secondary-500">
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                </div>
              </div>
              <p className="text-neutral-500 mb-6 italic">
                "CareLinkAI made finding care for my mother so much easier. The AI matched us with three perfect facilities, and we found the right one within a week!"
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold mr-3">
                  SM
                </div>
                <div>
                  <p className="font-bold text-neutral-900">Sarah M.</p>
                  <p className="text-sm text-neutral-500">Family Member</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200">
              <div className="flex items-center mb-4">
                <div className="flex text-secondary-500">
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                </div>
              </div>
              <p className="text-neutral-500 mb-6 italic">
                "The automated follow-ups and inquiry management have saved our staff countless hours. Our occupancy rate has increased by 25%!"
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center text-white font-bold mr-3">
                  JT
                </div>
                <div>
                  <p className="font-bold text-neutral-900">John T.</p>
                  <p className="text-sm text-neutral-500">Care Home Operator</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200">
              <div className="flex items-center mb-4">
                <div className="flex text-secondary-500">
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                </div>
              </div>
              <p className="text-neutral-500 mb-6 italic">
                "As a discharge planner, this tool has been a game-changer. I can place patients in hours instead of days. The AI is incredibly accurate!"
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold mr-3">
                  DR
                </div>
                <div>
                  <p className="font-bold text-neutral-900">Dr. Rodriguez</p>
                  <p className="text-sm text-neutral-500">Discharge Planner</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* HIPAA Badge */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center bg-white border-2 border-primary-500 rounded-full px-6 py-3 shadow-lg">
              <FiShield className="text-primary-500 text-2xl mr-3" />
              <div className="text-left">
                <p className="font-bold text-neutral-900">HIPAA Compliant</p>
                <p className="text-xs text-neutral-500">Your data is secure and protected</p>
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
                <span className="font-bold text-lg text-neutral-900">How does the AI matching work?</span>
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
                      <p>Our AI analyzes over 50 data points including medical needs, care level, location, budget, amenities, and personal preferences. It then matches you with facilities that best fit your specific requirements, providing match scores and detailed comparisons.</p>
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
                      <p>Absolutely. We are fully HIPAA compliant with bank-level encryption, secure data storage, comprehensive audit logging, and regular security audits. Your health information is protected at every level of our platform.</p>
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
                    <div className="px-6 pb-5 text-neutral-500"><p>For families, CareLinkAI is completely free to use - no credit card required. Care homes and healthcare professionals have subscription plans starting at $99/month with different tiers based on features and volume needs.</p></div>
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
                    <div className="px-6 pb-5 text-neutral-500"><p>Our AI provides matches instantly. Most families find the right care home within 3-7 days. Discharge planners can place patients within hours. The speed depends on your specific needs and location, but we're significantly faster than traditional methods.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* FAQ 5 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(4)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">What makes CareLinkAI different?</span>
                <motion.div animate={{ rotate: openFaqIndex === 4 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 4 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>CareLinkAI is the only platform that serves every stakeholder in senior care — families, operators, caregivers, discharge planners, and affiliates — each with a dedicated AI-powered portal. Features like On-Call AI shift coverage, AI inquiry responses, automatic reliability scores, and tiered commission tracking are live today and built into every plan.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* FAQ 6 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(5)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Can I schedule facility tours through CareLinkAI?</span>
                <motion.div animate={{ rotate: openFaqIndex === 5 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 5 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Yes! Our AI-powered tour scheduling finds optimal times for both families and facilities. Families book directly from the listing page, and both parties receive automated reminders and confirmations via email and SMS.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 7 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(6)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Can operators hire caregivers directly from the marketplace?</span>
                <motion.div animate={{ rotate: openFaqIndex === 6 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 6 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Yes. Operators on any plan can browse caregiver profiles in the marketplace and hire directly with one click — no job posting or application process required. The caregiver is notified instantly, an employment record is created, and the hire is logged for compliance. Professional and Growth plan operators pay no per-hire marketplace fee.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 8 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(7)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">How does the affiliate referral program work?</span>
                <motion.div animate={{ rotate: openFaqIndex === 7 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 7 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Affiliates get a unique referral link and earn recurring commissions on every operator or family subscription they refer. New affiliates start at 20% commission; reaching 5 active referrals unlocks SILVER tier (25%); 15+ referrals unlocks GOLD tier (30%). Commissions are tracked in real time in your affiliate dashboard and paid monthly.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* FAQ 9 */}
            <motion.div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden" initial={false}>
              <button onClick={() => toggleFaq(8)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors">
                <span className="font-bold text-lg text-neutral-900">Do you have compliance resources for Ohio ALF operators?</span>
                <motion.div animate={{ rotate: openFaqIndex === 8 ? 180 : 0 }} transition={{ duration: 0.2 }}><FiChevronDown className="text-primary-500 text-xl" /></motion.div>
              </button>
              <AnimatePresence>
                {openFaqIndex === 8 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-neutral-500"><p>Yes. We offer three downloadable Ohio Assisted Living Facility compliance document kits ($149–$199 one-time purchase) covering state licensing requirements, resident rights, and medication management. Available in your operator portal under Compliance Kits, or from the footer of this page. More states coming soon.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 9. REQUEST A DEMO SECTION */}
      <section id="request-demo" className="py-20 bg-white border-t border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — pitch */}
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 mb-4 uppercase tracking-wide">
                Personalized Demo
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 leading-tight">
                See CareLinkAI in action — built for your facility
              </h2>
              <p className="text-neutral-500 text-lg mb-8">
                Get a free 20-minute walkthrough tailored to your operation. We'll show you how operators are using CareLinkAI to fill shifts faster, reduce call-off chaos, and build a reliable caregiver pipeline.
              </p>
              <ul className="space-y-3">
                {[
                  "Live marketplace demo with real caregiver applications",
                  "On-Call AI auto-fill — watch it contact caregivers instantly",
                  "Full operator dashboard: shifts, residents, billing, analytics",
                  "No commitment. No credit card. Just a conversation.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-neutral-600">
                    <span className="h-5 w-5 rounded-full bg-success-100 text-success-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — form */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">Request your demo</h3>
              <p className="text-sm text-neutral-400 mb-6">We respond within one business day.</p>
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
            Senior Care, Reimagined by AI
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
              <span>Setup in 5 minutes</span>
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
                <li><Link href="/operator/compliance-kits" className="hover:text-white transition-colors">Compliance Kits</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            {/* Company Column */}
            <div>
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press Kit</Link></li>
              </ul>
            </div>
            
            {/* Support Column */}
            <div>
              <h3 className="text-white font-bold mb-4">Support</h3>
              <ul className="space-y-3">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#request-demo" className="hover:text-white transition-colors">Request a Demo</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="border-t border-neutral-700 pt-8 pb-8">
            <div className="grid md:grid-cols-2 gap-6 text-sm">
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
              <span>HIPAA Compliant & SOC 2 Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
