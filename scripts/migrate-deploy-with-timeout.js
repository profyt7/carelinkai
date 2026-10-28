#!/usr/bin/env node
/**
 * OL-188 — `prisma migrate deploy` with a hard timeout, run by `npm start`
 * before the server boots.
 *
 * Why: a migrate step that hangs (e.g. waiting on Prisma's advisory lock)
 * used to sit until Render's port-bind timeout, ~25 minutes, with no useful
 * error. Now it is killed after MIGRATE_DEPLOY_TIMEOUT_SEC (default 60) and
 * the process exits non-zero, so the deploy fails fast and visibly.
 *
 *   node scripts/migrate-deploy-with-timeout.js            # npx prisma migrate deploy
 *   node scripts/migrate-deploy-with-timeout.js -- <cmd…>  # any command (tests)
 *
 * Exit codes: the child's own code; 1 if it was killed by a signal;
 * 124 on timeout (same as coreutils `timeout`).
 */
const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_SEC = 60;
const KILL_GRACE_MS = 5000;

function timeoutSec() {
  const raw = process.env.MIGRATE_DEPLOY_TIMEOUT_SEC;
  const n = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_SEC;
}

function command() {
  const sep = process.argv.indexOf('--');
  if (sep !== -1 && process.argv.length > sep + 1) return process.argv.slice(sep + 1);
  return ['npx', 'prisma', 'migrate', 'deploy'];
}

const log = (msg) => console.log(`[migrate-deploy] ${msg}`);

const [cmd, ...args] = command();
const limit = timeoutSec();
const started = Date.now();
log(`running: ${[cmd, ...args].join(' ')} (timeout ${limit}s)`);

// detached → the child leads its own process group, so a timeout can kill
// npx and everything it spawned (prisma, the schema engine).
const child = spawn(cmd, args, { stdio: 'inherit', detached: true });

let timedOut = false;
const killGroup = (signal) => {
  try {
    process.kill(-child.pid, signal);
  } catch {
    /* already gone */
  }
};

const timer = setTimeout(() => {
  timedOut = true;
  console.error(`[migrate-deploy] ERROR: timed out after ${limit}s — killing the migrate process. The server will NOT start.`);
  killGroup('SIGTERM');
  setTimeout(() => killGroup('SIGKILL'), KILL_GRACE_MS).unref();
}, limit * 1000);

// The child is in its own group, so pass on a shutdown signal (Render stopping
// the instance mid-migrate) instead of orphaning it.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.error(`[migrate-deploy] received ${sig} — stopping the migrate process.`);
    killGroup(sig);
  });
}

child.on('error', (err) => {
  clearTimeout(timer);
  console.error(`[migrate-deploy] ERROR: could not start ${cmd}: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (timedOut) process.exit(124);
  if (code === 0) {
    log(`done in ${secs}s`);
    process.exit(0);
  }
  console.error(`[migrate-deploy] ERROR: failed after ${secs}s (${signal ? `signal ${signal}` : `exit ${code}`}). The server will NOT start.`);
  process.exit(code || 1);
});
