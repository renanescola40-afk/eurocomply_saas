import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'organization_required' }, { status: 403 });
  }

  const entitlements = await getOrganizationEntitlements(organization.id);

  return NextResponse.json({
    organizationId: organization.id,
    entitlements: {
      ...entitlements,
      maxDocuments: Number.isFinite(entitlements.maxDocuments) ? entitlements.maxDocuments : null,
      maxUsers: Number.isFinite(entitlements.maxUsers) ? entitlements.maxUsers : null,
      maxFiscalCountries: Number.isFinite(entitlements.maxFiscalCountries) ? entitlements.maxFiscalCountries : null,
    },
  });
}
