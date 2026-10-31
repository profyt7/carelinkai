"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiCalendar, 
  FiHome, 
  FiUsers, 
  FiCheck, 
  FiX, 
  FiHeart,
  FiShare2,
  FiClock,
  FiInfo,
  FiVideo,
  FiThumbsUp,
  FiThumbsDown,
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
  FiChevronRight,
  FiAlertCircle
} from "react-icons/fi";
import { Camera, MessageSquare } from "lucide-react";

import BrowseShell from "@/components/layout/BrowseShell";
import TourRequestModal from "@/components/tours/TourRequestModal";
// Import our new components
import PhotoGallery from "@/components/homes/PhotoGallery";
import GoogleRatingBadge from "@/components/homes/GoogleRatingBadge";
import FeaturedBadge from "@/components/homes/FeaturedBadge";
import AvailabilityBadge, { UNVERIFIED_AVAILABILITY } from "@/components/availability/AvailabilityBadge";
import HomeImagePlaceholder from "@/components/homes/HomeImagePlaceholder";
import PriceLine from "@/components/ui/PriceLine";
import { setBottomStackHeight } from "@/hooks/useBottomStackOffset";
import { listingBreadcrumb } from "@/lib/seo/listing-meta";
import { track } from "@/lib/analytics/events";
import HomeReviews from "@/components/homes/HomeReviews";
import InspectionHistory from "@/components/homes/InspectionHistory";
import ListingRelatedLinks from "@/components/directory/ListingRelatedLinks";
import { CARECREDIT_APPLY_URL, CARECREDIT_DISCLOSURE, CARECREDIT_TITLE } from "@/lib/financing/carecredit";
import LeadConsentCheckbox, { emptyLeadConsent } from "@/components/consent/LeadConsentCheckbox";
import type { LeadConsentPayload } from "@/lib/consent/lead-consent-text";
import SmsConsentCheckbox, { emptySmsConsent } from "@/components/consent/SmsConsentCheckbox";
import type { SmsConsentPayload } from "@/lib/consent/sms-consent";
import { PAYER_SOURCE_OPTIONS } from "@/lib/payer/payer-source";
import PricingCalculator from "@/components/homes/PricingCalculator";
import type { PricingEstimate } from "@/components/homes/PricingCalculator";
import { getCloudinaryAvatar, isCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { buildInquiryPayload } from "@/lib/inquiries/payload";
import { useSession } from "next-auth/react";
import ListingClaim, { ClaimListingButton } from "@/components/homes/ListingClaim";
import toast from "react-hot-toast";
import { toggleFavorite as toggleFavoriteApi } from "@/lib/favoritesService";
import { listingFacts } from "@/lib/homes/listing-facts";
import { ADVISOR_FOLLOW_UP_TEXT } from "@/lib/leads/advisor-copy";

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


// OL-217: profile sections, in page order — the sticky bar's section nav links to these.
const SECTIONS = [
  { id: "listing-about", label: "About" },
  { id: "listing-amenities", label: "Amenities" },
  { id: "listing-pricing", label: "Pricing" },
  { id: "listing-location", label: "Location" },
  { id: "listing-reviews", label: "Reviews" },
  { id: "listing-inspections", label: "Inspections" },
];
const CARD = "rounded-xl border border-line bg-surface-raised p-6";
const H2 = "mb-4 text-xl font-semibold text-neutral-900";
const SECTION = "scroll-mt-[calc(var(--site-header-h,0px)+4.5rem)]";
const TILE = "rounded-xl border border-line bg-surface-raised p-4";
const TILE_LABEL = "text-xs font-medium uppercase tracking-wide text-neutral-600";
const BTN_PRIMARY = "inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";
const BTN_SECONDARY = "inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";

/** "2026-03-04" → "Mar 4, 2026" (a calendar date — no timezone shift). */
function surveyDateLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? ymd : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
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
  const { status: authStatus, data: sessionData } = useSession();
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
  // OL-184: SMS opt-in for the phone field — UNCHECKED by default, optional.
  const [smsConsent, setSmsConsent] = useState<SmsConsentPayload>(emptySmsConsent());
  
  // State for booking step
  const [bookingStep, setBookingStep] = useState(0); // 0: not started, 1: inquiry form, 2: tour scheduling, 3: submitted
  
  // State for tour modal
  const [showTourModal, setShowTourModal] = useState(false);
  
  // State for collapsible amenities
  const [amenitiesExpanded, setAmenitiesExpanded] = useState<Record<string, boolean>>({});
  
  // The one inquiry panel (right rail ≥ lg, inline at the top of the content < lg).
  const bookingRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  // Signed-in visitors get the app shell once the session resolves, which remounts the page subtree;
  // track the panel / bar elements as state so the observers below re-attach to the live nodes.
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const [ctaEl, setCtaEl] = useState<HTMLDivElement | null>(null);
  const panelRefCb = useCallback((el: HTMLDivElement | null) => { bookingRef.current = el; setPanelEl(el); }, []);
  const role = (sessionData?.user as { role?: string } | undefined)?.role;
  const isStaff = role === "OPERATOR" || role === "STAFF" || role === "ADMIN";
  const signedIn = authStatus === "authenticated";

  // OL-217: latest ODH survey for the key-stat tile — the same public endpoint InspectionHistory reads.
  // No records → no tile (never a "0 inspections" claim).
  const [inspection, setInspection] = useState<{ date: string; type: string | null; citations: number; license: string | null } | null>(null);
  const [inspectionChecked, setInspectionChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/homes/${id}/inspections`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const rec = j?.data?.records?.[0];
        if (!cancelled && rec?.surveyDate) {
          setInspection({ date: rec.surveyDate, type: rec.surveyType ?? null, citations: Number(rec.citationCount) || 0, license: j.data.odhLicenseNumber ?? null });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setInspectionChecked(true); });
    return () => { cancelled = true; };
  }, [id]);

  // OL-226 profile_viewed: once per listing, after the listing and its inspection lookup have loaded.
  const profileTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!realHome?.id || !inspectionChecked || profileTrackedRef.current === realHome.id) return;
    profileTrackedRef.current = realHome.id;
    track('profile_viewed', {
      listing_id: realHome.id,
      availability_state: realHome.availabilityFreshness?.fresh ? 'verified' : 'unverified',
      has_photo: (realHome.photos || []).length > 0,
      has_price: Boolean(realHome.pricing?.hasPrice),
      claimed: !realHome.unclaimed,
      has_inspection: Boolean(inspection),
    });
  }, [realHome, inspectionChecked, inspection]);

  // < lg the panel sits inline. Whenever its availability + price aren't on screen (not reached yet, or scrolled
  // past), a sticky bottom bar carries them with the same two actions, so a phone sees both on the first screen.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [panelInView, setPanelInView] = useState(true);
  useEffect(() => {
    if (!compact || !panelEl) { setPanelInView(true); return; }
    // "In view" = the panel's facts block (availability + price) sits wholly inside the visible area, below the
    // sticky header. Without that block (inquiry form open, Concierge) it falls back to "panel not scrolled past".
    // A scroll check, not an IntersectionObserver: a jump from below the fold to past it (End key, anchor link,
    // reduced motion) never crosses an intersection threshold, so an observer would not fire.
    const scroller = panelEl.closest("main");
    let raf = 0;
    const check = () => {
      raf = 0;
      const inMain = Boolean(scroller && scroller.scrollHeight > scroller.clientHeight);
      const header = document.querySelector<HTMLElement>('[data-testid="site-header"]');
      const top = inMain ? Math.max(0, scroller!.getBoundingClientRect().top) : header && getComputedStyle(header).position === "sticky" ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      const bottom = inMain ? scroller!.getBoundingClientRect().bottom : window.innerHeight;
      const facts = panelEl.querySelector<HTMLElement>("[data-panel-facts]");
      if (facts) {
        const r = facts.getBoundingClientRect();
        setPanelInView(r.top >= top - 1 && r.bottom <= bottom + 1);
      } else {
        setPanelInView(panelEl.getBoundingClientRect().bottom > top);
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [compact, panelEl]);
  const showCta = compact && !panelInView;
  // Signed in, the page scrolls inside the shell's <main>, which ends above the tab bar and pads its bottom; a
  // sticky bar would stop inside that padding and float above a strip of content. So the bar is fixed on top of
  // whatever sits below the scroller (the tab bar), with an in-flow spacer for any height the padding doesn't cover.
  const [dock, setDock] = useState<{ bottom: number; spacer: number } | null>(null);
  useEffect(() => {
    const main = ctaEl?.closest("main");
    if (!signedIn || !compact || !ctaEl || !main) { setDock(null); return; }
    // Read after the shell's own effects (it sets its mobile padding on mount/resize).
    const read = () => setDock({
      bottom: Math.max(0, Math.round(window.innerHeight - main.getBoundingClientRect().bottom)),
      spacer: Math.max(0, Math.ceil(ctaEl.offsetHeight - (parseFloat(getComputedStyle(main).paddingBottom) || 0))),
    });
    let raf = requestAnimationFrame(read);
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(read); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [ctaEl, signedIn, compact]);
  // OL-208 + end-of-listing clearance, both from the floating widgets' measured boxes ([data-floating-widget]).
  // `reach` = how far the widgets extend above the bottom stack; the largest settled value is kept so the
  // clearance doesn't jump when a widget hides. A docked bar lifts the widgets by its height. A guest's sticky
  // bar rides away with the listing: the widgets ride on its top edge, then drop back to their normal offset once
  // the bar is clear of their zone — so they never sit on the bar's buttons.
  const reachRef = useRef(0);
  const [clearance, setClearance] = useState(0);
  const [panelOnScreen, setPanelOnScreen] = useState(false);
  useEffect(() => {
    if (!compact || !ctaEl) { setBottomStackHeight("listing-cta-bar", 0); setClearance(0); setPanelOnScreen(false); return; }
    let raf = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const check = () => {
      raf = 0;
      const vh = window.innerHeight;
      const lift = parseFloat(getComputedStyle(document.body).getPropertyValue("--bottom-stack-offset")) || 0;
      document.querySelectorAll<HTMLElement>("[data-floating-widget]").forEach((w) => {
        const r = w.getBoundingClientRect();
        // Skip a widget mid-transition (its box is between two offsets) or not rendered.
        if (r.height && !w.getAnimations?.().length) reachRef.current = Math.max(reachRef.current, Math.ceil(vh - lift - r.top));
      });
      const reach = reachRef.current;
      // The widgets mount on their own schedule (root layout); re-measure briefly until they're there.
      if (!reach && tries++ < 20) retry = setTimeout(schedule, 500);
      setClearance(reach ? reach + 8 : 0);
      const bar = ctaEl.getBoundingClientRect();
      const share = !showCta ? 0 : signedIn ? ctaEl.offsetHeight : bar.top < vh && bar.bottom >= vh - reach ? vh - bar.top : 0;
      setBottomStackHeight("listing-cta-bar", Math.max(0, Math.round(share)));
      if (panelEl) { const p = panelEl.getBoundingClientRect(); setPanelOnScreen(p.bottom > 0 && p.top < vh); }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    // The bar slides in (200 ms): measured mid-slide it reads as off-screen, so measure again once it settles
    // (it can now appear on the first screen, with no scroll to trigger a re-check).
    ctaEl.addEventListener("transitionend", schedule);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(retry);
      ctaEl.removeEventListener("transitionend", schedule);
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      setBottomStackHeight("listing-cta-bar", 0);
    };
  }, [compact, ctaEl, panelEl, showCta, signedIn]);
  // While the inquiry form or its confirmation is on screen on a phone, the widgets step aside (globals.css).
  const formOpen = compact && bookingStep > 0 && panelOnScreen;
  useEffect(() => {
    document.body.toggleAttribute("data-listing-form-open", formOpen);
    return () => document.body.removeAttribute("data-listing-form-open");
  }, [formOpen]);

  // Section nav: mark the section in the reading band as current (aria-current="location").
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  useEffect(() => {
    if (!panelEl || typeof IntersectionObserver === "undefined") return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveSection(top.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [panelEl]);
  
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
  // OL-230: no logging here — this handler holds the visitor's name, email, phone and care needs.
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!inquiryForm.name.trim()) errs["name"] = "Name is required";
    if (!inquiryForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiryForm.email)) {
      errs["email"] = "Valid email is required";
    }
    if (!Array.isArray(inquiryForm.careNeeded) || inquiryForm.careNeeded.length === 0) {
      errs["careNeeded"] = "Please select at least one care service";
    }
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBookingStep(2);
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
      track('tour_requested', { listing_id: String(id), entry: inquiryEntryRef.current });
      toast.success('Tour requested — CareLinkAI is coordinating.');
    } catch (e: any) {
      setConciergeTourState('idle');
      toast.error(e?.message || 'Could not request the tour');
    }
  };
  // OL-179: a signed-in family books through the tour modal (/api/family/tours/request,
  // which needs a FAMILY session); everyone else gets the listing form, whose step 2
  // asks for the tour date/time (/api/inquiries with tourDate). Both reach the admin
  // inbound queue when the home is unclaimed. (The modal used to render only in the
  // removed mock branch, so this button did nothing on real listings.)
  // OL-226: which control opened the inquiry/tour flow — the right rail (≥ lg), the inline panel
  // (< lg) or the bottom CTA bar. Carried on inquiry_started / inquiry_submitted / tour_requested.
  const inquiryEntryRef = useRef<'rail' | 'inline' | 'cta_bar'>('rail');
  const noteEntry = (from: 'panel' | 'cta_bar') => {
    inquiryEntryRef.current = from === 'cta_bar' ? 'cta_bar' : compact ? 'inline' : 'rail';
  };
  // inquiry_started = the form's first step is shown (not on later re-opens of an open form).
  const trackInquiryStarted = () => {
    if (bookingStep === 0 && realHome?.id) track('inquiry_started', { listing_id: realHome.id, entry: inquiryEntryRef.current });
  };
  const onScheduleTour = (from: 'panel' | 'cta_bar' = 'panel') => {
    noteEntry(from);
    if (conciergeSearchId) { void handleConciergeTour(); return; }
    if ((sessionData?.user as { role?: string } | undefined)?.role === 'FAMILY') {
      setShowTourModal(true);
      return;
    }
    trackInquiryStarted();
    setBookingStep(1);
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // "Send Inquiry" from the panel or the < lg bottom bar: open step 1 of the one form and move focus into it.
  const openInquiry = (from: 'panel' | 'cta_bar' = 'panel') => {
    noteEntry(from);
    trackInquiryStarted();
    setBookingStep(1);
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('name')?.focus({ preventScroll: true }), 50);
  };
  // "All photos" on the second gallery tile opens PhotoGallery's own lightbox (its View All control).
  const openAllPhotos = () => {
    const btn = Array.from(galleryRef.current?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes('View All'));
    btn?.click();
  };

  // OL-230: no logging here either — the payload carries every inquiry field.
  const handleTourSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Compose ISO tour date-time if both provided
    let tourDateIso: string | undefined = undefined;
    if (inquiryForm.tourDate && inquiryForm.tourTime) {
      try {
        const [hmm = '0:00', ampm = 'AM'] = inquiryForm.tourTime.split(" ");
        const [hh = '0', mm = '0'] = hmm.split(":");
        const hours = parseInt(hh, 10) % 12 + (ampm?.toUpperCase() === "PM" ? 12 : 0);
        const dt = new Date(inquiryForm.tourDate);
        dt.setHours(hours, parseInt(mm || "0", 10), 0, 0);
        tourDateIso = dt.toISOString();
      } catch {
        // Unparseable date/time: send the inquiry without a tour date.
      }
    }

    // Map the form fields onto the /api/inquiries contract (the canonical
    // Zod schema). The form historically posted name/email/phone/residentName/
    // careNeeded/source:'home_detail', none of which match the API, so every
    // submission failed Zod validation with 400. moveInTimeframe has no column
    // on Inquiry, so fold it into additionalInfo rather than drop it.
    const payload = {
      ...buildInquiryPayload(String(id), inquiryForm, tourDateIso, leadConsent),
      smsConsent,
      // Concierge-aware: loops in the care team + marks the DP's shortlist so a
      // generic-page inquiry from a concierge shortlist never black-holes either.
      ...(conciergeSearchId ? { conciergeSearchId } : {}),
    };

    try {
      setSubmitting(true);
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Drain the body (never logged): an unread response never finishes loading in the browser.
      await res.json().catch(() => null);
      if (!res.ok) {
        setSubmitError(res.status === 400 ? 'Please check your details and try again.' : 'Something went wrong. Please try again later.');
        return;
      }
      // Success → show confirmation
      setBookingStep(3);
      // OL-226: only after a 2xx — the confirmation is now showing.
      track('inquiry_submitted', { listing_id: String(id), entry: inquiryEntryRef.current });
      if (tourDateIso) track('tour_requested', { listing_id: String(id), entry: inquiryEntryRef.current });
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
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
  const availability = realHome.availabilityFreshness ?? UNVERIFIED_AVAILABILITY;
  const crumbs = listingBreadcrumb({ id: realHome.id, name: realHome.name, city: realHome.address?.city ?? null, state: realHome.address?.state ?? null, careLevels: realHome.careLevel ?? [] });
  const careLabels = (realHome.careLevel || []).map((l: string) => CARE_LEVELS.find((x) => x.id === l)?.label || l.replace(/_/g, ' '));
  const hasPrice = Boolean(realHome.pricing?.hasPrice);

  // ONE inquiry panel: right rail ≥ lg, inline at the top of the content < lg — a single instance either way.
  const inquiryPanel = (
    <div ref={panelRefCb} role="region" aria-label={`Contact ${realHome.name}`} data-testid="listing-inquiry-panel" className="scroll-mt-[calc(var(--site-header-h,0px)+1rem)] rounded-xl border border-line bg-surface-raised p-5 shadow-card">
                  {bookingStep === 0 && (
                    <>
                      <h2 className="text-lg font-semibold text-neutral-900">Interested in {realHome.name}?</h2>
                      {conciergeSearchId ? (
                        <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">
                          {conciergeTourState === 'done'
                            ? '✓ Tour requested — CareLinkAI is coordinating it on the patient’s behalf.'
                            : 'You’re acting on a patient’s behalf via CareLinkAI Concierge — request a tour and our care team coordinates it for you.'}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2" data-panel-facts>
                          {/* The badge is the visual; screen readers get the same fact once, as text. */}
                          <p className="sr-only" data-testid="sidebar-availability">{facts.availability.line}.</p>
                          <div aria-hidden="true"><AvailabilityBadge availability={availability} /></div>
                          {/* Pre-launch: the availability / pricing tiles were removed as repeats of this panel; their extra lines live here now. */}
                          <p className="text-xs text-neutral-600" data-testid="panel-availability-detail">
                            {facts.availability.known ? facts.availability.detail : 'Availability changes often — we verify on request.'}
                          </p>
                          <PriceLine pricing={realHome.pricing} />
                          {realHome.pricing?.transparent && (
                            <span className="inline-block rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700 ring-1 ring-inset ring-success-200">Transparent Pricing</span>
                          )}
                        </div>
                      )}
                      <div className="mt-4 space-y-2">
                        <button type="button" onClick={() => onScheduleTour('panel')} className={`${BTN_PRIMARY} w-full`}>
                          <FiCalendar className="mr-2 h-4 w-4" aria-hidden="true" />
                          Schedule a Tour
                        </button>
                        <button type="button" onClick={() => openInquiry('panel')} className={`${BTN_SECONDARY} w-full`}>
                          <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                          Send Inquiry
                        </button>
                      </div>
                      <p className="mt-3 text-center text-xs text-neutral-600">No obligation or fees to inquire</p>
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
                          <SmsConsentCheckbox checked={smsConsent.given} onChange={setSmsConsent} idPrefix="inquiry-main" className="mt-2" />
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
                          {/* OL-177: unclaimed → the inquiry goes to CareLinkAI's inbound queue, not the home. No time promise. */}
                          <p className="mb-3 text-sm text-neutral-600" data-testid="inquiry-confirmation-unclaimed">
                            We&apos;ve received your message about {realHome.name}. {ADVISOR_FOLLOW_UP_TEXT}
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
  );

  return (
    <BrowseShell title={`Home Details - ${realHome.name}`}>
      <div className="min-h-screen bg-surface-ivory">
        {/* Header: breadcrumb, gallery, name, location, Google rating, key-stat tiles (OL-217 §1–§2) */}
        <div className="bg-gradient-to-b from-surface-ivory-deep to-surface-ivory">
          <div className="container mx-auto px-4 pb-6 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Breadcrumb" className="min-w-0">
                <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-600">
                  {crumbs.map((c, i) => (
                    <li key={c.path} className="flex items-center gap-1">
                      {i < crumbs.length - 1 ? (
                        <>
                          <Link href={c.path} className="rounded-sm hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{c.name}</Link>
                          <FiChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                        </>
                      ) : (
                        <span aria-current="page" className="text-neutral-800">{c.name}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-pressed={isFavorite}
                  className={`flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isFavorite ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <FiHeart className={`mr-1 h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                  {isFavorite ? 'Saved' : 'Save'}
                </button>
                <button type="button" className="flex items-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                  <FiShare2 className="mr-1 h-4 w-4" aria-hidden="true" />
                  Share
                </button>
              </div>
            </div>

            {/* Gallery: PhotoGallery as the hero; ≥ md a second photo + "All photos" beside it. No real photos → the placeholder tile. */}
            {/* OL-227: explicit minmax(0, 1fr) columns + min-w-0 children — with implicit columns the track grew to the
                thumbnail strip's content width (8 photos ≈ 824px) and the whole page overflowed on phones. */}
            {photos.length === 0 ? (
              <div className="mt-4 aspect-[4/3] w-full md:aspect-auto md:h-80" data-testid="photo-gallery-hero">
                <HomeImagePlaceholder className="h-full w-full rounded-xl" label="Photos coming soon" subtitle="No photos yet" />
              </div>
            ) : (
              <div ref={galleryRef} className={`mt-4 grid min-w-0 grid-cols-1 gap-2 ${photos.length > 1 ? 'md:grid-cols-3' : ''}`}>
                <div className={`min-w-0 ${photos.length > 1 ? 'md:col-span-2' : ''}`}>
                  <PhotoGallery photos={photos} />
                </div>
                {photos.length > 1 && (
                  <div className="relative hidden min-w-0 self-start overflow-hidden rounded-lg md:block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- second tile only; PhotoGallery owns the optimised hero */}
                    <img src={photos[1].url} alt={`${realHome.name}, photo 2 of ${photos.length}`} className="h-96 w-full object-cover" />
                    <button type="button" onClick={openAllPhotos} className={`${BTN_SECONDARY} absolute bottom-3 right-3 py-1.5`}>
                      <FiGrid className="mr-1.5 h-4 w-4" aria-hidden="true" /> All photos
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <h1 className="font-serif text-3xl text-neutral-900 md:text-4xl">{realHome.name}</h1>
              {realHome.featured && (
                <div className="mt-2">
                  <FeaturedBadge />
                </div>
              )}
              {/* OL-176: the tagline is marketing copy — only when the description is operator/admin-verified. */}
              {facts.description.tagline && (
                <p className="mt-1 text-sm italic text-neutral-600">{facts.description.tagline}</p>
              )}
              <p className="mt-1 flex items-center gap-1 text-sm text-neutral-700">
                <FiMapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {addrText}
              </p>
              {realHome.googleRating != null && (
                <div className="mt-3">
                  <GoogleRatingBadge rating={realHome.googleRating} count={realHome.googleRatingCount} placeId={realHome.googlePlaceId} />
                </div>
              )}
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

            {/* Key stats — care types, plus the state inspection when one is on file (never a "0 inspections").
                Availability and price are not repeated here: they sit in the inquiry panel next to / right below. */}
            <dl data-testid="listing-key-stats" className={`mt-5 grid grid-cols-1 gap-3 ${inspection ? 'sm:grid-cols-2' : ''}`}>
              <div className={TILE} data-testid="listing-care-tile">
                <dt className={TILE_LABEL}>Care types</dt>
                <dd className="mt-2">
                  <ul className="flex flex-wrap gap-1.5" aria-label="Care types">
                    {careLabels.map((c: string) => (
                      <li key={c} className="rounded-lg bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">{c}</li>
                    ))}
                  </ul>
                  {/* Capacity only when an operator / verified source set it (OL-173). */}
                  {facts.capacity != null && (
                    <p className="mt-2 text-xs text-neutral-700" data-testid="listing-capacity-tile">{facts.capacity} residents</p>
                  )}
                </dd>
              </div>
              {inspection && (
                <div className={TILE} data-testid="listing-inspection-tile">
                  <dt className={TILE_LABEL}>State inspection</dt>
                  <dd className="mt-2">
                    <p className="text-sm font-semibold text-neutral-900">{surveyDateLabel(inspection.date)}{inspection.type ? ` · ${inspection.type}` : ''}</p>
                    <p className="text-sm text-neutral-700">{inspection.citations > 0 ? `${inspection.citations} citation${inspection.citations === 1 ? '' : 's'}` : 'No citations on this survey'}</p>
                    {inspection.license && <p className="mt-1 text-xs text-neutral-600">ODH license {inspection.license}</p>}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Section nav in the listing bar (§3). Sticky only ≥ lg: below lg the site header and the CTA bar are the two sticky regions. */}
        <div className="static lg:sticky top-[var(--site-header-h,0px)] z-30 border-y border-line bg-surface-raised" data-testid="listing-sticky-bar">
          <nav aria-label="Listing sections" className="container relative mx-auto px-4">
            <ul className="-mx-1 flex gap-1 overflow-x-auto pr-8 [scrollbar-width:none] md:pr-0 [&::-webkit-scrollbar]:hidden">
              {SECTIONS.map((sec) => {
                const current = activeSection === sec.id;
                return (
                  <li key={sec.id} className="flex-shrink-0">
                    <a
                      href={`#${sec.id}`}
                      aria-current={current ? 'location' : undefined}
                      className={`block border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                        current ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-700 hover:border-neutral-300 hover:text-neutral-900'
                      }`}
                    >
                      {sec.label}
                    </a>
                  </li>
                );
              })}
            </ul>
            {/* More tabs offscreen < md */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 w-10 bg-gradient-to-l from-surface-raised to-transparent md:hidden" />
          </nav>
        </div>

        {/* Content + the one inquiry panel (§4–§5) */}
        <div className="container mx-auto px-4 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
          <aside className="mb-6 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:sticky top-[calc(var(--site-header-h,0px)+5rem)]">
            {inquiryPanel}
          </aside>

          <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
            {/* Operators / staff keep the full claim driver (OL-083). Families and guests get the footer line. */}
            {isStaff && (
              <div>
              {realHome.unclaimed && realHome.claimState === 'pending' && (
                <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4" data-testid="listing-claim-pending-staff">
                  <p className="text-sm text-neutral-700">A claim for this listing is under review.</p>
                </div>
              )}
              {realHome.unclaimed && realHome.claimState !== 'pending' && (
                realHome.pendingInquiryCount > 0 ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4">
                    <p className="text-sm font-medium text-primary-900">
                      📩 {realHome.pendingInquiryCount} {realHome.pendingInquiryCount === 1 ? 'family has' : 'families have'} inquired about this community — claim the listing to view &amp; respond securely{photos.length === 0 ? ', and add your photos' : ''}.
                    </p>
                    <ClaimListingButton homeId={realHome.id} role={role} className="shrink-0" />
                  </div>
                ) : (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-sm text-neutral-700">
                      {photos.length === 0
                        ? 'Are you the operator of this community? Claim your free listing to add your photos, showcase & respond to reviews, manage it, and respond to families.'
                        : 'Are you the operator of this community? Claim your free listing to showcase & respond to reviews, manage it, and respond to families.'}
                    </p>
                    <ClaimListingButton homeId={realHome.id} role={role} className="shrink-0" label={photos.length === 0 ? 'Claim & add photos' : 'Claim this listing'} />
                  </div>
                )
              )}

              </div>
            )}

            <section id="listing-about" aria-labelledby="listing-about-h" className={SECTION}>
              <h2 id="listing-about-h" className={H2}>About {realHome.name}</h2>
                <div className="rounded-xl border border-line bg-surface-raised p-6" data-testid="listing-description" data-verified={facts.description.verified ? 'true' : 'false'}>
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
              {(facts.capacity != null || facts.gender || realHome.medicaidWaiver?.pendingLine) && (
              <dl className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface-raised p-6 md:grid-cols-2">
                {/* Availability is in the inquiry panel; only the size stays here, when an operator set it. */}
                {facts.capacity != null && (
                  <div>
                    <dt className="text-sm font-medium text-neutral-900">Facility size</dt>
                    <dd className="text-sm text-neutral-700" data-testid="quick-facts-capacity">{facts.capacity} beds</dd>
                  </div>
                )}
                {/* OL-176: only when an operator / admin set it — an empty column says nothing about who is accepted. */}
                {facts.gender && (
                  <div data-testid="quick-facts-gender">
                    <dt className="text-sm font-medium text-neutral-900">Resident gender</dt>
                    <dd className="text-sm text-neutral-700">{facts.gender}</dd>
                  </div>
                )}
                {/* Medicaid pending-application acceptance (sprint W5-2). */}
                {realHome.medicaidWaiver?.pendingLine && (
                  <div className="md:col-span-2" data-testid="medicaid-waiver-block">
                    <dt className="text-sm font-medium text-neutral-900">Medicaid application pending</dt>
                    <dd className="mt-1 text-sm text-neutral-700" data-testid="medicaid-pending-line">{realHome.medicaidWaiver.pendingLine}</dd>
                  </div>
                )}
              </dl>
              )}
            </section>

            <section id="listing-amenities" aria-labelledby="listing-amenities-h" className={SECTION}>
              {/* OL-173 / OL-176: unless an operator / admin / VA call set them, amenities are
                  reported features (import, enrichment, seed) — own heading, no checkmarks. */}
                <h2 className={H2} id="listing-amenities-h" data-testid="amenities-heading" data-verified={facts.amenities.verified ? 'true' : 'false'}>
                  {facts.amenities.items.length > 0 ? facts.amenities.heading : 'Amenities & Services'}
                </h2>
                {facts.amenities.items.length > 0 && !facts.amenities.verified && (
                  <p className="-mt-3 mb-3 text-xs text-neutral-600">As reported by the community.</p>
                )}
                {facts.amenities.items.length > 0 ? (
                  <div className="rounded-xl border border-line bg-surface-raised p-6" data-testid="listing-amenities" data-verified={facts.amenities.verified ? 'true' : 'false'}>
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
                  <div className="rounded-xl border border-line bg-surface-raised p-6">
                    <p className="text-neutral-600">
                      Specific amenities haven&apos;t been added to this listing yet. Communities offering{" "}
                      {careLevelPhrase(realHome.careLevel)} typically provide assistance with daily living,
                      meals, housekeeping, and social activities — though offerings vary by community.
                    </p>
                    {realHome.unclaimed && isStaff && realHome.claimState !== 'pending' && (
                      <a
                        href={`/homes/${realHome.id}/claim`}
                        className="mt-3 inline-flex items-center rounded-md border border-primary-600 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                      >
                        Claim this listing to add verified amenities
                      </a>
                    )}
                  </div>
                )}
            </section>

            <section id="listing-pricing" aria-labelledby="listing-pricing-h" className={SECTION}>
              <h2 id="listing-pricing-h" className={H2}>Pricing</h2>
              <div className={CARD}>
                {hasPrice ? (
                  <>
                    <PriceLine pricing={realHome.pricing} className="text-base" />
                    {/* OL-176: an imported / estimated figure is not a quote from the community. */}
                    {!realHome.pricePending && realHome.pricing?.source !== 'OPERATOR' && (
                      <p className="mt-2 text-xs text-neutral-600" data-testid="pricing-range-source">
                        Estimated range — confirm the current rate with the community.
                      </p>
                    )}
                    {realHome.pricePending && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                        Approximate starting price · pending operator confirmation
                      </p>
                    )}
                    <p className="mb-4 mt-3 text-sm text-neutral-700">
                      Actual costs vary based on care level, room type, and additional services required. Contact the facility for a personalized quote.
                    </p>
                    <div className="rounded-lg border border-line bg-neutral-50 p-4 text-sm text-neutral-700">
                      {/* OL-176: not a statement about this home — a question to ask. */}
                      <p className="mb-1 font-medium text-neutral-900">Ask what the monthly rate includes. It often covers:</p>
                      <ul className="list-inside list-disc space-y-1">
                        <li>Room and board</li>
                        <li>Meals and snacks</li>
                        <li>Basic care services</li>
                        <li>Activities and programs</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="font-medium text-neutral-800">Pricing isn&apos;t published for this listing yet.</p>
                    <p className="mt-1 text-sm text-neutral-700">
                      Monthly costs depend on care level, room type, and the services each resident needs.
                      {realHome.unclaimed
                        ? " Operators can add current pricing by claiming this free listing."
                        : " Contact the community for a current quote."}
                    </p>
                    {realHome.unclaimed && isStaff && realHome.claimState !== 'pending' && (
                      <a
                        href={`/homes/${realHome.id}/claim`}
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
                      className="flex-shrink-0 text-xs px-3 py-1.5 bg-amber-700 text-white rounded-md font-semibold hover:bg-amber-800 transition-colors"
                    >
                      Apply →
                    </a>
                  </div>
              </div>
            </section>

            <section id="listing-location" aria-labelledby="listing-location-h" className={SECTION}>
              <h2 id="listing-location-h" className={H2}>Location</h2>
                <div className="overflow-hidden rounded-xl border border-line bg-surface-raised">
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
            </section>

            {/* Reviews (first-party, real data) — HomeReviews renders its own heading. */}
            <section id="listing-reviews" className={SECTION}>
              <HomeReviews homeId={realHome.id} homeName={realHome.name} canRespond={Boolean(realHome.viewerIsOwner)} />
            </section>

            {/* State Inspection History (OL-113) — factual ODH public-records data, async-loaded. */}
            <section id="listing-inspections" className={SECTION}>
              <InspectionHistory homeId={realHome.id} />
            </section>

            {/* OL-172 (f): back to the suburb page and care-type hubs */}
            <ListingRelatedLinks listing={{ name: realHome.name, city: realHome.address?.city ?? null, state: realHome.address?.state ?? null, careLevels: realHome.careLevel ?? [] }} />

            {/* Contact details as information only — the inquiry panel is the one way to reach the community. */}
            <section aria-labelledby="listing-contact-h">
              <h2 id="listing-contact-h" className={H2}>Contact Information</h2>
              <div className={CARD}>
                {realHome.operator ? (
                  <div>
                    <h3 className="mb-3 text-lg font-medium text-neutral-900">Facility Contact</h3>
                        <div className="space-y-3">
                          {realHome.phone && (
                            <div className="flex items-center">
                              <FiPhone className="mr-3 h-5 w-5 text-neutral-500 flex-shrink-0" />
                              <a href={`tel:${String(realHome.phone).replace(/[^0-9+]/g, '')}`} className="text-primary-600 hover:underline">
                                {realHome.phone}
                              </a>
                            </div>
                          )}
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
                ) : (
                  // OL-176: unclaimed listings have no facility contact on file (the API no longer
                  // exposes the directory placeholder account) — route families through the inquiry.
                  <div data-testid="contact-unclaimed">
                    <p className="text-sm text-neutral-700">
                      {realHome.unclaimed
                        ? "This community hasn't claimed its listing yet, so we don't publish a direct contact. Send a message and we'll pass it on."
                        : 'Contact information not available.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Claim (fix/self-serve-claim): the obvious next step for an operator on an unclaimed listing; staff on an
            unclaimed listing already get the banner above. Claimed listings say who manages them. */}
        {(realHome.claimState === 'claimed' || (realHome.claimState && !(realHome.unclaimed && isStaff))) && (
          <div className="border-t border-line bg-surface-raised" data-testid="listing-claim-footer">
            <div className="container mx-auto px-4 py-4">
              <ListingClaim homeId={realHome.id} claimState={realHome.claimState} role={role} />
            </div>
          </div>
        )}

        {/* < lg: room for the floating widgets above the bar, so the last content (contact details, claim line) can
            scroll clear of them. Measured, see `clearance`. */}
        {clearance > 0 && <div aria-hidden="true" data-testid="listing-widget-clearance" className="lg:hidden" style={{ height: clearance }} />}
        {/* < lg: sticky bottom CTA bar once the inline panel has scrolled away (§4). Last in the page flow, so its
            height is the bottom padding; signed in it docks on the tab bar (see `dock`). Hidden + inert while the
            inline panel is on screen. */}
        {dock && dock.spacer > 0 && <div aria-hidden="true" className="lg:hidden" style={{ height: dock.spacer }} />}
        <div
          ref={setCtaEl}
          data-testid="listing-cta-bar"
          data-hidden={!showCta}
          aria-hidden={!showCta || undefined}
          {...(!showCta ? ({ inert: true } as Record<string, unknown>) : {})}
          className={`sticky bottom-0 z-30 border-t border-line bg-white/95 px-4 pt-3 shadow-dropdown backdrop-blur lg:hidden motion-safe:transition-all motion-safe:duration-200 ${
            showCta ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
          }`}
          style={{
            paddingBottom: signedIn ? '0.75rem' : 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
            ...(dock ? { position: 'fixed' as const, left: 0, right: 0, bottom: dock.bottom } : {}),
          }}
        >
          {/* Availability + price at the point of inquiry (pre-launch). */}
          <div className="mx-auto mb-2 flex max-w-xl flex-wrap items-center gap-x-3 gap-y-1 text-sm" data-testid="cta-bar-facts">
            <span aria-hidden="true"><AvailabilityBadge availability={availability} /></span>
            <span className="sr-only">{facts.availability.line}.</span>
            <PriceLine pricing={realHome.pricing} />
          </div>
          <div className="mx-auto flex max-w-xl gap-2">
            <button type="button" onClick={() => onScheduleTour('cta_bar')} className={`${BTN_PRIMARY} flex-1`}>Schedule a Tour</button>
            <button type="button" onClick={() => openInquiry('cta_bar')} className={`${BTN_SECONDARY} flex-1`}>Send Inquiry</button>
          </div>
        </div>
      </div>
      {/* Tour request modal — signed-in families only (see onScheduleTour). */}
      <TourRequestModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        homeId={realHome.id}
        homeName={realHome.name}
        homeUnclaimed={Boolean(realHome.unclaimed)}
        onConfirmed={() => track('tour_requested', { listing_id: realHome.id, entry: inquiryEntryRef.current })}
      />
    </BrowseShell>
  );
}
