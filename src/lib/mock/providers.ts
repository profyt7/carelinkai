/**
 * Mock Provider Data Generator
 * 
 * Generates realistic mock provider data for development and testing.
 * Used when mock mode is enabled via the carelink_mock_mode cookie.
 */

export interface MockProvider {
  id: string;
  userId: string;
  businessName: string;
  contactName: string;
  bio: string;
  serviceTypes: string[];
  coverageArea: {
    cities?: string[];
    states?: string[];
    radius?: number;
    centerLat?: number;
    centerLng?: number;
  };
  yearsInBusiness: number;
  isVerified: boolean;
  website: string | null;
  photoUrl: string | null;
  credentialCount: number;
  verifiedCredentialCount: number;
}

/**
 * Generate mock providers for development
 * 
 * @param count - Number of mock providers to generate
 * @param serviceTypeOptions - Optional array of service types to choose from
 * @returns Array of mock provider objects
 */
export function generateMockProviders(
  count: number,
  serviceTypeOptions: string[] = []
): MockProvider[] {
  // Default service types if none provided
  const defaultServiceTypes = [
    'transportation',
    'meal-prep',
    'housekeeping',
    'companionship',
    'medical-transport',
    'home-care',
    'personal-care',
    'meal-delivery',
    'light-housekeeping',
    'medication-management'
  ];
  
  const serviceTypes = serviceTypeOptions.length > 0 ? serviceTypeOptions : defaultServiceTypes;
  
  // Mock data arrays
  const businessNames = [
    'CarePlus Transport',
    'Comfort Meals Co.',
    'CityCare Housekeeping',
    'HomeChef Helpers',
    'CareRide',
    'MealMates',
    'FreshStart Housekeeping',
    'Senior Services Inc',
    'HomeCare Plus',
    'Golden Years Home Care',
    'CareBridge Services',
    'Sunshine Transport',
    'Helping Hands Home Care',
    'Premier Care Solutions',
    'TLC Home Services',
    'Compassionate Care Co.',
    'Reliable Home Helpers',
    'Heart & Home Services',
    'Essential Care Partners',
    'Daily Living Support'
  ];
  
  const firstNames = [
    'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 
    'Robert', 'Lisa', 'James', 'Patricia', 'John',
    'Maria', 'Thomas', 'Nancy', 'Daniel', 'Karen',
    'Christopher', 'Betty', 'Matthew', 'Helen', 'Anthony'
  ];
  
  const lastNames = [
    'Johnson', 'Smith', 'Williams', 'Brown', 'Jones',
    'Garcia', 'Martinez', 'Rodriguez', 'Wilson', 'Anderson',
    'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Thompson', 'White', 'Harris', 'Clark'
  ];
  
  const cities = [
    'San Francisco', 'Oakland', 'San Jose', 'Berkeley', 
    'Palo Alto', 'Mountain View', 'Sunnyvale', 'Santa Clara',
    'Fremont', 'Hayward', 'Redwood City', 'Menlo Park',
    'Cupertino', 'Milpitas', 'San Mateo', 'Daly City'
  ];
  
  const states = ['CA', 'CA', 'CA']; // Bay Area focused
  
  const bios = [
    'We provide compassionate, reliable care services to help seniors live independently in their own homes. Our team is dedicated to delivering personalized support with dignity and respect.',
    'Trusted provider of quality home care services for over a decade. We specialize in helping families maintain their independence while ensuring safety and comfort.',
    'Professional care services tailored to meet the unique needs of each client. Our experienced team is committed to excellence and compassionate care.',
    'Family-owned business dedicated to serving the senior community with integrity and care. We understand the importance of trust when it comes to your loved ones.',
    'Comprehensive care solutions designed to support independent living. Our services are flexible and can be customized to meet your specific needs.',
    'Experienced provider of home support services with a focus on quality and reliability. We treat every client like family.',
    'Committed to enhancing quality of life through personalized care and attention. Our caregivers are carefully vetted and trained professionals.',
    'Leading provider of senior care services in the Bay Area. We pride ourselves on our responsiveness and attention to detail.',
    'Professional home care services with a personal touch. Our mission is to help seniors age gracefully in place.',
    'Specialized care services for seniors who want to maintain their independence. We offer flexible scheduling and personalized care plans.'
  ];
  
  const websites = [
    'https://careplus-transport.com',
    'https://comfortmeals.co',
    'https://citycare-services.com',
    'https://homechefhelpers.com',
    'https://careride-services.com',
    null, // Some providers might not have websites
    'https://freshstart-home.com',
    'https://seniorservicesinc.com',
    null,
    'https://goldenyearshomecare.com'
  ];
  
  // Generate random providers
  return Array.from({ length: count }, (_, i) => {
    const businessName = businessNames[i % businessNames.length];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const contactName = `${firstName} ${lastName}`;
    const bio = bios[Math.floor(Math.random() * bios.length)];
    const yearsInBusiness = Math.floor(Math.random() * 20) + 3; // 3-22 years
    const website = websites[Math.floor(Math.random() * websites.length)];
    
    // Select 1-3 service types
    const providerServiceTypes = [];
    const serviceCount = Math.floor(Math.random() * 3) + 1; // 1-3 services
    const shuffledServices = [...serviceTypes].sort(() => 0.5 - Math.random());
    for (let j = 0; j < serviceCount && j < shuffledServices.length; j++) {
      providerServiceTypes.push(shuffledServices[j]);
    }
    
    // Coverage area - select 2-5 cities
    const cityCount = Math.floor(Math.random() * 4) + 2; // 2-5 cities
    const shuffledCities = [...cities].sort(() => 0.5 - Math.random());
    const coverageCities = shuffledCities.slice(0, cityCount);
    
    // Verification status - 70% verified, 30% pending
    const isVerified = Math.random() > 0.3;
    
    // Credentials - verified providers have more credentials
    const credentialCount = isVerified 
      ? Math.floor(Math.random() * 3) + 3  // 3-5 credentials
      : Math.floor(Math.random() * 2) + 1; // 1-2 credentials
    
    const verifiedCredentialCount = isVerified
      ? Math.floor(credentialCount * 0.8) // 80% verified
      : Math.floor(credentialCount * 0.3); // 30% verified
    
    // Random logo/photo
    const logoIndex = Math.floor(Math.random() * 100);
    const photoUrl = `https://i.pravatar.cc/150?img=${logoIndex}`;
    
    return {
      id: `mock-provider-${i + 1}`,
      userId: `mock-provider-user-${i + 1}`,
      businessName,
      contactName,
      bio,
      serviceTypes: providerServiceTypes,
      coverageArea: {
        cities: coverageCities,
        states: ['CA'],
        radius: 25, // 25 mile radius
      },
      yearsInBusiness,
      isVerified,
      website,
      photoUrl,
      credentialCount,
      verifiedCredentialCount,
    };
  });
}

/**
 * Filter mock providers based on query parameters
 * Mimics the filtering logic used in the real API
 */
export function filterMockProviders(
  providers: MockProvider[],
  filters: {
    q?: string;
    serviceType?: string;
    city?: string;
    state?: string;
    verified?: string;
  }
): MockProvider[] {
  let filtered = [...providers];
  
  // Text search filter
  if (filters.q) {
    const query = filters.q.toLowerCase();
    filtered = filtered.filter(p => 
      p.businessName.toLowerCase().includes(query) ||
      p.contactName.toLowerCase().includes(query) ||
      p.bio.toLowerCase().includes(query)
    );
  }
  
  // Service type filter
  if (filters.serviceType) {
    filtered = filtered.filter(p => 
      p.serviceTypes.includes(filters.serviceType!)
    );
  }
  
  // City filter
  if (filters.city) {
    const city = filters.city.toLowerCase();
    filtered = filtered.filter(p => 
      p.coverageArea.cities?.some(c => c.toLowerCase().includes(city))
    );
  }
  
  // State filter
  if (filters.state) {
    const state = filters.state.toUpperCase();
    filtered = filtered.filter(p => 
      p.coverageArea.states?.includes(state)
    );
  }
  
  // Verified filter
  if (filters.verified !== undefined && filters.verified !== null) {
    const isVerified = filters.verified === 'true';
    filtered = filtered.filter(p => p.isVerified === isVerified);
  }
  
  return filtered;
}

/**
 * Extended Provider Detail Interface
 * For individual provider detail pages
 */
export interface MockProviderDetail {
  id: string;
  userId: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  bio: string;
  website: string | null;
  insuranceInfo: string | null;
  licenseNumber: string | null;
  yearsInBusiness: number;
  isVerified: boolean;
  isActive: boolean;
  serviceTypes: string[];
  coverageArea: {
    cities: string[];
    states: string[];
    zipCodes: string[];
  };
  photoUrl: string | null;
  credentials: Array<{
    id: string;
    type: string;
    status: string;
    expiresAt: string | null;
    verifiedAt: string | null;
  }>;
  memberSince: string;
}

/**
 * Generate detailed mock provider data for a specific provider ID
 * Used for provider detail pages
 * 
 * @param providerId - The mock provider ID (e.g., "mock-provider-1")
 * @returns Detailed provider object or null if not found
 */
export function getMockProviderDetail(providerId: string): MockProviderDetail | null {
  // Extract provider number from ID
  const match = providerId.match(/mock-provider-(\d+)/);
  if (!match) return null;
  
  const providerIndex = parseInt(match[1], 10) - 1;
  
  // Generate base mock providers
  const mockProviders = generateMockProviders(20);
  
  if (providerIndex < 0 || providerIndex >= mockProviders.length) {
    return null;
  }
  
  const baseProvider = mockProviders[providerIndex];
  
  // Generate detailed data
  const firstName = baseProvider.contactName.split(' ')[0];
  const lastName = baseProvider.contactName.split(' ')[1] || 'Smith';
  
  // Generate contact info
  const emailDomain = baseProvider.businessName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  const contactEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}.com`;
  const contactPhone = `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  
  // Generate insurance and license info
  const insuranceInfo = baseProvider.isVerified 
    ? `General Liability: $2,000,000 | Professional Liability: $1,000,000 | Workers' Compensation: Active`
    : `General Liability: $1,000,000`;
  
  const licenseNumber = baseProvider.isVerified
    ? `CA-${String(providerIndex + 1000).padStart(6, '0')}`
    : null;
  
  // Generate credentials
  const credentialTypes = [
    'Business License',
    'General Liability Insurance',
    'Professional Liability Insurance',
    'Workers\' Compensation Insurance',
    'CPR Certification',
    'First Aid Certification',
    'Background Check',
    'TB Test',
  ];
  
  const credentials = [];
  const credentialCount = baseProvider.isVerified ? 5 : 3;
  
  for (let i = 0; i < credentialCount; i++) {
    const credType = credentialTypes[i % credentialTypes.length];
    const isVerified = baseProvider.isVerified ? (i < 4) : (i < 1);
    
    // Generate expiration date (1-3 years from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + Math.floor(Math.random() * 3) + 1);
    
    // Generate verified date (2-6 months ago)
    const verifiedAt = new Date();
    verifiedAt.setMonth(verifiedAt.getMonth() - Math.floor(Math.random() * 5) - 2);
    
    credentials.push({
      id: `mock-credential-${providerId}-${i + 1}`,
      type: credType,
      status: isVerified ? 'VERIFIED' : 'PENDING',
      expiresAt: expiresAt.toISOString(),
      verifiedAt: isVerified ? verifiedAt.toISOString() : null,
    });
  }
  
  // Generate ZIP codes for coverage area
  const zipCodes = [];
  const baseZip = 94000 + Math.floor(Math.random() * 500);
  for (let i = 0; i < 10; i++) {
    zipCodes.push(String(baseZip + i));
  }
  
  // Member since date (based on years in business)
  const memberSince = new Date();
  memberSince.setFullYear(memberSince.getFullYear() - baseProvider.yearsInBusiness);
  
  return {
    id: providerId,
    userId: baseProvider.userId,
    businessName: baseProvider.businessName,
    contactName: baseProvider.contactName,
    contactEmail,
    contactPhone,
    bio: baseProvider.bio,
    website: baseProvider.website,
    insuranceInfo,
    licenseNumber,
    yearsInBusiness: baseProvider.yearsInBusiness,
    isVerified: baseProvider.isVerified,
    isActive: true,
    serviceTypes: baseProvider.serviceTypes,
    coverageArea: {
      cities: baseProvider.coverageArea.cities || [],
      states: baseProvider.coverageArea.states || ['CA'],
      zipCodes,
    },
    photoUrl: baseProvider.photoUrl,
    credentials,
    memberSince: memberSince.toISOString(),
  };
}
