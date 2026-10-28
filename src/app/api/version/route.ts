
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// Assumptions:
// - Render sets RENDER_GIT_COMMIT and RENDER_GIT_BRANCH at runtime; fall back to common CI vars.
// - APP_VERSION and BUILD_TIME can be optionally provided via env; otherwise we use npm_package_version and serverTime.
// - RBAC: public read-only endpoint (no PHI), safe to expose for diagnostics.

export async function GET() {
  const info = {
    commitSha:
      process.env['RENDER_GIT_COMMIT'] ||
      process.env['VERCEL_GIT_COMMIT_SHA'] ||
      process.env['GITHUB_SHA'] ||
      process.env['GIT_COMMIT'] ||
      'unknown',
    branch:
      process.env['RENDER_GIT_BRANCH'] ||
      process.env['VERCEL_GIT_COMMIT_REF'] ||
      process.env['GITHUB_REF_NAME'] ||
      process.env['GIT_BRANCH'] ||
      'unknown',
    version: process.env['APP_VERSION'] || process.env['npm_package_version'] || '0.0.0',
    buildTime: process.env['BUILD_TIME'] || null,
    serverTime: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    platform: process.env['RENDER'] ? 'render' : process.env['VERCEL'] ? 'vercel' : 'node'
  };
  return NextResponse.json(info);
}
