import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('enterprise auth, RBAC and tenant-isolation invariants', () => {
  it('uses Supabase Auth as the single active identity source', () => {
    const middleware = readRepoFile('src/middleware.ts');
    const authHook = readRepoFile('src/hooks/useAuth.tsx');
    const authQuery = readRepoFile('src/server/queries/auth.ts');

    expect(middleware).toContain('supabase.auth.getUser()');
    expect(authHook).toContain('supabase.auth.getSession()');
    expect(authHook).toContain('supabase.auth.signInWithPassword');
    expect(authHook).toContain('supabase.auth.signUp');
    expect(authHook).toContain("provider: 'google'");
    expect(authQuery).toContain("source: 'supabase'");
    expect(authQuery.toLowerCase()).not.toContain('clerk');
  });

  it('binds active organization RBAC to Supabase user_id only', () => {
    const activeAuthorizationFiles = [
      'src/server/security/rbac.ts',
      'src/server/queries/current-organization.ts',
      'src/server/queries/organizations.ts',
      'src/server/actions/organizations.ts',
      'src/server/actions/members.ts',
      'src/server/actions/onboarding.ts',
      'src/app/api/internal/trial-reminders/route.ts',
    ];

    for (const file of activeAuthorizationFiles) {
      const source = readRepoFile(file);
      expect(source).not.toContain('clerk_user_id');
      expect(source).not.toContain('created_by_clerk_user_id');
      expect(source).not.toContain('clerk_org_id');
      expect(source).not.toContain('identityColumn');
      expect(source).not.toContain('getOrganizationByClerkOrgId');
    }

    const rbacSource = readRepoFile('src/server/security/rbac.ts');
    const canonicalMembershipQuery = readRepoFile('src/server/queries/current-organization.ts');
    const organizationQuery = readRepoFile('src/server/queries/organizations.ts');

    expect(rbacSource).toContain(".eq('user_id', userId)");
    expect(canonicalMembershipQuery).toContain(".eq('user_id', userId)");
    expect(canonicalMembershipQuery).toContain(".eq('status', 'active')");
    expect(organizationQuery).toContain('getUserOrganizationMemberships(userId)');
    expect(organizationQuery).not.toContain(".from('organization_members')");
    const organizationAction = readRepoFile('src/server/actions/organizations.ts');
    const organizationCreationMigration = readRepoFile(
      'supabase/migrations/20260716180000_atomic_organization_creation.sql',
    );
    expect(organizationAction).toContain('p_user_id: user.id');
    expect(organizationCreationMigration).toContain("values (v_organization.id, p_user_id, 'owner')");
    const onboardingAction = readRepoFile('src/server/actions/onboarding.ts');
    const onboardingActivationMigration = readRepoFile(
      'supabase/migrations/20260716183000_atomic_onboarding_activation.sql',
    );
    const activationRunInsert = onboardingActivationMigration.slice(
      onboardingActivationMigration.indexOf('insert into public.onboarding_activation_runs'),
      onboardingActivationMigration.indexOf('update public.organizations'),
    );
    expect(onboardingAction).toContain('p_actor_user_id: user.id');
    expect(onboardingActivationMigration).toContain('members.user_id = p_actor_user_id');
    expect(activationRunInsert).toContain('p_actor_user_id');
  });

  it('keeps open redirects rejected in login, signup and OAuth callback', () => {
    const login = readRepoFile('src/app/[locale]/login/page.tsx');
    const signup = readRepoFile('src/app/[locale]/signup/page.tsx');
    const callback = readRepoFile('src/app/auth/callback/route.ts');

    for (const source of [login, signup, callback]) {
      expect(source).toContain("startsWith('//')");
      expect(source).toContain("includes('://')");
    }

    expect(callback).toContain('isAllowedCallbackContinuation(normalizedNext, locale)');
  });

  it('keeps private API failures sanitized, no-store and requestId-correlated', () => {
    const apiGuards = readRepoFile('src/server/security/api-guards.ts');

    expect(apiGuards).toContain('getRequestId');
    expect(apiGuards).toContain('requestId');
    expect(apiGuards).toContain('noStoreJson({ error: error.code, requestId }');
    expect(apiGuards).toContain('[api-security] route_failed');
    expect(apiGuards).not.toContain('message: error.message');
  });

  it('requires step-up coverage for high-risk enterprise actions', () => {
    const stepUpCheck = readRepoFile('scripts/security/check-step-up.mjs');

    for (const action of [
      'manage_billing',
      'manage_team',
      'gdpr_delete',
      'audit_chain_export',
      'change_security_settings',
    ]) {
      expect(stepUpCheck).toContain(action);
    }
  });

  it('documents the final auth/RBAC review and validates placeholder or authoritative exact-SHA runtime evidence', () => {
    const reviewPath = 'docs/security/AUTH_RBAC_ENTERPRISE_REVIEW.md';
    const evidencePath = 'docs/security/evidence/runtime/auth-rbac-final-validation.json';

    expect(existsSync(join(process.cwd(), reviewPath))).toBe(true);
    expect(existsSync(join(process.cwd(), evidencePath))).toBe(true);

    const review = readRepoFile(reviewPath);
    const evidence = JSON.parse(readRepoFile(evidencePath));

    expect(review).toContain('Supabase Auth');
    expect(review).toContain('Go/No-Go');

    if (evidence.schema === 'risck-comply.auth-rbac-runtime-evidence.v2') {
      expect(evidence.evidenceItem).toBe('auth-rbac-final-validation');
      expect(evidence.status).toBe('Complete');
      expect(evidence.outcome).toBe('passed');
      expect(evidence.repository).toBe('renanescola40-afk/eurocomply_saas');
      expect(evidence.branch).toBe('main');
      expect(evidence.targetSha).toMatch(/^[a-f0-9]{40}$/);
      expect(evidence.checkedOutSha).toBe(evidence.targetSha);
      expect(evidence.environment).toBe('production-auth-rbac-validation');
      expect(evidence.productionGate).toBe('eligible for downstream enterprise gates');
      expect(evidence.provenance).toMatchObject({
        githubActions: true,
        repository: 'renanescola40-afk/eurocomply_saas',
        branch: 'main',
        expectedSha: evidence.targetSha,
        checkedOutSha: evidence.targetSha,
        exactShaBound: true,
      });
      expect(String(evidence.provenance?.runId || '')).toMatch(/^\d+$/);
      expect(Object.values(evidence.checks || {}).length).toBeGreaterThan(0);
      expect(Object.values(evidence.checks || {}).every((value) => value === true)).toBe(true);
      expect(evidence.failures).toEqual([]);
      expect(evidence.evidenceIntegrity).toMatchObject({
        placeholderOnly: false,
        runtimeProofInvented: false,
        customerFacingProof: false,
        rawCredentialsStored: false,
        serviceRoleKeyStored: false,
        disposablePasswordStored: false,
        accessTokensStored: false,
        userIdentifiersStored: false,
        organizationIdentifiersStored: false,
        rawProviderResponsesStored: false,
        cleanupRequired: true,
        cleanupVerified: true,
      });
      expect(evidence.evidenceLocations).toContain('.github/workflows/auth-rbac-runtime-proof.yml');
      return;
    }

    expect(evidence.schemaVersion).toBe('1.0');
    expect(evidence.evidenceItem).toBe('enterprise-final-readiness-validation');
    expect(evidence.primaryAuthStack).toBe('supabase-auth');
    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('no_go');
    expect(evidence.releaseDecision).toBe('No-Go');
    expect(evidence.goNoGo?.status).toBe('NO_GO');
    expect(evidence.evidenceIntegrity?.placeholderOnly).toBe(true);
    expect(evidence.evidenceIntegrity?.realRuntimeEvidenceAttached).toBe(false);
    expect(evidence.evidenceIntegrity?.customerFacingProof).toBe(false);
    expect(evidence.validationCommands?.some((item: { command?: string }) => item.command === 'npm run security:step-up')).toBe(true);
  });
});
