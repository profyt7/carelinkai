import { renamedDemoEmail, isLegacyCarelinkaiDomain, planDemoEmailRenames, parseRenameMap, type RenameCandidate } from '@/lib/admin/demo-email-rename';
import { DEMO_EMAIL_RE } from '@/lib/admin/demo-identity';
import { isBlockedRecipient } from '@/lib/email/recipient-guard';

describe('renamedDemoEmail', () => {
  it.each([
    ['operator+seed@carelinkai.com', 'operator+seed@carelinkai.test'],
    ['Family.Seed2@CareLinkAI.com', 'family.seed2@carelinkai.test'],
    ['e2e-op@test.carelinkai.com', 'e2e-op@test.carelinkai.test'],
    ['admin@carelinkai.com', 'admin@seed.carelinkai.test'],
    ['operator.test@carelinkai.com', 'operator.test@seed.carelinkai.test'],
    ['x@foo.carelinkai.com', 'x@foo.carelinkai.test'],
  ])('%s → %s', (from, to) => expect(renamedDemoEmail(from)).toBe(to));

  it('leaves other domains alone', () => {
    for (const e of ['chris@getcarelinkai.com', 'a@notcarelinkai.com', 'x@carelinkai.test', 'directory-unclaimed@carelinkai.system']) {
      expect(renamedDemoEmail(e)).toBeNull();
      expect(isLegacyCarelinkaiDomain(e)).toBe(false);
    }
  });

  it('keeps demo classification and every new address is send-blocked', () => {
    for (const e of ['operator+seed@carelinkai.com', 'family.seed1@carelinkai.com', 'op@test.carelinkai.com', 'admin@carelinkai.com', 'operator.test@carelinkai.com']) {
      const to = renamedDemoEmail(e)!;
      expect(DEMO_EMAIL_RE.test(to)).toBe(DEMO_EMAIL_RE.test(e));
      expect(isBlockedRecipient(to)).toBe(true);
    }
  });
});

describe('planDemoEmailRenames', () => {
  const u = (email: string, extra: Partial<RenameCandidate> = {}): RenameCandidate => ({ id: email, email, role: 'OPERATOR', isDemo: false, lastLoginAt: null, ...extra });

  it('renames known seed/demo accounts, skips unknown ones for review', () => {
    const plan = planDemoEmailRenames([u('operator+seed@carelinkai.com'), u('admin@carelinkai.com', { role: 'ADMIN' }), u('random.person@carelinkai.com'), u('flagged@carelinkai.com', { isDemo: true })], new Set());
    expect(plan.map((r) => [r.email, r.action])).toEqual([
      ['operator+seed@carelinkai.com', 'rename'],
      ['admin@carelinkai.com', 'rename'],
      ['random.person@carelinkai.com', 'skip'],
      ['flagged@carelinkai.com', 'rename'],
    ]);
  });

  it('skips when the target exists or is excluded, and never maps two rows to one address', () => {
    const plan = planDemoEmailRenames(
      [u('admin@carelinkai.com'), u('operator@carelinkai.com'), u('Operator+Seed@carelinkai.com', { id: 'a' }), u('operator+seed@carelinkai.com', { id: 'b' })],
      new Set(['admin@seed.carelinkai.test']),
      new Set(['operator@carelinkai.com']),
    );
    expect(plan.map((r) => r.why)).toEqual(['target address already exists', 'excluded (--exclude)', 'demo email pattern', 'target address already exists']);
    expect(plan.filter((r) => r.action === 'rename')).toHaveLength(1);
  });
});

describe('--map overrides and the prod-found seeds', () => {
  const u = (email: string, extra: Partial<RenameCandidate> = {}): RenameCandidate => ({ id: email, email, role: 'OPERATOR', isDemo: false, lastLoginAt: null, ...extra });
  // The six carelinkai.com users the 2026-11-11 prod dry-run listed.
  const prodRows = [
    u('admin@carelinkai.com', { role: 'ADMIN', lastLoginAt: new Date('2026-10-24') }),
    u('caregiver@carelinkai.com', { role: 'CAREGIVER' }),
    u('demo.discharge@carelinkai.com', { role: 'DISCHARGE_PLANNER' }),
    u('discharge.planner@carelinkai.com', { role: 'DISCHARGE_PLANNER' }),
    u('family.demo1@carelinkai.com', { role: 'FAMILY' }),
    u('operator@carelinkai.com'),
  ];

  it('admin moves to the mapped owned address; every other seed (incl. caregiver@, family.demo1@) goes to .test', () => {
    const map = parseRenameMap('admin@carelinkai.com=chris@getcarelinkai.com');
    const plan = planDemoEmailRenames(prodRows, new Set(), new Set(), map);
    expect(plan.map((r) => [r.email, r.action, r.to])).toEqual([
      ['admin@carelinkai.com', 'rename', 'chris@getcarelinkai.com'],
      ['caregiver@carelinkai.com', 'rename', 'caregiver@seed.carelinkai.test'],
      ['demo.discharge@carelinkai.com', 'rename', 'demo.discharge@seed.carelinkai.test'],
      ['discharge.planner@carelinkai.com', 'rename', 'discharge.planner@seed.carelinkai.test'],
      ['family.demo1@carelinkai.com', 'rename', 'family.demo1@seed.carelinkai.test'],
      ['operator@carelinkai.com', 'rename', 'operator@seed.carelinkai.test'],
    ]);
    expect(plan[0].why).toBe('mapped (--map)');
  });

  it('a mapped target that already exists is skipped, not merged', () => {
    const plan = planDemoEmailRenames(prodRows.slice(0, 1), new Set(['chris@getcarelinkai.com']), new Set(), parseRenameMap('admin@carelinkai.com=chris@getcarelinkai.com'));
    expect(plan[0]).toMatchObject({ action: 'skip', why: 'target address already exists' });
  });

  it('--exclude still wins over --map', () => {
    const plan = planDemoEmailRenames(prodRows.slice(0, 1), new Set(), new Set(['admin@carelinkai.com']), parseRenameMap('admin@carelinkai.com=chris@getcarelinkai.com'));
    expect(plan[0]).toMatchObject({ action: 'skip', why: 'excluded (--exclude)' });
  });

  it('parseRenameMap rejects malformed pairs and carelinkai.com targets', () => {
    expect(parseRenameMap(undefined).size).toBe(0);
    expect(() => parseRenameMap('admin@carelinkai.com')).toThrow();
    expect(() => parseRenameMap('admin@carelinkai.com=nope')).toThrow();
    expect(() => parseRenameMap('admin@carelinkai.com=x@carelinkai.com')).toThrow(/not our domain/);
    expect(parseRenameMap(' Admin@CareLinkAI.com = Chris@GetCareLinkAI.com ').get('admin@carelinkai.com')).toBe('chris@getcarelinkai.com');
  });
});
