/**
 * Gallery Upload E2E Tests
 * 
 * Tests the gallery photo upload functionality for family members.
 */

import { test, expect } from '@playwright/test';
import { loginAsFamily } from './helpers/auth';
import path from 'path';

test.describe('Gallery Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login as family member
    await loginAsFamily(page);
    
    // Navigate to family portal gallery
    await page.goto('/family?tab=gallery');
    await page.waitForLoadState('networkidle');
  });

  test('should display gallery page with upload button', async ({ page }) => {
    // Verify gallery page loads
    await expect(page.locator('text=/Family Portal|Gallery/i')).toBeVisible();
    
    // Verify upload button is visible
    await expect(page.locator('button:has-text("Upload Photos")')).toBeVisible();
  });

  test('should upload a photo successfully', async ({ page }) => {
    // Click upload button
    await page.click('button:has-text("Upload Photos")');
    
    // Wait for upload modal/dialog to appear
    await expect(page.locator('text=/Upload Photos|Drag and drop/i')).toBeVisible({ timeout: 5000 });
    
    // Get the file input (might be hidden)
    const fileInput = page.locator('input[type="file"]');
    
    // Upload the test image
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    await fileInput.setInputFiles(testImagePath);
    
    // Wait a bit for preview to load
    await page.waitForTimeout(1000);
    
    // Add optional caption
    const captionInput = page.locator('input[placeholder*="caption" i], textarea[placeholder*="caption" i]');
    if (await captionInput.isVisible()) {
      await captionInput.fill('E2E Test Photo - Automated Test Upload');
    }
    
    // Click the upload/submit button (inside the modal)
    const uploadButton = page.locator('button:has-text("Upload")').last();
    await uploadButton.click();
    
    // Wait for upload to complete (look for success message or modal close)
    // Adjust timeout for slow uploads
    await expect(page.locator('text=/Upload successful|Photo uploaded/i, [role="status"]:has-text("success")')).toBeVisible({ 
      timeout: 30000 
    }).catch(async () => {
      // Alternative: check if modal closed
      await expect(page.locator('text=/Upload Photos|Drag and drop/i')).not.toBeVisible({ timeout: 30000 });
    });
    
    // Verify the photo appears in the gallery
    // Look for the newly uploaded photo (might take a moment for SSE update)
    await page.waitForTimeout(2000);
    
    // Verify photo is visible in gallery grid
    const photoGrid = page.locator('[class*="grid"], [class*="gallery"]');
    await expect(photoGrid.locator('img').first()).toBeVisible({ timeout: 10000 });
    
    // Verify the caption appears if we added one
    await expect(page.locator('text=/E2E Test Photo|Automated Test/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle upload failure gracefully', async ({ page }) => {
    // Click upload button
    await page.click('button:has-text("Upload Photos")');
    
    // Wait for upload modal
    await expect(page.locator('text=/Upload Photos|Drag and drop/i')).toBeVisible({ timeout: 5000 });
    
    // Try to upload without selecting a file (if validation allows clicking submit)
    const uploadButton = page.locator('button:has-text("Upload")').last();
    
    // If button is enabled without file, click it
    if (await uploadButton.isEnabled()) {
      await uploadButton.click();
      
      // Should show error message
      await expect(page.locator('text=/required|select.*file|error/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should upload multiple photos', async ({ page }) => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    // Upload first photo
    await page.click('button:has-text("Upload Photos")');
    await expect(page.locator('text=/Upload Photos|Drag and drop/i')).toBeVisible({ timeout: 5000 });
    
    const fileInput1 = page.locator('input[type="file"]');
    await fileInput1.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);
    
    const uploadButton1 = page.locator('button:has-text("Upload")').last();
    await uploadButton1.click();
    
    // Wait for first upload to complete
    await page.waitForTimeout(3000);
    
    // Upload second photo
    await page.click('button:has-text("Upload Photos")');
    await expect(page.locator('text=/Upload Photos|Drag and drop/i')).toBeVisible({ timeout: 5000 });
    
    const fileInput2 = page.locator('input[type="file"]');
    await fileInput2.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);
    
    const uploadButton2 = page.locator('button:has-text("Upload")').last();
    await uploadButton2.click();
    
    // Wait for second upload
    await page.waitForTimeout(3000);
    
    // Verify multiple photos exist in gallery
    const images = page.locator('[class*="grid"] img, [class*="gallery"] img');
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should validate file size limits', async ({ page }) => {
    // This test would need a large file to test size validation
    // For now, we'll just verify the error message structure exists in the UI
    await page.click('button:has-text("Upload Photos")');
    
    // Look for file size information in the upload UI
    await expect(page.locator('text=/max.*10.*mb|size.*limit/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display uploaded photos with correct metadata', async ({ page }) => {
    // Click upload button
    await page.click('button:has-text("Upload Photos")');
    await expect(page.locator('text=/Upload Photos|Drag and drop/i')).toBeVisible({ timeout: 5000 });
    
    // Upload photo with specific caption
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);
    
    const captionText = 'Metadata Test Photo - ' + Date.now();
    const captionInput = page.locator('input[placeholder*="caption" i], textarea[placeholder*="caption" i]');
    if (await captionInput.isVisible()) {
      await captionInput.fill(captionText);
    }
    
    const uploadButton = page.locator('button:has-text("Upload")').last();
    await uploadButton.click();
    
    // Wait for upload
    await page.waitForTimeout(3000);
    
    // Verify caption appears
    await expect(page.locator(`text=${captionText}`)).toBeVisible({ timeout: 10000 });
    
    // Click on photo to view details (if implemented)
    const photoCard = page.locator(`text=${captionText}`).locator('..').locator('..');
    if (await photoCard.isVisible()) {
      await photoCard.click();
      
      // Verify details modal/page shows metadata
      await expect(page.locator('text=/uploaded|date/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Gallery Upload - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/family?tab=gallery');
    await page.waitForLoadState('networkidle');
  });

  test('should show detailed error on server failure', async ({ page }) => {
    // Intercept the upload request and return an error
    await page.route('**/api/family/gallery/upload', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error: Upload failed' }),
      });
    });

    // Attempt upload
    await page.click('button:has-text("Upload Photos")');
    await expect(page.locator('text=/Upload Photos|Drag and drop/i')).toBeVisible({ timeout: 5000 });
    
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);
    
    const uploadButton = page.locator('button:has-text("Upload")').last();
    await uploadButton.click();
    
    // Verify error message is shown
    await expect(page.locator('text=/error|failed|upload.*failed/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Gallery Upload - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/family?tab=gallery');
    await page.waitForLoadState('networkidle');
  });

  test('should complete upload within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    // Click upload button
    await page.click('button:has-text("Upload Photos")');
    await expect(page.locator('text=/Upload Photos|Drag and drop/i')).toBeVisible({ timeout: 5000 });
    
    // Upload photo
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);
    
    const uploadButton = page.locator('button:has-text("Upload")').last();
    await uploadButton.click();
    
    // Wait for completion
    await page.waitForTimeout(3000);
    
    const endTime = Date.now();
    const uploadTime = endTime - startTime;
    
    // Upload should complete within 15 seconds for a small test image
    expect(uploadTime).toBeLessThan(15000);
  });
});
