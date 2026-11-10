import { renamedDemoEmail, isLegacyCarelinkaiDomain, planDemoEmailRenames, type RenameCandidate } from '@/lib/admin/demo-email-rename';
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
