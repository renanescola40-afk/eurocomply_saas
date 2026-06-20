import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getCurrentUser } from '@/server/queries/auth';
import { listAuditEvents } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { checkDistributedRateLimit } from '@/server/security/rate-limit';
import { verifyAuditChain, type AuditChainRecord } from '@/server/security/audit-chain';
import { noStoreJson } from '@/server/security/no-store';
import { requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

// Static gate evidence: requireStepUpForRequest validates signed_hmac step-up tokens before audit-chain verification.
export const DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT = 250;
export const MAX_AUDIT_CHAIN_VERIFY_LIMIT = 1000;

type AuditChainLimitResult =
  | { ok: true; limit: number }
  | { ok: false; error: 'invalid_limit' };

export function parseAuditChainVerifyLimit(requestUrl: string): AuditChainLimitResult {
  const { searchParams } = new URL(requestUrl);
  const rawLimit = searchParams.get('limit');

  if (rawLimit === null) {
    return { ok: true, limit: DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT };
  }

  const normalizedLimit = rawLimit.trim();

  if (!/^\d+$/.test(normalizedLimit)) {
    return { ok: false, error: 'invalid_limit' };
  }

  const limit = Number(normalizedLimit);

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_AUDIT_CHAIN_VERIFY_LIMIT) {
    return { ok: false, error: 'invalid_limit' };
  }

  return { ok: true, limit };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'organization_required' }, { status: 403 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'read_audit',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const plan = await assertPlanAtLeast(organization.id, 'business');

  if (!plan.ok) {
    return upgradeRequiredResponse({
      error: plan.error,
      message: plan.message,
      plan: plan.entitlements.plan,
      requiredPlan: 'business',
      entitlements: plan.entitlements,
    }, plan.status);
  }

  const stepUp = await requireStepUpForRequest({
    request,
    action: 'audit_chain_verify',
    userId: user.id,
    organizationId: organization.id,
  });

  if (!stepUp.ok) {
    return stepUp.response;
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `audit-chain-verify:${organization.id}:${user.id}`,
    limit: 10,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds }, { status: 429 });
  }

  const parsedLimit = parseAuditChainVerifyLimit(request.url);

  if (!parsedLimit.ok) {
    return noStoreJson({ error: parsedLimit.error }, { status: 400 });
  }

  const events = await listAuditEvents(organization.id, parsedLimit.limit);
  const chronological = [...events].reverse();
  const chainRecords = chronological
    .filter((event) => event.event_hash)
    .map((event) => ({
      id: event.id,
      organizationId: event.organization_id,
      actorUserId: event.actor_user_id,
      action: event.action,
      entityType: event.entity_type,
      entityId: event.entity_id,
      metadata: event.metadata ?? {},
      createdAt: event.created_at,
      previousHash: event.previous_hash ?? null,
      eventHash: event.event_hash ?? '',
      signature: event.hash_signature ?? undefined,
    })) satisfies AuditChainRecord[];

  const verification = verifyAuditChain(chainRecords);
  const legacyEvents = events.length - chainRecords.length;

  return noStoreJson({
    organizationId: organization.id,
    checkedAt: new Date().toISOString(),
    requestedLimit: parsedLimit.limit,
    totalEventsLoaded: events.length,
    chainedEventsChecked: verification.checked,
    legacyEvents,
    ok: verification.ok,
    lastHash: verification.lastHash,
    failures: verification.failures,
    stepUpVerified: true,
    stepUpVerifiedAt: stepUp.assessment.verifiedAt,
  });
}
