#!/usr/bin/env npx tsx
/**
 * scripts/report-placement-fee-payments.ts
 *
 * READ-ONLY report of every Payment row of type PLACEMENT_FEE — the rows the
 * pre-OL-124 conversion path wrote ($1,500 in prod per OL-030) before the
 * PLACEMENT_FEE_ENABLED gate landed (#721). Answers: how many, which operator,
 * how much, when, and whether a Stripe invoice item was actually queued
 * (stripePaymentId starting with "ii_").
 *
 * Writes nothing. Safe to run anytime. No PHI (operator/company only).
 *
 * Usage (Render shell, or anywhere with prod DATABASE_URL):
 *   npx tsx scripts/report-placement-fee-payments.ts          # table + totals
 *   npx tsx scripts/report-placement-fee-payments.ts --tsv    # tab-separated rows
 *   npx tsx scripts/report-placement-fee-payments.ts --json   # raw JSON
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mode = process.argv.includes('--json') ? 'json' : process.argv.includes('--tsv') ? 'tsv' : 'table';

  const rows = await prisma.payment.findMany({
    where: { type: 'PLACEMENT_FEE' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      createdAt: true,
      amount: true,
      status: true,
      description: true,
      stripePaymentId: true,
      user: {
        select: {
          email: true,
          operator: { select: { id: true, companyName: true, stripeCustomerId: true } },
        },
      },
    },
  });

  const shaped = rows.map((r) => ({
    paymentId: r.id,
    createdAt: r.createdAt.toISOString(),
    amountUsd: Number(r.amount),
    status: r.status,
    operatorId: r.user.operator?.id ?? null,
    operator: r.user.operator?.companyName ?? '(no operator record)',
    operatorEmail: r.user.email,
    operatorHasStripeCustomer: Boolean(r.user.operator?.stripeCustomerId),
    stripeInvoiceItemId: r.stripePaymentId && r.stripePaymentId.startsWith('ii_') ? r.stripePaymentId : null,
    stripeRefOther: r.stripePaymentId && !r.stripePaymentId.startsWith('ii_') ? r.stripePaymentId : null,
    description: r.description ?? '',
  }));

  if (mode === 'json') {
    console.log(JSON.stringify(shaped, null, 2));
    return;
  }

  const withInvoice = shaped.filter((r) => r.stripeInvoiceItemId);
  const total = shaped.reduce((s, r) => s + r.amountUsd, 0);

  if (withInvoice.length) {
    console.log(`\n⚠️  ${withInvoice.length} PLACEMENT_FEE row(s) carry a Stripe invoice-item id — a real charge may have been queued:`);
    for (const r of withInvoice) console.log(`   ${r.paymentId}  ${r.createdAt.slice(0, 10)}  ${r.operator}  $${r.amountUsd}  ${r.stripeInvoiceItemId}  (${r.status})`);
  } else {
    console.log('\n✅ No PLACEMENT_FEE row carries a Stripe invoice-item id (nothing was queued to Stripe).');
  }

  console.log(`\nPLACEMENT_FEE payments: ${shaped.length} row(s), $${total.toFixed(2)} total, by status: ${JSON.stringify(
    shaped.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {})
  )}\n`);

  if (mode === 'tsv') {
    console.log(['paymentId', 'createdAt', 'amountUsd', 'status', 'operatorId', 'operator', 'operatorEmail', 'stripeInvoiceItemId', 'description'].join('\t'));
    for (const r of shaped) {
      console.log([r.paymentId, r.createdAt, r.amountUsd, r.status, r.operatorId ?? '', r.operator, r.operatorEmail, r.stripeInvoiceItemId ?? '', r.description].join('\t'));
    }
    return;
  }

  for (const r of shaped) {
    console.log(
      `${r.createdAt.slice(0, 10)}  $${String(r.amountUsd).padStart(7)}  ${r.status.padEnd(10)}  ${r.operator.padEnd(32).slice(0, 32)}  ${r.stripeInvoiceItemId ?? '-'}  ${r.paymentId}`
    );
  }
}

main()
  .catch((e) => {
    console.error('report failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
