import { createElement } from 'react';

import { requireCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

import BoardReportClient from './board-report-client';

export default async function BoardReportPage() {
  const user = await requireCurrentUser();
  const context = await getCurrentOrganizationForUser(user.id);

  if (!context) {
    return createElement('p', { role: 'alert' }, 'No active organization is available for this report.');
  }

  return createElement(BoardReportClient, { canonicalOrganizationId: context.organization.id });
}
