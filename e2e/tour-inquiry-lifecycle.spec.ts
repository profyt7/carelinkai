import { test, expect } from '@playwright/test';
import { upsertOperator, upsertFamily, loginAs } from './_helpers';

test.describe('@critical Tour/inquiry lifecycle', () => {
  test('family submits inquiry → operator schedules tour → marks tour completed', async ({
    page,
    request,
  }) => {
    const opEmail = `tour-op-${Date.now()}@test.carelinkai.com`;
    const famEmail = `tour-fam-${Date.now()}@test.carelinkai.com`;

    // 1. Seed operator with a home
    const opRes = await request.post('/api/dev/upsert-operator', {
      data: { email: opEmail, companyName: 'Tour Test Co', homes: [{ name: 'Tour Home', capacity: 5 }] },
    });
    expect(opRes.ok()).toBeTruthy();
    const { homeId } = await opRes.json();
    expect(homeId).toBeTruthy();

    // 2. Seed family
    const famData = await upsertFamily(request, famEmail);
    const familyId = famData.familyId;

    // 3. Family submits inquiry via API (public endpoint — no auth required)
    const inquiryRes = await request.post('/api/inquiries', {
      data: {
        familyId,
        homeId,
        contactName: 'E2E Family',
        contactEmail: famEmail,
        careRecipientName: 'Test Resident',
        careNeeds: ['ASSISTED_LIVING'],
        urgency: 'MEDIUM',
        source: 'WEBSITE',
      },
    });
    expect(inquiryRes.ok()).toBeTruthy();
    const { inquiry } = await inquiryRes.json();
    expect(inquiry.id).toBeTruthy();
    expect(inquiry.status).toBe('NEW');

    // 4. Operator logs in and updates inquiry status to TOUR_SCHEDULED
    await loginAs(page, opEmail);
    const scheduleRes = await page.evaluate(
      async ({ inquiryId }: { inquiryId: string }) => {
        const r = await fetch(`/api/operator/inquiries/${inquiryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'TOUR_SCHEDULED' }),
        });
        return { status: r.status, body: await r.json() };
      },
      { inquiryId: inquiry.id }
    );
    expect(scheduleRes.status).toBe(200);
    expect(scheduleRes.body.status).toBe('TOUR_SCHEDULED');

    // 5. Operator marks tour completed
    const completeRes = await page.evaluate(
      async ({ inquiryId }: { inquiryId: string }) => {
        const r = await fetch(`/api/operator/inquiries/${inquiryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'TOUR_COMPLETED' }),
        });
        return { status: r.status, body: await r.json() };
      },
      { inquiryId: inquiry.id }
    );
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe('TOUR_COMPLETED');
  });
});
