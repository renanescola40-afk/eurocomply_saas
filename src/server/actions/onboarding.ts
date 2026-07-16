import { createHash } from 'crypto';

import { sendEmail } from '@/lib/email/client';
import { invitationEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
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

const ATOMIC_ONBOARDING_ACTIVATION_RPC = 'complete_onboarding_activation_atomic';
const SUPPORTED_LOCALES = new Set(['en', 'pt', 'es', 'fr', 'it', 'de']);

type AtomicOnboardingActivationResult = {
  outcome: 'completed' | 'replayed' | 'not_found' | 'forbidden' | 'invalid_input' | 'ai_system_not_found';
  activation_run_id: string | null;
  first_ai_system_id: string | null;
  documents_created: number;
  tasks_created: number;
  invitations_created: number;
  organization_name: string;
  invitation_deliveries: unknown;
};

type OnboardingInvitationDelivery = {
  id: string;
  email: string;
  role: string;
  token: string;
};

function onboardingActionError(message: string) {
  return new Error(message);
}

function getDashboardPath(locale: string, plan?: string | null) {
  const query = plan && plan !== 'trial' ? `?plan=${encodeURIComponent(plan)}` : '?onboarding=completed';
  return `/${locale}/dashboard/organizations${query}`;
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function getSafeLocale(locale: string) {
  return SUPPORTED_LOCALES.has(locale) ? locale : 'en';
}

function normalizeInviteEmails(emails: string[]) {
  return [...new Set(emails.map((email) => email.trim().toLowerCase()))].sort();
}

export function createOnboardingActivationIdempotencyKey(input: {
  organizationId: string;
  userId: string;
  payload: OnboardingActivationInput;
}) {
  const canonicalPayload = {
    organizationId: input.organizationId,
    actorUserId: input.userId,
    organizationName: input.payload.organizationName,
    slug: input.payload.slug,
    country: input.payload.country,
    companyType: input.payload.companyType,
    sector: input.payload.sector,
    aiUsage: input.payload.aiUsage,
    aiUsageSummary: input.payload.aiUsageSummary,
    aiSystemId: input.payload.aiSystemId ?? null,
    aiSystemName: input.payload.aiSystemName,
    aiSystemUseCase: input.payload.aiSystemUseCase,
    ownerTeam: input.payload.ownerTeam,
    vendorName: input.payload.vendorName,
    role: input.payload.role,
    lifecycleStatus: input.payload.lifecycleStatus,
    riskDomain: input.payload.riskDomain,
    usesPersonalData: input.payload.usesPersonalData,
    interactsWithPeople: input.payload.interactsWithPeople,
    generatesContent: input.payload.generatesContent,
    biometricIdentification: input.payload.biometricIdentification,
    manipulativeOrExploitative: input.payload.manipulativeOrExploitative,
    inviteEmails: normalizeInviteEmails(input.payload.inviteEmails),
    selectedPlan: input.payload.selectedPlan,
  };

  return createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
}

function firstAtomicActivationResult(data: unknown): AtomicOnboardingActivationResult | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const candidate = data[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  return candidate as AtomicOnboardingActivationResult;
}

function parseInvitationDeliveries(value: unknown): OnboardingInvitationDelivery[] {
  if (!Array.isArray(value)) return [];

  return value.filter((candidate): candidate is OnboardingInvitationDelivery => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
    const record = candidate as Record<string, unknown>;
    return typeof record.id === 'string'
      && typeof record.email === 'string'
      && typeof record.role === 'string'
      && typeof record.token === 'string'
      && /^[a-f0-9]{64}$/i.test(record.token);
  });
}

async function deliverOnboardingInvitations(input: {
  organizationId: string;
  organizationName: string;
  userId: string;
  locale: string;
  invitations: OnboardingInvitationDelivery[];
}) {
  await Promise.all(input.invitations.map(async (invitation) => {
    const inviteUrl = `${getAppUrl()}/${getSafeLocale(input.locale)}/invite/${encodeURIComponent(invitation.token)}`;
    const builtEmail = invitationEmail({
      organizationName: input.organizationName,
      role: invitation.role,
      inviteUrl,
    });

    try {
      const delivery = await sendEmail({
        to: invitation.email,
        subject: builtEmail.subject,
        html: builtEmail.html,
        text: builtEmail.text,
        template: builtEmail.template,
        organizationId: input.organizationId,
        userId: input.userId,
        idempotencyKey: `onboarding-invite:${invitation.id}:${createHash('sha256').update(invitation.token).digest('hex')}`,
        metadata: {
          source: 'onboarding_activation',
          invitationId: invitation.id,
          role: invitation.role,
        },
      });

      if (!delivery.sent) {
        throw new Error(`Invitation provider returned ${delivery.status}`);
      }
    } catch (error) {
      reportError(error, {
        area: 'onboarding_invitation_delivery',
        organizationId: input.organizationId,
        invitationId: invitation.id,
        emailDomain: invitation.email.split('@')[1] ?? 'unknown',
      });
      throw onboardingActionError('Onboarding data was saved, but invitation delivery failed. Retry onboarding to resend pending invitations.');
    }
  }));
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

  const inviteEmails = normalizeInviteEmails(payload.inviteEmails);
  const activationPayload = { ...payload, inviteEmails };

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
    inviteEmails,
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
    invitedEmails: inviteEmails,
    selectedPlan: payload.selectedPlan,
  });

  const idempotencyKey = createOnboardingActivationIdempotencyKey({
    organizationId,
    userId: user.id,
    payload: activationPayload,
  });
  const { data, error } = await supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC, {
    p_organization_id: organizationId,
    p_actor_user_id: user.id,
    p_idempotency_key: idempotencyKey,
    p_activation: {
      organization: {
        name: payload.organizationName,
        slug: payload.slug,
        country: payload.country,
        companyType: payload.companyType,
        sector: payload.sector,
        aiUsage: payload.aiUsage,
        aiUsageSummary: payload.aiUsageSummary,
        selectedPlan: payload.selectedPlan,
      },
      aiSystem: {
        id: payload.aiSystemId ?? null,
        name: payload.aiSystemName,
        ownerTeam: payload.ownerTeam,
        vendorName: payload.vendorName,
        useCase: payload.aiSystemUseCase,
        role: normalizeAiSystemRole(payload.role),
        lifecycleStatus: normalizeAiSystemStatus(payload.lifecycleStatus),
        riskDomain: normalizeAiRiskDomain(payload.riskDomain),
        usesPersonalData: payload.usesPersonalData,
        interactsWithPeople: payload.interactsWithPeople,
        generatesContent: payload.generatesContent,
        biometricIdentification: payload.biometricIdentification,
        manipulativeOrExploitative: payload.manipulativeOrExploitative,
        riskLevel: classification.riskLevel,
        classificationSummary: classification.summary,
        obligations: classification.obligations,
        nextActions: classification.nextActions,
      },
      recommendedDocuments,
      suggestedTasks,
      inviteEmails,
      readinessScore,
    },
  });

  if (error) {
    reportError(error, {
      area: 'onboarding_activation_atomic',
      organizationId,
      idempotencyKey,
    });
    throw onboardingActionError('Unable to complete onboarding activation.');
  }

  const activation = firstAtomicActivationResult(data);
  if (!activation) {
    throw onboardingActionError('Unable to complete onboarding activation.');
  }

  if (activation.outcome === 'not_found') {
    throw onboardingActionError('Organization not found.');
  }
  if (activation.outcome === 'forbidden') {
    throw onboardingActionError('You do not have access to complete this onboarding.');
  }
  if (activation.outcome === 'ai_system_not_found') {
    throw onboardingActionError('The selected AI system does not belong to this organization.');
  }
  if (activation.outcome !== 'completed' && activation.outcome !== 'replayed') {
    throw onboardingActionError('Unable to complete onboarding activation.');
  }

  const invitationDeliveries = parseInvitationDeliveries(activation.invitation_deliveries);
  if (invitationDeliveries.length !== inviteEmails.length) {
    throw onboardingActionError('Onboarding data was saved, but invitation delivery state is incomplete. Retry onboarding.');
  }
  await deliverOnboardingInvitations({
    organizationId,
    organizationName: activation.organization_name || payload.organizationName,
    userId: user.id,
    locale,
    invitations: invitationDeliveries,
  });

  return {
    organizationId,
    status: 'completed',
    readinessScore,
    riskLevel: classification.riskLevel,
    dashboardPath: getDashboardPath(getSafeLocale(locale), payload.selectedPlan),
    documentsCreated: activation.documents_created,
    tasksCreated: activation.tasks_created,
    invitationsCreated: activation.invitations_created,
    invitationsDelivered: invitationDeliveries.length,
  };
}
