import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { checkDistributedRateLimit } from '@/server/security/rate-limit';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const settingsSchema = z.object({
  requireStepUpForCriticalActions: z.boolean(),
  stepUpProviderMode: z.enum(['supabase_mfa', 'enterprise_idp', 'supabase_mfa_or_enterprise_idp']),
  allowedIdpAcrValues: z.array(z.string().trim().min(1).max(128)).max(20).default([]),
  allowedIdpAmrValues: z.array(z.string().trim().min(1).max(128)).max(20).default([]),
});

type SecuritySettingsRecord = {
  organization_id: string;
  require_step_up_for_critical_actions: boolean;
  step_up_provider_mode: string;
  allowed_idp_acr_values: string[] | null;
  allowed_idp_amr_values: string[] | null;
};

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const SETTINGS_JSON_MAX_BYTES = 6 * 1024;

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function normalizeList(values: string[]) {
  const normalized = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) normalized.add(trimmed);
    if (normalized.size >= 20) break;
  }
  return [...normalized];
}

function listChanged(previousValues: string[] | null, nextValues: string[]) {
  const previous = previousValues ?? [];
  if (previous.length !== nextValues.length) return true;
  return previous.some((value, index) => value !== nextValues[index]);
}

function changedKeys(previous: SecuritySettingsRecord | null, next: z.infer<typeof settingsSchema>) {
  if (!previous) return ['created'];

  const changes: string[] = [];
  if (previous.require_step_up_for_critical_actions !== next.requireStepUpForCriticalActions) changes.push('requireStepUpForCriticalActions');
  if (previous.step_up_provider_mode !== next.stepUpProviderMode) changes.push('stepUpProviderMode');
  if (listChanged(previous.allowed_idp_acr_values, next.allowedIdpAcrValues)) changes.push('allowedIdpAcrValues');
  if (listChanged(previous.allowed_idp_amr_values, next.allowedIdpAmrValues)) changes.push('allowedIdpAmrValues');
  return changes;
}

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `security-settings:${user.id}:${getClientIp(request)}`,
    limit: RATE_LIMIT_MAX_ATTEMPTS,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson(
      { error: rateLimit.reason ? 'security_control_unavailable' : 'Too many security settings attempts. Please wait before trying again.' },
      {
        status: rateLimit.reason ? 503 : 429,
        headers: {
          'Retry-After': String(Math.max(1, rateLimit.retryAfterSeconds)),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      },
    );
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_settings',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const stepUp = await requireStepUpForRequest({
    request,
    action: 'change_security_settings',
    userId: user.id,
    organizationId: organization.id,
  });

  if (!stepUp.ok) {
    return stepUp.response;
  }

  const payload = await readBoundedJsonRequest(request, { maxBytes: SETTINGS_JSON_MAX_BYTES }).catch(() => null);
  const parsed = settingsSchema.safeParse(payload);

  if (!parsed.success) {
    return noStoreJson({ error: 'invalid_security_settings_payload' }, { status: 400 });
  }

  const nextSettings = {
    ...parsed.data,
    allowedIdpAcrValues: normalizeList(parsed.data.allowedIdpAcrValues),
    allowedIdpAmrValues: normalizeList(parsed.data.allowedIdpAmrValues),
  };

  if (nextSettings.stepUpProviderMode === 'enterprise_idp' && nextSettings.allowedIdpAcrValues.length === 0 && nextSettings.allowedIdpAmrValues.length === 0) {
    return noStoreJson({ error: 'idp_policy_required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: previousData, error: previousError } = await supabase
    .from('organization_security_settings')
    .select('organization_id,require_step_up_for_critical_actions,step_up_provider_mode,allowed_idp_acr_values,allowed_idp_amr_values')
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (previousError) {
    return noStoreJson({ error: 'security_settings_lookup_failed' }, { status: 503 });
  }

  const previous = previousData as SecuritySettingsRecord | null;
  const changes = changedKeys(previous, nextSettings);

  const { error } = await supabase
    .from('organization_security_settings')
    .upsert(
      {
        organization_id: organization.id,
        require_step_up_for_critical_actions: nextSettings.requireStepUpForCriticalActions,
        step_up_provider_mode: nextSettings.stepUpProviderMode,
        allowed_idp_acr_values: nextSettings.allowedIdpAcrValues,
        allowed_idp_amr_values: nextSettings.allowedIdpAmrValues,
      },
      { onConflict: 'organization_id' },
    );

  if (error) {
    return noStoreJson({ error: 'security_settings_update_failed' }, { status: 503 });
  }

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'security_settings_changed',
    entityType: 'organization_security_settings',
    entityId: organization.id,
    metadata: {
      changedKeys: changes,
      actorRole: permission.role,
      stepUpAction: 'change_security_settings',
      stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      stepUpTokenType: stepUp.assessment.tokenType,
    },
  });

  return noStoreJson({
    changed: changes.length > 0,
    changedKeys: changes,
    auditPersisted: audit.persisted,
    settings: {
      requireStepUpForCriticalActions: nextSettings.requireStepUpForCriticalActions,
      stepUpProviderMode: nextSettings.stepUpProviderMode,
      allowedIdpAcrValueCount: nextSettings.allowedIdpAcrValues.length,
      allowedIdpAmrValueCount: nextSettings.allowedIdpAmrValues.length,
    },
    stepUp: publicStepUpSummary(stepUp.assessment),
  });
}
