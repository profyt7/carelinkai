'use client';

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { 
  FiArrowRight, FiCheck, FiShield, FiUsers, FiHeart, FiActivity, 
  FiSearch, FiStar, FiZap, FiBriefcase, FiMessageCircle, FiCalendar, 
  FiFileText, FiClock, FiTarget, FiTrendingUp, FiAward, FiSmartphone,
  FiVideo, FiGlobe, FiBarChart, FiChevronDown, FiPhone, FiMail, FiMapPin
} from "react-icons/fi";

export default function HomePage() {
  const [activeBenefitTab, setActiveBenefitTab] = useState('families');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white">
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
            <Link href="#features" className="text-[#63666A] hover:text-[#3978FC] font-medium transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-[#63666A] hover:text-[#3978FC] font-medium transition-colors">
              How It Works
            </Link>
            <Link href="#benefits" className="text-[#63666A] hover:text-[#3978FC] font-medium transition-colors">
              Benefits
            </Link>
            <Link href="#roadmap" className="text-[#63666A] hover:text-[#3978FC] font-medium transition-colors">
              Roadmap
            </Link>
            <Link href="#testimonials" className="text-[#63666A] hover:text-[#3978FC] font-medium transition-colors">
              Testimonials
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/auth/login" 
              className="text-[#3978FC] hover:text-[#3167d4] font-medium transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/auth/register" 
              className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] hover:opacity-90 text-white px-6 py-2.5 rounded-lg font-medium transition-opacity shadow-lg"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. HERO SECTION - Enhanced */}
      <section className="relative bg-gradient-to-br from-[#e8f2ff] via-white to-[#f3f0f9] py-20 md:py-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7253B7] rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#3978FC] rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Trust badge */}
              <div className="inline-flex items-center bg-white rounded-full px-4 py-2 shadow-sm mb-6 border border-neutral-200">
                <FiStar className="text-[#7253B7] mr-2" />
                <span className="text-sm font-semibold text-[#1A1A1A]">Trusted by 10,000+ families</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight">
                AI-Powered Senior Care{' '}
                <span className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              
              <p className="mt-6 text-xl text-[#63666A] max-w-xl leading-relaxed">
                Connect with the perfect care homes and caregivers using intelligent AI matching. 
                HIPAA-compliant, trusted, and built for families.
              </p>
              
              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/auth/register" 
                  className="group bg-gradient-to-r from-[#3978FC] to-[#7253B7] hover:shadow-xl text-white px-8 py-4 rounded-lg font-semibold text-center flex items-center justify-center shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  Get Started Free
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/search" 
                  className="bg-white hover:bg-neutral-50 text-[#1A1A1A] px-8 py-4 rounded-lg font-semibold border-2 border-neutral-300 text-center flex items-center justify-center transition-all duration-300 hover:border-[#3978FC]"
                >
                  <FiSearch className="mr-2" />
                  Find Care Now
                </Link>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[#63666A]">
                <div className="flex items-center">
                  <FiCheck className="text-[#7253B7] mr-2 flex-shrink-0" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center">
                  <FiShield className="text-[#7253B7] mr-2 flex-shrink-0" />
                  <span>HIPAA compliant</span>
                </div>
                <div className="flex items-center">
                  <FiZap className="text-[#7253B7] mr-2 flex-shrink-0" />
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
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center">
                      <FiHeart className="text-white text-2xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1A1A1A] text-lg">Perfect Match Found</h3>
                      <p className="text-sm text-[#63666A]">Sunshine Valley Care</p>
                    </div>
                    <div className="text-[#7253B7] font-bold text-2xl">98%</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-[#e8f2ff] to-[#d4e7ff] rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-[#3978FC]">24/7</div>
                      <div className="text-xs text-[#63666A] font-medium">Care Available</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#f3f0f9] to-[#e8e3f5] rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-[#7253B7]">5★</div>
                      <div className="text-xs text-[#63666A] font-medium">Rating</div>
                    </div>
                  </div>
                </div>
                
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white px-4 py-2 rounded-full shadow-lg border border-neutral-200 flex items-center space-x-2">
                  <FiZap className="text-[#3978FC]" />
                  <span className="text-sm font-semibold">AI Matched</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white px-4 py-2 rounded-full shadow-lg border border-neutral-200 flex items-center space-x-2">
                  <FiShield className="text-[#7253B7]" />
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
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
              Why CareLinkAI?
            </h2>
            <p className="text-xl text-[#63666A] max-w-3xl mx-auto">
              The only platform connecting families, care homes, caregivers, and healthcare professionals 
              through intelligent AI-powered matching
            </p>
          </div>
          
          {/* Three-channel strategy */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="bg-gradient-to-br from-[#e8f2ff] to-white p-8 rounded-2xl border border-[#3978FC]/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center mb-6">
                <FiUsers className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-3">For Families</h3>
              <p className="text-[#63666A] mb-4">
                Find the perfect care home or caregiver for your loved one through our AI matching engine.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-[#3978FC] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">AI-powered matching to care homes</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-[#3978FC] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">Direct connection to qualified caregivers</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-[#3978FC] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">24/7 CareBot support</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-[#f3f0f9] to-white p-8 rounded-2xl border border-[#7253B7]/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center mb-6">
                <FiActivity className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-3">For Operators</h3>
              <p className="text-[#63666A] mb-4">
                Receive qualified inquiries and manage your facility with comprehensive tools.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-[#7253B7] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">AI-generated home profiles</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-[#7253B7] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">Automated inquiry responses</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-[#7253B7] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">Resident management system</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-[#e8f2ff] via-white to-[#f3f0f9] p-8 rounded-2xl border border-[#3978FC]/20 hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center mb-6">
                <FiBriefcase className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-3">For Healthcare Pros</h3>
              <p className="text-[#63666A] mb-4">
                Discharge planners and case managers can place patients quickly and efficiently.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-[#3978FC] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">AI placement search</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-[#3978FC] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">Multi-facility requests</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-[#3978FC] mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[#63666A]">Real-time bed availability</span>
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
            <div className="inline-flex items-center bg-gradient-to-r from-[#3978FC] to-[#7253B7] rounded-full px-4 py-2 shadow-lg mb-6">
              <FiZap className="text-white mr-2" />
              <span className="text-sm font-bold text-white">POWERED BY AI</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              8 AI-Powered Features That Make Us Different
            </h2>
            <p className="text-xl text-[#63666A] max-w-3xl mx-auto">
              Our proprietary AI technology transforms how senior care connections are made
            </p>
          </div>
          
          {/* 8 Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#3978FC] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiTarget className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                AI Resident Matching Engine
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                Analyzes 50+ data points including medical needs, preferences, location, and budget to find perfect matches.
              </p>
              <p className="text-xs font-semibold text-[#3978FC]">
                ✓ 98% match accuracy
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#7253B7] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiFileText className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                AI Home Profile Generator
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                Automatically creates compelling facility profiles with optimized descriptions, amenities, and care specialties.
              </p>
              <p className="text-xs font-semibold text-[#7253B7]">
                ✓ Saves 5+ hours per profile
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#3978FC] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiCalendar className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                AI Tour Scheduling
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                Smart scheduling that finds optimal times for families and facilities, with automated reminders and confirmations.
              </p>
              <p className="text-xs font-semibold text-[#3978FC]">
                ✓ 60% faster booking
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#7253B7] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiMessageCircle className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                AI Inquiry Response System
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                Intelligent automated responses to family inquiries with personalized information and instant follow-ups.
              </p>
              <p className="text-xs font-semibold text-[#7253B7]">
                ✓ Responds in seconds
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#3978FC] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiFileText className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                Smart Document Processing
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                AI-powered document validation, extraction, and organization for medical records, insurance, and assessments.
              </p>
              <p className="text-xs font-semibold text-[#3978FC]">
                ✓ 90% time savings
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#7253B7] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiClock className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                Automated Follow-ups
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                Smart follow-up system that engages families at the right time with the right message via email and SMS.
              </p>
              <p className="text-xs font-semibold text-[#7253B7]">
                ✓ 3x higher engagement
              </p>
            </div>
            
            {/* Feature 7 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#3978FC] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiMessageCircle className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                CareBot for Families
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                24/7 AI chatbot that answers questions, provides guidance, and connects families with the right resources instantly.
              </p>
              <p className="text-xs font-semibold text-[#3978FC]">
                ✓ Always available
              </p>
            </div>
            
            {/* Feature 8 */}
            <div className="group bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-[#7253B7] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiBriefcase className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                AI for Discharge Planners
              </h3>
              <p className="text-sm text-[#63666A] mb-3">
                Specialized AI that helps healthcare professionals quickly place patients with matching availability and care level criteria.
              </p>
              <p className="text-xs font-semibold text-[#7253B7]">
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
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              How It Works
            </h2>
            <p className="text-xl text-[#63666A] max-w-3xl mx-auto">
              Simple, fast, and effective for everyone
            </p>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-8">
            {/* For Families */}
            <div className="bg-gradient-to-br from-[#e8f2ff] to-white p-6 rounded-2xl border border-[#3978FC]/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] items-center justify-center mb-4">
                  <FiUsers className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A]">For Families</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3978FC] text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Tell Us Your Needs</h4>
                    <p className="text-sm text-[#63666A]">Share your loved one's care requirements</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3978FC] text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Get AI Matches</h4>
                    <p className="text-sm text-[#63666A]">Receive personalized care home matches</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3978FC] text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Schedule Tours</h4>
                    <p className="text-sm text-[#63666A]">Book visits and find the perfect fit</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* For Care Homes */}
            <div className="bg-gradient-to-br from-[#f3f0f9] to-white p-6 rounded-2xl border border-[#7253B7]/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] items-center justify-center mb-4">
                  <FiActivity className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A]">For Care Homes</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#7253B7] text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Create Your Profile</h4>
                    <p className="text-sm text-[#63666A]">AI generates your facility profile</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#7253B7] text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Receive Inquiries</h4>
                    <p className="text-sm text-[#63666A]">Get matched with qualified families</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#7253B7] text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Fill Your Beds</h4>
                    <p className="text-sm text-[#63666A]">Convert inquiries into residents</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* For Caregivers */}
            <div className="bg-gradient-to-br from-[#e8f2ff] to-white p-6 rounded-2xl border border-[#3978FC]/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-[#3978FC] to-[#7253B7] items-center justify-center mb-4">
                  <FiHeart className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A]">For Caregivers</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3978FC] text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Build Your Profile</h4>
                    <p className="text-sm text-[#63666A]">Showcase your skills and experience</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3978FC] text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Get Matched</h4>
                    <p className="text-sm text-[#63666A]">Connect with families seeking care</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3978FC] text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Start Caring</h4>
                    <p className="text-sm text-[#63666A]">Begin your rewarding caregiving job</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* For Healthcare Pros */}
            <div className="bg-gradient-to-br from-[#f3f0f9] to-white p-6 rounded-2xl border border-[#7253B7]/20">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-[#7253B7] to-[#3978FC] items-center justify-center mb-4">
                  <FiBriefcase className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A]">For Discharge Planners</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#7253B7] text-white flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Enter Patient Info</h4>
                    <p className="text-sm text-[#63666A]">Describe care level and needs</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#7253B7] text-white flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">AI Finds Matches</h4>
                    <p className="text-sm text-[#63666A]">Get available facilities instantly</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#7253B7] text-white flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">Place Patient</h4>
                    <p className="text-sm text-[#63666A]">Secure placement in minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BENEFITS BY USER TYPE */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              Benefits for Everyone
            </h2>
            <p className="text-xl text-[#63666A] max-w-3xl mx-auto">
              Tailored solutions for each user type
            </p>
          </div>
          
          {/* Tab Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveBenefitTab('families')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeBenefitTab === 'families'
                  ? 'bg-gradient-to-r from-[#3978FC] to-[#5a8ffc] text-white shadow-lg'
                  : 'bg-white text-[#63666A] border-2 border-neutral-200 hover:border-[#3978FC]'
              }`}
            >
              For Families
            </button>
            <button
              onClick={() => setActiveBenefitTab('operators')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeBenefitTab === 'operators'
                  ? 'bg-gradient-to-r from-[#7253B7] to-[#8f6dd1] text-white shadow-lg'
                  : 'bg-white text-[#63666A] border-2 border-neutral-200 hover:border-[#7253B7]'
              }`}
            >
              For Care Homes
            </button>
            <button
              onClick={() => setActiveBenefitTab('caregivers')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeBenefitTab === 'caregivers'
                  ? 'bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white shadow-lg'
                  : 'bg-white text-[#63666A] border-2 border-neutral-200 hover:border-[#3978FC]'
              }`}
            >
              For Caregivers
            </button>
            <button
              onClick={() => setActiveBenefitTab('healthcare')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeBenefitTab === 'healthcare'
                  ? 'bg-gradient-to-r from-[#7253B7] to-[#3978FC] text-white shadow-lg'
                  : 'bg-white text-[#63666A] border-2 border-neutral-200 hover:border-[#7253B7]'
              }`}
            >
              For Healthcare Professionals
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-neutral-200">
            {activeBenefitTab === 'families' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center">
                    <FiTarget className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Perfect Matches</h4>
                    <p className="text-[#63666A]">AI analyzes 50+ factors to find ideal care homes that meet your specific needs and budget.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center">
                    <FiClock className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Save Time</h4>
                    <p className="text-[#63666A]">Find the right care in days, not months. Our AI does the heavy lifting for you.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">HIPAA Secure</h4>
                    <p className="text-[#63666A]">Your health information is protected with bank-level security and full HIPAA compliance.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center">
                    <FiMessageCircle className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">24/7 Support</h4>
                    <p className="text-[#63666A]">CareBot is always available to answer questions and guide you through the process.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center">
                    <FiCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Transparent Pricing</h4>
                    <p className="text-[#63666A]">See costs upfront with no hidden fees. Compare options side-by-side easily.</p>
                  </div>
                </div>
              </div>
            )}
            
            {activeBenefitTab === 'operators' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center">
                    <FiTrendingUp className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Increase Occupancy</h4>
                    <p className="text-[#63666A]">Get matched with qualified families actively seeking care, filling your beds faster.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center">
                    <FiZap className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Automated Marketing</h4>
                    <p className="text-[#63666A]">AI creates compelling profiles and handles inquiry responses automatically.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center">
                    <FiActivity className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Resident Management</h4>
                    <p className="text-[#63666A]">Comprehensive tools to track health, medications, assessments, and family communication.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center">
                    <FiBarChart className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Analytics & Insights</h4>
                    <p className="text-[#63666A]">Track inquiry sources, conversion rates, and optimize your facility's performance.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center">
                    <FiClock className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Save Staff Time</h4>
                    <p className="text-[#63666A]">Automation handles follow-ups, scheduling, and documentation, freeing your team.</p>
                  </div>
                </div>
              </div>
            )}
            
            {activeBenefitTab === 'caregivers' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center">
                    <FiSearch className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Find Great Jobs</h4>
                    <p className="text-[#63666A]">Connect directly with families seeking caregivers in your area with your skills.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center">
                    <FiTarget className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Perfect Matches</h4>
                    <p className="text-[#63666A]">AI matches you with families whose needs align with your expertise and availability.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Verified Profiles</h4>
                    <p className="text-[#63666A]">Background checks and credential verification build trust with families.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center">
                    <FiCalendar className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Flexible Scheduling</h4>
                    <p className="text-[#63666A]">Choose jobs that fit your schedule and availability preferences.</p>
                  </div>
                </div>
              </div>
            )}
            
            {activeBenefitTab === 'healthcare' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center">
                    <FiZap className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Fast Placements</h4>
                    <p className="text-[#63666A]">Place patients in hours instead of days with instant AI-powered facility matching.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center">
                    <FiTarget className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Accurate Matches</h4>
                    <p className="text-[#63666A]">AI considers care level, location, insurance, and availability for perfect fits.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center">
                    <FiUsers className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Multi-Facility Requests</h4>
                    <p className="text-[#63666A]">Send placement requests to multiple facilities simultaneously with one click.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center">
                    <FiActivity className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Real-Time Availability</h4>
                    <p className="text-[#63666A]">See which facilities have beds available right now, eliminating endless phone calls.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">HIPAA Compliant</h4>
                    <p className="text-[#63666A]">All patient information is securely handled with full HIPAA compliance.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. COMING SOON FEATURES (ROADMAP) */}
      <section id="roadmap" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-[#3978FC] to-[#7253B7] rounded-full px-4 py-2 shadow-lg mb-6">
              <FiTrendingUp className="text-white mr-2" />
              <span className="text-sm font-bold text-white">COMING SOON</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              What's Next for CareLinkAI
            </h2>
            <p className="text-xl text-[#63666A] max-w-3xl mx-auto">
              We're constantly innovating to make senior care placement even better
            </p>
          </div>
          
          {/* Roadmap Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-[#3978FC] via-[#7253B7] to-neutral-200"></div>
            
            <div className="space-y-12">
              {/* Q1 2026 */}
              <div className="relative">
                <div className="flex items-center justify-center mb-8">
                  <div className="bg-gradient-to-r from-[#3978FC] to-[#5a8ffc] text-white px-6 py-2 rounded-full font-bold shadow-lg z-10">
                    Q1 2026
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-[#e8f2ff] to-white p-6 rounded-xl shadow-lg border border-[#3978FC]/20">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center">
                        <FiSmartphone className="text-white text-xl" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Mobile App (iOS & Android)</h4>
                        <p className="text-sm text-[#63666A]">Search for care, manage inquiries, and communicate on the go with our native mobile apps.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#f3f0f9] to-white p-6 rounded-xl shadow-lg border border-[#7253B7]/20">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center">
                        <FiVideo className="text-white text-xl" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Video Tours</h4>
                        <p className="text-sm text-[#63666A]">Take virtual tours of facilities from the comfort of your home with live video streaming.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Q2 2026 */}
              <div className="relative">
                <div className="flex items-center justify-center mb-8">
                  <div className="bg-gradient-to-r from-[#7253B7] to-[#8f6dd1] text-white px-6 py-2 rounded-full font-bold shadow-lg z-10">
                    Q2 2026
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-[#e8f2ff] to-white p-6 rounded-xl shadow-lg border border-[#3978FC]/20">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center">
                        <FiMessageCircle className="text-white text-xl" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Virtual Consultations</h4>
                        <p className="text-sm text-[#63666A]">Schedule video consultations with care coordinators and facility staff directly in the platform.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#f3f0f9] to-white p-6 rounded-xl shadow-lg border border-[#7253B7]/20">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center">
                        <FiBarChart className="text-white text-xl" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">Advanced Analytics Dashboard</h4>
                        <p className="text-sm text-[#63666A]">Deep insights into occupancy trends, conversion rates, and facility performance metrics.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Future */}
              <div className="relative">
                <div className="flex items-center justify-center mb-8">
                  <div className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-2 rounded-full font-bold shadow-lg z-10">
                    Future Features
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-[#3978FC] to-[#5a8ffc] flex items-center justify-center">
                        <FiActivity className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] mb-1">EHR Integrations</h4>
                        <p className="text-xs text-[#63666A]">Connect with major EHR systems</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-[#7253B7] to-[#8f6dd1] flex items-center justify-center">
                        <FiGlobe className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] mb-1">Multi-Language Support</h4>
                        <p className="text-xs text-[#63666A]">Spanish, Chinese, and more</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center">
                        <FiAward className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] mb-1">Quality Ratings</h4>
                        <p className="text-xs text-[#63666A]">Comprehensive facility reviews</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SOCIAL PROOF SECTION */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-[#63666A] max-w-3xl mx-auto">
              See what families, operators, and healthcare professionals are saying
            </p>
          </div>
          
          {/* Trust Statistics */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-[#3978FC] mb-2">10,000+</div>
              <p className="text-[#63666A] font-medium">Families Helped</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-[#7253B7] mb-2">200+</div>
              <p className="text-[#63666A] font-medium">Care Homes</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-[#3978FC] mb-2">500+</div>
              <p className="text-[#63666A] font-medium">Caregivers</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200 text-center">
              <div className="text-4xl font-bold text-[#7253B7] mb-2">98%</div>
              <p className="text-[#63666A] font-medium">Match Accuracy</p>
            </div>
          </div>
          
          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200">
              <div className="flex items-center mb-4">
                <div className="flex text-[#7253B7]">
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                </div>
              </div>
              <p className="text-[#63666A] mb-6 italic">
                "CareLinkAI made finding care for my mother so much easier. The AI matched us with three perfect facilities, and we found the right one within a week!"
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center text-white font-bold mr-3">
                  SM
                </div>
                <div>
                  <p className="font-bold text-[#1A1A1A]">Sarah M.</p>
                  <p className="text-sm text-[#63666A]">Family Member</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200">
              <div className="flex items-center mb-4">
                <div className="flex text-[#7253B7]">
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                </div>
              </div>
              <p className="text-[#63666A] mb-6 italic">
                "The automated follow-ups and inquiry management have saved our staff countless hours. Our occupancy rate has increased by 25%!"
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#7253B7] to-[#3978FC] flex items-center justify-center text-white font-bold mr-3">
                  JT
                </div>
                <div>
                  <p className="font-bold text-[#1A1A1A]">John T.</p>
                  <p className="text-sm text-[#63666A]">Care Home Operator</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200">
              <div className="flex items-center mb-4">
                <div className="flex text-[#7253B7]">
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                </div>
              </div>
              <p className="text-[#63666A] mb-6 italic">
                "As a discharge planner, this tool has been a game-changer. I can place patients in hours instead of days. The AI is incredibly accurate!"
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#3978FC] to-[#7253B7] flex items-center justify-center text-white font-bold mr-3">
                  DR
                </div>
                <div>
                  <p className="font-bold text-[#1A1A1A]">Dr. Rodriguez</p>
                  <p className="text-sm text-[#63666A]">Discharge Planner</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* HIPAA Badge */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center bg-white border-2 border-[#3978FC] rounded-full px-6 py-3 shadow-lg">
              <FiShield className="text-[#3978FC] text-2xl mr-3" />
              <div className="text-left">
                <p className="font-bold text-[#1A1A1A]">HIPAA Compliant</p>
                <p className="text-xs text-[#63666A]">Your data is secure and protected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-[#63666A]">
              Get answers to common questions about CareLinkAI
            </p>
          </div>
          
          <div className="space-y-4">
            {/* FAQ 1 */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-[#1A1A1A]">How does the AI matching work?</span>
                <FiChevronDown className={`text-[#3978FC] text-xl transition-transform ${openFaqIndex === 0 ? 'transform rotate-180' : ''}`} />
              </button>
              {openFaqIndex === 0 && (
                <div className="px-6 pb-5 text-[#63666A]">
                  <p>Our AI analyzes over 50 data points including medical needs, care level, location, budget, amenities, and personal preferences. It then matches you with facilities that best fit your specific requirements, providing match scores and detailed comparisons.</p>
                </div>
              )}
            </div>
            
            {/* FAQ 2 */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-[#1A1A1A]">Is my health information secure?</span>
                <FiChevronDown className={`text-[#3978FC] text-xl transition-transform ${openFaqIndex === 1 ? 'transform rotate-180' : ''}`} />
              </button>
              {openFaqIndex === 1 && (
                <div className="px-6 pb-5 text-[#63666A]">
                  <p>Absolutely. We are fully HIPAA compliant with bank-level encryption, secure data storage, comprehensive audit logging, and regular security audits. Your health information is protected at every level of our platform.</p>
                </div>
              )}
            </div>
            
            {/* FAQ 3 */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-[#1A1A1A]">How much does CareLinkAI cost?</span>
                <FiChevronDown className={`text-[#3978FC] text-xl transition-transform ${openFaqIndex === 2 ? 'transform rotate-180' : ''}`} />
              </button>
              {openFaqIndex === 2 && (
                <div className="px-6 pb-5 text-[#63666A]">
                  <p>For families, CareLinkAI is completely free to use - no credit card required. Care homes and healthcare professionals have subscription plans starting at $99/month with different tiers based on features and volume needs.</p>
                </div>
              )}
            </div>
            
            {/* FAQ 4 */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-[#1A1A1A]">How quickly can I find care?</span>
                <FiChevronDown className={`text-[#3978FC] text-xl transition-transform ${openFaqIndex === 3 ? 'transform rotate-180' : ''}`} />
              </button>
              {openFaqIndex === 3 && (
                <div className="px-6 pb-5 text-[#63666A]">
                  <p>Our AI provides matches instantly. Most families find the right care home within 3-7 days. Discharge planners can place patients within hours. The speed depends on your specific needs and location, but we're significantly faster than traditional methods.</p>
                </div>
              )}
            </div>
            
            {/* FAQ 5 */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(4)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-[#1A1A1A]">What makes CareLinkAI different?</span>
                <FiChevronDown className={`text-[#3978FC] text-xl transition-transform ${openFaqIndex === 4 ? 'transform rotate-180' : ''}`} />
              </button>
              {openFaqIndex === 4 && (
                <div className="px-6 pb-5 text-[#63666A]">
                  <p>We're the only platform that uses advanced AI to match all stakeholders - families, care homes, caregivers, and healthcare professionals. Our 8 AI-powered features automate the entire placement process, making it faster, more accurate, and less stressful for everyone involved.</p>
                </div>
              )}
            </div>
            
            {/* FAQ 6 */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(5)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors"
              >
                <span className="font-bold text-lg text-[#1A1A1A]">Can I schedule facility tours through CareLinkAI?</span>
                <FiChevronDown className={`text-[#3978FC] text-xl transition-transform ${openFaqIndex === 5 ? 'transform rotate-180' : ''}`} />
              </button>
              {openFaqIndex === 5 && (
                <div className="px-6 pb-5 text-[#63666A]">
                  <p>Yes! Our AI-powered tour scheduling finds optimal times for both families and facilities. You'll receive automated reminders and confirmations. Virtual tours and video consultations are coming in Q1 2026.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA SECTION */}
      <section className="py-20 bg-gradient-to-br from-[#3978FC] to-[#7253B7] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 md:px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Find the Perfect Care?
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-10">
            Join thousands of families, care homes, and healthcare professionals who trust CareLinkAI 
            to make senior care placement simple, fast, and effective.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link 
              href="/auth/register" 
              className="group bg-white hover:bg-neutral-100 text-[#3978FC] px-10 py-4 rounded-lg font-bold text-lg text-center flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              Get Started Free
              <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/contact" 
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
      <footer className="bg-[#1A1A1A] text-neutral-300 py-16">
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
                <a href="#" className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-[#3978FC] flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-[#3978FC] flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-neutral-700 hover:bg-[#3978FC] flex items-center justify-center transition-colors">
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
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
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
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="border-t border-neutral-700 pt-8 pb-8">
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-center">
                <FiMail className="text-[#3978FC] mr-3" />
                <a href="mailto:support@getcarelinkai.com" className="hover:text-white transition-colors">
                  support@getcarelinkai.com
                </a>
              </div>
              <div className="flex items-center">
                <FiPhone className="text-[#7253B7] mr-3" />
                <a href="tel:+18005551234" className="hover:text-white transition-colors">
                  1-800-555-1234
                </a>
              </div>
              <div className="flex items-center">
                <FiMapPin className="text-[#3978FC] mr-3" />
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-neutral-700 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-neutral-500">
            <p>© {new Date().getFullYear()} CareLinkAI. All rights reserved.</p>
            <div className="flex items-center mt-4 md:mt-0">
              <FiShield className="text-[#3978FC] mr-2" />
              <span>HIPAA Compliant & SOC 2 Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
