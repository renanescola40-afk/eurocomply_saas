import { unstable_noStore as noStore } from 'next/cache';

import { tryCreateAdminClient } from '@/lib/supabase/admin';
import type { AiActRiskLevel, OnboardingActivationInitialState, OnboardingRecommendation, OnboardingTaskSuggestion } from '@/lib/onboarding/activation';
import { getCurrentOrganizationForUser, isOrganizationOnboardingCompleted, normalizeOnboardingStatus } from '@/server/queries/current-organization';

type QueryError = { code?: string; message?: string } | null;

function isExpectedSchemaFallback(error: QueryError) {
  return error?.code === '42P01' || error?.code === '42703' || error?.code === 'PGRST204' || error?.code === 'PGRST205';
}

function normalizeRecommendationArray(value: unknown): OnboardingRecommendation[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is OnboardingRecommendation => {
    if (!item || typeof item !== 'object') return false;
    const maybe = item as Partial<OnboardingRecommendation>;
    return typeof maybe.id === 'string' && typeof maybe.title === 'string' && typeof maybe.category === 'string';
  });
}

function normalizeTaskArray(value: unknown): OnboardingTaskSuggestion[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is OnboardingTaskSuggestion => {
    if (!item || typeof item !== 'object') return false;
    const maybe = item as Partial<OnboardingTaskSuggestion>;
    return typeof maybe.id === 'string' && typeof maybe.title === 'string' && typeof maybe.description === 'string';
  });
}

function normalizeEmailArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.includes('@'));
}

export async function getOnboardingActivationState(userId: string): Promise<OnboardingActivationInitialState> {
  noStore();

  const membership = await getCurrentOrganizationForUser(userId);

  if (!membership) {
    return {
      organization: null,
      firstAiSystem: null,
      latestRun: null,
    };
  }

  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return {
      organization: {
        id: membership.organization_id,
        name: membership.name,
        slug: membership.slug,
        country: null,
        companyType: null,
        sector: null,
        aiUsageSummary: null,
        onboardingStatus: membership.onboarding_status,
        onboardingCompletedAt: membership.onboarding_completed_at,
        isOnboardingCompleted: membership.is_onboarding_completed,
        onboardingStep: null,
        readinessScore: null,
        selectedPlan: null,
      },
      firstAiSystem: null,
      latestRun: null,
    };
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id,name,slug,country,company_type,sector,ai_usage_summary,onboarding_status,onboarding_step,readiness_score,selected_plan,onboarding_completed_at')
    .eq('id', membership.organization_id)
    .maybeSingle();

  const organizationState = organizationError && isExpectedSchemaFallback(organizationError)
    ? {
        id: membership.organization_id,
        name: membership.name,
        slug: membership.slug,
        country: null,
        companyType: null,
        sector: null,
        aiUsageSummary: null,
        onboardingStatus: membership.onboarding_status,
        onboardingCompletedAt: membership.onboarding_completed_at,
        isOnboardingCompleted: membership.is_onboarding_completed,
        onboardingStep: null,
        readinessScore: null,
        selectedPlan: null,
      }
    : organization
      ? {
          id: organization.id as string,
          name: organization.name as string,
          slug: (organization.slug as string | null) ?? membership.slug,
          country: (organization.country as string | null) ?? null,
          companyType: (organization.company_type as string | null) ?? null,
          sector: (organization.sector as string | null) ?? null,
          aiUsageSummary: (organization.ai_usage_summary as string | null) ?? null,
          onboardingStatus: normalizeOnboardingStatus(organization.onboarding_status),
          onboardingCompletedAt: (organization.onboarding_completed_at as string | null) ?? null,
          isOnboardingCompleted: isOrganizationOnboardingCompleted({
            onboarding_status: organization.onboarding_status as string | null,
            onboarding_completed_at: (organization.onboarding_completed_at as string | null) ?? null,
          }),
          onboardingStep: (organization.onboarding_step as string | null) ?? null,
          readinessScore: typeof organization.readiness_score === 'number' ? organization.readiness_score : null,
          selectedPlan: (organization.selected_plan as string | null) ?? null,
        }
      : {
          id: membership.organization_id,
          name: membership.name,
          slug: membership.slug,
          country: null,
          companyType: null,
          sector: null,
          aiUsageSummary: null,
          onboardingStatus: membership.onboarding_status,
          onboardingCompletedAt: membership.onboarding_completed_at,
          isOnboardingCompleted: membership.is_onboarding_completed,
          onboardingStep: null,
          readinessScore: null,
          selectedPlan: null,
        };

  if (organizationError && !isExpectedSchemaFallback(organizationError)) {
    console.warn('[onboarding] organization_state_lookup_failed', { code: organizationError.code ?? 'unknown' });
  }

  const { data: firstAiSystem, error: aiSystemError } = await supabase
    .from('ai_systems')
    .select('id,name,owner_team,vendor_name,use_case,role,lifecycle_status,risk_domain,risk_level,uses_personal_data,interacts_with_people,generates_content,biometric_identification,manipulative_or_exploitative,created_at')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (aiSystemError && !isExpectedSchemaFallback(aiSystemError)) {
    console.warn('[onboarding] first_ai_system_lookup_failed', { code: aiSystemError.code ?? 'unknown' });
  }

  const { data: latestRun, error: latestRunError } = await supabase
    .from('onboarding_activation_runs')
    .select('readiness_score,recommended_documents,suggested_tasks,invited_emails,selected_plan,created_at')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRunError && !isExpectedSchemaFallback(latestRunError)) {
    console.warn('[onboarding] activation_run_lookup_failed', { code: latestRunError.code ?? 'unknown' });
  }

  return {
    organization: organizationState,
    firstAiSystem: firstAiSystem && !aiSystemError
      ? {
          id: firstAiSystem.id as string,
          name: (firstAiSystem.name as string | null) ?? null,
          ownerTeam: (firstAiSystem.owner_team as string | null) ?? null,
          vendorName: (firstAiSystem.vendor_name as string | null) ?? null,
          useCase: (firstAiSystem.use_case as string | null) ?? null,
          role: (firstAiSystem.role as string | null) ?? null,
          lifecycleStatus: (firstAiSystem.lifecycle_status as string | null) ?? null,
          riskDomain: (firstAiSystem.risk_domain as string | null) ?? null,
          riskLevel: (firstAiSystem.risk_level as AiActRiskLevel | null) ?? null,
          usesPersonalData: Boolean(firstAiSystem.uses_personal_data),
          interactsWithPeople: Boolean(firstAiSystem.interacts_with_people),
          generatesContent: Boolean(firstAiSystem.generates_content),
          biometricIdentification: Boolean(firstAiSystem.biometric_identification),
          manipulativeOrExploitative: Boolean(firstAiSystem.manipulative_or_exploitative),
        }
      : null,
    latestRun: latestRun && !latestRunError
      ? {
          readinessScore: typeof latestRun.readiness_score === 'number' ? latestRun.readiness_score : null,
          recommendedDocuments: normalizeRecommendationArray(latestRun.recommended_documents),
          suggestedTasks: normalizeTaskArray(latestRun.suggested_tasks),
          invitedEmails: normalizeEmailArray(latestRun.invited_emails),
          selectedPlan: (latestRun.selected_plan as string | null) ?? null,
        }
      : null,
  };
}
