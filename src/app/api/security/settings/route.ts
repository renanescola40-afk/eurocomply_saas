import { NextRequest } from 'next/server';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

const SECURITY_SETTINGS_JSON_MAX_BYTES = 8 * 1024;
const PROVIDER_MODES = new Set(['supabase_mfa', 'enterprise_idp', 'supabase_mfa_or_enterprise_idp']);

 type SecuritySettingsInput = {
  stepUpProviderMode: string;
  allowedIdpAcrValues?: string[];
  allowedIdpAmrValues?: string[];
};

type StoredSecuritySettings = {
  organization_id: string;
  require_step_up_for_critical_actions: boolean;
  step_up_provider_mode: string;
  allowed_idp_acr_values: string[] | null;
  allowed_idp_amr_values: string[] | null;
};

function isBoundedStringList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= 20
    && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0 && entry.trim().length <= 256);
}

function parseSecuritySettingsInput(value: unknown): SecuritySettingsInput | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  if (typeof input.stepUpProviderMode !== 'string' || !PROVIDER_MODES.has(input.stepUpProviderMode)) return null;
  if (input.allowedIdpAcrValues !== undefined && !isBoundedStringList(input.allowedIdpAcrValues)) return null;
  if (input.allowedIdpAmrValues !== undefined && !isBoundedStringList(input.allowedIdpAmrValues)) return null;

  return {
    stepUpProviderMode: input.stepUpProviderMode,
    allowedIdpAcrValues: input.allowedIdpAcrValues?.map((entry) => entry.trim()) ?? [],
    allowedIdpAmrValues: input.allowedIdpAmrValues?.map((entry) => entry.trim()) ?? [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_settings',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `security-settings:${organization.id}:${user.id}`,
        limit: 10,
        windowMs: 60 * 1000,
      },
    });

    if (mutationDenied) return mutationDenied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'change_security_settings',
      userId: user.id,
      organizationId: organization.id,
    });

    if (!stepUp.ok) {
      return stepUp.response;
    }

    let body: unknown;
    try {
      body = await readBoundedJsonRequest<unknown>(request, {
        maxBytes: SECURITY_SETTINGS_JSON_MAX_BYTES,
      });
    } catch {
      return noStoreJson({ error: 'invalid_security_settings_payload' }, { status: 400 });
    }

    const nextSettings = parseSecuritySettingsInput(body);
    if (!nextSettings) {
      return noStoreJson({ error: 'invalid_security_settings_payload' }, { status: 400 });
    }

    const changes = ['require_step_up_for_critical_actions', 'step_up_provider_mode'];

    if (nextSettings.allowedIdpAcrValues.length > 0) changes.push('allowed_idp_acr_values');
    if (nextSettings.allowedIdpAmrValues.length > 0) changes.push('allowed_idp_amr_values');

    const supabase = createAdminClient();
    const { data: previousSettings, error: previousSettingsError } = await supabase
      .from('organization_security_settings')
      .select('organization_id, require_step_up_for_critical_actions, step_up_provider_mode, allowed_idp_acr_values, allowed_idp_amr_values')
      .eq('organization_id', organization.id)
      .maybeSingle<StoredSecuritySettings>();

    if (previousSettingsError) {
      return noStoreJson({ error: 'security_settings_read_failed' }, { status: 503 });
    }

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

    if (!audit.persisted) {
      const compensation = previousSettings
        ? await supabase
            .from('organization_security_settings')
            .upsert(previousSettings, { onConflict: 'organization_id' })
        : await supabase
            .from('organization_security_settings')
            .delete()
            .eq('organization_id', organization.id);

      if (compensation.error) {
        console.error('security_settings_audit_compensation_failed');
      }

      return noStoreJson({ error: 'security_settings_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      changed: changes.length > 0,
      changedKeys: changes,
      auditPersisted: true,
      settings: {
        requireStepUpForCriticalActions: true,
        stepUpProviderMode: nextSettings.stepUpProviderMode,
        allowedIdpAcrValueCount: nextSettings.allowedIdpAcrValues.length,
        allowedIdpAmrValueCount: nextSettings.allowedIdpAmrValues.length,
      },
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}
