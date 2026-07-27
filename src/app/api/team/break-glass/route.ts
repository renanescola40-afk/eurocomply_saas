import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createBreakGlassRequest } from '@/server/enterprise/break-glass-governance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { requireStepUpForRequest } from '@/server/security/step-up';

const schema = z.object({
  targetMembershipId: z.string().uuid(),
  requestedRole: z.enum(['admin', 'owner']),
  incidentReference: z.string().trim().min(8).max(160),
  justification: z.string().trim().min(20).max(2000),
  requestedMinutes: z.number().int().min(15).max(240),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    const { data, error } = await createAdminClient()
      .from('enterprise_break_glass_requests')
      .select('id,target_membership_id,requested_role,incident_reference,status,requested_minutes,approvals_required,approvals_received,activated_at,expires_at,review_due_at,created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return noStoreJson({ error: 'break_glass_lookup_failed' }, { status: 503 });
    return noStoreJson({ requests: data ?? [] });
  } catch (error) { return secureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    const denied = await requireTrustedMutation(request, { rateLimit: { key: `break-glass-request:${organization.id}:${user.id}`, policy: 'team-management', userId: user.id, organizationId: organization.id, action: 'create_break_glass_request', route: '/api/team/break-glass', limit: 3, windowMs: 60_000, failureMode: 'fail-closed' } });
    if (denied) return denied;
    const stepUp = await requireStepUpForRequest({ request, action: 'manage_team', userId: user.id, organizationId: organization.id });
    if (!stepUp.ok) return stepUp.response;
    const body = await parseJsonBodyWithZod(request, { schema, maxBytes: 16 * 1024 });
    const created = await createBreakGlassRequest({ organizationId: organization.id, requesterUserId: user.id, ...body });
    return noStoreJson({ request: created }, { status: 201 });
  } catch (error) { return secureApiError(error); }
}
