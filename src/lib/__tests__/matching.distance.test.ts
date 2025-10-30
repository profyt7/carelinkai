import { calculateDistance, scoreCaregiverForListing } from '@/lib/matching';

describe('matching distance calculations', () => {
  test('calculateDistance approximates known distances', () => {
    // San Francisco to Oakland ~ 8-10 miles
    const sf = { lat: 37.7749, lng: -122.4194 };
    const oak = { lat: 37.8044, lng: -122.2711 };
    const d = calculateDistance(sf.lat, sf.lng, oak.lat, oak.lng);
    expect(d).toBeGreaterThan(7);
    expect(d).toBeLessThan(15);
  });

  test('distance factor uses caregiver/listing coordinates when provided', () => {
    const caregiver: any = {
      id: 'cg1',
      userId: 'u1',
      specialties: [],
      hourlyRate: null,
    };
    const listingNear: any = {
      id: 'l1',
      title: 'Test',
      description: 'desc',
      specialties: [],
      services: [],
      careTypes: [],
      latitude: 37.7749,
      longitude: -122.4194,
    };

    const resNear = scoreCaregiverForListing(caregiver, listingNear, {
      caregiverLocation: { lat: 37.775, lng: -122.419 },
      maxDistance: 25,
    });
    expect(resNear.factors.distance.score).toBeGreaterThan(80);

    const listingFar: any = { ...listingNear, latitude: 34.0522, longitude: -118.2437 }; // LA
    const resFar = scoreCaregiverForListing(caregiver, listingFar, {
      caregiverLocation: { lat: 37.7749, lng: -122.4194 },
      maxDistance: 25,
    });
    expect(resFar.factors.distance.score).toBeLessThan(resNear.factors.distance.score);
  });
});
