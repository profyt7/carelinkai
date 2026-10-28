/**
 * HIPAA Phase 3A — PHI audit coverage probe.
 *
 * Asserts that every PHI read-path API route imports src/lib/audit.
 * This is a static analysis substitute — it reads source files and checks
 * for the import, catching regressions where a dev removes the import.
 *
 * Integration-mock rule: we read real source files, not mocks.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(__dirname, '..', 'src', 'app', 'api');

function readRoute(relPath: string): string {
  const abs = path.join(SRC_ROOT, relPath);
  return fs.readFileSync(abs, 'utf-8');
}

function importsAudit(source: string): boolean {
  return source.includes("from '@/lib/audit'") || source.includes('from "@/lib/audit"');
}

const PHI_READ_ROUTES = [
  { path: 'residents/[id]/documents/route.ts', desc: 'residents/[id]/documents GET' },
  { path: 'operator/residents/[id]/documents/route.ts', desc: 'operator/residents/[id]/documents GET' },
  { path: 'family/gallery/route.ts', desc: 'family/gallery GET' },
  { path: 'operator/inquiries/[id]/documents/route.ts', desc: 'operator/inquiries/[id]/documents GET' },
  { path: 'family/documents/route.ts', desc: 'family/documents GET (pre-existing)' },
  { path: 'family/documents/[documentId]/download/route.ts', desc: 'family/documents/[documentId]/download GET (pre-existing)' },
];

describe('PHI read-path audit coverage probe', () => {
  PHI_READ_ROUTES.forEach(({ path: routePath, desc }) => {
    it(`${desc} imports src/lib/audit`, () => {
      const source = readRoute(routePath);
      expect(importsAudit(source)).toBe(true);
    });
  });
});
