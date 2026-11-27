/**
 * The nightly failure notifier must fire when ANY e2e job fails on the schedule. It used to need only
 * residents / family / merge-reports, so the 11/18–11/20 nightlies (red in e2e-operator-claim) skipped it.
 */
import fs from 'fs';
import path from 'path';

const wf = fs.readFileSync(path.join(process.cwd(), '.github/workflows/e2e-family.yml'), 'utf8');
const jobsBlock = wf.slice(wf.indexOf('\njobs:'));
const jobNames = [...jobsBlock.matchAll(/^ {2}([a-z0-9-]+):\s*$/gm)].map((m) => m[1]);
const notifier = jobsBlock.slice(jobsBlock.indexOf('\n  e2e-notify-failure:'));
const needs = (notifier.match(/^ {4}needs: \[([^\]]*)\]/m)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const cond = notifier.match(/^ {4}if: (.*)$/m)?.[1] ?? '';

it('needs every e2e job', () => {
  const e2eJobs = jobNames.filter((j) => j.startsWith('e2e-') && j !== 'e2e-notify-failure');
  expect(e2eJobs.length).toBeGreaterThanOrEqual(7);
  expect(e2eJobs.filter((j) => !needs.includes(j))).toEqual([]);
});

it('fires on any failure among them, only on the nightly schedule, even when jobs fail', () => {
  expect(cond).toContain('always()');
  expect(cond).toContain("github.event_name == 'schedule'");
  expect(cond).toContain("contains(needs.*.result, 'failure')");
});
