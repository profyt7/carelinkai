"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  FiMessageSquare,
  FiVideo,
  FiCamera,
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
  FiChevronUp
} from "react-icons/fi";

import DashboardLayout from "@/components/layout/DashboardLayout";
// Import our new components
import PhotoGallery from "@/components/homes/PhotoGallery";
import PricingCalculator from "@/components/homes/PricingCalculator";
import type { PricingEstimate } from "@/components/homes/PricingCalculator";
import { getCloudinaryAvatar, isCloudinaryUrl } from "@/lib/cloudinaryUrl";

// Dynamically import the SimpleMap component with SSR disabled
const SimpleMap = dynamic(
  () => import("@/components/search/SimpleMap"),
  { ssr: false }
);

// Mock data for a single home
const MOCK_HOME = {
  id: "1",
  name: "Sunshine Care Home",
  address: "123 Maple Street, San Francisco, CA 94102",
  description: "A warm and welcoming assisted living facility with 24/7 care staff and beautiful gardens. Our dedicated team provides personalized care in a comfortable, home-like environment designed to promote independence while offering the support residents need.",
  longDescription: `
    Sunshine Care Home offers a perfect blend of independence and support in a warm, inviting community setting. Our beautifully designed facility features spacious common areas, tranquil gardens, and comfortable private and semi-private rooms.
    
    Our professional staff is available 24/7 to provide personalized care tailored to each resident's unique needs. We focus on creating a nurturing environment where residents can thrive, maintain their dignity, and enjoy a high quality of life.
    
    We believe in a holistic approach to care, addressing physical, emotional, and social wellbeing through engaging activities, nutritious meals, and compassionate support. Family involvement is encouraged, and we work closely with healthcare providers to ensure comprehensive care.
  `,
  careLevel: ["ASSISTED", "MEMORY_CARE"],
  priceRange: { min: 3500, max: 5000 },
  capacity: 24,
  availability: 3,
  gender: "ALL",
  rating: 4.8,
  reviewsCount: 42,
  aiMatchScore: 92,
  photos: [
    { id: "p1", url: "/images/homes/1.jpg", caption: "Front entrance with beautiful garden" },
    { id: "p2", url: "/images/homes/2.jpg", caption: "Spacious common area" },
    { id: "p3", url: "/images/homes/3.jpg", caption: "Private bedroom" },
    { id: "p4", url: "/images/homes/4.jpg", caption: "Dining room" },
    { id: "p5", url: "/images/homes/5.jpg", caption: "Garden patio" },
    { id: "p6", url: "/images/homes/6.jpg", caption: "Activity room" }
  ],
  amenities: [
    { category: "Living Spaces", items: ["Private Rooms", "Semi-Private Rooms", "Furnished Rooms Available", "Private Bathrooms", "Cable TV", "Internet Access", "Housekeeping"] },
    { category: "Community Features", items: ["Garden/Patio", "Beauty Salon", "Library", "Activity Room", "Dining Room", "Transportation Services", "Security System"] },
    { category: "Care Services", items: ["24/7 Staff", "Medication Management", "Assistance with ADLs", "Incontinence Care", "Diabetes Care", "Mobility Assistance", "Hospice Care"] },
    { category: "Activities", items: ["Exercise Programs", "Arts & Crafts", "Music Therapy", "Religious Services", "Community Outings", "Holiday Celebrations", "Pet Therapy"] },
    { category: "Dining", items: ["Three Meals Daily", "Snacks Available", "Special Diets", "Private Dining", "Family Dining Options"] }
  ],
  pricing: [
    { 
      type: "Private Room", 
      base: 4500, 
      additional: [
        { service: "Medication Management", cost: 300, description: "Daily medication administration and monitoring" }, 
        { service: "Incontinence Care", cost: 400, description: "Assistance with incontinence needs" },
        { service: "Diabetes Management", cost: 250, description: "Blood sugar monitoring and insulin administration" }
      ],
      description: "Spacious private room with en-suite bathroom",
      availability: 2
    },
    { 
      type: "Semi-Private Room", 
      base: 3500, 
      additional: [
        { service: "Medication Management", cost: 300, description: "Daily medication administration and monitoring" }, 
        { service: "Incontinence Care", cost: 400, description: "Assistance with incontinence needs" },
        { service: "Diabetes Management", cost: 250, description: "Blood sugar monitoring and insulin administration" }
      ],
      description: "Comfortable shared room with shared bathroom",
      availability: 1
    },
    { 
      type: "Memory Care Private", 
      base: 5000, 
      additional: [
        { service: "Specialized Memory Care", cost: 500, description: "Enhanced supervision and specialized memory activities" },
        { service: "Medication Management", cost: 300, description: "Daily medication administration and monitoring" }, 
        { service: "Incontinence Care", cost: 400, description: "Assistance with incontinence needs" }
      ],
      description: "Secure private room in memory care wing",
      availability: 0
    }
  ],
  oneTimeFees: [
    { name: "Community Fee", amount: 3000, description: "One-time move-in fee", required: true },
    { name: "Assessment Fee", amount: 500, description: "Initial care assessment", required: true },
    { name: "Deep Cleaning", amount: 250, description: "Deep cleaning of room upon move-in" },
    { name: "Furniture Rental", amount: 800, description: "Monthly furniture rental package" }
  ],
  pricingNotes: "Prices may increase based on care assessment. Additional services available à la carte. Financial assistance programs may be available for qualifying residents.",
  virtualTour: "https://example.com/virtual-tour",
  contactInfo: {
    phone: "(415) 555-1234",
    email: "info@sunshinecarehome.com",
    website: "https://www.sunshinecarehome.com",
    administrator: "Sarah Johnson"
  },
  license: {
    number: "AB-12345-NH",
    type: "Residential Care Facility for the Elderly",
    status: "Active",
    lastInspection: "2023-09-15",
    violations: 0
  },
  reviewsList: [
    { id: "r1", author: "Michael T.", relationship: "Son of Resident", rating: 5, date: "2023-10-15", content: "My mother has been at Sunshine Care Home for 6 months now, and we couldn't be happier with the care she's receiving. The staff is attentive, kind, and truly cares about her wellbeing. The facility is always clean and well-maintained." },
    { id: "r2", author: "Patricia L.", relationship: "Daughter of Resident", rating: 5, date: "2023-09-22", content: "Moving my father to Sunshine was the best decision we made. He's thriving in this environment, making friends, and participating in activities he enjoys. The staff communicates well and addresses any concerns promptly." },
    { id: "r3", author: "Robert K.", relationship: "Resident", rating: 4, date: "2023-08-05", content: "I've been living here for almost a year and feel very comfortable. The food is good, activities are enjoyable, and the staff knows me by name. My only suggestion would be more outdoor activities." },
    { id: "r4", author: "Susan M.", relationship: "Daughter of Resident", rating: 5, date: "2023-07-12", content: "The memory care program at Sunshine has been exceptional for my mother with Alzheimer's. The specialized staff is trained well and uses effective techniques to keep her engaged and comfortable." }
  ],
  availableDates: [
    "2025-08-01", "2025-08-02", "2025-08-03", "2025-08-04", "2025-08-05",
    "2025-08-08", "2025-08-09", "2025-08-10", "2025-08-11", "2025-08-12",
    "2025-08-15", "2025-08-16", "2025-08-17", "2025-08-18", "2025-08-19"
  ],
  coordinates: { lat: 37.7749, lng: -122.4194 },
  staff: [
    { 
      id: "s1", 
      name: "Dr. Robert Chen", 
      title: "Medical Director", 
      photo: "https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830518/carelinkai/placeholders/provider/provider-medical.png",
      bio: "Dr. Chen has over 20 years of experience in geriatric medicine and oversees all medical care at Sunshine Care Home."
    },
    { 
      id: "s2", 
      name: "Sarah Johnson", 
      title: "Administrator", 
      photo: "https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830515/carelinkai/placeholders/caregiver/caregiver-default.png",
      bio: "Sarah has been with Sunshine for 8 years and ensures the highest standards of care and service for all residents."
    },
    { 
      id: "s3", 
      name: "Miguel Rodriguez", 
      title: "Head of Nursing", 
      photo: "https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830516/carelinkai/placeholders/caregiver/caregiver-nurse.png",
      bio: "Miguel leads our nursing team with compassion and expertise, focusing on personalized care plans for each resident."
    },
    { 
      id: "s4", 
      name: "Lisa Wong", 
      title: "Activities Director", 
      photo: "https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830517/carelinkai/placeholders/caregiver/caregiver-aide.png",
      bio: "Lisa creates engaging programs that promote social interaction, cognitive stimulation, and physical well-being."
    }
  ],
  activities: [
    {
      id: "a1",
      name: "Morning Yoga",
      date: "2025-07-26",
      time: "9:00 AM",
      location: "Activity Room",
      description: "Gentle yoga session suitable for all mobility levels."
    },
    {
      id: "a2",
      name: "Art Therapy",
      date: "2025-07-26",
      time: "2:00 PM",
      location: "Craft Room",
      description: "Express yourself through painting and drawing."
    },
    {
      id: "a3",
      name: "Garden Club",
      date: "2025-07-27",
      time: "10:00 AM",
      location: "Garden Patio",
      description: "Plant summer flowers and tend to our vegetable garden."
    },
    {
      id: "a4",
      name: "Movie Night",
      date: "2025-07-27",
      time: "7:00 PM",
      location: "Common Room",
      description: "Featuring a classic film with popcorn and refreshments."
    },
    {
      id: "a5",
      name: "Music Therapy",
      date: "2025-07-28",
      time: "11:00 AM",
      location: "Activity Room",
      description: "Sing-along and instrument play with our music therapist."
    },
    {
      id: "a6",
      name: "Bingo",
      date: "2025-07-28",
      time: "3:00 PM",
      location: "Dining Room",
      description: "Fun game with prizes and refreshments."
    }
  ]
};

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
  const { id } = params;
  
  // State for the home data
  const [home, setHome] = useState(MOCK_HOME);
  const [isLoading, setIsLoading] = useState(false);
  // Real data states (used when mock mode is off)
  const [realHome, setRealHome] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState("overview");
  
  // State for pricing calculator
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimate | null>(null);
  
  // State for activity calendar
  const [selectedDate, setSelectedDate] = useState<string>("");
  
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
    tourDate: "",
    tourTime: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // State for booking step
  const [bookingStep, setBookingStep] = useState(0); // 0: not started, 1: inquiry form, 2: tour scheduling, 3: submitted
  
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
  
  // Runtime mock toggle fetched from API
  const [showMock, setShowMock] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/runtime/mocks', { cache: 'no-store', credentials: 'include' as RequestCredentials });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setShowMock(!!j?.show);
      } catch {
        if (!cancelled) setShowMock(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        if (!cancelled) setRealHome(j.data);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Network error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (showMock) {
      // Simulate API call for mock data
      const t = setTimeout(() => {
        setHome(MOCK_HOME);
        setIsLoading(false);
      }, 400);
      return () => clearTimeout(t);
    } else {
      fetchReal();
      return () => {
        cancelled = true;
      };
    }
  }, [id, showMock]);
  
  // Set initial selected date for activities
  useEffect(() => {
    if (home.activities && home.activities.length > 0) {
      const uniqueDates = [...new Set(home.activities.map(activity => activity.date))];
      if (uniqueDates.length > 0) {
        const firstDate = uniqueDates[0];
        if (firstDate) setSelectedDate(firstDate);
      }
    }
  }, [home.activities]);
  
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
    const errs: Record<string, string> = {};
    if (!inquiryForm.name.trim()) errs["name"] = "Name is required";
    if (!inquiryForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiryForm.email)) errs["email"] = "Valid email is required";
    if (!Array.isArray(inquiryForm.careNeeded) || inquiryForm.careNeeded.length === 0) errs["careNeeded"] = "Please select at least one care service";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBookingStep(2);
  };
  
  // Handle tour scheduling
  const handleTourSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Compose ISO tour date-time if both provided
    let tourDateIso: string | undefined = undefined;
    if (inquiryForm.tourDate && inquiryForm.tourTime) {
      try {
        const [hmm = '0:00', ampm = 'AM'] = inquiryForm.tourTime.split(" ");
        const [hh = '0', mm = '0'] = hmm.split(":");
        let hours = parseInt(hh, 10) % 12 + (ampm?.toUpperCase() === "PM" ? 12 : 0);
        const dt = new Date(inquiryForm.tourDate);
        dt.setHours(hours, parseInt(mm || "0", 10), 0, 0);
        tourDateIso = dt.toISOString();
      } catch {}
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeId: String(id),
          name: inquiryForm.name.trim(),
          email: inquiryForm.email.trim(),
          phone: inquiryForm.phone.trim() || undefined,
          residentName: inquiryForm.residentName.trim() || undefined,
          moveInTimeframe: inquiryForm.moveInTimeframe || undefined,
          careNeeded: inquiryForm.careNeeded,
          message: inquiryForm.message.trim() || undefined,
          tourDate: tourDateIso,
          source: 'home_detail',
        }),
      });
      if (!res.ok) {
        const msg = res.status === 400 ? 'Please check your details and try again.' : 'Something went wrong. Please try again later.';
        setSubmitError(msg);
        return;
      }
      // Success → show confirmation
      setBookingStep(3);
    } catch (err: any) {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
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
  
  // Toggle favorite
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // In a real app, we would save this to the user's profile
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
  
  // Get activities for selected date
  const getActivitiesForDate = (date: string) => {
    return home.activities.filter(activity => activity.date === date);
  };
  
  // Get unique activity dates
  const getUniqueDates = () => {
    return [...new Set(home.activities.map(activity => activity.date))];
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

  // Real-data rendering when mock mode is disabled
  if (!showMock) {
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
        </div>
      );
    }

    if (loadError) {
      return (
        <DashboardLayout title="Home Details">
          <div className="p-4 md:p-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-700 mb-2">Could not load listing</h2>
              <p className="text-red-700">{loadError}</p>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    if (!realHome) {
      return (
        <DashboardLayout title="Home Details">
          <div className="p-4 md:p-6">
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <p className="text-neutral-600">No data found.</p>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    const addrText = typeof realHome.address === 'object' && realHome.address
      ? [realHome.address.street, realHome.address.city && `${realHome.address.city}, ${realHome.address.state}`, realHome.address.zipCode].filter(Boolean).join(', ')
      : '';
    const photos = (realHome.photos || []).map((p: any) => ({ id: p.id, url: p.url, caption: p.caption || '' }));

    return (
      <DashboardLayout title={`Home Details - ${realHome.name}`}>
        <div className="min-h-screen bg-neutral-50 pb-28">
          {/* Back */}
          <div className="sticky top-0 z-20 bg-white shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <button onClick={() => router.back()} className="flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-800">
                  <FiArrowLeft className="mr-1 h-4 w-4" />
                  Back to Search
                </button>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="container mx-auto px-4 pt-6">
            <PhotoGallery photos={photos} />
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col lg:flex-row lg:space-x-8">
              <div className="flex-1">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex flex-wrap items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-neutral-800 md:text-3xl">{realHome.name}</h1>
                      <div className="mt-1 flex items-center">
                        <FiMapPin className="mr-1 h-4 w-4 text-neutral-500" />
                        <span className="text-sm text-neutral-600">{addrText}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center md:mt-0">
                      {realHome.rating != null && (
                        <>
                          <div className="flex items-center text-amber-500">
                            <FiStar className="fill-current" />
                            <span className="ml-1 font-medium text-neutral-800">{realHome.rating.toFixed(1)}</span>
                          </div>
                          <span className="ml-1 text-sm text-neutral-500">({realHome.reviewCount} reviews)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Key details */}
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <div className="flex items-center text-neutral-600">
                        <FiUsers className="mr-2 h-5 w-5" />
                        <div>
                          <p className="text-xs">Capacity</p>
                          <p className="font-medium">{realHome.capacity} Residents</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <div className="flex items-center text-neutral-600">
                        <FiHome className="mr-2 h-5 w-5" />
                        <div>
                          <p className="text-xs">Availability</p>
                          <p className="font-medium">{realHome.availability > 0 ? `${realHome.availability} Spots` : 'Waitlist'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <div className="flex items-center text-neutral-600">
                        <FiDollarSign className="mr-2 h-5 w-5" />
                        <div>
                          <p className="text-xs">Starting At</p>
                          <p className="font-medium">{realHome.priceRange?.formattedMin || (realHome.priceRange?.min ? formatCurrency(realHome.priceRange.min) : '—')}/mo</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <div className="flex items-center text-neutral-600">
                        <FiAward className="mr-2 h-5 w-5" />
                        <div>
                          <p className="text-xs">Care Levels</p>
                          <p className="text-sm">{(realHome.careLevel || []).join(', ').replaceAll('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
                  <p className="text-neutral-700 whitespace-pre-line">{realHome.description}</p>
                </div>

                {/* Amenities */}
                {Array.isArray(realHome.amenities) && realHome.amenities.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-xl font-semibold text-neutral-800">Amenities & Services</h2>
                    <div className="rounded-lg border border-neutral-200 bg-white p-6">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {realHome.amenities.map((a: string) => (
                          <div key={a} className="flex items-center">
                            <FiCheck className="mr-2 h-5 w-5 text-success-500" />
                            <span className="text-neutral-700">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold text-neutral-800">Location</h2>
                  <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <div className="h-80 w-full">
                      {realHome.address?.coordinates && (
                        <SimpleMap homes={[realHome]} />
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start">
                        <FiMapPinOutline className="mr-3 h-5 w-5 text-neutral-500" />
                        <div>
                          <h3 className="font-medium text-neutral-800">Address</h3>
                          <p className="text-neutral-600">{addrText}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar (reuse inquiry CTA) */}
              <div className="mt-8 w-full lg:mt-0 lg:w-80">
                <div className="sticky top-20">
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-3 text-lg font-semibold text-neutral-800">Interested in {realHome.name}?</h3>
                    <p className="mb-4 text-sm text-neutral-600">
                      {realHome.availability > 0 ? `${realHome.availability} spots available. Schedule a tour or send an inquiry.` : 'Currently on waitlist. Send an inquiry to learn more.'}
                    </p>
                    <div className="space-y-3">
                      <Link href={`/inquiry?homeId=${realHome.id}`} className="flex w-full items-center justify-center rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600">
                        <FiCalendar className="mr-2 h-5 w-5" />
                        Schedule a Tour
                      </Link>
                      <Link href={`/inquiry?homeId=${realHome.id}`} className="flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50">
                        <FiMessageSquare className="mr-2 h-5 w-5" />
                        Send Inquiry
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title={`Home Details - ${home.name}`}>
    <div className="min-h-screen bg-neutral-50 pb-28">
      {/* Back button */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-800"
            >
              <FiArrowLeft className="mr-1 h-4 w-4" />
              Back to Search
            </button>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={toggleFavorite}
                className={`flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isFavorite 
                    ? "border-primary-200 bg-primary-50 text-primary-600" 
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <FiHeart className={`mr-1 h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "Saved" : "Save"}
              </button>
              <button className="flex items-center rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
                <FiShare2 className="mr-1 h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Photo gallery */}
      <div className="container mx-auto px-4 pt-6">
        <PhotoGallery photos={home.photos} />
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:space-x-8">
          {/* Left column - Main content */}
          <div className="flex-1">
            {/* Header section */}
            <div className="mb-6">
              <div className="flex flex-wrap items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-800 md:text-3xl">{home.name}</h1>
                  <div className="mt-1 flex items-center">
                    <FiMapPin className="mr-1 h-4 w-4 text-neutral-500" />
                    <span className="text-sm text-neutral-600">{home.address}</span>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center md:mt-0">
                  <div className="flex items-center text-amber-500">
                    <FiStar className="fill-current" />
                    <span className="ml-1 font-medium text-neutral-800">{home.rating}</span>
                  </div>
                  <span className="ml-1 text-sm text-neutral-500">({home.reviewsCount} reviews)</span>
                </div>
              </div>
              
              {/* Key details */}
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="flex items-center text-neutral-600">
                    <FiUsers className="mr-2 h-5 w-5" />
                    <div>
                      <p className="text-xs">Capacity</p>
                      <p className="font-medium">{home.capacity} Residents</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="flex items-center text-neutral-600">
                    <FiHome className="mr-2 h-5 w-5" />
                    <div>
                      <p className="text-xs">Availability</p>
                      <p className="font-medium">{home.availability > 0 ? `${home.availability} Spots` : "Waitlist"}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="flex items-center text-neutral-600">
                    <FiDollarSign className="mr-2 h-5 w-5" />
                    <div>
                      <p className="text-xs">Starting At</p>
                      <p className="font-medium">{formatCurrency(home.priceRange.min)}/mo</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="flex items-center text-neutral-600">
                    <FiAward className="mr-2 h-5 w-5" />
                    <div>
                      <p className="text-xs">License Status</p>
                      <p className="font-medium">{home.license.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Match Score */}
            <div className="mb-6 rounded-lg border border-primary-100 bg-primary-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-xl font-bold text-white">
                    {home.aiMatchScore}%
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800">AI Match Score</h3>
                    <p className="text-sm text-neutral-600">This home is a strong match for your needs</p>
                  </div>
                </div>
                <button className="rounded-md bg-white px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100">
                  <FiInfo className="mr-1 inline-block h-4 w-4" />
                  How It Works
                </button>
              </div>
            </div>
            
            {/* Virtual Tour Banner */}
            <div className="mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-gradient-to-r from-primary-600 to-primary-500">
              <div className="flex flex-col items-center justify-between p-6 md:flex-row">
                <div className="mb-4 text-center md:mb-0 md:text-left">
                  <h3 className="text-xl font-semibold text-white">Take a Virtual Tour</h3>
                  <p className="text-primary-100">Explore Sunshine Care Home from the comfort of your home</p>
                </div>
                <button
                  onClick={() => window.open(home.virtualTour, '_blank')}
                  className="flex items-center rounded-md bg-white px-4 py-2 font-medium text-primary-600 shadow-sm hover:bg-neutral-100"
                >
                  <FiVideo className="mr-2 h-5 w-5" />
                  Start Virtual Tour
                </button>
              </div>
            </div>
            
            {/* Tab navigation */}
            <div className="mb-6 -mx-4 overflow-x-auto border-b border-neutral-200 px-4">
              <div className="flex min-w-max space-x-6">
                <button
                  onClick={() => handleTabChange("overview")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "overview"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => handleTabChange("amenities")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "amenities"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Amenities
                </button>
                <button
                  onClick={() => handleTabChange("pricing")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "pricing"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Pricing
                </button>
                <button
                  onClick={() => handleTabChange("staff")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "staff"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Staff
                </button>
                <button
                  onClick={() => handleTabChange("activities")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "activities"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Activities
                </button>
                <button
                  onClick={() => handleTabChange("reviews")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "reviews"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => handleTabChange("location")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "location"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Location
                </button>
                <button
                  onClick={() => handleTabChange("contact")}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === "contact"
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  Contact
                </button>
              </div>
            </div>
            
            {/* Overview section */}
            <div ref={overviewRef} className="mb-8 scroll-mt-20">
              <h2 className="mb-4 text-xl font-semibold text-neutral-800">About {home.name}</h2>
              
              {/* Care levels */}
              <div className="mb-4 flex flex-wrap gap-2">
                {home.careLevel.map((level) => (
                  <span
                    key={level}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700"
                  >
                    {CARE_LEVELS.find(l => l.id === level)?.label}
                  </span>
                ))}
              </div>
              
              {/* Description */}
              <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
                <p className="mb-4 text-neutral-700">{home.description}</p>
                <div className="whitespace-pre-line text-neutral-700">{home.longDescription}</div>
              </div>
              
              {/* Quick facts */}
              <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-medium text-neutral-800">Quick Facts</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600">
                      <FiUsers className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">Resident Gender</p>
                      <p className="text-sm text-neutral-600">
                        {home.gender === "ALL" ? "All genders welcome" : `${home.gender} only`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600">
                      <FiHome className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">Facility Type</p>
                      <p className="text-sm text-neutral-600">{home.license.type}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600">
                      <FiShield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">License Information</p>
                      <p className="text-sm text-neutral-600">License #{home.license.number}</p>
                      <p className="text-sm text-neutral-600">Last inspection: {new Date(home.license.lastInspection).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600">
                      <FiClock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">Staff Availability</p>
                      <p className="text-sm text-neutral-600">24/7 care staff on-site</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Amenities section */}
            <div ref={amenitiesRef} className="mb-8 scroll-mt-20">
              <h2 className="mb-4 text-xl font-semibold text-neutral-800">Amenities & Services</h2>
              
              <div className="rounded-lg border border-neutral-200 bg-white">
                {home.amenities.map((category, index) => (
                  <div 
                    key={category.category} 
                    className={`p-6 ${index !== home.amenities.length - 1 ? "border-b border-neutral-200" : ""}`}
                  >
                    <h3 className="mb-3 text-lg font-medium text-neutral-800">{category.category}</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {(amenitiesExpanded[category.category] ? category.items : category.items.slice(0, 6)).map(item => (
                        <div key={item} className="flex items-center">
                          <FiCheck className="mr-2 h-5 w-5 text-success-500" />
                          <span className="text-neutral-700">{item}</span>
                        </div>
                      ))}
                    </div>
                    {category.items.length > 6 && (
                      <button 
                        onClick={() => toggleAmenityCategory(category.category)}
                        className="mt-3 flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {amenitiesExpanded[category.category] ? (
                          <>
                            <FiChevronUp className="mr-1 h-4 w-4" />
                            Show less
                          </>
                        ) : (
                          <>
                            <FiChevronDown className="mr-1 h-4 w-4" />
                            Show all {category.items.length} items
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pricing section */}
            <div ref={pricingRef} className="mb-8 scroll-mt-20">
              <h2 className="mb-4 text-xl font-semibold text-neutral-800">Pricing & Fees</h2>
              
              {/* Pricing Calculator */}
              <PricingCalculator 
                pricing={home.pricing}
                oneTimeFees={home.oneTimeFees}
                pricingNotes={home.pricingNotes}
                onEstimateComplete={handleEstimateComplete}
              />
            </div>
            
            {/* Staff section */}
            <div ref={staffRef} className="mb-8 scroll-mt-20">
              <h2 className="mb-4 text-xl font-semibold text-neutral-800">Our Team</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {home.staff.map((member) => (
                  <div key={member.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-md">
                    <div className="relative w-full pt-[100%]">
                      <img
                        src={isCloudinaryUrl(member.photo) ? getCloudinaryAvatar(member.photo) : member.photo}
                        alt={member.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-neutral-800">{member.name}</h3>
                      <p className="text-sm text-primary-600">{member.title}</p>
                      <p className="mt-2 text-sm text-neutral-600">{member.bio}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Activities section */}
            <div ref={activitiesRef} className="mb-8 scroll-mt-20">
              <h2 className="mb-4 text-xl font-semibold text-neutral-800">Activities & Events</h2>
              
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                {/* Date selector */}
                <div className="mb-6 overflow-x-auto">
                  <div className="flex space-x-2">
                    {getUniqueDates().map((date) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedDate === date
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                        }`}
                      >
                        {formatDate(date)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Activities for selected date */}
                <div className="space-y-4">
                  {getActivitiesForDate(selectedDate).map((activity) => (
                    <div key={activity.id} className="flex rounded-lg border border-neutral-100 bg-neutral-50 p-4">
                      <div className="mr-4 flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                        <FiActivity className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">{activity.name}</h3>
                        <p className="text-sm text-neutral-600">{activity.time} • {activity.location}</p>
                        <p className="mt-1 text-sm text-neutral-700">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                  
                  {getActivitiesForDate(selectedDate).length === 0 && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center">
                      <p className="text-neutral-600">No activities scheduled for this date.</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button className="flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                    <FiCalendar className="mr-2 h-4 w-4" />
                    View Full Calendar
                  </button>
                </div>
              </div>
            </div>
            
            {/* Reviews section */}
            <div ref={reviewsRef} className="mb-8 scroll-mt-20">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-800">Reviews</h2>
                <div className="flex items-center">
                  <div className="flex items-center text-amber-500">
                    <FiStar className="fill-current" />
                    <span className="ml-1 font-medium text-neutral-800">{home.rating}</span>
                  </div>
                  <span className="ml-1 text-sm text-neutral-500">({home.reviewsCount} reviews)</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {home.reviewsList.map((review) => (
                  <div key={review.id} className="rounded-lg border border-neutral-200 bg-white p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-800">{review.author}</p>
                        <p className="text-sm text-neutral-500">{review.relationship}</p>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              className={i < review.rating ? "fill-current" : ""}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-neutral-500">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-neutral-700">{review.content}</p>
                    <div className="mt-4 flex items-center space-x-4">
                      <button className="flex items-center text-sm text-neutral-500 hover:text-neutral-700">
                        <FiThumbsUp className="mr-1 h-4 w-4" />
                        Helpful
                      </button>
                      <button className="flex items-center text-sm text-neutral-500 hover:text-neutral-700">
                        <FiFlag className="mr-1 h-4 w-4" />
                        Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <button className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  See All {home.reviewsCount} Reviews
                </button>
              </div>
            </div>
            
            {/* Location section */}
            <div ref={locationRef} className="mb-8 scroll-mt-20">
              <h2 className="mb-4 text-xl font-semibold text-neutral-800">Location</h2>
              
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <div className="h-80 w-full">
                  {home.coordinates && (
                    <SimpleMap homes={[home]} />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start">
                    <FiMapPinOutline className="mr-3 h-5 w-5 text-neutral-500" />
                    <div>
                      <h3 className="font-medium text-neutral-800">Address</h3>
                      <p className="text-neutral-600">{home.address}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="mb-2 font-medium text-neutral-800">Nearby Amenities</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center">
                        <FiCoffee className="mr-2 h-4 w-4 text-neutral-500" />
                        <span className="text-sm text-neutral-600">Cafes (0.2 miles)</span>
                      </div>
                      <div className="flex items-center">
                        <FiShield className="mr-2 h-4 w-4 text-neutral-500" />
                        <span className="text-sm text-neutral-600">Hospital (1.5 miles)</span>
                      </div>
                      <div className="flex items-center">
                        <FiHome className="mr-2 h-4 w-4 text-neutral-500" />
                        <span className="text-sm text-neutral-600">Shopping Center (0.8 miles)</span>
                      </div>
                      <div className="flex items-center">
                        <FiActivity className="mr-2 h-4 w-4 text-neutral-500" />
                        <span className="text-sm text-neutral-600">Park (0.4 miles)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex">
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(home.address)}`}
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
            
            {/* Contact section */}
            <div ref={contactRef} className="mb-8 scroll-mt-20">
              <h2 className="mb-4 text-xl font-semibold text-neutral-800">Contact Information</h2>
              
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-lg font-medium text-neutral-800">Facility Contact</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <FiPhone className="mr-3 h-5 w-5 text-neutral-500" />
                        <a href={`tel:${home.contactInfo.phone}`} className="text-primary-600 hover:underline">
                          {home.contactInfo.phone}
                        </a>
                      </div>
                      <div className="flex items-center">
                        <FiMail className="mr-3 h-5 w-5 text-neutral-500" />
                        <a href={`mailto:${home.contactInfo.email}`} className="text-primary-600 hover:underline">
                          {home.contactInfo.email}
                        </a>
                      </div>
                      <div className="flex items-center">
                        <FiHome className="mr-3 h-5 w-5 text-neutral-500" />
                        <a href={home.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                          Visit Website
                        </a>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-lg font-medium text-neutral-800">Administrator</h3>
                    <p className="mb-2">{home.contactInfo.administrator}</p>
                    <p className="text-sm text-neutral-600">Please contact the administrator for specific questions about care services, policies, or to schedule a private tour.</p>
                  </div>
                </div>
                
                <div className="mt-6 rounded-lg bg-neutral-100 p-4">
                  <h3 className="mb-2 text-base font-medium text-neutral-800">Need Help?</h3>
                  <p className="mb-3 text-sm text-neutral-600">
                    Our CareLinkAI care advisors are available to help you navigate your options and find the perfect home.
                  </p>
                  <button className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
                    <FiMessageSquare className="mr-2 h-4 w-4" />
                    Chat with a Care Advisor
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Inquiry sidebar */}
          <div className="mt-8 w-full lg:mt-0 lg:w-80">
            <div ref={bookingRef} className="sticky top-20">
              <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                {bookingStep === 0 && (
                  <>
                    <h3 className="mb-3 text-lg font-semibold text-neutral-800">Interested in {home.name}?</h3>
                    <p className="mb-4 text-sm text-neutral-600">
                      {home.availability > 0 
                        ? `${home.availability} spots available. Schedule a tour or send an inquiry.` 
                        : "Currently on waitlist. Send an inquiry to learn more."}
                    </p>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => setBookingStep(1)}
                        className="flex w-full items-center justify-center rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600"
                      >
                        <FiCalendar className="mr-2 h-5 w-5" />
                        Schedule a Tour
                      </button>
                      <button
                        onClick={() => setBookingStep(1)}
                        className="flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <FiMessageSquare className="mr-2 h-5 w-5" />
                        Send Inquiry
                      </button>
                    </div>
                    
                    <div className="mt-4 text-center text-xs text-neutral-500">
                      No obligation or fees to inquire
                    </div>
                  </>
                )}
                
                {bookingStep === 1 && (
                  <>
                    <h3 className="mb-3 text-lg font-semibold text-neutral-800">Contact {home.name}</h3>
                    <p className="mb-4 text-sm text-neutral-600">
                      Fill out this form and a representative will contact you shortly.
                    </p>
                    
                    <form onSubmit={handleInquirySubmit}>
                      <div className="mb-3">
                        <label htmlFor="name" className="mb-1 block text-sm font-medium text-neutral-700">
                          Your Name*
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={inquiryForm.name}
                          onChange={handleInquiryChange}
                          className={`form-input w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${formErrors['name'] ? 'border-red-400' : 'border-neutral-300'}`}
                        />
                        {formErrors['name'] && (
                          <p className="mt-1 text-xs text-red-600">{formErrors['name']}</p>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
                          Email Address*
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={inquiryForm.email}
                          onChange={handleInquiryChange}
                          className={`form-input w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${formErrors['email'] ? 'border-red-400' : 'border-neutral-300'}`}
                        />
                        {formErrors['email'] && (
                          <p className="mt-1 text-xs text-red-600">{formErrors['email']}</p>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-neutral-700">
                          Phone Number (optional)
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={inquiryForm.phone}
                          onChange={handleInquiryChange}
                          className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="residentName" className="mb-1 block text-sm font-medium text-neutral-700">
                          Resident Name
                        </label>
                        <input
                          type="text"
                          id="residentName"
                          name="residentName"
                          value={inquiryForm.residentName}
                          onChange={handleInquiryChange}
                          className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="moveInTimeframe" className="mb-1 block text-sm font-medium text-neutral-700">
                          Move-in Timeframe
                        </label>
                        <select
                          id="moveInTimeframe"
                          name="moveInTimeframe"
                          value={inquiryForm.moveInTimeframe}
                          onChange={handleInquiryChange}
                          className="form-select w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                          <option value="Immediately">Immediately</option>
                          <option value="1-3 months">1-3 months</option>
                          <option value="3-6 months">3-6 months</option>
                          <option value="6+ months">6+ months</option>
                          <option value="Just researching">Just researching</option>
                        </select>
                      </div>
                      
                      <div className="mb-3">
                        <label className="mb-1 block text-sm font-medium text-neutral-700">
                          Care Services Needed
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="careAssisted"
                              checked={inquiryForm.careNeeded.includes("Assisted Living")}
                              onChange={() => handleCareNeededChange("Assisted Living")}
                              className="form-checkbox h-4 w-4 rounded border-neutral-300 text-primary-500"
                            />
                            <label htmlFor="careAssisted" className="ml-2 text-sm text-neutral-600">
                              Assisted Living
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="careMemory"
                              checked={inquiryForm.careNeeded.includes("Memory Care")}
                              onChange={() => handleCareNeededChange("Memory Care")}
                              className="form-checkbox h-4 w-4 rounded border-neutral-300 text-primary-500"
                            />
                            <label htmlFor="careMemory" className="ml-2 text-sm text-neutral-600">
                              Memory Care
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="careMedication"
                              checked={inquiryForm.careNeeded.includes("Medication Management")}
                              onChange={() => handleCareNeededChange("Medication Management")}
                              className="form-checkbox h-4 w-4 rounded border-neutral-300 text-primary-500"
                            />
                            <label htmlFor="careMedication" className="ml-2 text-sm text-neutral-600">
                              Medication Management
                            </label>
                          </div>
                        </div>
                        {formErrors['careNeeded'] && (
                          <p className="mt-1 text-xs text-red-600">{formErrors['careNeeded']}</p>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="message" className="mb-1 block text-sm font-medium text-neutral-700">
                          Message
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={inquiryForm.message}
                          onChange={handleInquiryChange}
                          rows={3}
                          className="form-textarea w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Any specific questions or concerns?"
                        ></textarea>
                      </div>
                      
                      <div className="mb-4">
                        <button
                          type="submit"
                          className="w-full rounded-md bg-primary-500 py-2 font-medium text-white hover:bg-primary-600"
                        >
                          Continue to Schedule Tour
                        </button>
                      </div>
                      
                      <p className="text-center text-xs text-neutral-500">
                        By submitting, you agree to our <a href="#" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
                      </p>
                    </form>
                  </>
                )}
                
                {bookingStep === 2 && (
                  <>
                    <h3 className="mb-3 text-lg font-semibold text-neutral-800">Schedule a Tour</h3>
                    <p className="mb-4 text-sm text-neutral-600">
                      Select a date and time for your tour at {home.name}.
                    </p>
                    
                    <form onSubmit={handleTourSchedule}>
                      {submitError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {submitError}
                        </div>
                      )}
                      <div className="mb-4">
                        <label htmlFor="tourDate" className="mb-1 block text-sm font-medium text-neutral-700">
                          Select Date
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {home.availableDates.slice(0, 6).map((date) => (
                            <button
                              key={date}
                              type="button"
                              onClick={() => setInquiryForm({ ...inquiryForm, tourDate: date })}
                              className={`rounded-md border p-2 text-center text-sm ${
                                inquiryForm.tourDate === date
                                  ? "border-primary-500 bg-primary-50 text-primary-700"
                                  : "border-neutral-300 hover:border-neutral-400"
                              }`}
                            >
                              {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="tourTime" className="mb-1 block text-sm font-medium text-neutral-700">
                          Select Time
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM"].map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setInquiryForm({ ...inquiryForm, tourTime: time })}
                              className={`rounded-md border p-2 text-center text-sm ${
                                inquiryForm.tourTime === time
                                  ? "border-primary-500 bg-primary-50 text-primary-700"
                                  : "border-neutral-300 hover:border-neutral-400"
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
                        <p>
                          <span className="font-medium">Tour details:</span> A staff member will show you around the facility, answer questions, and discuss care options.
                        </p>
                      </div>
                      
                      <div className="mb-4">
                        <button
                          type="submit"
                          disabled={submitting || !inquiryForm.tourDate || !inquiryForm.tourTime}
                          className="w-full rounded-md bg-primary-500 py-2 font-medium text-white hover:bg-primary-600 disabled:bg-neutral-300 disabled:text-neutral-500"
                        >
                          {submitting ? 'Submitting…' : 'Schedule Tour'}
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        className="w-full text-center text-sm text-primary-600 hover:underline"
                      >
                        Back to Inquiry Form
                      </button>
                    </form>
                  </>
                )}
                
                {bookingStep === 3 && (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-600">
                      <FiCheck className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-neutral-800">Tour Scheduled!</h3>
                    <p className="mb-4 text-neutral-600">
                      Your tour at {home.name} is confirmed for:
                    </p>
                    <div className="mb-4 rounded-lg bg-neutral-50 p-4">
                      <p className="font-medium text-neutral-800">
                        {inquiryForm.tourDate && new Date(inquiryForm.tourDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-neutral-700">{inquiryForm.tourTime}</p>
                    </div>
                    <p className="mb-4 text-sm text-neutral-600">
                      A confirmation email has been sent to {inquiryForm.email} with all the details.
                    </p>
                    <div className="space-y-3">
                      <button className="flex w-full items-center justify-center rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600">
                        <FiCalendar className="mr-2 h-5 w-5" />
                        Add to Calendar
                      </button>
                      <button
                        onClick={() => setBookingStep(0)}
                        className="flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Similar homes */}
              {bookingStep === 0 && (
                <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
                  <h3 className="mb-3 text-base font-medium text-neutral-800">Similar Homes Nearby</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                        <img
                          src={getCloudinaryAvatar("https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830518/carelinkai/placeholders/provider/provider-facility.png")}
                          alt="Golden Years Living"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">Golden Years Living</p>
                        <p className="text-xs text-neutral-500">2.3 miles away • 85% Match</p>
                        <p className="text-sm font-medium text-neutral-700">$4,200+/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                        <img
                          src={getCloudinaryAvatar("https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830518/carelinkai/placeholders/provider/provider-facility.png")}
                          alt="Serenity House"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">Serenity House</p>
                        <p className="text-xs text-neutral-500">3.1 miles away • 79% Match</p>
                        <p className="text-sm font-medium text-neutral-700">$5,000+/mo</p>
                      </div>
                    </div>
                  </div>
                  <button className="mt-3 w-full text-center text-sm text-primary-600 hover:underline">
                    View More Similar Homes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile sticky CTA bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 bg-white p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:hidden">
        <div className="flex gap-2 sm:flex-row flex-col">
          <button
            onClick={() => {
              setBookingStep(1);
              bookingRef.current?.scrollIntoView({behavior: 'smooth'});
            }}
            className="flex-1 rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600"
          >
            Schedule Tour
          </button>
          <button
            onClick={() => {
              setActiveTab('contact');
              contactRef.current?.scrollIntoView({behavior: 'smooth'});
            }}
            className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Contact
          </button>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}