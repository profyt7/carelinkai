"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  FiArrowLeft, 
  FiStar, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiCalendar, 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCheck, 
  FiX, 
  FiHeart,
  FiShare2,
  FiClock,
  FiInfo,
  FiVideo,
  FiThumbsUp,
  FiThumbsDown,
  FiShield,
  FiAward,
  FiTrendingUp,
  FiList,
  FiGrid,
  FiFlag,
  FiMapPin as FiMapPinOutline,
  FiCoffee,
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle
} from "react-icons/fi";
import { Camera, MessageSquare } from "lucide-react";

import BrowseShell from "@/components/layout/BrowseShell";
import TourRequestModal from "@/components/tours/TourRequestModal";
// Import our new components
import PhotoGallery from "@/components/homes/PhotoGallery";
import { placeholderImageFor } from "@/lib/placeholder-images";
import GoogleRatingBadge from "@/components/homes/GoogleRatingBadge";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import HomeReviews from "@/components/homes/HomeReviews";
import InspectionHistory from "@/components/homes/InspectionHistory";
import ListingRelatedLinks from "@/components/directory/ListingRelatedLinks";
import { CARECREDIT_APPLY_URL, CARECREDIT_DISCLOSURE, CARECREDIT_TITLE } from "@/lib/financing/carecredit";
import LeadConsentCheckbox, { emptyLeadConsent } from "@/components/consent/LeadConsentCheckbox";
import type { LeadConsentPayload } from "@/lib/consent/lead-consent-text";
import { PAYER_SOURCE_OPTIONS } from "@/lib/payer/payer-source";
import PricingCalculator from "@/components/homes/PricingCalculator";
import type { PricingEstimate } from "@/components/homes/PricingCalculator";
import { getCloudinaryAvatar, isCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { buildInquiryPayload } from "@/lib/inquiries/payload";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { toggleFavorite as toggleFavoriteApi } from "@/lib/favoritesService";
import { listingFacts } from "@/lib/homes/listing-facts";

// Dynamically import the SimpleMap component with SSR disabled
const SimpleMap = dynamic(
  () => import("@/components/search/SimpleMap"),
  { ssr: false }
);

// Readable care-level phrase for GENERAL (clearly non-facility-specific) empty-state copy.
const CARE_LEVEL_WORDS: Record<string, string> = {
  ASSISTED: "assisted living",
  MEMORY_CARE: "memory care",
  INDEPENDENT: "independent living",
  SKILLED_NURSING: "skilled nursing",
};
function careLevelPhrase(levels: unknown): string {
  const arr = Array.isArray(levels) ? (levels as string[]) : [];
  const mapped = arr.map((l) => CARE_LEVEL_WORDS[l]).filter(Boolean);
  if (mapped.length === 0) return "senior care";
  if (mapped.length === 1) return mapped[0];
  if (mapped.length === 2) return `${mapped[0]} and ${mapped[1]}`;
  return `${mapped.slice(0, -1).join(", ")}, and ${mapped[mapped.length - 1]}`;
}


// Care level options for reference
const CARE_LEVELS = [
  { id: "INDEPENDENT", label: "Independent Living" },
  { id: "ASSISTED", label: "Assisted Living" },
  { id: "MEMORY_CARE", label: "Memory Care" },
  { id: "SKILLED_NURSING", label: "Skilled Nursing" }
];

export default function HomeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status: authStatus } = useSession();
  const { id } = params;
  // Set when a discharge planner arrives from their concierge shortlist
  // (?concierge=<searchId>): tour/inquiry actions here are coordinated by the
  // CareLinkAI care team, not the gated family tour flow.
  const searchParams = useSearchParams();
  const conciergeSearchId = searchParams?.get("concierge") || null;
  
  // State for the home data
  const [isLoading, setIsLoading] = useState(false);
  // Listing data states
  const [realHome, setRealHome] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState("overview");
  
  // State for pricing calculator
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimate | null>(null);
  
  // State for activity calendar
  
  // State for inquiry form
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    residentName: "",
    moveInTimeframe: "1-3 months",
    // Explicitly assert string[] to avoid `never[]` inference issues
    careNeeded: [] as string[],
    message: "",
    // Payer-source screener (OL-114) — optional, "" = unanswered. Tags only.
    payerSource: "",
    tourDate: "",
    tourTime: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // TCPA/marketing consent — UNCHECKED by default; declining never blocks submit.
  const [leadConsent, setLeadConsent] = useState<LeadConsentPayload>(emptyLeadConsent());
  
  // State for booking step
  const [bookingStep, setBookingStep] = useState(0); // 0: not started, 1: inquiry form, 2: tour scheduling, 3: submitted
  
  // State for tour modal
  const [showTourModal, setShowTourModal] = useState(false);
  
  // State for collapsible amenities
  const [amenitiesExpanded, setAmenitiesExpanded] = useState<Record<string, boolean>>({});
  
  // Reference for scrolling to sections
  const overviewRef = useRef<HTMLDivElement>(null);
  const amenitiesRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const activitiesRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);
  
  // Fetch data
  useEffect(() => {
    let cancelled = false;
    const fetchReal = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/homes/${id}`, { cache: 'no-store', credentials: 'include' as RequestCredentials });
        if (!res.ok) {
          const msg = `Failed to load listing (${res.status})`;
          if (!cancelled) setLoadError(msg);
          return;
        }
        const j = await res.json();
        if (!j?.success || !j?.data) {
          if (!cancelled) setLoadError('Malformed response');
          return;
        }
        if (!cancelled) {
          setRealHome(j.data);
          setIsFavorite(Boolean(j.data?.isFavorited));
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Network error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchReal();
    return () => {
      cancelled = true;
    };
  }, [id]);
  
  
  // Handle inquiry form changes
  const handleInquiryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInquiryForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle care needed checkboxes
  const handleCareNeededChange = (care: string) => {
    setInquiryForm(prev => {
      const careNeeded = [...prev.careNeeded];
      if (careNeeded.includes(care)) {
        return { ...prev, careNeeded: careNeeded.filter(c => c !== care) };
      } else {
        return { ...prev, careNeeded: [...careNeeded, care] };
      }
    });
  };
  
  // Handle inquiry submission (step 1 validation → go to step 2)
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  🔴 CONTINUE TO SCHEDULE TOUR - BUTTON CLICKED          ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    
    console.log("🔴 [STEP 1] Form submission started");
    console.log("🔴 [CURRENT STATE]:");
    console.log("  ├─ bookingStep:", bookingStep);
    console.log("  ├─ inquiryForm.name:", inquiryForm.name);
    console.log("  ├─ inquiryForm.email:", inquiryForm.email);
    console.log("  ├─ inquiryForm.phone:", inquiryForm.phone);
    console.log("  ├─ inquiryForm.residentName:", inquiryForm.residentName);
    console.log("  ├─ inquiryForm.moveInTimeframe:", inquiryForm.moveInTimeframe);
    console.log("  ├─ inquiryForm.careNeeded:", inquiryForm.careNeeded);
    console.log("  ├─ inquiryForm.careNeeded length:", inquiryForm.careNeeded?.length || 0);
    console.log("  ├─ inquiryForm.careNeeded is array?:", Array.isArray(inquiryForm.careNeeded));
    console.log("  └─ inquiryForm.message:", inquiryForm.message);
    
    console.log("\n🔴 [STEP 2] Running validation checks...");
    
    const errs: Record<string, string> = {};
    
    // Name validation
    console.log("🔴 [CHECK 1] Validating name...");
    if (!inquiryForm.name.trim()) {
      console.log("  ❌ Name is empty");
      errs["name"] = "Name is required";
    } else {
      console.log("  ✅ Name is valid:", inquiryForm.name);
    }
    
    // Email validation
    console.log("🔴 [CHECK 2] Validating email...");
    if (!inquiryForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiryForm.email)) {
      console.log("  ❌ Email is invalid:", inquiryForm.email);
      errs["email"] = "Valid email is required";
    } else {
      console.log("  ✅ Email is valid:", inquiryForm.email);
    }
    
    // Care needed validation
    console.log("🔴 [CHECK 3] Validating care services...");
    console.log("  ├─ careNeeded value:", inquiryForm.careNeeded);
    console.log("  ├─ Is array?:", Array.isArray(inquiryForm.careNeeded));
    console.log("  └─ Length:", inquiryForm.careNeeded?.length || 0);
    
    if (!Array.isArray(inquiryForm.careNeeded) || inquiryForm.careNeeded.length === 0) {
      console.log("  ❌ No care services selected");
      errs["careNeeded"] = "Please select at least one care service";
    } else {
      console.log("  ✅ Care services selected:", inquiryForm.careNeeded);
    }
    
    console.log("\n🔴 [STEP 3] Validation summary:");
    console.log("  ├─ Total errors:", Object.keys(errs).length);
    console.log("  └─ Errors:", errs);
    
    setFormErrors(errs);
    
    if (Object.keys(errs).length > 0) {
      console.log("\n🔴 [RESULT] ❌ VALIDATION FAILED - Form NOT advancing");
      console.log("  └─ Staying on bookingStep:", bookingStep);
      console.log("\n╔══════════════════════════════════════════════════════════╗");
      console.log("║  ❌ FORM BLOCKED - FIX VALIDATION ERRORS ABOVE          ║");
      console.log("╚══════════════════════════════════════════════════════════╝\n");
      return;
    }

    console.log("\n🔴 [RESULT] ✅ VALIDATION PASSED - Advancing to step 2!");
    console.log("  ├─ Previous bookingStep:", bookingStep);
    console.log("  └─ New bookingStep: 2");
    
    setBookingStep(2);
    
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  ✅ FORM ADVANCED - Should show tour scheduling now     ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
  };
  
  // Handle tour scheduling
  // Concierge tour: when a DP arrives via ?concierge=<searchId>, the "Schedule a
  // Tour" CTA routes to the concierge endpoint (claimed → operator + Chris;
  // unclaimed → Chris + claim signal) instead of the family tour modal (which a
  // DP can't use). Non-concierge users are unaffected — they get the modal.
  const [conciergeTourState, setConciergeTourState] = useState<'idle' | 'sending' | 'done'>('idle');
  const handleConciergeTour = async () => {
    if (!conciergeSearchId) return;
    setConciergeTourState('sending');
    try {
      const res = await fetch(`/api/discharge-planner/concierge/${conciergeSearchId}/tour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeId: String(id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not request the tour');
      setConciergeTourState('done');
      toast.success('Tour requested — CareLinkAI is coordinating.');
    } catch (e: any) {
      setConciergeTourState('idle');
      toast.error(e?.message || 'Could not request the tour');
    }
  };
  const onScheduleTour = () => {
    if (conciergeSearchId) { void handleConciergeTour(); return; }
    setShowTourModal(true);
  };

  const handleTourSchedule = async (e: React.FormEvent) => {
    console.log('🔴🔴🔴 [TOUR DIAGNOSTIC] ========================================');
    console.log('🔴 [TOUR DIAGNOSTIC] Tour schedule handler called');
    console.log('🔴 [TOUR DIAGNOSTIC] Timestamp:', new Date().toISOString());
    console.log('🔴 [TOUR DIAGNOSTIC] Event type:', e.type);
    
    e.preventDefault();
    console.log('🔴 [TOUR DIAGNOSTIC] preventDefault() called successfully');
    
    setSubmitError(null);
    console.log('🔴 [TOUR DIAGNOSTIC] Submit error state cleared');

    // Log current form state
    console.log('🔴 [TOUR DIAGNOSTIC] Current inquiry form state:', {
      name: inquiryForm.name,
      email: inquiryForm.email,
      phone: inquiryForm.phone,
      residentName: inquiryForm.residentName,
      moveInTimeframe: inquiryForm.moveInTimeframe,
      careNeeded: inquiryForm.careNeeded,
      message: inquiryForm.message,
      tourDate: inquiryForm.tourDate,
      tourTime: inquiryForm.tourTime,
    });
    console.log('🔴 [TOUR DIAGNOSTIC] Home ID:', id);

    // Compose ISO tour date-time if both provided
    console.log('🔴 [TOUR DIAGNOSTIC] Step 1: Composing tour date-time...');
    let tourDateIso: string | undefined = undefined;
    if (inquiryForm.tourDate && inquiryForm.tourTime) {
      console.log('🔴 [TOUR DIAGNOSTIC] Tour date and time provided, converting to ISO...');
      try {
        const [hmm = '0:00', ampm = 'AM'] = inquiryForm.tourTime.split(" ");
        console.log('🔴 [TOUR DIAGNOSTIC] Parsed time components:', { hmm, ampm });
        
        const [hh = '0', mm = '0'] = hmm.split(":");
        console.log('🔴 [TOUR DIAGNOSTIC] Parsed hour/minute:', { hh, mm });
        
        let hours = parseInt(hh, 10) % 12 + (ampm?.toUpperCase() === "PM" ? 12 : 0);
        console.log('🔴 [TOUR DIAGNOSTIC] Calculated hours (24h format):', hours);
        
        const dt = new Date(inquiryForm.tourDate);
        console.log('🔴 [TOUR DIAGNOSTIC] Base date object:', dt.toISOString());
        
        dt.setHours(hours, parseInt(mm || "0", 10), 0, 0);
        tourDateIso = dt.toISOString();
        console.log('🔴 [TOUR DIAGNOSTIC] ✅ Final tour date ISO:', tourDateIso);
      } catch (dateError) {
        console.error('🔴 [TOUR DIAGNOSTIC] ❌ Error converting tour date:', dateError);
      }
    } else {
      console.log('🔴 [TOUR DIAGNOSTIC] ⚠️ No tour date/time provided');
    }

    console.log('🔴 [TOUR DIAGNOSTIC] Step 2: Building request payload...');
    // Map the form fields onto the /api/inquiries contract (the canonical
    // Zod schema). The form historically posted name/email/phone/residentName/
    // careNeeded/source:'home_detail', none of which match the API, so every
    // submission failed Zod validation with 400. moveInTimeframe has no column
    // on Inquiry, so fold it into additionalInfo rather than drop it.
    const payload = {
      ...buildInquiryPayload(String(id), inquiryForm, tourDateIso, leadConsent),
      // Concierge-aware: loops in the care team + marks the DP's shortlist so a
      // generic-page inquiry from a concierge shortlist never black-holes either.
      ...(conciergeSearchId ? { conciergeSearchId } : {}),
    };
    console.log('🔴 [TOUR DIAGNOSTIC] Request payload:', JSON.stringify(payload, null, 2));

    try {
      console.log('🔴 [TOUR DIAGNOSTIC] Step 3: Setting submitting state to true...');
      setSubmitting(true);
      
      console.log('🔴 [TOUR DIAGNOSTIC] Step 4: Making API call...');
      console.log('🔴 [TOUR DIAGNOSTIC] URL: /api/inquiries');
      console.log('🔴 [TOUR DIAGNOSTIC] Method: POST');
      console.log('🔴 [TOUR DIAGNOSTIC] Headers:', { 'Content-Type': 'application/json' });
      
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('🔴 [TOUR DIAGNOSTIC] Step 5: API call completed');
      console.log('🔴 [TOUR DIAGNOSTIC] Response status:', res.status);
      console.log('🔴 [TOUR DIAGNOSTIC] Response ok:', res.ok);
      console.log('🔴 [TOUR DIAGNOSTIC] Response statusText:', res.statusText);
      
      if (!res.ok) {
        console.log('🔴 [TOUR DIAGNOSTIC] ❌ API returned error status');
        
        // Try to parse error response
        let errorData;
        try {
          errorData = await res.json();
          console.log('🔴 [TOUR DIAGNOSTIC] Error response body:', JSON.stringify(errorData, null, 2));
        } catch (parseError) {
          console.error('🔴 [TOUR DIAGNOSTIC] Failed to parse error response:', parseError);
        }
        
        const msg = res.status === 400 ? 'Please check your details and try again.' : 'Something went wrong. Please try again later.';
        console.log('🔴 [TOUR DIAGNOSTIC] Setting error message:', msg);
        setSubmitError(msg);
        return;
      }
      
      // Try to parse success response
      console.log('🔴 [TOUR DIAGNOSTIC] Step 6: Parsing success response...');
      let responseData;
      try {
        responseData = await res.json();
        console.log('🔴 [TOUR DIAGNOSTIC] Response data:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.log('🔴 [TOUR DIAGNOSTIC] ⚠️ Failed to parse response (may be empty):', parseError);
      }
      
      // Success → show confirmation
      console.log('🔴 [TOUR DIAGNOSTIC] ✅ Tour scheduled successfully!');
      console.log('🔴 [TOUR DIAGNOSTIC] Setting booking step to 3 (confirmation)...');
      setBookingStep(3);
      console.log('🔴 [TOUR DIAGNOSTIC] ======================================== ✅');
    } catch (err: any) {
      console.error('🔴 [TOUR DIAGNOSTIC] ========================================');
      console.error('🔴 [TOUR DIAGNOSTIC] ❌ EXCEPTION CAUGHT');
      console.error('🔴 [TOUR DIAGNOSTIC] Error type:', err?.constructor?.name || 'Unknown');
      console.error('🔴 [TOUR DIAGNOSTIC] Error name:', err?.name || 'N/A');
      console.error('🔴 [TOUR DIAGNOSTIC] Error message:', err?.message || String(err));
      console.error('🔴 [TOUR DIAGNOSTIC] Error stack:', err?.stack || 'N/A');
      console.error('🔴 [TOUR DIAGNOSTIC] Full error object:', err);
      console.error('🔴 [TOUR DIAGNOSTIC] ======================================== ❌');
      
      setSubmitError('Network error. Please try again.');
    } finally {
      console.log('🔴 [TOUR DIAGNOSTIC] Finally block: Setting submitting to false');
      setSubmitting(false);
      console.log('🔴 [TOUR DIAGNOSTIC] Handler execution complete');
    }
  };
  
  // Handle tab changes with scrolling
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Scroll to the appropriate section
    switch (tab) {
      case "overview":
        overviewRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "amenities":
        amenitiesRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "pricing":
        pricingRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "staff":
        staffRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "activities":
        activitiesRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "reviews":
        reviewsRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "location":
        locationRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "contact":
        contactRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      default:
        break;
    }
  };
  
  // Toggle favorite — persists to the user's saved homes (matches /search). Anon
  // visitors can browse freely; saving prompts signup (not a login wall).
  const toggleFavorite = async () => {
    if (authStatus !== 'authenticated') {
      toast(
        (t) => (
          <span>
            Create a free account to save homes.{' '}
            <a href="/auth/register" className="font-semibold text-teal-700 underline" onClick={() => toast.dismiss(t.id)}>
              Sign up
            </a>
          </span>
        ),
        { duration: 6000 },
      );
      return;
    }
    const homeId = realHome?.id;
    if (!homeId) return;
    const next = !isFavorite;
    setIsFavorite(next); // optimistic
    try {
      await toggleFavoriteApi(homeId);
    } catch {
      setIsFavorite(!next); // revert on error
      toast.error('Could not update your saved homes. Please try again.');
    }
  };
  
  // Handle pricing estimate updates
  const handleEstimateComplete = (estimate: PricingEstimate) => {
    setPricingEstimate(estimate);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  
  
  // Toggle amenity category expansion
  const toggleAmenityCategory = (category: string) => {
    setAmenitiesExpanded(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
      </div>
    );
  }

  // Real data only — the cookie/runtime-toggled mock listing was removed (follow-up to OL-173).
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <BrowseShell title="Home Details">
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-error-200 bg-error-50 p-6">
            <h2 className="text-lg font-semibold text-error-700 mb-2">Could not load listing</h2>
            <p className="text-error-700">{loadError}</p>
          </div>
        </div>
      </BrowseShell>
    );
  }

  if (!realHome) {
    return (
      <BrowseShell title="Home Details">
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-neutral-600">No data found.</p>
          </div>
        </div>
      </BrowseShell>
    );
  }

  const addrText = typeof realHome.address === 'object' && realHome.address
    ? [realHome.address.street, realHome.address.city && `${realHome.address.city}, ${realHome.address.state}`, realHome.address.zipCode].filter(Boolean).join(', ')
    : '';
  const photos = (realHome.photos || []).map((p: any) => ({ id: p.id, url: p.url, caption: p.caption || '' }));
  // OL-173: capacity / availability / staffing / amenities only as far as an
  // operator, admin or verified call backs them (see src/lib/homes/listing-facts.ts).
  const facts = listingFacts(realHome);

  return (
    <BrowseShell title={`Home Details - ${realHome.name}`}>
      <div className="min-h-screen bg-neutral-50 pb-28">
        {/* Sticky top nav */}
        {/* Sits just below the sticky site header for anonymous visitors (--site-header-h, set by PublicShell); 0 inside the member dashboard. */}
        <div className="sticky top-[var(--site-header-h,0px)] z-30 bg-white shadow-sm" data-testid="listing-sticky-bar">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button onClick={() => router.back()} className="flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-800">
                <FiArrowLeft className="mr-1 h-4 w-4" />
                Back to Search
              </button>
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isFavorite ? 'border-primary-200 bg-primary-50 text-primary-600' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <FiHeart className={`mr-1 h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Saved' : 'Save'}
                </button>
                <button className="flex items-center rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
                  <FiShare2 className="mr-1 h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="container mx-auto px-4 pt-6">
          <PhotoGallery photos={photos} placeholderImageUrl={placeholderImageFor(realHome.id)} />
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:space-x-8">
            {/* Left column */}
            <div className="flex-1">
              {/* Unclaimed listing → claim driver (OL-083). HIPAA: count only,
                  no inquiry/health details surfaced publicly. */}
              {realHome.unclaimed && (
                realHome.pendingInquiryCount > 0 ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4">
                    <p className="text-sm font-medium text-primary-900">
                      📩 {realHome.pendingInquiryCount} {realHome.pendingInquiryCount === 1 ? 'family has' : 'families have'} inquired about this community — claim the listing to view &amp; respond securely{photos.length === 0 ? ', and add your photos' : ''}.
                    </p>
                    <a
                      href="/auth/register?role=OPERATOR"
                      className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      Claim this listing
                    </a>
                  </div>
                ) : (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-sm text-neutral-700">
                      {photos.length === 0
                        ? 'Are you the operator of this community? Claim your free listing to add your photos, showcase & respond to reviews, manage it, and respond to families.'
                        : 'Are you the operator of this community? Claim your free listing to showcase & respond to reviews, manage it, and respond to families.'}
                    </p>
                    <a
                      href="/auth/register?role=OPERATOR"
                      className="shrink-0 rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                    >
                      {photos.length === 0 ? 'Claim & add photos' : 'Claim this listing'}
                    </a>
                  </div>
                )
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-800 md:text-3xl">{realHome.name}</h1>
                    {/* OL-176: the tagline is marketing copy — only when the description is operator/admin-verified. */}
                    {facts.description.tagline && (
                      <p className="mt-1 text-sm italic text-neutral-500">{facts.description.tagline}</p>
                    )}
                    <div className="mt-1 flex items-center">
                      <FiMapPin className="mr-1 h-4 w-4 text-neutral-500" />
                      <span className="text-sm text-neutral-600">{addrText}</span>
                    </div>
                    {realHome.googleRating != null && (
                      <div className="mt-1.5">
                        <GoogleRatingBadge
                          rating={realHome.googleRating}
                          count={realHome.googleRatingCount}
                          placeId={realHome.googlePlaceId}
                        />
                      </div>
                    )}
                    {realHome.phone && (
                      <div className="mt-1 flex items-center">
                        <FiPhone className="mr-1 h-4 w-4 text-neutral-500" />
                        <a
                          href={`tel:${String(realHome.phone).replace(/[^0-9+]/g, '')}`}
                          className="text-sm text-primary-600 hover:underline"
                        >
                          {realHome.phone}
                        </a>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(realHome.careLevel || []).map((level: string) => (
                        <span key={level} className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700">
                          {CARE_LEVELS.find(l => l.id === level)?.label || level.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    {/* Medicaid Assisted Living Waiver (sprint W5-2, OL-173) — same helper +
                        wording as the directory ListingCard; nothing for NOT_ON_LIST / UNKNOWN. */}
                    {realHome.medicaidWaiver?.line && (
                      <p className="mt-3 text-sm text-neutral-700" data-testid="listing-page-waiver-line" data-waiver-status={realHome.medicaidWaiver.status}>
                        <span className="font-semibold">Medicaid Assisted Living Waiver:</span>{' '}
                        <span data-testid="medicaid-waiver-line" data-waiver-status={realHome.medicaidWaiver.status}>{realHome.medicaidWaiver.line}</span>
                        <span className="block text-xs text-neutral-500">{realHome.medicaidWaiver.note}</span>
                      </p>
                    )}
                  </div>
                  {realHome.rating != null && (
                    <div className="flex items-center rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mt-2 md:mt-0">
                      <FiStar className="fill-current text-amber-500 h-4 w-4" />
                      <span className="ml-1 font-semibold text-neutral-800">{realHome.rating.toFixed(1)}</span>
                      <span className="ml-1 text-sm text-neutral-500">({realHome.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>

                {/* Key stats — capacity only when an operator/verified source set it;
                    no staffing tile (no field backs a staffing claim). OL-173. */}
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3" data-testid="listing-key-stats">
                  {facts.capacity != null && (
                    <div className="rounded-lg border border-neutral-200 bg-white p-3" data-testid="listing-capacity-tile">
                      <div className="flex items-center text-neutral-600">
                        <FiUsers className="mr-2 h-5 w-5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-neutral-500">Capacity</p>
                          <p className="font-medium">{facts.capacity} residents</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-neutral-200 bg-white p-3" data-testid="listing-availability-tile">
                    <div className="flex items-center text-neutral-600">
                      <FiHome className="mr-2 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500">Availability</p>
                        {facts.availability.known ? (
                          <>
                            <p className="font-medium">{facts.availability.headline}</p>
                            <div className="mt-1.5">
                              <AvailabilityBadge availability={realHome.availabilityFreshness} />
                              {facts.availability.detail && (
                                <p className="mt-1 text-xs text-neutral-500">{facts.availability.detail}</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Contact to confirm</p>
                            <p className="mt-1 text-xs text-neutral-400">Availability changes often — we verify on request.</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="flex items-center text-neutral-600">
                      <FiDollarSign className="mr-2 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500">Monthly Cost</p>
                        {realHome.pricing?.hasPrice ? (
                          <>
                            {/* OL-111: honest, source-labeled — always paired with "contact for exact quote". */}
                            <p className="font-medium text-sm">{realHome.pricing.display}</p>
                            <p className="text-[11px] text-neutral-400">Contact for exact quote</p>
                            {realHome.pricing.transparent && (
                              <span className="mt-1 inline-block rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700 ring-1 ring-inset ring-success-200">Transparent Pricing</span>
                            )}
                          </>
                        ) : realHome.priceRange?.min && realHome.priceRange?.max ? (
                          <p className="font-medium text-sm">{formatCurrency(realHome.priceRange.min)}–{formatCurrency(realHome.priceRange.max)}</p>
                        ) : realHome.priceRange?.min ? (
                          <p className="font-medium">From {formatCurrency(realHome.priceRange.min)}</p>
                        ) : (
                          <p className="font-medium text-neutral-400">Contact us</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab navigation */}
              <div className="mb-6 -mx-4 overflow-x-auto border-b border-neutral-200 px-4">
                <div className="flex min-w-max space-x-6">
                  {(['overview','amenities','pricing','location','contact'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium capitalize ${
                        activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-600 hover:text-neutral-800'
                      }`}
                    >
                      {tab === 'overview' ? 'Overview' : tab === 'amenities' ? (facts.amenities.verified ? 'Amenities' : 'Features') : tab === 'pricing' ? 'Pricing' : tab === 'location' ? 'Location' : 'Contact'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overview */}
              <div ref={overviewRef} className="mb-8 scroll-mt-20">
                <h2 className="mb-4 text-xl font-semibold text-neutral-800">About {realHome.name}</h2>
                <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6" data-testid="listing-description" data-verified={facts.description.verified ? 'true' : 'false'}>
                  <p className="text-neutral-700 whitespace-pre-line leading-relaxed">
                    {facts.description.text || 'No description available for this facility.'}
                  </p>
                  {/* OL-176: imported / enriched descriptions are not the community's own confirmed words. */}
                  {facts.description.note && (
                    <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500" data-testid="description-source-note">
                      {facts.description.note}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                  <h3 className="mb-4 text-lg font-medium text-neutral-800">Quick Facts</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* OL-176: only when an operator / admin set it — an empty column says nothing about who is accepted. */}
                    {facts.gender && (
                      <div className="flex items-start" data-testid="quick-facts-gender">
                        <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600 flex-shrink-0"><FiUsers className="h-5 w-5" /></div>
                        <div>
                          <p className="font-medium text-neutral-800">Resident Gender</p>
                          <p className="text-sm text-neutral-600">{facts.gender}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start">
                      <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600 flex-shrink-0"><FiHome className="h-5 w-5" /></div>
                      <div>
                        <p className="font-medium text-neutral-800">{facts.capacity != null ? 'Facility Size' : 'Availability'}</p>
                        <p className="text-sm text-neutral-600" data-testid="quick-facts-availability">
                          {facts.capacity != null ? `${facts.capacity} beds · ` : ''}{facts.availability.line}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600 flex-shrink-0"><FiShield className="h-5 w-5" /></div>
                      <div>
                        <p className="font-medium text-neutral-800">Care Types Offered</p>
                        <p className="text-sm text-neutral-600">
                          {(realHome.careLevel || []).map((l: string) => CARE_LEVELS.find(x => x.id === l)?.label || l.replace(/_/g, ' ')).join(', ')}
                        </p>
                      </div>
                    </div>
                    {/* Medicaid pending-application acceptance (sprint W5-2). The waiver
                        status line itself sits under the header (listing-page-waiver-line). */}
                    {realHome.medicaidWaiver?.pendingLine && (
                      <div className="flex items-start md:col-span-2" data-testid="medicaid-waiver-block">
                        <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600 flex-shrink-0"><FiShield className="h-5 w-5" /></div>
                        <div>
                          <p className="font-medium text-neutral-800">Medicaid application pending</p>
                          {realHome.medicaidWaiver?.pendingLine && (
                            <p className="mt-1 text-sm text-neutral-700" data-testid="medicaid-pending-line">{realHome.medicaidWaiver.pendingLine}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div ref={amenitiesRef} className="mb-8 scroll-mt-20">
                {/* OL-173 / OL-176: unless an operator / admin / VA call set them, amenities are
                    reported features (import, enrichment, seed) — own heading, no checkmarks. */}
                <h2 className="mb-4 text-xl font-semibold text-neutral-800" data-testid="amenities-heading" data-verified={facts.amenities.verified ? 'true' : 'false'}>
                  {facts.amenities.items.length > 0 ? facts.amenities.heading : 'Amenities & Services'}
                </h2>
                {facts.amenities.items.length > 0 ? (
                  <div className="rounded-lg border border-neutral-200 bg-white p-6" data-testid="listing-amenities" data-verified={facts.amenities.verified ? 'true' : 'false'}>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {(amenitiesExpanded['all'] ? facts.amenities.items : facts.amenities.items.slice(0, 12)).map((a: string) => (
                        <div key={a} className="flex items-center">
                          {facts.amenities.verified ? (
                            <FiCheck className="mr-2 h-5 w-5 text-success-500 flex-shrink-0" />
                          ) : (
                            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-neutral-400 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-neutral-700">{a}</span>
                        </div>
                      ))}
                    </div>
                    {facts.amenities.items.length > 12 && (
                      <button
                        onClick={() => toggleAmenityCategory('all')}
                        className="mt-4 flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {amenitiesExpanded['all'] ? (
                          <><FiChevronUp className="mr-1 h-4 w-4" />Show less</>
                        ) : (
                          <><FiChevronDown className="mr-1 h-4 w-4" />Show all {facts.amenities.items.length}</>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <p className="text-neutral-600">
                      Specific amenities haven&apos;t been added to this listing yet. Communities offering{" "}
                      {careLevelPhrase(realHome.careLevel)} typically provide assistance with daily living,
                      meals, housekeeping, and social activities — though offerings vary by community.
                    </p>
                    {realHome.unclaimed && (
                      <a
                        href="/auth/register?role=OPERATOR"
                        className="mt-3 inline-flex items-center rounded-md border border-primary-600 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                      >
                        Claim this listing to add verified amenities
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div ref={pricingRef} className="mb-8 scroll-mt-20">
                <h2 className="mb-4 text-xl font-semibold text-neutral-800">Pricing & Fees</h2>
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                  {realHome.priceRange?.min || realHome.priceRange?.max ? (
                    <>
                      <div className="mb-4">
                        <p className="text-sm text-neutral-500 mb-1">Monthly rate range</p>
                        <p className="text-3xl font-bold text-primary-600">
                          {realHome.priceRange?.min && realHome.priceRange?.max
                            ? `${formatCurrency(realHome.priceRange.min)} – ${formatCurrency(realHome.priceRange.max)}`
                            : realHome.priceRange?.min
                            ? `From ${formatCurrency(realHome.priceRange.min)}`
                            : `Up to ${formatCurrency(realHome.priceRange.max)}`}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">per month</p>
                        {/* OL-176: an imported / estimated range is not a quote from the community. */}
                        {!realHome.pricePending && realHome.pricing?.source !== 'OPERATOR' && (
                          <p className="mt-2 text-xs text-neutral-500" data-testid="pricing-range-source">
                            Estimated range — confirm the current rate with the community.
                          </p>
                        )}
                        {realHome.pricePending && (
                          <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Approximate starting price · pending operator confirmation
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 mb-4">
                        Actual costs vary based on care level, room type, and additional services required. Contact the facility for a personalized quote.
                      </p>
                      <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-sm text-neutral-600">
                        {/* OL-176: not a statement about this home — a question to ask. */}
                        <p className="font-medium text-neutral-800 mb-1">Ask what the monthly rate includes. It often covers:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Room and board</li>
                          <li>Meals and snacks</li>
                          <li>Basic care services</li>
                          <li>Activities and programs</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="font-medium text-neutral-700">Pricing isn&apos;t published for this listing yet.</p>
                      <p className="mt-1 text-sm text-neutral-600">
                        Monthly costs depend on care level, room type, and the services each resident needs.
                        {realHome.unclaimed
                          ? " Operators can add current pricing by claiming this free listing."
                          : " Contact the community for a current quote."}
                      </p>
                      {realHome.unclaimed && (
                        <a
                          href="/auth/register?role=OPERATOR"
                          className="mt-3 inline-flex items-center rounded-md border border-primary-600 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                        >
                          Claim this listing to add pricing
                        </a>
                      )}
                    </div>
                  )}
                  {/* Financing CTA */}
                  <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                    <span className="text-xl">💳</span>
                    <div className="flex-1">
                      {/* OL-173: no executed CareCredit agreement and the link carries no
                          affiliate parameter — so no "partnered" / affiliate claim. */}
                      <p className="text-sm font-semibold text-neutral-800">{CARECREDIT_TITLE}</p>
                      <p className="text-xs text-neutral-600 mt-0.5" data-testid="carecredit-disclosure">{CARECREDIT_DISCLOSURE}</p>
                    </div>
                    <a
                      href={CARECREDIT_APPLY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-xs px-3 py-1.5 bg-amber-500 text-white rounded-md font-semibold hover:bg-amber-600 transition-colors"
                    >
                      Apply →
                    </a>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={onScheduleTour}
                      className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                    >
                      <FiCalendar className="mr-2 h-4 w-4" />
                      Schedule a Tour to Discuss Pricing
                    </button>
                  </div>
                </div>
              </div>

              {/* Reviews (first-party, real data) */}
              <div ref={reviewsRef} className="mb-8 scroll-mt-20">
                <HomeReviews homeId={realHome.id} homeName={realHome.name} canRespond={Boolean(realHome.viewerIsOwner)} />
              </div>

              {/* State Inspection History (OL-113) — factual ODH public-records
                  data, async-loaded so it never blocks the page. */}
              <div className="mb-8 scroll-mt-20">
                <InspectionHistory homeId={realHome.id} />
              </div>

              {/* Location */}
              <div ref={locationRef} className="mb-8 scroll-mt-20">
                <h2 className="mb-4 text-xl font-semibold text-neutral-800">Location</h2>
                <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  <div className="h-80 w-full">
                    <SimpleMap homes={[realHome]} showCount={false} />
                  </div>
                  <div className="p-6">
                    <div className="flex items-start">
                      <FiMapPinOutline className="mr-3 h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-neutral-800">Address</h3>
                        <p className="text-neutral-600">{addrText}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addrText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <FiMapPin className="mr-1.5 h-4 w-4" />
                        Get Directions
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* OL-172 (f): back to the suburb page and care-type hubs */}
              <ListingRelatedLinks listing={{ name: realHome.name, city: realHome.address?.city ?? null, state: realHome.address?.state ?? null, careLevels: realHome.careLevel ?? [] }} />

              {/* Contact */}
              <div ref={contactRef} className="mb-8 scroll-mt-20">
                <h2 className="mb-4 text-xl font-semibold text-neutral-800">Contact Information</h2>
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                  {realHome.operator ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <h3 className="mb-3 text-lg font-medium text-neutral-800">Facility Contact</h3>
                        <div className="space-y-3">
                          {realHome.operator.company && (
                            <div className="flex items-center">
                              <FiHome className="mr-3 h-5 w-5 text-neutral-500 flex-shrink-0" />
                              <span className="text-neutral-700">{realHome.operator.company}</span>
                            </div>
                          )}
                          {realHome.operator.name && (
                            <div className="flex items-center">
                              <FiUsers className="mr-3 h-5 w-5 text-neutral-500 flex-shrink-0" />
                              <span className="text-neutral-700">{realHome.operator.name}</span>
                            </div>
                          )}
                          {realHome.operator.email && (
                            <div className="flex items-center">
                              <FiMail className="mr-3 h-5 w-5 text-neutral-500 flex-shrink-0" />
                              <a href={`mailto:${realHome.operator.email}`} className="text-primary-600 hover:underline">
                                {realHome.operator.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-3 text-lg font-medium text-neutral-800">Get in Touch</h3>
                        <p className="text-sm text-neutral-600 mb-3">Reach out to schedule a tour, ask questions about care services, or get a personalized pricing quote.</p>
                        <button
                          onClick={() => setBookingStep(1)}
                          className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Send a Message
                        </button>
                      </div>
                    </div>
                  ) : (
                    // OL-176: unclaimed listings have no facility contact on file (the API no longer
                    // exposes the directory placeholder account) — route families through the inquiry.
                    <div data-testid="contact-unclaimed">
                      <p className="text-sm text-neutral-600 mb-3">
                        {realHome.unclaimed
                          ? "This community hasn't claimed its listing yet, so we don't publish a direct contact. Send a message and we'll pass it on."
                          : 'Contact information not available.'}
                      </p>
                      <button
                        onClick={() => setBookingStep(1)}
                        className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send a Message
                      </button>
                    </div>
                  )}
                  <div className="mt-6 rounded-lg bg-neutral-100 p-4">
                    <h3 className="mb-2 text-base font-medium text-neutral-800">Need Help?</h3>
                    <p className="mb-3 text-sm text-neutral-600">Our CareLinkAI care advisors can help you navigate your options and find the right home.</p>
                    <button
                      onClick={onScheduleTour}
                      className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat with a Care Advisor
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="mt-8 w-full lg:mt-0 lg:w-80">
              <div ref={bookingRef} className="sticky top-[calc(var(--site-header-h,0px)+5rem)]">
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  {bookingStep === 0 && (
                    <>
                      <h3 className="mb-3 text-lg font-semibold text-neutral-800">Interested in {realHome.name}?</h3>
                      {conciergeSearchId ? (
                        <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">
                          {conciergeTourState === 'done'
                            ? '✓ Tour requested — CareLinkAI is coordinating it on the patient’s behalf.'
                            : 'You’re acting on a patient’s behalf via CareLinkAI Concierge — request a tour and our care team coordinates it for you.'}
                        </div>
                      ) : (
                        <p className="mb-4 text-sm text-neutral-600">
                          <span data-testid="sidebar-availability">{facts.availability.line}.</span>{' '}
                          Schedule a tour or send an inquiry.
                        </p>
                      )}
                      <div className="space-y-3">
                        <button
                          onClick={onScheduleTour}
                          className="flex w-full items-center justify-center rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600"
                        >
                          <FiCalendar className="mr-2 h-5 w-5" />
                          Schedule a Tour
                        </button>
                        <button
                          onClick={() => setBookingStep(1)}
                          className="flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <MessageSquare className="mr-2 h-5 w-5" />
                          Send Inquiry
                        </button>
                      </div>
                      <div className="mt-4 text-center text-xs text-neutral-500">No obligation or fees to inquire</div>
                    </>
                  )}

                  {bookingStep === 1 && (
                    <>
                      <h3 className="mb-3 text-lg font-semibold text-neutral-800">Contact {realHome.name}</h3>
                      <p className="mb-4 text-sm text-neutral-600">Fill out this form and we&apos;ll send your message to the community.</p>
                      <form onSubmit={handleInquirySubmit}>
                        <div className="mb-3">
                          <label htmlFor="name" className="mb-1 block text-sm font-medium text-neutral-700">Your Name*</label>
                          <input type="text" id="name" name="name" value={inquiryForm.name} onChange={handleInquiryChange}
                            className={`form-input w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${formErrors['name'] ? 'border-error-400' : 'border-neutral-300'}`} />
                          {formErrors['name'] && <p className="mt-1 text-xs text-error-600">{formErrors['name']}</p>}
                        </div>
                        <div className="mb-3">
                          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">Email Address*</label>
                          <input type="email" id="email" name="email" value={inquiryForm.email} onChange={handleInquiryChange}
                            className={`form-input w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${formErrors['email'] ? 'border-error-400' : 'border-neutral-300'}`} />
                          {formErrors['email'] && <p className="mt-1 text-xs text-error-600">{formErrors['email']}</p>}
                        </div>
                        <div className="mb-3">
                          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-neutral-700">Phone (optional)</label>
                          <input type="tel" id="phone" name="phone" value={inquiryForm.phone} onChange={handleInquiryChange}
                            className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="residentName" className="mb-1 block text-sm font-medium text-neutral-700">Resident Name</label>
                          <input type="text" id="residentName" name="residentName" value={inquiryForm.residentName} onChange={handleInquiryChange}
                            className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="moveInTimeframe" className="mb-1 block text-sm font-medium text-neutral-700">Move-in Timeframe</label>
                          <select id="moveInTimeframe" name="moveInTimeframe" value={inquiryForm.moveInTimeframe} onChange={handleInquiryChange}
                            className="form-select w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                            <option value="Immediately">Immediately</option>
                            <option value="1-3 months">1-3 months</option>
                            <option value="3-6 months">3-6 months</option>
                            <option value="6+ months">6+ months</option>
                            <option value="Just researching">Just researching</option>
                          </select>
                        </div>
                        {/* Payer-source screener (OL-114) — optional, friendly, no wrong answers. Tags only. */}
                        <div className="mb-3">
                          <label htmlFor="payerSource" className="mb-1 block text-sm font-medium text-neutral-700">How will care most likely be paid for? <span className="font-normal text-neutral-400">(optional)</span></label>
                          <select id="payerSource" name="payerSource" value={inquiryForm.payerSource} onChange={handleInquiryChange}
                            className="form-select w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                            <option value="">Select if you'd like to share</option>
                            {PAYER_SOURCE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-neutral-500">There's no wrong answer — this just helps us point you to the right resources. "Not sure yet" is completely fine.</p>
                        </div>
                        <div className="mb-3">
                          <label className={`mb-1 block text-sm font-medium ${formErrors['careNeeded'] ? 'text-error-700' : 'text-neutral-700'}`}>Care Services Needed*</label>
                          <div className={`space-y-2 rounded-md p-3 ${formErrors['careNeeded'] ? 'border-2 border-error-400 bg-error-50' : 'border border-neutral-200'}`}>
                            {['Assisted Living','Memory Care','Medication Management'].map((care) => (
                              <div key={care} className="flex items-center">
                                <input type="checkbox" id={`care-${care}`} checked={inquiryForm.careNeeded.includes(care)} onChange={() => handleCareNeededChange(care)}
                                  className="form-checkbox h-4 w-4 rounded border-neutral-300 text-primary-500" />
                                <label htmlFor={`care-${care}`} className="ml-2 text-sm text-neutral-600">{care}</label>
                              </div>
                            ))}
                          </div>
                          {formErrors['careNeeded'] && (
                            <div className="mt-2 flex items-center rounded-md bg-error-100 border border-error-300 p-2">
                              <FiAlertCircle className="mr-2 h-5 w-5 text-error-600" />
                              <p className="text-sm font-medium text-error-700">{formErrors['careNeeded']}</p>
                            </div>
                          )}
                        </div>
                        <div className="mb-4">
                          <label htmlFor="message" className="mb-1 block text-sm font-medium text-neutral-700">Message</label>
                          <textarea id="message" name="message" rows={3} value={inquiryForm.message} onChange={handleInquiryChange}
                            className="form-textarea w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            placeholder="Tell us about your specific needs..." />
                        </div>
                        <LeadConsentCheckbox checked={leadConsent.given} onChange={setLeadConsent} idPrefix="inquiry-main" className="mb-4" />
                        {submitError && <div className="mb-3 rounded-md bg-error-50 border border-error-200 p-3 text-sm text-error-700">{submitError}</div>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setBookingStep(0)} className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                            Back
                          </button>
                          <button type="submit" disabled={submitting} className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60">
                            {submitting ? 'Sending...' : 'Continue →'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}

                  {bookingStep === 2 && (
                    <>
                      <h3 className="mb-3 text-lg font-semibold text-neutral-800">Schedule Your Tour</h3>
                      <form onSubmit={handleTourSchedule}>
                        <div className="mb-3">
                          <label htmlFor="tourDate" className="mb-1 block text-sm font-medium text-neutral-700">Preferred Date</label>
                          <input type="date" id="tourDate" name="tourDate" value={inquiryForm.tourDate} onChange={handleInquiryChange}
                            min={new Date().toISOString().split('T')[0]}
                            className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="tourTime" className="mb-1 block text-sm font-medium text-neutral-700">Preferred Time</label>
                          <select id="tourTime" name="tourTime" value={inquiryForm.tourTime} onChange={handleInquiryChange}
                            className="form-select w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                            <option value="">Select a time</option>
                            {['9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        {submitError && <div className="mb-3 rounded-md bg-error-50 border border-error-200 p-3 text-sm text-error-700">{submitError}</div>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setBookingStep(1)} className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                            Back
                          </button>
                          <button type="submit" disabled={submitting} className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60">
                            {submitting ? 'Submitting...' : 'Submit Request'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}

                  {bookingStep === 3 && (
                    <div className="text-center py-4">
                      <div className="mb-3 flex justify-center">
                        <div className="rounded-full bg-success-100 p-4"><FiCheck className="h-8 w-8 text-success-600" /></div>
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-neutral-800">Request Submitted!</h3>
                      {realHome.unclaimed ? (
                        <>
                          <p className="mb-3 text-sm text-neutral-600">
                            We&apos;ve sent your inquiry to {realHome.name} and let them know a family is waiting. Some communities haven&apos;t set up their CareLinkAI page yet, so a direct reply can take a little longer — we&apos;ll route their response to you as soon as it comes in.
                          </p>
                          <a
                            href={`/search?location=${encodeURIComponent(realHome.address?.city || '')}${realHome.careLevel?.[0] ? `&careLevel=${encodeURIComponent(realHome.careLevel[0])}` : ''}`}
                            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                          >
                            Browse similar communities ready to respond
                          </a>
                        </>
                      ) : (
                        <p className="mb-4 text-sm text-neutral-600">We&apos;ve received your inquiry and sent it to {realHome.name}. The community will reply by email or phone.</p>
                      )}
                      <div className="mt-3">
                        <button onClick={() => setBookingStep(0)} className="text-sm text-primary-600 hover:underline">Submit another inquiry</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowseShell>
  );
}