/**
 * Tests for mock data generators
 * Verifies that our mock data generators return proper image URLs
 */
import { generateMockCaregivers } from '../src/app/api/marketplace/caregivers/route';
import { generateMockHomes } from '../src/app/api/search/route';

describe('Mock data generators', () => {
  describe('generateMockCaregivers', () => {
    it('returns items with valid photoUrl for all items', () => {
      // Generate 5 mock caregivers
      const mockCaregivers = generateMockCaregivers(5);
      
      // Verify we got the expected count
      expect(mockCaregivers.length).toBe(5);
      
      // Check each caregiver has a valid photoUrl
      mockCaregivers.forEach(caregiver => {
        // photoUrl should be a string
        expect(typeof caregiver.photoUrl).toBe('string');
        
        // photoUrl should not be empty
        expect(caregiver.photoUrl.length).toBeGreaterThan(0);
        
        // photoUrl should be a valid URL
        expect(() => new URL(caregiver.photoUrl)).not.toThrow();
        
        // Verify it's a randomuser.me URL (based on our implementation)
        expect(caregiver.photoUrl).toMatch(/^https:\/\/randomuser\.me\/api\/portraits\/(women|men)\/\d+\.jpg$/);
      });
    });
  });

  describe('generateMockHomes', () => {
    it('returns items with valid imageUrl for all items', () => {
      // Generate 5 mock homes
      const mockHomes = generateMockHomes(5);
      
      // Verify we got the expected count
      expect(mockHomes.length).toBe(5);
      
      // Check each home has a valid imageUrl
      mockHomes.forEach((home, index) => {
        // imageUrl should be a string
        expect(typeof home.imageUrl).toBe('string');
        
        // imageUrl should not be empty
        expect(home.imageUrl.length).toBeGreaterThan(0);
        
        // Absolute URLs should be valid, otherwise allow relative asset paths
        if (home.imageUrl.startsWith('http')) {
          expect(() => new URL(home.imageUrl)).not.toThrow();
        } else {
          // Relative paths must start with our public images folder
          expect(home.imageUrl.startsWith('/images/')).toBe(true);
        }
        
        // Ensure it starts with either 'http' (external) or '/' (internal asset)
        expect(
          home.imageUrl.startsWith('http') || home.imageUrl.startsWith('/')
        ).toBe(true);
      });
    });
  });
});
