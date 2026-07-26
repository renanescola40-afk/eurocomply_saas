import { z } from 'zod';

import { csvDownloadResponse, type CsvCell, type CsvRow } from '@/lib/exports/csv';
import { exportEnterpriseAccessOperationMembers } from '@/server/enterprise/access-operations-center';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, requirePermission, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';

const paramsSchema = z.object({ jobId: z.string().uuid() });

const headers = [
  'identity_id',
  'membership_id',
  'user_id',
  'department_key',
  'source_group_id',
  'previous_role',
  'requested_role',
  'previous_seat_type',
  'requested_seat_type',
  'status',
  'outcome_code',
  'attempt_count',
  'completed_at',
] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const { jobId } = paramsSchema.parse(await context.params);
    const rows = await exportEnterpriseAccessOperationMembers({
      operationId: jobId,
      organizationId: organization.id,
    });

    const csvRows: CsvRow[] = [
      [...headers],
      ...rows.map((row) => {
        const record = row as Record<string, CsvCell>;
        return headers.map((header) => record[header]);
      }),
    ];

    return csvDownloadResponse(csvRows, `access-operation-${jobId}.csv`);
  } catch (error) {
    return secureApiError(error);
  }
}
