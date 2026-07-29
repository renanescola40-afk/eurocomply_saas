import { z } from 'zod';
import { decideBreakGlassRequest } from '@/server/enterprise/break-glass-governance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { requireStepUpForRequest } from '@/server/security/step-up';

const paramsSchema = z.object({ requestId: z.string().uuid() });
const schema = z.object({ decision: z.enum(['approved','rejected']), rationale: z.string().trim().min(8).max(1000) });

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    const { requestId } = paramsSchema.parse(await context.params);
    const denied = await requireTrustedMutation(request, { rateLimit: { key: `break-glass-decision:${organization.id}:${user.id}:${requestId}`, policy: 'team-management', userId: user.id, organizationId: organization.id, action: 'decide_break_glass_request', route: '/api/team/break-glass/[requestId]/decision', limit: 10, windowMs: 60_000, failureMode: 'fail-closed' } });
    if (denied) return denied;
    const stepUp = await requireStepUpForRequest({ request, action: 'manage_team', userId: user.id, organizationId: organization.id });
    if (!stepUp.ok) return stepUp.response;
    const body = await parseJsonBodyWithZod(request, { schema, maxBytes: 8 * 1024 });
    const result = await decideBreakGlassRequest({ organizationId: organization.id, requestId, approverUserId: user.id, ...body });
    return noStoreJson({ request: result });
  } catch (error) { return secureApiError(error); }
}
