/**
 * HIPAA Phase 1 — Purge seed Cloudinary files from PHI tables
 *
 * Removes Cloudinary-hosted files from the 4 PHI-bearing upload tables:
 *   ResidentDocument (1 file), FamilyDocument (8), InquiryDocument (3), GalleryPhoto (14)
 *
 * Production DB confirmed SEED_ONLY as of 2026-05-13 — no real PHI at risk.
 * Run with --dry-run first. Execute for real only after PR 1 + PR 2 are merged.
 *
 * See HIPAA_PHASE_1_DESIGN.md §3, CARELINKAI_RISK_REGISTER.md#risk-1
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/phase1-purge-cloudinary-seeds.ts --dry-run
 *   npx ts-node --transpile-only scripts/phase1-purge-cloudinary-seeds.ts
 */

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const isDryRun = process.argv.includes('--dry-run');
const isVerbose = process.argv.includes('--verbose') || isDryRun;

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

/**
 * Extract Cloudinary public_id and resource_type from a URL.
 * Example: https://res.cloudinary.com/mycloud/image/upload/v1234/carelinkai/docs/abc.pdf
 *   → { publicId: 'carelinkai/docs/abc', resourceType: 'image' }
 */
function parseCloudinaryUrl(url: string): { publicId: string; resourceType: string } | null {
  try {
    const match = url.match(/cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)/);
    if (!match) return null;
    const resourceType = match[1];
    // Remove file extension from publicId
    const withExt = match[2];
    const lastDot = withExt.lastIndexOf('.');
    const publicId = lastDot > -1 ? withExt.slice(0, lastDot) : withExt;
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

type PurgeRow = { id: string; fileUrl: string };

async function purgeTable(
  tableName: string,
  rows: PurgeRow[]
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  const cloudinaryRows = rows.filter((r) => isCloudinaryUrl(r.fileUrl));
  console.log(`\n[${tableName}] ${cloudinaryRows.length} Cloudinary row(s) found (of ${rows.length} total)`);

  for (const row of cloudinaryRows) {
    const parsed = parseCloudinaryUrl(row.fileUrl);
    if (!parsed) {
      console.error(`  [ERROR] Cannot parse publicId from URL: ${row.fileUrl} (id=${row.id}) — SKIPPING`);
      errors++;
      continue;
    }

    const { publicId, resourceType } = parsed;

    if (isDryRun) {
      console.log(`  [DRY-RUN] would destroy Cloudinary ${resourceType}/${publicId} + delete DB row ${row.id}`);
      deleted++;
      continue;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as 'image' | 'raw' | 'video',
        invalidate: true,
      });

      if (result.result === 'ok' || result.result === 'not found') {
        if (isVerbose) {
          console.log(`  [OK] Cloudinary destroy: ${publicId} (result=${result.result})`);
        }
        // Only delete DB row after Cloudinary confirms gone
        await deleteRow(tableName, row.id);
        if (isVerbose) {
          console.log(`  [OK] DB row deleted: ${row.id}`);
        }
        deleted++;
      } else {
        console.error(`  [ERROR] Cloudinary destroy returned unexpected result: ${JSON.stringify(result)} for ${publicId} — SKIPPING DB delete`);
        errors++;
      }
    } catch (err) {
      console.error(`  [ERROR] Cloudinary destroy threw for ${publicId}: ${err} — SKIPPING DB delete`);
      errors++;
    }
  }

  return { deleted, errors };
}

async function deleteRow(tableName: string, id: string): Promise<void> {
  switch (tableName) {
    case 'ResidentDocument':
      await prisma.residentDocument.delete({ where: { id } });
      break;
    case 'FamilyDocument':
      await prisma.familyDocument.delete({ where: { id } });
      break;
    case 'InquiryDocument':
      await prisma.inquiryDocument.delete({ where: { id } });
      break;
    case 'GalleryPhoto':
      await prisma.galleryPhoto.delete({ where: { id } });
      break;
    default:
      throw new Error(`Unknown table: ${tableName}`);
  }
}

async function verifyZeroCloudinaryRows(): Promise<void> {
  const [rd, fd, id, gp] = await Promise.all([
    prisma.residentDocument.count({ where: { fileUrl: { contains: 'cloudinary' } } }),
    prisma.familyDocument.count({ where: { fileUrl: { contains: 'cloudinary' } } }),
    prisma.inquiryDocument.count({ where: { fileUrl: { contains: 'cloudinary' } } }),
    prisma.galleryPhoto.count({ where: { fileUrl: { contains: 'cloudinary' } } }),
  ]);
  console.log('\n=== POST-PURGE VERIFICATION ===');
  console.log(`ResidentDocument  Cloudinary rows: ${rd}`);
  console.log(`FamilyDocument    Cloudinary rows: ${fd}`);
  console.log(`InquiryDocument   Cloudinary rows: ${id}`);
  console.log(`GalleryPhoto      Cloudinary rows: ${gp}`);
  const total = rd + fd + id + gp;
  if (total === 0) {
    console.log('✓ PASS — 0 Cloudinary rows remain across all 4 PHI tables');
  } else {
    console.error(`✗ FAIL — ${total} Cloudinary row(s) remain — review errors above`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  console.log('=== HIPAA Phase 1 — Cloudinary Seed Purge ===');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no changes)' : 'LIVE'}`);
  console.log('Tables: ResidentDocument, FamilyDocument, InquiryDocument, GalleryPhoto\n');

  if (!isDryRun) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('ERROR: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET must be set');
      process.exit(1);
    }
  }

  const [residentDocs, familyDocs, inquiryDocs, galleryPhotos] = await Promise.all([
    prisma.residentDocument.findMany({ select: { id: true, fileUrl: true } }),
    prisma.familyDocument.findMany({ select: { id: true, fileUrl: true } }),
    prisma.inquiryDocument.findMany({ select: { id: true, fileUrl: true } }),
    prisma.galleryPhoto.findMany({ select: { id: true, fileUrl: true } }),
  ]);

  const results = await Promise.all([
    purgeTable('ResidentDocument', residentDocs),
    purgeTable('FamilyDocument', familyDocs),
    purgeTable('InquiryDocument', inquiryDocs),
    purgeTable('GalleryPhoto', galleryPhotos),
  ]);

  const totalDeleted = results.reduce((s, r) => s + r.deleted, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);

  console.log('\n=== SUMMARY ===');
  console.log(`${isDryRun ? 'Would delete' : 'Deleted'}: ${totalDeleted}`);
  console.log(`Errors: ${totalErrors}`);

  if (!isDryRun) {
    await verifyZeroCloudinaryRows();
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
