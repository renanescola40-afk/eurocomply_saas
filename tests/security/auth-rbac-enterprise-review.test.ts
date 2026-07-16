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

    expect(readRepoFile('src/server/security/rbac.ts')).toContain(".eq('user_id', userId)");
    expect(readRepoFile('src/server/queries/organizations.ts')).toContain(".eq('user_id', userId)");
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

  it('documents the final auth/RBAC review and No-Go runtime evidence status', () => {
    const reviewPath = 'docs/security/AUTH_RBAC_ENTERPRISE_REVIEW.md';
    const evidencePath = 'docs/security/evidence/runtime/auth-rbac-final-validation.json';

    expect(existsSync(join(process.cwd(), reviewPath))).toBe(true);
    expect(existsSync(join(process.cwd(), evidencePath))).toBe(true);

    const review = readRepoFile(reviewPath);
    const evidence = JSON.parse(readRepoFile(evidencePath)) as {
      primaryAuthStack?: string;
      status?: string;
      outcome?: string;
      releaseDecision?: string;
      goNoGo?: { status?: string };
      evidenceIntegrity?: {
        placeholderOnly?: boolean;
        realRuntimeEvidenceAttached?: boolean;
        customerFacingProof?: boolean;
      };
      validationCommands?: Array<{ command: string; status: string }>;
    };

    expect(review).toContain('Supabase Auth');
    expect(review).toContain('Go/No-Go');
    expect(review).toContain('No-Go for enterprise production until CI and runtime gates pass');
    expect(review).toContain('Runtime validation was not executed in this GitHub patch session');
    expect(evidence.primaryAuthStack).toBe('supabase-auth');
    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('no_go');
    expect(evidence.releaseDecision).toBe('No-Go');
    expect(evidence.goNoGo?.status).toBe('NO_GO');
    expect(evidence.evidenceIntegrity?.placeholderOnly).toBe(true);
    expect(evidence.evidenceIntegrity?.realRuntimeEvidenceAttached).toBe(false);
    expect(evidence.evidenceIntegrity?.customerFacingProof).toBe(false);
    expect(evidence.validationCommands?.some((item) => item.command === 'npm run security:step-up')).toBe(true);
  });
});
