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
