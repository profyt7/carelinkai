import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * GET /api/marketplace/caregivers
 * 
 * Fetches caregivers with optional filters
 * Supports filtering by: q, city, state, minRate, maxRate, minExperience, specialties
 * Supports pagination with page and pageSize parameters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters
    const q = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const minRate = searchParams.get('minRate') ? parseFloat(searchParams.get('minRate')!) : null;
    const maxRate = searchParams.get('maxRate') ? parseFloat(searchParams.get('maxRate')!) : null;
    const minExperience = searchParams.get('minExperience') ? parseInt(searchParams.get('minExperience')!, 10) : null;
    const specialties = searchParams.get('specialties')?.split(',').filter(Boolean);
    
    // Pagination parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;
    const skip = (page - 1) * pageSize;
    
    // Build where clause for filtering
    const where: any = {};
    
    // Text search in bio or name
    if (q) {
      where.OR = [
        { bio: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } }
      ];
    }
    
    // Location filters using address relation
    if (city || state) {
      where.user = {
        addresses: {
          some: {
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(state && { state: { contains: state, mode: 'insensitive' } })
          }
        }
      };
    }
    
    // Rate range filter
    if (minRate !== null) {
      where.hourlyRate = {
        ...where.hourlyRate,
        gte: new Prisma.Decimal(minRate)
      };
    }
    
    if (maxRate !== null) {
      where.hourlyRate = {
        ...where.hourlyRate,
        lte: new Prisma.Decimal(maxRate)
      };
    }
    
    // Experience filter
    if (minExperience !== null) {
      where.yearsExperience = {
        gte: minExperience
      };
    }
    
    // Specialties filter
    if (specialties && specialties.length > 0) {
      where.specialties = {
        hasSome: specialties
      };
    }
    
    // Fetch caregivers with counts for pagination
    const [caregivers, totalCount] = await Promise.all([
      prisma.caregiver.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
              addresses: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      }),
      prisma.caregiver.count({ where })
    ]);
    
    // Transform the data to a clean DTO format
    const formattedCaregivers = caregivers.map((caregiver: any) => {
      // Find the first address if available
      const address = caregiver.user.addresses && caregiver.user.addresses.length > 0 
        ? caregiver.user.addresses[0] 
        : null;
      
      // Resolve profile image URL
      let photoUrl = null;
      if (caregiver.user.profileImageUrl) {
        if (typeof caregiver.user.profileImageUrl === 'string') {
          photoUrl = caregiver.user.profileImageUrl;
        } else if (caregiver.user.profileImageUrl.medium) {
          photoUrl = caregiver.user.profileImageUrl.medium;
        } else if (caregiver.user.profileImageUrl.thumbnail) {
          photoUrl = caregiver.user.profileImageUrl.thumbnail;
        } else if (caregiver.user.profileImageUrl.large) {
          photoUrl = caregiver.user.profileImageUrl.large;
        }
      }
      
      return {
        id: caregiver.id,
        userId: caregiver.user.id,
        name: `${caregiver.user.firstName} ${caregiver.user.lastName}`,
        city: address?.city || null,
        state: address?.state || null,
        hourlyRate: caregiver.hourlyRate ? parseFloat(caregiver.hourlyRate.toString()) : null,
        yearsExperience: caregiver.yearsExperience,
        specialties: caregiver.specialties || [],
        bio: caregiver.bio || null,
        backgroundCheckStatus: caregiver.backgroundCheckStatus,
        photoUrl
      };
    });
    
    // In development, if no results or error occurs, return mock data
    if (process.env.NODE_ENV === 'development' && formattedCaregivers.length === 0) {
      // Fetch specialties from DB for more realistic mock data
      let specialtyCategories: string[] = [];
      try {
        const categories = await prisma.marketplaceCategory.findMany({
          where: { type: 'SPECIALTY', isActive: true }
        });
        specialtyCategories = categories.map(cat => cat.slug);
      } catch (error) {
        // If we can't get real specialties, use defaults
        specialtyCategories = [
          'alzheimers-care', 'dementia-care', 'diabetes-care', 'hospice-care',
          'medication-management', 'mobility-assistance', 'parkinsons-care',
          'post-surgery-care', 'stroke-recovery', 'wound-care'
        ];
      }
      
      const mockCaregivers = generateMockCaregivers(12, specialtyCategories);
      
      return NextResponse.json(
        { 
          data: mockCaregivers,
          pagination: {
            page,
            pageSize,
            total: mockCaregivers.length
          }
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { 
        data: formattedCaregivers,
        pagination: {
          page,
          pageSize,
          total: totalCount
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching caregivers:', error);
    
    // In development, return mock data on error
    if (process.env.NODE_ENV === 'development') {
      const mockCaregivers = generateMockCaregivers(12);
      
      return NextResponse.json(
        { 
          data: mockCaregivers,
          pagination: {
            page: 1,
            pageSize: 20,
            total: mockCaregivers.length
          }
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch caregivers' },
      { status: 500 }
    );
  }
}

/**
 * Generate mock caregivers for development
 */
function generateMockCaregivers(count: number, specialtyOptions: string[] = []) {
  // Default specialties if none provided
  const defaultSpecialties = [
    'alzheimers-care', 'dementia-care', 'diabetes-care', 'hospice-care',
    'medication-management', 'mobility-assistance', 'parkinsons-care',
    'post-surgery-care', 'stroke-recovery', 'wound-care'
  ];
  
  const specialties = specialtyOptions.length > 0 ? specialtyOptions : defaultSpecialties;
  
  // Mock data for caregivers
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Logan', 'Charlotte', 'Benjamin', 'Amelia', 'Mason', 'Harper', 'Elijah', 'Evelyn', 'Oliver', 'Abigail', 'Jacob'];
  
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  
  const cities = ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto', 'Mountain View', 'Sunnyvale', 'Santa Clara', 'Fremont', 'Hayward'];
  
  const states = ['CA'];
  
  const bios = [
    'Compassionate caregiver with years of experience in assisted living environments. Dedicated to providing personalized care.',
    'Certified nursing assistant specializing in elderly care. Patient, attentive, and committed to improving quality of life.',
    'Experienced healthcare professional with a focus on memory care. Trained in dementia and Alzheimer\'s support.',
    'Reliable caregiver with a background in home health assistance. Skilled in medication management and daily living support.',
    'Dedicated care provider with expertise in mobility assistance and rehabilitation support. Passionate about helping seniors maintain independence.',
    'Empathetic caregiver with specialized training in hospice care. Committed to providing dignity and comfort.',
    'Professional with extensive experience in post-surgery recovery care. Attentive to medical needs and emotional support.',
    'Certified caregiver with training in diabetes management and nutritional support. Focused on holistic wellness.',
    'Experienced in providing care for individuals with Parkinson\'s disease. Knowledgeable about symptom management and mobility exercises.',
    'Compassionate professional specializing in stroke recovery support. Trained in rehabilitation exercises and adaptive techniques.'
  ];
  
  const backgroundCheckStatuses = ['CLEAR', 'PENDING', 'NOT_STARTED', 'CLEAR', 'CLEAR', 'CLEAR'];
  
  // Generate random caregivers
  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const bio = bios[Math.floor(Math.random() * bios.length)];
    const hourlyRate = Math.floor(Math.random() * 20) + 20; // $20-40/hr
    const yearsExperience = Math.floor(Math.random() * 15) + 1; // 1-15 years
    
    // Select 2-4 random specialties
    const caregiverSpecialties = [];
    const specialtyCount = Math.floor(Math.random() * 3) + 2; // 2-4 specialties
    const shuffledSpecialties = [...specialties].sort(() => 0.5 - Math.random());
    for (let j = 0; j < specialtyCount && j < shuffledSpecialties.length; j++) {
      caregiverSpecialties.push(shuffledSpecialties[j]);
    }
    
    const backgroundCheckStatus = backgroundCheckStatuses[Math.floor(Math.random() * backgroundCheckStatuses.length)];
    
    return {
      id: `mock-${i + 1}`,
      userId: `mock-user-${i + 1}`,
      name: `${firstName} ${lastName}`,
      city,
      state,
      hourlyRate,
      yearsExperience,
      specialties: caregiverSpecialties,
      bio,
      backgroundCheckStatus,
      photoUrl: null // Mock caregivers don't have photos
    };
  });
}

/**
 * Return 405 Method Not Allowed for non-GET requests
 */
export function POST() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

/**
 * Helper function to return 405 Method Not Allowed
 */
function methodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    {
      status: 405,
      headers: {
        Allow: 'GET',
      },
    }
  );
}
