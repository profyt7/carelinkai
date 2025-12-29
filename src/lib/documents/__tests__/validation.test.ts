/**
 * Tests for document validation service
 * Phase 3: Smart Document Processing
 */

import {
  validateDocument,
  getValidationStatus,
  formatValidationErrors,
} from '../validation';
import { ValidationError } from '@/lib/types/documents';

describe('Document Validation Service', () => {
  describe('validateDocument', () => {
    it('should reject documents with insufficient text', async () => {
      const result = await validateDocument('MEDICAL_RECORD', 'short', {});
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('content');
    });

    it('should validate medical records', async () => {
      const text = 'Patient: John Doe. Date: 01/15/2024. Diagnosis: The patient has been diagnosed with high blood pressure.';
      const result = await validateDocument('MEDICAL_RECORD', text, {});
      expect(result.success).toBe(true);
      // May have warnings but should not have critical errors
    });

    it('should validate insurance documents', async () => {
      const text = 'Insurance Policy Number: ABC123456. Member: Jane Smith. Coverage begins 01/01/2024.';
      const result = await validateDocument('INSURANCE', text, {});
      expect(result.success).toBe(true);
    });

    it('should validate identification documents', async () => {
      const text = 'Driver License. Name: John Doe. ID: DL123456789. Date of Birth: 05/20/1960. Expires: 05/20/2025.';
      const result = await validateDocument('IDENTIFICATION', text, {});
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('should validate emergency contact documents', async () => {
      const text = 'Emergency Contact: Mary Smith. Relationship: Daughter. Phone: (555) 123-4567.';
      const result = await validateDocument('EMERGENCY_CONTACT', text, {});
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('should have warnings for documents missing key information', async () => {
      const text = 'This is a medical document about some medical stuff and health related matters but no specific details.';
      const result = await validateDocument('MEDICAL_RECORD', text, {});
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getValidationStatus', () => {
    it('should return INVALID when there are errors', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is missing', severity: 'error' },
      ];
      const warnings: ValidationError[] = [];
      expect(getValidationStatus(errors, warnings)).toBe('INVALID');
    });

    it('should return NEEDS_REVIEW when there are warnings', () => {
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [
        { field: 'date', message: 'Date may be missing', severity: 'warning' },
      ];
      expect(getValidationStatus(errors, warnings)).toBe('NEEDS_REVIEW');
    });

    it('should return NEEDS_REVIEW when there are many warnings', () => {
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [
        { field: 'field1', message: 'Warning 1', severity: 'warning' },
        { field: 'field2', message: 'Warning 2', severity: 'warning' },
        { field: 'field3', message: 'Warning 3', severity: 'warning' },
        { field: 'field4', message: 'Warning 4', severity: 'warning' },
      ];
      expect(getValidationStatus(errors, warnings)).toBe('NEEDS_REVIEW');
    });

    it('should return VALID when no errors or warnings', () => {
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];
      expect(getValidationStatus(errors, warnings)).toBe('VALID');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format multiple errors', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is missing', severity: 'error' },
        { field: 'date', message: 'Date is invalid', severity: 'error' },
      ];
      const result = formatValidationErrors(errors);
      expect(result).toContain('name: Name is missing');
      expect(result).toContain('date: Date is invalid');
    });

    it('should return no errors message when empty', () => {
      const errors: ValidationError[] = [];
      const result = formatValidationErrors(errors);
      expect(result).toBe('No validation errors');
    });
  });
});
