import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  accessExportRequestSchema,
  alertActionSchema,
  enqueueAccessExport,
  getAccessRuntimeDashboard,
  mutateAccessRuntimeAlert,
} from '@/server/enterprise/access-runtime-slo';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const MAX_JSON_BYTES = 16 * 1024;

function ip(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

async function context() {
  const user = await requireApiUser();
  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) return null;
  const permission = await requirePermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_team',
  });
  return { user, organization, permission };
}

export async function GET(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const dashboard = await getAccessRuntimeDashboard(ctx.organization.id, cursor, limit);
    return noStoreJson({ dashboard, actorRole: ctx.permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const denied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `access-runtime:${ctx.organization.id}:${ctx.user.id}:${ip(request)}`,
        policy: 'team-management',
        userId: ctx.user.id,
        organizationId: ctx.organization.id,
        action: 'access_runtime_mutation',
        route: '/api/team/access-runtime',
        limit: 20,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (denied) return denied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: ctx.user.id,
      organizationId: ctx.organization.id,
    });
    if (!stepUp.ok) return stepUp.response;

    const body = await readBoundedJsonRequest(request, { maxBytes: MAX_JSON_BYTES }).catch(() => null);
    if (!body || typeof body !== 'object') return noStoreJson({ error: 'invalid_access_runtime_payload' }, { status: 400 });
    const record = body as Record<string, unknown>;

    if (record.operation === 'export') {
      const parsed = accessExportRequestSchema.safeParse(record);
      if (!parsed.success) return noStoreJson({ error: 'invalid_access_export_request' }, { status: 400 });
      const result = await enqueueAccessExport({
        organizationId: ctx.organization.id,
        actorUserId: ctx.user.id,
        request: parsed.data,
      });
      return noStoreJson({ result, stepUp: publicStepUpSummary(stepUp.assessment) }, { status: 202 });
    }

    const parsed = alertActionSchema.safeParse(record);
    if (!parsed.success) return noStoreJson({ error: 'invalid_access_alert_action' }, { status: 400 });
    const result = await mutateAccessRuntimeAlert({
      organizationId: ctx.organization.id,
      actorUserId: ctx.user.id,
      action: parsed.data,
    });
    return noStoreJson({ result, stepUp: publicStepUpSummary(stepUp.assessment) });
  } catch (error) {
    return secureApiError(error);
  }
}
