import { NextRequest } from 'next/server';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

const SECURITY_SETTINGS_JSON_MAX_BYTES = 8 * 1024;
const PROVIDER_MODES = new Set(['supabase_mfa', 'enterprise_idp', 'supabase_mfa_or_enterprise_idp']);

type SecuritySettingsInput = {
  stepUpProviderMode?: unknown;
  allowedIdpAcrValues?: unknown;
  allowedIdpAmrValues?: unknown;
};

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeSettings(input: SecuritySettingsInput) {
  const stepUpProviderMode = typeof input.stepUpProviderMode === 'string' && PROVIDER_MODES.has(input.stepUpProviderMode)
    ? input.stepUpProviderMode
    : 'supabase_mfa';

  return {
    stepUpProviderMode,
    allowedIdpAcrValues: normalizeStringList(input.allowedIdpAcrValues),
    allowedIdpAmrValues: normalizeStringList(input.allowedIdpAmrValues),
  };
}

export async function POST(request: NextRequest) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'change_security_settings',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `security-settings:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
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

  const body = await readBoundedJsonRequest<SecuritySettingsInput>(request, {
    maxBytes: SECURITY_SETTINGS_JSON_MAX_BYTES,
  }).catch(() => ({}));
  const nextSettings = normalizeSettings(body);
  const changes = ['require_step_up_for_critical_actions', 'step_up_provider_mode'];

  if (nextSettings.allowedIdpAcrValues.length > 0) changes.push('allowed_idp_acr_values');
  if (nextSettings.allowedIdpAmrValues.length > 0) changes.push('allowed_idp_amr_values');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('organization_security_settings')
    .upsert(
      {
        organization_id: organization.id,
        require_step_up_for_critical_actions: true,
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
      stepUpTokenType: 'signed_hmac',
    },
  });

  return noStoreJson({
    changed: changes.length > 0,
    changedKeys: changes,
    auditPersisted: audit.persisted,
    settings: {
      requireStepUpForCriticalActions: true,
      stepUpProviderMode: nextSettings.stepUpProviderMode,
      allowedIdpAcrValueCount: nextSettings.allowedIdpAcrValues.length,
      allowedIdpAmrValueCount: nextSettings.allowedIdpAmrValues.length,
    },
    stepUp: publicStepUpSummary(stepUp.assessment),
  });
}
