import { randomUUID } from 'crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateInitialReadinessScore,
  getRecommendedDocuments,
  getSuggestedTasks,
  onboardingActivationSchema,
  onboardingDraftSchema,
  type OnboardingActivationInput,
  type OnboardingActionResult,
  type OnboardingDraftInput,
} from '@/lib/onboarding/activation';
import { createOrganization } from '@/server/actions/organizations';
import { classifyAiSystem, normalizeAiRiskDomain, normalizeAiSystemRole, normalizeAiSystemStatus } from '@/server/ai-governance/classifier';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

type CurrentUserForOnboarding = {
  id: string;
  email?: string | null;
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

function onboardingActionError(message: string) {
  return new Error(message);
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function getUuidUserId(userId: string) {
  return isUuid(userId) ? userId : null;
}

function getDashboardPath(locale: string, plan?: string | null) {
  const query = plan && plan !== 'trial' ? `?plan=${encodeURIComponent(plan)}` : '?onboarding=completed';
  return `/${locale}/dashboard/organizations${query}`;
}

async function resolveOrganizationId(input: { organizationId?: string; organizationName: string; slug: string }, user: CurrentUserForOnboarding) {
  const currentOrganization = await getCurrentOrganizationForUser(user.id);

  if (input.organizationId) {
    if (!currentOrganization || currentOrganization.organization_id !== input.organizationId) {
      throw onboardingActionError('You do not have access to this organization.');
    }

    return input.organizationId;
  }

  if (currentOrganization) {
    return currentOrganization.organization_id;
  }

  const organization = await createOrganization({ name: input.organizationName, slug: input.slug });
  return organization.id as string;
}

async function updateOrganizationOnboardingProfile(
  supabase: SupabaseAdminClient,
  organizationId: string,
  input: Partial<OnboardingDraftInput & OnboardingActivationInput> & {
    readinessScore?: number;
    status: 'in_progress' | 'completed';
  },
) {
  const metadata = {
    onboarding: {
      aiUsage: input.aiUsage ?? null,
      selectedPlan: input.selectedPlan ?? 'trial',
      updatedAt: new Date().toISOString(),
    },
  };

  const updatePayload: Record<string, unknown> = {
    name: input.organizationName,
    slug: input.slug,
    country: input.country ?? null,
    company_type: input.companyType ?? null,
    sector: input.sector ?? null,
    ai_usage_summary: input.aiUsageSummary ?? '',
    onboarding_status: input.status,
    onboarding_step: input.onboardingStep ?? (input.status === 'completed' ? 'completed' : 'company-profile'),
    selected_plan: input.selectedPlan ?? 'trial',
    metadata,
  };

  if (typeof input.readinessScore === 'number') {
    updatePayload.readiness_score = input.readinessScore;
  }

  if (input.status === 'completed') {
    updatePayload.onboarding_completed_at = new Date().toISOString();
    if ((input.selectedPlan ?? 'trial') === 'trial') {
      updatePayload.trial_started_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)
    .eq('id', organizationId);

  if (error) throw onboardingActionError('Unable to update onboarding profile');
}

async function upsertFirstAiSystem(
  supabase: SupabaseAdminClient,
  organizationId: string,
  userId: string,
  input: OnboardingActivationInput,
  classification: ReturnType<typeof classifyAiSystem>,
) {
  const payload = {
    organization_id: organizationId,
    name: input.aiSystemName,
    owner_team: input.ownerTeam,
    vendor_name: input.vendorName || null,
    use_case: input.aiSystemUseCase,
    role: normalizeAiSystemRole(input.role),
    lifecycle_status: normalizeAiSystemStatus(input.lifecycleStatus),
    risk_domain: normalizeAiRiskDomain(input.riskDomain),
    uses_personal_data: input.usesPersonalData,
    interacts_with_people: input.interactsWithPeople,
    generates_content: input.generatesContent,
    biometric_identification: input.biometricIdentification,
    manipulative_or_exploitative: input.manipulativeOrExploitative,
    risk_level: classification.riskLevel,
    classification_summary: classification.summary,
    obligations: classification.obligations,
    next_actions: classification.nextActions,
    created_by: getUuidUserId(userId),
  };

  if (input.aiSystemId) {
    const { data, error } = await supabase
      .from('ai_systems')
      .update(payload)
      .eq('id', input.aiSystemId)
      .eq('organization_id', organizationId)
      .select('id')
      .single();

    if (error) throw onboardingActionError('Unable to update first AI system');
    return data.id as string;
  }

  const { data, error } = await supabase
    .from('ai_systems')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw onboardingActionError('Unable to create first AI system');
  return data.id as string;
}

async function createRecommendedDocumentRecords(
  supabase: SupabaseAdminClient,
  organizationId: string,
  userId: string,
  documents: ReturnType<typeof getRecommendedDocuments>,
) {
  const { data: existing, error: existingError } = await supabase
    .from('documents')
    .select('id,title,name,category')
    .eq('organization_id', organizationId)
    .eq('category', 'onboarding_recommended');

  const existingTitles = new Set(
    existingError ? [] : (existing ?? []).map((document) => String(document.title ?? document.name ?? '').toLowerCase()),
  );
  const missingDocuments = documents.filter((document) => !existingTitles.has(document.title.toLowerCase()));

  if (missingDocuments.length === 0) return { inserted: 0 };

  const now = new Date().toISOString();
  const rows = missingDocuments.map((document) => ({
    organization_id: organizationId,
    uploaded_by: getUuidUserId(userId),
    title: document.title,
    name: document.title,
    category: 'onboarding_recommended',
    storage_path: `${organizationId}/onboarding/recommended/${document.id}.md`,
    mime_type: 'text/markdown',
    size_bytes: 0,
    status: 'suggested',
    metadata: {
      source: 'onboarding_activation',
      recommendationId: document.id,
      priority: document.priority,
      reason: document.reason,
      generatedAt: now,
    },
  }));

  const { error } = await supabase.from('documents').insert(rows);
  if (error) throw onboardingActionError('Unable to create recommended documents');

  return { inserted: rows.length };
}

async function createInitialComplianceTasks(
  supabase: SupabaseAdminClient,
  organizationId: string,
  userId: string,
  tasks: ReturnType<typeof getSuggestedTasks>,
) {
  const { data: existing, error: existingError } = await supabase
    .from('compliance_tasks')
    .select('id,title,category')
    .eq('organization_id', organizationId)
    .eq('category', 'onboarding_activation');

  const existingTitles = new Set(existingError ? [] : (existing ?? []).map((task) => String(task.title ?? '').toLowerCase()));
  const missingTasks = tasks.filter((task) => !existingTitles.has(task.title.toLowerCase()));

  if (missingTasks.length === 0) return { inserted: 0 };

  const createdBy = getUuidUserId(userId);
  const rows = missingTasks.map((task) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + task.dueInDays);

    return {
      organization_id: organizationId,
      created_by: createdBy,
      user_id: createdBy,
      title: task.title,
      description: task.description,
      category: 'onboarding_activation',
      status: 'open',
      priority: task.priority,
      due_date: dueDate.toISOString().slice(0, 10),
      metadata: {
        source: 'onboarding_activation',
        suggestionId: task.id,
      },
    };
  });

  const { error } = await supabase.from('compliance_tasks').insert(rows);
  if (error) throw onboardingActionError('Unable to create initial compliance tasks');

  return { inserted: rows.length };
}

async function createTeamInvitations(
  supabase: SupabaseAdminClient,
  organizationId: string,
  userId: string,
  emails: string[],
) {
  if (emails.length === 0) return { inserted: 0 };

  const invitedBy = getUuidUserId(userId);
  const rows = emails.map((email) => ({
    organization_id: organizationId,
    email,
    role: 'member',
    token: randomUUID(),
    invited_by: invitedBy,
  }));

  const { error } = await supabase
    .from('invitations')
    .upsert(rows, { onConflict: 'organization_id,email', ignoreDuplicates: true });

  if (error) throw onboardingActionError('Unable to create team invitations');
  return { inserted: rows.length };
}

async function recordActivationRun(
  supabase: SupabaseAdminClient,
  organizationId: string,
  userId: string,
  input: OnboardingActivationInput,
  firstAiSystemId: string,
  readinessScore: number,
  recommendedDocuments: ReturnType<typeof getRecommendedDocuments>,
  suggestedTasks: ReturnType<typeof getSuggestedTasks>,
  riskLevel: string,
) {
  const { error } = await supabase.from('onboarding_activation_runs').insert({
    organization_id: organizationId,
    created_by: getUuidUserId(userId),
    created_by_clerk_user_id: isUuid(userId) ? null : userId,
    country: input.country,
    company_type: input.companyType,
    sector: input.sector,
    ai_usage_level: input.aiUsage,
    ai_usage_summary: input.aiUsageSummary,
    first_ai_system_id: firstAiSystemId,
    initial_risk_level: riskLevel,
    readiness_score: readinessScore,
    recommended_documents: recommendedDocuments,
    suggested_tasks: suggestedTasks,
    invited_emails: input.inviteEmails,
    selected_plan: input.selectedPlan,
    status: 'completed',
  });

  if (error) throw onboardingActionError('Unable to record onboarding activation');
}

export async function saveOnboardingDraft(input: OnboardingDraftInput): Promise<OnboardingActionResult> {
  const user = await requireCurrentUser();
  const payload = onboardingDraftSchema.parse(input);
  const supabase = createAdminClient();
  const organizationId = await resolveOrganizationId(payload, user);

  await assertCurrentUserCan(organizationId, user.id, 'organization:update');

  await updateOrganizationOnboardingProfile(supabase, organizationId, {
    ...payload,
    status: 'in_progress',
  });

  return {
    organizationId,
    status: 'saved',
  };
}

export async function completeOnboardingActivation(
  input: OnboardingActivationInput,
  locale: string,
): Promise<OnboardingActionResult> {
  const user = await requireCurrentUser();
  const payload = onboardingActivationSchema.parse(input);
  const supabase = createAdminClient();
  const organizationId = await resolveOrganizationId(payload, user);

  await assertCurrentUserCan(organizationId, user.id, 'organization:update');
  if (payload.inviteEmails.length > 0) {
    await assertCurrentUserCan(organizationId, user.id, 'team:invite');
  }

  const classification = classifyAiSystem({
    role: normalizeAiSystemRole(payload.role),
    riskDomain: normalizeAiRiskDomain(payload.riskDomain),
    usesPersonalData: payload.usesPersonalData,
    interactsWithPeople: payload.interactsWithPeople,
    generatesContent: payload.generatesContent,
    biometricIdentification: payload.biometricIdentification,
    manipulativeOrExploitative: payload.manipulativeOrExploitative,
  });
  const recommendedDocuments = getRecommendedDocuments({
    riskLevel: classification.riskLevel,
    usesPersonalData: payload.usesPersonalData,
    interactsWithPeople: payload.interactsWithPeople,
    generatesContent: payload.generatesContent,
    sector: payload.sector,
  });
  const suggestedTasks = getSuggestedTasks({
    riskLevel: classification.riskLevel,
    recommendedDocuments,
    inviteEmails: payload.inviteEmails,
  });
  const readinessScore = calculateInitialReadinessScore({
    hasOrganization: true,
    hasCountry: true,
    hasCompanyType: true,
    hasSector: true,
    hasAiUsage: true,
    hasFirstAiSystem: true,
    hasRiskClassification: true,
    recommendedDocuments,
    suggestedTasks,
    invitedEmails: payload.inviteEmails,
    selectedPlan: payload.selectedPlan,
  });

  const firstAiSystemId = await upsertFirstAiSystem(supabase, organizationId, user.id, payload, classification);
  const [documentResult, taskResult, invitationResult] = await Promise.all([
    createRecommendedDocumentRecords(supabase, organizationId, user.id, recommendedDocuments),
    createInitialComplianceTasks(supabase, organizationId, user.id, suggestedTasks),
    createTeamInvitations(supabase, organizationId, user.id, payload.inviteEmails),
  ]);

  await recordActivationRun(
    supabase,
    organizationId,
    user.id,
    payload,
    firstAiSystemId,
    readinessScore,
    recommendedDocuments,
    suggestedTasks,
    classification.riskLevel,
  );

  await updateOrganizationOnboardingProfile(supabase, organizationId, {
    ...payload,
    readinessScore,
    onboardingStep: 'completed',
    status: 'completed',
  });

  return {
    organizationId,
    status: 'completed',
    readinessScore,
    riskLevel: classification.riskLevel,
    dashboardPath: getDashboardPath(locale, payload.selectedPlan),
    documentsCreated: documentResult.inserted,
    tasksCreated: taskResult.inserted,
    invitationsCreated: invitationResult.inserted,
  };
}
