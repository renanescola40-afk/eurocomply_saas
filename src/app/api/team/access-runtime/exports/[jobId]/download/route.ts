import { randomUUID } from 'node:crypto';

import { createAccessExportSignedDownload } from '@/server/enterprise/access-export-downloads';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: user.id,
      organizationId: organization.id,
    });
    if (!stepUp.ok) return stepUp.response;

    const { jobId } = await context.params;
    if (!UUID_PATTERN.test(jobId)) {
      return noStoreJson({ error: 'invalid_export_job_id' }, { status: 400 });
    }

    const result = await createAccessExportSignedDownload({
      organizationId: organization.id,
      exportJobId: jobId,
      actorUserId: user.id,
      correlationId: randomUUID(),
    });

    return noStoreJson({
      result,
      stepUp: publicStepUpSummary(stepUp.assessment),
    }, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    return secureApiError(error);
  }
}
