import { createElement } from 'react';

import { requireCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

import AuditPackClient from './audit-pack-client';

export default async function AuditPackPage() {
  const user = await requireCurrentUser();
  const context = await getCurrentOrganizationForUser(user.id);

  if (!context) {
    return createElement('p', { role: 'alert' }, 'No active organization is available for this report.');
  }

  return createElement(AuditPackClient, { canonicalOrganizationId: context.organization.id });
}
