/**
 * OL-188 — `npm start` runs `prisma migrate deploy` through a timeout wrapper,
 * and nothing else: the five one-time `migrate resolve --rolled-back` repairs
 * no longer run on every boot. The wrapper runs a fake command here (no DB).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const WRAPPER = path.join(root, 'scripts/migrate-deploy-with-timeout.js');

function run(fake: string, env: Record<string, string> = {}) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [WRAPPER, '--', process.execPath, '-e', fake], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 30_000,
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}`, ms: Date.now() - started };
}

describe('scripts/migrate-deploy-with-timeout.js', () => {
  it('passes a successful run through (exit 0, child output kept)', () => {
    const r = run('console.log("No pending migrations to apply.")');
    expect(r.status).toBe(0);
    expect(r.out).toContain('No pending migrations to apply.');
    expect(r.out).toMatch(/\[migrate-deploy\] done in/);
  });

  it("propagates the command's own non-zero exit code", () => {
    const r = run('console.error("P3009 failed migrations"); process.exit(3)');
    expect(r.status).toBe(3);
    expect(r.out).toContain('P3009 failed migrations');
    expect(r.out).toMatch(/ERROR: failed after .*exit 3.*will NOT start/);
  });

  it('kills a hung command at the timeout and exits 124 with a log line', () => {
    // A child that would hang for 60s; the wrapper must stop it after ~1s.
    const r = run('setTimeout(() => {}, 60000)', { MIGRATE_DEPLOY_TIMEOUT_SEC: '1' });
    expect(r.status).toBe(124);
    expect(r.out).toMatch(/ERROR: timed out after 1s .*will NOT start/);
    expect(r.ms).toBeLessThan(15_000);
  });

  it('also kills grandchildren (the whole process group), like npx → prisma', () => {
    const marker = path.join(root, `.tmp-ol188-${process.pid}`);
    // The child spawns a grandchild (same process group) that would write the
    // marker after 3s; the group kill at 1s must stop it.
    const fake = `require('child_process').spawn(process.execPath, ['-e', "setTimeout(()=>require('fs').writeFileSync('${marker}', 'x'), 3000)"], { stdio: 'inherit' }); setTimeout(()=>{}, 60000)`;
    try {
      const r = run(fake, { MIGRATE_DEPLOY_TIMEOUT_SEC: '1' });
      expect(r.status).toBe(124);
      spawnSync(process.execPath, ['-e', 'setTimeout(()=>{}, 3500)']);
      expect(fs.existsSync(marker)).toBe(false);
    } finally {
      fs.rmSync(marker, { force: true });
    }
  });

  it('a missing command fails fast with exit 1', () => {
    const r = spawnSync(process.execPath, [WRAPPER, '--', 'definitely-not-a-command-ol188'], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(`${r.stderr}`).toMatch(/could not start definitely-not-a-command-ol188/);
  });

  it('ignores an invalid timeout env and falls back to 60s', () => {
    const r = run('process.exit(0)', { MIGRATE_DEPLOY_TIMEOUT_SEC: 'abc' });
    expect(r.status).toBe(0);
    expect(r.out).toContain('(timeout 60s)');
  });
});

describe('package.json start path', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  it('migrate:deploy is only the timeout wrapper (no migrate resolve on boot)', () => {
    expect(pkg.scripts['migrate:deploy']).toBe('node scripts/migrate-deploy-with-timeout.js');
    expect(pkg.scripts.start).not.toMatch(/migrate resolve/);
    expect(pkg.scripts['migrate:deploy']).not.toMatch(/migrate resolve/);
  });

  it('start = migrate deploy, then the standalone server (not `next start`)', () => {
    expect(pkg.scripts.start).toMatch(/^npm run migrate:deploy && .*node \.next\/standalone\/server\.js$/);
  });

  it('the wrapper defaults to `npx prisma migrate deploy`', () => {
    expect(fs.readFileSync(WRAPPER, 'utf8')).toContain("['npx', 'prisma', 'migrate', 'deploy']");
  });

  it('the five historical resolves live in scripts/one-time with a README', () => {
    const sh = fs.readFileSync(path.join(root, 'scripts/one-time/resolve-rolled-back-migrations.sh'), 'utf8');
    for (const m of [
      'draft_add_document_processing',
      '20251220024025_phase1a_document_processing',
      '20251218162945_update_homes_to_active',
      '20251221011617_add_document_classification_validation',
      '20260107004129_add_impersonation_feature',
    ]) {
      expect(sh).toContain(m);
    }
    expect(fs.readFileSync(path.join(root, 'scripts/one-time/README.md'), 'utf8')).toMatch(/already applied in production/i);
  });
});
