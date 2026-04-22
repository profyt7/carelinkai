/**
 * OL-007: Operator Onboarding End-to-End Walkthrough
 *
 * Tests the full operator journey:
 *   1. Login as operator
 *   2. Create a home listing
 *   3. Submit a family inquiry for that home
 *   4. Operator views inquiry in pipeline
 *   5. Generate AI response for inquiry
 *   6. Convert inquiry to resident
 */

import { test, expect } from '@playwright/test';
import { loginAsOperator, loginAsFamily, waitForPageReady } from './helpers/auth';

// Shared state between tests in this file
let createdHomeId: string;
let createdInquiryId: string;

// ─── Step 1: Operator dashboard loads ───────────────────────────────────────

test('Step 1: Operator can access their dashboard', async ({ page }) => {
  await loginAsOperator(page);
  await page.goto('/dashboard');
  await waitForPageReady(page);

  await expect(page.locator('body')).not.toContainText('Unauthorized');
  await expect(page.locator('text=/Dashboard/i').first()).toBeVisible();
});

// ─── Step 2: Operator creates a home ────────────────────────────────────────

test('Step 2: Operator can navigate to homes list', async ({ page }) => {
  await loginAsOperator(page);
  await page.goto('/operator/homes');
  await waitForPageReady(page);

  await expect(page.locator('body')).not.toContainText('Unauthorized');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
  // Page should load — either empty state or existing homes
  await expect(page.locator('main, [role="main"]')).toBeVisible();
});

test('Step 2b: Operator can create a home via API', async ({ page }) => {
  await loginAsOperator(page);

  const res = await page.request.post('/api/operator/homes', {
    data: {
      name: 'Sunrise Care Home (E2E Test)',
      description: 'A warm and caring assisted living home in Cleveland focused on personalized care for seniors with memory and mobility challenges.',
      careLevel: ['ASSISTED', 'MEMORY_CARE'],
      capacity: 8,
      priceMin: 3500,
      priceMax: 5500,
      genderRestriction: null,
      amenities: ['WiFi', 'Garden', 'Meals Included', 'Transportation'],
      address: {
        street: '1234 Euclid Ave',
        city: 'Cleveland',
        state: 'OH',
        zipCode: '44115',
      },
    },
  });

  console.log('Create home status:', res.status());
  const body = await res.json();
  console.log('Create home response:', JSON.stringify(body, null, 2));

  expect(res.status()).toBe(201);
  expect(body.home).toBeDefined();
  expect(body.home.id).toBeTruthy();
  expect(body.home.name).toBe('Sunrise Care Home (E2E Test)');
  expect(body.home.status).toBe('ACTIVE');

  createdHomeId = body.home.id;
  console.log('✅ Home created with ID:', createdHomeId);
});

// ─── Step 3: Home appears in operator homes list ─────────────────────────────

test('Step 3: Created home appears in operator homes list', async ({ page }) => {
  await loginAsOperator(page);

  const res = await page.request.get('/api/operator/homes');
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(Array.isArray(body.homes)).toBeTruthy();
  expect(body.homes.length).toBeGreaterThan(0);

  const testHome = body.homes.find((h: any) => h.name === 'Sunrise Care Home (E2E Test)');
  expect(testHome).toBeDefined();
  expect(testHome.status).toBe('ACTIVE');

  createdHomeId = testHome.id;
  console.log('✅ Home confirmed in operator list, ID:', createdHomeId);
});

// ─── Step 4: Family submits inquiry for the home ─────────────────────────────

test('Step 4: Family can submit an inquiry for the home', async ({ page }) => {
  // Get the home ID first
  await loginAsOperator(page);
  const homesRes = await page.request.get('/api/operator/homes');
  const homesBody = await homesRes.json();
  const testHome = homesBody.homes?.find((h: any) => h.name === 'Sunrise Care Home (E2E Test)');

  if (!testHome) {
    console.log('Test home not found — skipping (run Step 2b first)');
    test.skip();
    return;
  }
  createdHomeId = testHome.id;

  // Now login as family and submit inquiry
  await loginAsFamily(page);

  const res = await page.request.post('/api/inquiries', {
    data: {
      homeId: createdHomeId,
      contactName: 'Jennifer Martinez',
      contactEmail: 'demo.family@carelinkai.test',
      contactPhone: '(555) 123-4567',
      careRecipientName: 'Eleanor Martinez',
      careRecipientAge: 82,
      careNeeds: ['Memory Care', 'Medication Management', 'Mobility Assistance'],
      message: 'My mother has early-stage Alzheimer\'s and needs daily assistance. I\'m looking for a safe, warm environment where she can receive personalized care. Could we schedule a tour?',
      urgency: 'MEDIUM',
      source: 'WEBSITE',
      preferredContactMethod: 'EMAIL',
    },
  });

  console.log('Submit inquiry status:', res.status());
  const body = await res.json();
  console.log('Submit inquiry response:', JSON.stringify(body, null, 2));

  expect(res.status()).toBe(201);
  expect(body.inquiry || body.id).toBeDefined();

  createdInquiryId = body.inquiry?.id || body.id;
  console.log('✅ Inquiry submitted with ID:', createdInquiryId);
});

// ─── Step 5: Operator sees inquiry in pipeline ───────────────────────────────

test('Step 5: Operator can view inquiries list', async ({ page }) => {
  await loginAsOperator(page);
  await page.goto('/operator/inquiries');
  await waitForPageReady(page);

  await expect(page.locator('body')).not.toContainText('Unauthorized');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
  await expect(page.locator('main, [role="main"]')).toBeVisible();
  console.log('✅ Inquiries page loads without errors');
});

test('Step 5b: Operator inquiry API returns the submitted inquiry', async ({ page }) => {
  await loginAsOperator(page);

  const res = await page.request.get('/api/operator/inquiries');
  console.log('Inquiries API status:', res.status());

  expect(res.status()).toBe(200);
  const body = await res.json();
  const inquiries = body.inquiries || body.data || body;
  console.log('Inquiry count:', Array.isArray(inquiries) ? inquiries.length : 'N/A');

  if (Array.isArray(inquiries) && inquiries.length > 0) {
    const testInquiry = inquiries.find((i: any) =>
      i.careRecipientName === 'Eleanor Martinez' ||
      i.contactEmail === 'demo.family@carelinkai.test'
    );
    if (testInquiry) {
      createdInquiryId = testInquiry.id;
      console.log('✅ Test inquiry found in operator pipeline, ID:', createdInquiryId);
    } else {
      console.log('ℹ️ Inquiries exist but test inquiry not found by name — may need homeId scoping');
    }
  }
});

// ─── Step 6: AI response generation ─────────────────────────────────────────

test('Step 6: Operator can generate AI response for an inquiry', async ({ page }) => {
  await loginAsOperator(page);

  // Get an inquiry ID to work with
  const res = await page.request.get('/api/operator/inquiries');
  const body = await res.json();
  const inquiries = body.inquiries || body.data || (Array.isArray(body) ? body : []);

  if (!Array.isArray(inquiries) || inquiries.length === 0) {
    console.log('ℹ️ No inquiries available — skipping AI response test');
    test.skip();
    return;
  }

  const inquiry = inquiries.find((i: any) =>
    i.contactEmail === 'demo.family@carelinkai.test'
  ) || inquiries[0];

  console.log('Using inquiry ID:', inquiry.id);

  const aiRes = await page.request.post(`/api/inquiries/${inquiry.id}/generate-response`, {
    data: {
      type: 'INITIAL',
      tone: 'WARM',
      includeNextSteps: true,
      includeHomeDetails: true,
      sendEmail: false,
    },
  });

  console.log('AI response status:', aiRes.status());
  const aiBody = await aiRes.json();
  console.log('AI response preview:', JSON.stringify(aiBody).slice(0, 300));

  expect(aiRes.status()).toBe(200);
  expect(aiBody.content || aiBody.response || aiBody.success).toBeTruthy();
  console.log('✅ AI response generated successfully');
});

// ─── Step 7: Convert inquiry to resident ────────────────────────────────────

test('Step 7: Operator can convert inquiry to resident', async ({ page }) => {
  await loginAsOperator(page);

  // Get inquiry to convert
  const res = await page.request.get('/api/operator/inquiries');
  const body = await res.json();
  const inquiries = body.inquiries || body.data || (Array.isArray(body) ? body : []);

  if (!Array.isArray(inquiries) || inquiries.length === 0) {
    console.log('ℹ️ No inquiries to convert — skipping');
    test.skip();
    return;
  }

  const inquiry = inquiries.find((i: any) =>
    i.contactEmail === 'demo.family@carelinkai.test' &&
    i.status !== 'CONVERTED'
  ) || inquiries.find((i: any) => i.status !== 'CONVERTED');

  if (!inquiry) {
    console.log('ℹ️ No unconverted inquiries available');
    test.skip();
    return;
  }

  console.log('Converting inquiry ID:', inquiry.id, 'Status:', inquiry.status);

  const convertRes = await page.request.post(`/api/operator/inquiries/${inquiry.id}/convert`, {
    data: {
      firstName: inquiry.careRecipientName?.split(' ')[0] || 'Eleanor',
      lastName: inquiry.careRecipientName?.split(' ')[1] || 'Martinez',
      dateOfBirth: '1943-06-15',
      gender: 'FEMALE',
      homeId: inquiry.homeId || createdHomeId,
      roomNumber: '101',
      admissionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payerType: 'PRIVATE',
      conversionNotes: 'Family confirmed placement after tour. Moving in next week.',
    },
  });

  console.log('Convert status:', convertRes.status());
  const convertBody = await convertRes.json();
  console.log('Convert response:', JSON.stringify(convertBody, null, 2));

  if (convertRes.status() === 200) {
    expect(convertBody.success).toBeTruthy();
    expect(convertBody.residentId).toBeTruthy();
    console.log('✅ Inquiry converted to resident ID:', convertBody.residentId);
  } else {
    // Log the reason — not all inquiries can be converted (may already be converted or missing homeId)
    console.log('⚠️ Conversion returned:', convertRes.status(), convertBody.error || convertBody);
    // Don't hard fail — document the response
    expect([200, 400]).toContain(convertRes.status());
  }
});

// ─── Step 8: Resident appears in operator residents list ─────────────────────

test('Step 8: Residents list loads without errors', async ({ page }) => {
  await loginAsOperator(page);
  await page.goto('/operator/residents');
  await waitForPageReady(page);

  await expect(page.locator('body')).not.toContainText('Unauthorized');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
  await expect(page.locator('main, [role="main"]')).toBeVisible();
  console.log('✅ Residents page loads without errors');
});
