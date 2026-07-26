import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { decidePrivilegedAccessRequest } from '@/server/enterprise/privileged-access-governance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { requireStepUpForRequest } from '@/server/security/step-up';

const paramsSchema = z.object({ requestId: z.string().uuid() });
const bodySchema = z.object({ decision: z.enum(['approved', 'rejected']), reason: z.string().trim().min(8).max(500) });

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    const { requestId } = paramsSchema.parse(await context.params);
    const denied = await requireTrustedMutation(request, { rateLimit: {
      key: `privileged-access-decision:${organization.id}:${user.id}:${requestId}`, policy: 'team-management', userId: user.id,
      organizationId: organization.id, action: 'decide_privileged_access_request', route: '/api/team/privileged-access/[requestId]/decision',
      limit: 10, windowMs: 60_000, failureMode: 'fail-closed',
    }});
    if (denied) return denied;
    const stepUp = await requireStepUpForRequest({ request, action: 'manage_team', userId: user.id, organizationId: organization.id });
    if (!stepUp.ok) return stepUp.response;
    const parsed = bodySchema.safeParse(await readBoundedJsonRequest(request, { maxBytes: 8 * 1024 }));
    if (!parsed.success) return noStoreJson({ error: 'invalid_privileged_access_decision' }, { status: 400 });
    const result = await decidePrivilegedAccessRequest({ organizationId: organization.id, requestId, approverUserId: user.id, ...parsed.data });
    if (result.outcome === 'not_found') return noStoreJson({ error: 'privileged_access_request_not_found' }, { status: 404 });
    if (result.outcome === 'invalid_state') return noStoreJson({ error: 'privileged_access_invalid_state' }, { status: 409 });
    if (result.outcome === 'separation_of_duties') return noStoreJson({ error: 'privileged_access_separation_of_duties' }, { status: 403 });
    return noStoreJson({ result });
  } catch (error) { return secureApiError(error); }
}