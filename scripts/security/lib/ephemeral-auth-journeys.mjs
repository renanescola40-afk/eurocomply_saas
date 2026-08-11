import { createHash, randomBytes, randomUUID } from 'node:crypto';

function password() {
  return `Rc!${randomBytes(24).toString('base64url')}9a`;
}

function safePurpose(value) {
  return String(value || 'auth-runtime-proof')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'auth-runtime-proof';
}

function firstRow(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data && typeof data === 'object' ? data : null;
}

function userAbsenceWasProven(data, error) {
  if (!error) return !data?.user;
  const status = Number(error?.status || 0);
  const message = String(error?.message || '');
  return status === 404 || /not found/i.test(message);
}

async function rowAbsent(admin, table, id) {
  if (!id) return true;
  const { data, error } = await admin.from(table).select('id').eq('id', id).maybeSingle();
  return !error && !data;
}

async function membershipAbsent(admin, organizationId, userId) {
  if (!organizationId || !userId) return true;
  const { data, error } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .limit(1);
  return !error && Array.isArray(data) && data.length === 0;
}

async function cleanupJourney(admin, created) {
  const failures = [];

  if (created.activationRunId) {
    const { error } = await admin
      .from('onboarding_activation_runs')
      .delete()
      .eq('id', created.activationRunId);
    if (error) failures.push('onboarding_activation_cleanup_failed');
  }
  if (created.aiSystemId) {
    const { error } = await admin.from('ai_systems').delete().eq('id', created.aiSystemId);
    if (error) failures.push('onboarding_ai_system_cleanup_failed');
  }
  if (created.organizationId) {
    const { error: membershipError } = await admin
      .from('organization_members')
      .delete()
      .eq('organization_id', created.organizationId);
    if (membershipError) failures.push('onboarding_membership_cleanup_failed');

    const { error: organizationError } = await admin
      .from('organizations')
      .delete()
      .eq('id', created.organizationId);
    if (organizationError) failures.push('onboarding_organization_cleanup_failed');
  }
  if (created.userId) {
    const { error } = await admin.auth.admin.deleteUser(created.userId);
    if (error) failures.push('signup_user_cleanup_failed');
  }

  const onboardingAbsent = (
    await rowAbsent(admin, 'onboarding_activation_runs', created.activationRunId)
  ) && (
    await rowAbsent(admin, 'ai_systems', created.aiSystemId)
  ) && (
    await rowAbsent(admin, 'organizations', created.organizationId)
  ) && (
    await membershipAbsent(admin, created.organizationId, created.userId)
  );
  if (!onboardingAbsent) failures.push('onboarding_cleanup_not_verified');

  let userAbsent = true;
  if (created.userId) {
    const { data, error } = await admin.auth.admin.getUserById(created.userId);
    userAbsent = userAbsenceWasProven(data, error);
    if (!userAbsent) failures.push('signup_user_cleanup_not_verified');
  }

  return {
    onboardingVerified: onboardingAbsent,
    userVerified: userAbsent,
    verified: onboardingAbsent && userAbsent && failures.length === 0,
    failures: [...new Set(failures)],
  };
}

export function evaluateIdentityJourneyChecks(checks) {
  const signupPassed = checks.disposableSignup === true
    && checks.signupSessionRevoked === true
    && checks.disposableSignupCleanup === true;
  const onboardingPassed = checks.onboardingUserInitiallyUnscoped === true
    && checks.onboardingOrganizationCreated === true
    && checks.onboardingActivationCompleted === true
    && checks.onboardingStateObserved === true
    && checks.onboardingCleanup === true;
  return {
    signupPassed,
    onboardingPassed,
    complete: signupPassed && onboardingPassed,
  };
}

export async function runEphemeralSignupOnboardingJourney({
  admin,
  anon,
  purpose = 'auth-rbac-live-proof',
} = {}) {
  const normalizedPurpose = safePurpose(purpose);
  const suffix = `${Date.now()}-${randomUUID()}`;
  const created = {
    userId: null,
    organizationId: null,
    activationRunId: null,
    aiSystemId: null,
  };
  const checks = {
    disposableSignup: false,
    signupSessionRevoked: false,
    disposableSignupCleanup: false,
    onboardingUserInitiallyUnscoped: false,
    onboardingOrganizationCreated: false,
    onboardingActivationCompleted: false,
    onboardingStateObserved: false,
    onboardingCleanup: false,
  };
  const failures = [];

  try {
    if (!admin || !anon) throw new Error('identity_journey_client_missing');

    const credentials = {
      email: `${normalizedPurpose}-signup-${suffix}@example.com`,
      password: password(),
    };
    const { data: signupData, error: signupError } = await anon.auth.signUp({
      ...credentials,
      options: { data: { purpose: `${normalizedPurpose}-signup-onboarding` } },
    });
    if (signupError || !signupData?.user?.id) throw new Error('disposable_signup_failed');
    created.userId = signupData.user.id;
    checks.disposableSignup = true;

    if (signupData.session) {
      const { error: signOutError } = await anon.auth.signOut();
      checks.signupSessionRevoked = !signOutError;
    } else {
      checks.signupSessionRevoked = true;
    }
    if (!checks.signupSessionRevoked) throw new Error('disposable_signup_session_revoke_failed');

    const { data: existingMemberships, error: existingMembershipsError } = await admin
      .from('organization_members')
      .select('id')
      .eq('user_id', created.userId)
      .limit(1);
    if (existingMembershipsError) throw new Error('onboarding_initial_scope_query_failed');
    checks.onboardingUserInitiallyUnscoped = Array.isArray(existingMemberships) && existingMemberships.length === 0;
    if (!checks.onboardingUserInitiallyUnscoped) throw new Error('onboarding_user_not_initially_unscoped');

    const organizationName = `Runtime Onboarding ${suffix}`;
    const organizationSlug = `${normalizedPurpose}-onboarding-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80);
    const { data: creationData, error: creationError } = await admin.rpc('create_organization_with_owner_atomic', {
      p_name: organizationName,
      p_slug: organizationSlug,
      p_user_id: created.userId,
    });
    const creation = firstRow(creationData);
    if (creationError || creation?.outcome !== 'created' || !creation?.organization_id) {
      throw new Error('onboarding_organization_create_failed');
    }
    created.organizationId = creation.organization_id;
    checks.onboardingOrganizationCreated = true;

    const idempotencyKey = createHash('sha256')
      .update(`${suffix}:${created.userId}:${created.organizationId}`)
      .digest('hex');
    const { data: activationData, error: activationError } = await admin.rpc('complete_onboarding_activation_atomic', {
      p_organization_id: created.organizationId,
      p_actor_user_id: created.userId,
      p_idempotency_key: idempotencyKey,
      p_activation: {
        organization: {
          name: organizationName,
          slug: organizationSlug,
          country: 'PT',
          companyType: 'software',
          sector: 'technology',
          aiUsage: 'active',
          aiUsageSummary: 'Disposable protected runtime onboarding validation.',
          selectedPlan: 'trial',
        },
        aiSystem: {
          id: null,
          name: 'Runtime Proof AI',
          ownerTeam: 'Security',
          vendorName: 'Internal runtime fixture',
          useCase: 'Protected disposable onboarding runtime validation for enterprise release evidence.',
          role: 'deployer',
          lifecycleStatus: 'pilot',
          riskDomain: 'general',
          usesPersonalData: false,
          interactsWithPeople: false,
          generatesContent: false,
          biometricIdentification: false,
          manipulativeOrExploitative: false,
          riskLevel: 'minimal_or_low',
          classificationSummary: 'Disposable low-risk runtime proof fixture.',
          obligations: [],
          nextActions: [],
        },
        recommendedDocuments: [],
        suggestedTasks: [],
        inviteEmails: [],
        readinessScore: 100,
      },
    });
    const activation = firstRow(activationData);
    if (activationError || activation?.outcome !== 'completed' || !activation?.activation_run_id || !activation?.first_ai_system_id) {
      throw new Error('onboarding_activation_failed');
    }
    created.activationRunId = activation.activation_run_id;
    created.aiSystemId = activation.first_ai_system_id;
    checks.onboardingActivationCompleted = true;

    const { data: organization, error: organizationError } = await admin
      .from('organizations')
      .select('id,onboarding_status,onboarding_completed_at,selected_plan')
      .eq('id', created.organizationId)
      .maybeSingle();
    const { data: activationRun, error: activationRunError } = await admin
      .from('onboarding_activation_runs')
      .select('id,status,first_ai_system_id')
      .eq('id', created.activationRunId)
      .maybeSingle();
    checks.onboardingStateObserved = !organizationError
      && !activationRunError
      && organization?.onboarding_status === 'completed'
      && Boolean(organization?.onboarding_completed_at)
      && organization?.selected_plan === 'trial'
      && activationRun?.status === 'completed'
      && activationRun?.first_ai_system_id === created.aiSystemId;
    if (!checks.onboardingStateObserved) throw new Error('onboarding_state_not_observed');
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'identity_journey_failed');
  } finally {
    if (admin) {
      const cleanup = await cleanupJourney(admin, created);
      checks.onboardingCleanup = cleanup.onboardingVerified;
      checks.disposableSignupCleanup = cleanup.userVerified;
      failures.push(...cleanup.failures);
    }
  }

  const decision = evaluateIdentityJourneyChecks(checks);
  return {
    schema: 'risck-comply.auth-identity-journey.v1',
    status: decision.complete ? 'Complete' : 'Open',
    outcome: decision.complete ? 'passed' : (failures.length ? 'failed' : 'blocked'),
    checks,
    failures: [...new Set(failures)],
    cleanupVerified: checks.disposableSignupCleanup && checks.onboardingCleanup,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawCredentialsStored: false,
      accessTokensStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
      cleanupRequired: true,
    },
  };
}
