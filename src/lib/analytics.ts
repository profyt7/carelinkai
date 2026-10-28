// Analytics tracking utilities for Google Analytics 4, Facebook Pixel, and Microsoft Clarity

// Google Analytics 4
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

// Check if analytics is enabled (user consent)
export const isAnalyticsEnabled = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    const consent = localStorage.getItem('carelinkai_cookie_consent');
    if (!consent) return false;
    
    const preferences = JSON.parse(consent);
    return preferences.analytics === true;
  } catch {
    return false;
  }
};

// Google Analytics pageview
export const pageview = (url: string) => {
  if (!isAnalyticsEnabled()) return;
  
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Google Analytics event tracking
type GTagEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

export const event = ({ action, category, label, value }: GTagEvent) => {
  if (!isAnalyticsEnabled()) return;
  
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track user registration by role
export const trackRegistration = (role: string) => {
  event({
    action: 'registration',
    category: 'User',
    label: role,
  });
  
  // Also track with Facebook Pixel if marketing consent given
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'CompleteRegistration', {
      content_name: role,
    });
  }
};

// Track search queries
export const trackSearch = (query: string, resultsCount: number) => {
  event({
    action: 'search',
    category: 'Engagement',
    label: query,
    value: resultsCount,
  });
};

// Track tour bookings
export const trackTourBooking = (homeId: string, homeName: string) => {
  event({
    action: 'tour_booking',
    category: 'Conversion',
    label: homeName,
  });
  
  // Facebook Pixel conversion
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Schedule', {
      content_name: homeName,
      content_ids: [homeId],
      content_type: 'tour',
    });
  }
};

// Track placement requests
export const trackPlacementRequest = (searchId: string, homeCount: number) => {
  event({
    action: 'placement_request',
    category: 'Conversion',
    label: searchId,
    value: homeCount,
  });
  
  // Facebook Pixel conversion
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Lead', {
      content_name: 'Placement Request',
      value: homeCount,
    });
  }
};

// Track inquiry submissions
export const trackInquiry = (homeId: string, homeName: string) => {
  event({
    action: 'inquiry_submit',
    category: 'Conversion',
    label: homeName,
  });
  
  // Facebook Pixel conversion
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Contact', {
      content_name: homeName,
      content_ids: [homeId],
    });
  }
};

// Track caregiver job applications
export const trackJobApplication = (jobId: string) => {
  event({
    action: 'job_application',
    category: 'Conversion',
    label: jobId,
  });
  
  // Facebook Pixel conversion
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'SubmitApplication', {
      content_ids: [jobId],
      content_type: 'job',
    });
  }
};

// Microsoft Clarity - Session tracking
export const clarityIdentify = (userId: string, userRole: string) => {
  if (typeof window !== 'undefined' && (window as any).clarity) {
    (window as any).clarity('identify', userId, {
      role: userRole,
    });
  }
};

// Track button clicks
export const trackButtonClick = (buttonName: string, location: string) => {
  event({
    action: 'click',
    category: 'Button',
    label: `${buttonName} - ${location}`,
  });
};
