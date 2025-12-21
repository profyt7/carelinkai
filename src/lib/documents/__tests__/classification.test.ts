/**
 * Tests for document classification service
 * Phase 3: Smart Document Processing
 */

import {
  classifyDocument,
  determineReviewStatus,
  shouldAutoClassify,
  getConfidenceLevel,
  CONFIDENCE_THRESHOLDS,
} from '../classification';

describe('Document Classification Service', () => {
  describe('determineReviewStatus', () => {
    it('should return NOT_REQUIRED for high confidence', () => {
      expect(determineReviewStatus(90)).toBe('NOT_REQUIRED');
      expect(determineReviewStatus(85)).toBe('NOT_REQUIRED');
    });

    it('should return PENDING_REVIEW for medium confidence', () => {
      expect(determineReviewStatus(80)).toBe('PENDING_REVIEW');
      expect(determineReviewStatus(70)).toBe('PENDING_REVIEW');
    });

    it('should return PENDING_REVIEW for low confidence', () => {
      expect(determineReviewStatus(60)).toBe('PENDING_REVIEW');
      expect(determineReviewStatus(30)).toBe('PENDING_REVIEW');
    });
  });

  describe('shouldAutoClassify', () => {
    it('should return true for high confidence', () => {
      expect(shouldAutoClassify(90)).toBe(true);
      expect(shouldAutoClassify(85)).toBe(true);
    });

    it('should return false for medium confidence', () => {
      expect(shouldAutoClassify(80)).toBe(false);
      expect(shouldAutoClassify(70)).toBe(false);
    });

    it('should return false for low confidence', () => {
      expect(shouldAutoClassify(60)).toBe(false);
      expect(shouldAutoClassify(30)).toBe(false);
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return high level for confidence >= 85', () => {
      const result = getConfidenceLevel(90);
      expect(result.level).toBe('high');
      expect(result.label).toBe('High Confidence');
    });

    it('should return medium level for confidence 70-84', () => {
      const result = getConfidenceLevel(75);
      expect(result.level).toBe('medium');
      expect(result.label).toBe('Medium Confidence');
    });

    it('should return low level for confidence < 70', () => {
      const result = getConfidenceLevel(60);
      expect(result.level).toBe('low');
      expect(result.label).toBe('Low Confidence');
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(85);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(70);
      expect(CONFIDENCE_THRESHOLDS.LOW).toBe(0);
    });
  });
});

// Note: classifyDocument tests would require mocking OpenAI API
// These should be implemented as integration tests
