import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson, requireEnterpriseRateLimit } from '@/server/security/api-guards';

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'organization_required' }, { status: 403 });
  }

  const rateLimitDenied = await requireEnterpriseRateLimit(request, {
    policy: 'general-api',
    userId: user.id,
    organizationId: organization.id,
    action: 'billing.entitlements.read',
    route: '/api/billing/entitlements',
  });

  if (rateLimitDenied) {
    return rateLimitDenied;
  }

  const entitlements = await getOrganizationEntitlements(organization.id);

  return noStoreJson({
    organizationId: organization.id,
    entitlements: {
      ...entitlements,
      maxDocuments: Number.isFinite(entitlements.maxDocuments) ? entitlements.maxDocuments : null,
      maxUsers: Number.isFinite(entitlements.maxUsers) ? entitlements.maxUsers : null,
      maxVendors: Number.isFinite(entitlements.maxVendors) ? entitlements.maxVendors : null,
      maxRisks: Number.isFinite(entitlements.maxRisks) ? entitlements.maxRisks : null,
      maxFiscalCountries: Number.isFinite(entitlements.maxFiscalCountries) ? entitlements.maxFiscalCountries : null,
    },
  });
}
