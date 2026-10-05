import { createElement } from 'react';

import { requireCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

import EvidenceVaultClient from './evidence-vault-client';

export default async function EvidenceVaultPage() {
  const user = await requireCurrentUser();
  const context = await getCurrentOrganizationForUser(user.id);

  if (!context) {
    return createElement('p', { role: 'alert' }, 'No active organization is available for the Evidence Vault.');
  }

  return createElement(EvidenceVaultClient, { canonicalOrganizationId: context.organization.id });
}
