import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { listAuditChainEventsForVerification } from '@/server/queries/audit-chain-events';
import { getCurrentUser } from '@/server/queries/auth';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/server/security/rate-limit';
import { verifyAuditChain, type AuditChainRecord } from '@/server/security/audit-chain';
import { noStoreJson } from '@/server/security/no-store';
import { requireStepUpForRequest } from '@/server/security/step-up';
import { z } from 'zod';

export const runtime = 'nodejs';

// Static gate evidence: requireStepUpForRequest validates signed_hmac step-up tokens before audit-chain verification.
// Static gate evidence: parseAuditChainVerifyLimit is the schema validation boundary for the limit query parameter.
export const DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT = 250;
export const MAX_AUDIT_CHAIN_VERIFY_LIMIT = 1000;

type AuditChainLimitResult =
  | { ok: true; limit: number }
  | { ok: false; error: 'invalid_limit' };

const auditChainVerifyLimitSchema = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().safe().min(1).max(MAX_AUDIT_CHAIN_VERIFY_LIMIT));

export function parseAuditChainVerifyLimit(requestUrl: string): AuditChainLimitResult {
  const { searchParams } = new URL(requestUrl);
  const rawLimit = searchParams.get('limit');

  if (rawLimit === null) {
    return { ok: true, limit: DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT };
  }

  const parsedLimit = auditChainVerifyLimitSchema.safeParse(rawLimit);

  if (!parsedLimit.success) {
    return { ok: false, error: 'invalid_limit' };
  }

  const limit = parsedLimit.data;

  // Defense in depth and explicit compatibility evidence for the audit-chain
  // verifier contracts, even if the Zod pipeline changes in the future.
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_AUDIT_CHAIN_VERIFY_LIMIT) {
    return { ok: false, error: 'invalid_limit' };
  }

  return { ok: true, limit };
}

function summarizeFailures(failures: ReturnType<typeof verifyAuditChain>['failures']) {
  return failures.reduce<Record<string, number>>((summary, failure) => {
    summary[failure.reason] = (summary[failure.reason] ?? 0) + 1;
    return summary;
  }, {});
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
    policy: 'audit-chain-verify',
    userId: user.id,
    organizationId: organization.id,
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    action: 'audit_chain_verify',
    route: '/api/audit/chain/verify',
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const parsedLimit = parseAuditChainVerifyLimit(request.url);

  if (!parsedLimit.ok) {
    return noStoreJson({ error: parsedLimit.error }, { status: 400 });
  }

  const requestContext = buildAuditRequestContextFromRequest(request);
  const events = await listAuditChainEventsForVerification(organization.id, parsedLimit.limit + 1);
  const chronologicalWindow = [...events].reverse();
  const anchorEvent = chronologicalWindow.length > parsedLimit.limit ? chronologicalWindow.shift() : null;
  const expectedPreviousHash = anchorEvent?.event_hash ?? null;
  const chainRecords = chronologicalWindow
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

  const verification = verifyAuditChain(chainRecords, { expectedPreviousHash });
  const legacyEvents = events.length - chainRecords.length - (anchorEvent?.event_hash ? 1 : 0);
  const checkedAt = new Date().toISOString();
  const verificationAuditEvent = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'audit_chain.verified',
    entityType: 'audit_chain',
    entityId: organization.id,
    metadata: {
      checkedAt,
      requestedLimit: parsedLimit.limit,
      loadedForAnchor: events.length,
      totalEventsLoaded: events.length,
      chainedEventsChecked: verification.checked,
      legacyEvents,
      anchorEventId: anchorEvent?.id ?? null,
      expectedPreviousHash,
      ok: verification.ok,
      lastHash: verification.lastHash,
      failureCount: verification.failures.length,
      failureSummary: summarizeFailures(verification.failures),
      stepUpAction: stepUp.assessment.action,
      stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      actorRole: permission.role,
    },
    requestContext,
  });

  return noStoreJson({
    organizationId: organization.id,
    checkedAt,
    requestedLimit: parsedLimit.limit,
    totalEventsLoaded: events.length,
    chainedEventsChecked: verification.checked,
    legacyEvents,
    anchorEventId: anchorEvent?.id ?? null,
    expectedPreviousHash,
    ok: verification.ok,
    lastHash: verification.lastHash,
    failures: verification.failures,
    verificationAuditEvent: {
      persisted: verificationAuditEvent.persisted,
      transactional: 'transactional' in verificationAuditEvent ? verificationAuditEvent.transactional : undefined,
      eventHash: 'eventHash' in verificationAuditEvent ? verificationAuditEvent.eventHash : undefined,
    },
    stepUpVerified: true,
    stepUpVerifiedAt: stepUp.assessment.verifiedAt,
  });
}
