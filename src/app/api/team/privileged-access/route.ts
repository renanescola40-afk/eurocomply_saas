import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPrivilegedAccessRequest } from '@/server/enterprise/privileged-access-governance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { requireStepUpForRequest } from '@/server/security/step-up';

const schema = z.object({
  targetMembershipId: z.string().uuid(),
  requestedRole: z.enum(['admin', 'owner']),
  justification: z.string().trim().min(12).max(1000),
  durationMinutes: z.number().int().min(15).max(1440),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    const { data, error } = await createAdminClient().from('enterprise_privileged_access_requests')
      .select('id,target_membership_id,requested_role,status,required_approvals,approval_count,expires_at,created_at')
      .eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(100);
    if (error) return noStoreJson({ error: 'privileged_access_lookup_failed' }, { status: 503 });
    return noStoreJson({ requests: data ?? [] });
  } catch (error) { return secureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    const denied = await requireTrustedMutation(request, { rateLimit: {
      key: `privileged-access:${organization.id}:${user.id}`, policy: 'team-management', userId: user.id,
      organizationId: organization.id, action: 'create_privileged_access_request', route: '/api/team/privileged-access',
      limit: 5, windowMs: 60_000, failureMode: 'fail-closed',
    }});
    if (denied) return denied;
    const stepUp = await requireStepUpForRequest({ request, action: 'manage_team', userId: user.id, organizationId: organization.id });
    if (!stepUp.ok) return stepUp.response;
    const parsed = schema.safeParse(await readBoundedJsonRequest(request, { maxBytes: 16 * 1024 }));
    if (!parsed.success) return noStoreJson({ error: 'invalid_privileged_access_request' }, { status: 400 });
    const result = await createPrivilegedAccessRequest({ organizationId: organization.id, requesterUserId: user.id, ...parsed.data });
    return noStoreJson({ request: result }, { status: 202 });
  } catch (error) { return secureApiError(error); }
}