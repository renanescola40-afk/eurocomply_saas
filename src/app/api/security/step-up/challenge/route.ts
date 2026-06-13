import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

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
