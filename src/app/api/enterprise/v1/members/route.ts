import { createHash } from 'node:crypto';
import { z } from 'zod';

import { buildRateLimitSubjectFromRequest, checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  EnterpriseApiAccessError,
  requireEnterpriseApiAccess,
} from '@/server/enterprise/api-access';
import { provisionEnterpriseIdentity } from '@/server/enterprise/provisioning';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/enterprise/v1/members';
const MAX_BODY_BYTES = 16 * 1024;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']),
  seatType: z.enum(['full', 'participant', 'viewer']),
});

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

function outcomeStatus(outcome: string) {
  if (['reserved', 'already_active', 'seat_changed', 'duplicate'].includes(outcome)) return 200;
  if (['member_limit_reached', 'seat_limit_reached', 'admin_limit_reached'].includes(outcome)) return 409;
  if (['contract_missing', 'contract_not_active', 'entitlements_missing'].includes(outcome)) return 403;
  if (outcome.startsWith('invalid_')) return 400;
  return 503;
}

export async function POST(request: Request) {
  const authenticationRateLimit = await checkDistributedRateLimit({
    policy: 'general-api',
    ...buildRateLimitSubjectFromRequest(request, {
      action: 'enterprise_api_key_authentication',
      route: ROUTE,
    }),
    limit: 60,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });
  if (!authenticationRateLimit.allowed) return rateLimitResponse(authenticationRateLimit);

  try {
    const access = await requireEnterpriseApiAccess(request, 'users:provision');
    const operationRateLimit = await checkDistributedRateLimit({
      policy: 'general-api',
      ...buildRateLimitSubjectFromRequest(request, {
        userId: access.actorUserId,
        organizationId: access.organizationId,
        action: 'enterprise_api_user_provision',
        route: ROUTE,
      }),
      limit: 120,
      windowMs: 60_000,
      failureMode: 'fail-closed',
    });
    if (!operationRateLimit.allowed) return rateLimitResponse(operationRateLimit);

    const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
      return noStoreJson({ error: 'enterprise_api_idempotency_key_required' }, { status: 400 });
    }

    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_BODY_BYTES,
    }).catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_enterprise_api_member_payload' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(parsed.data.userId);
    if (userError || !userData.user) {
      return noStoreJson({ error: 'enterprise_api_user_not_found' }, { status: 404 });
    }

    const result = await provisionEnterpriseIdentity({
      organizationId: access.organizationId,
      userId: parsed.data.userId,
      actorUserId: access.actorUserId,
      role: parsed.data.role,
      seatType: parsed.data.seatType,
      source: 'api',
      idempotencyKey: `enterprise-api:${access.keyId}:${idempotencyKey}`,
    });

    const idempotencyDigest = createHash('sha256').update(idempotencyKey, 'utf8').digest('hex');
    const rpc = admin as unknown as RpcClient;
    const { error: auditError } = await rpc.rpc('record_enterprise_api_provisioning_event', {
      p_organization_id: access.organizationId,
      p_service_account_id: access.serviceAccountId,
      p_api_key_id: access.keyId,
      p_target_user_id: parsed.data.userId,
      p_outcome: result.outcome,
      p_role: parsed.data.role,
      p_seat_type: parsed.data.seatType,
      p_idempotency_digest: idempotencyDigest,
    });
    if (auditError) {
      console.warn('[enterprise-api] provisioning_audit_failed', { code: auditError.code ?? 'unknown' });
      return noStoreJson({ error: 'enterprise_api_audit_unavailable' }, { status: 503 });
    }

    const status = outcomeStatus(result.outcome);
    if (status >= 400) {
      return noStoreJson({ error: result.outcome }, { status });
    }

    return noStoreJson(
      {
        provisioned: true,
        outcome: result.outcome,
        membershipId: result.membershipId,
        role: result.role,
        seatType: result.seatType,
        organizationId: access.organizationId,
      },
      { status },
    );
  } catch (error) {
    if (error instanceof EnterpriseApiAccessError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    console.error('[enterprise-api] member_provisioning_failed', {
      error: error instanceof Error ? error.name : 'unknown',
    });
    return noStoreJson({ error: 'enterprise_api_unavailable' }, { status: 503 });
  }
}
