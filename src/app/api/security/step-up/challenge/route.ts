import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

function rateLimitDeniedResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return noStoreJson(
    {
      error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status: result.reason ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'authentication_required' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'organization_required' }, { status: 403 });
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `step-up:challenge:${organization.id}:${user.id}`,
    limit: 5,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitDeniedResponse(rateLimit);
  }

  return noStoreJson(
    {
      error: 'step_up_provider_not_configured',
      message: 'Step-up challenge issuance is intentionally disabled until a real MFA or identity-provider reauthentication flow is connected.',
      requiredProvider: 'mfa_or_identity_provider_reauthentication',
      supportedActions: [
        'export_data',
        'manage_billing',
        'manage_team',
        'gdpr_delete',
        'audit_chain_verify',
        'audit_chain_export',
        'change_security_settings',
      ],
    },
    { status: 501 },
  );
}
