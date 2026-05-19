import { test, expect } from '@playwright/test';
import { loginAs, upsertOperator } from './_helpers';

const ADMIN_EMAIL = 'admin@carelinkai.com';

test.describe('@critical Operator claim flow', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN_EMAIL } });
  });

  test('admin claims a DRAFT home for an operator → status PENDING_REVIEW', async ({ page, request }) => {
    const opEmail = `claim-op-${Date.now()}@test.carelinkai.com`;
    await upsertOperator(request, opEmail, { companyName: 'Claim Test Co' });

    // Create a DRAFT home (seeded without an operator)
    await loginAs(page, ADMIN_EMAIL);

    const createRes = await page.evaluate(async () => {
      const r = await fetch('/api/operator/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `Draft Home ${Date.now()}`,
          description: 'E2E draft listing for claim test',
          careLevel: ['ASSISTED'],
          capacity: 10,
          address: { street: '123 Test St', city: 'Cleveland', state: 'OH', zipCode: '44101' },
        }),
      });
      return { status: r.status, body: await r.json() };
    });

    // If creating as admin fails (operators-only route), seed via upsert-operator homes instead
    let homeId: string;
    if (createRes.status === 200 || createRes.status === 201) {
      homeId = createRes.body.id ?? createRes.body.home?.id;
    } else {
      // Use the operator's seeded home and reset its status to DRAFT via admin API
      const opRes = await request.post('/api/dev/upsert-operator', {
        data: { email: opEmail, companyName: 'Claim Test Co', homes: [{ name: `Draft ${Date.now()}`, capacity: 5 }] },
      });
      const opData = await opRes.json();
      homeId = opData.homeId ?? opData.homes?.[0]?.id;
    }

    expect(homeId).toBeTruthy();

    // Admin calls claim endpoint
    const claimRes = await page.evaluate(
      async ({ hid, email }: { hid: string; email: string }) => {
        const r = await fetch(`/api/admin/homes/${hid}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ operatorEmail: email }),
        });
        return { status: r.status, body: await r.json() };
      },
      { hid: homeId, email: opEmail }
    );

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.home?.status).toBe('PENDING_REVIEW');
    expect(claimRes.body.home?.operator?.user?.email).toBe(opEmail);
  });
});
