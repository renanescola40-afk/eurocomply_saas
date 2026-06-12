import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getCurrentUser } from '@/server/queries/auth';
import { listAuditEvents } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { checkDistributedRateLimit } from '@/server/security/rate-limit';
import { verifyAuditChain, type AuditChainRecord } from '@/server/security/audit-chain';
import { noStoreJson } from '@/server/security/no-store';
import { assessStepUpToken, stepUpRequiredResponse } from '@/server/security/step-up';

export const runtime = 'nodejs';

const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
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

  const stepUp = assessStepUpToken({
    action: 'audit_chain_verify',
    userId: user.id,
    organizationId: organization.id,
    token: request.headers.get(STEP_UP_TOKEN_HEADER),
  });

  if (!stepUp.ok) {
    return stepUpRequiredResponse(stepUp);
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `audit-chain-verify:${organization.id}:${user.id}`,
    limit: 10,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '250') || 250, 1), 1000);
  const events = await listAuditEvents(organization.id, limit);
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
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    checkedAt: new Date().toISOString(),
    requestedLimit: limit,
    totalEventsLoaded: events.length,
    chainedEventsChecked: verification.checked,
    legacyEvents,
    ok: verification.ok,
    lastHash: verification.lastHash,
    failures: verification.failures,
    actorRole: permission.role,
    plan: plan.entitlements.plan,
    stepUp: {
      action: stepUp.action,
      verifiedAt: stepUp.verifiedAt,
      expiresAt: stepUp.expiresAt,
      tokenType: 'signed_hmac',
    },
  });
}
