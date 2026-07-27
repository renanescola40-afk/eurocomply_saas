import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getSeatContentionSummary, reserveSeatWithConcurrencyGuard } from '@/server/enterprise/seat-concurrency-alerting';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { requireStepUpForRequest } from '@/server/security/step-up';

const inputSchema = z.object({
  membershipId: z.string().uuid(),
  seatType: z.enum(['full', 'participant', 'viewer']),
  expectedContractVersion: z.number().int().positive().nullable().optional(),
  correlationId: z.string().uuid().optional(),
});

function ip(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    return noStoreJson({ summary: await getSeatContentionSummary(organization.id) });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });

    const denied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `seat-contention:${organization.id}:${user.id}:${ip(request)}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organization.id,
        action: 'seat_contention_reservation',
        route: '/api/team/seat-contention',
        limit: 20,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (denied) return denied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: user.id,
      organizationId: organization.id,
    });
    if (!stepUp.ok) return stepUp.response;

    const payload = await readBoundedJsonRequest(request, { maxBytes: 16 * 1024 }).catch(() => null);
    const parsed = inputSchema.safeParse(payload);
    if (!parsed.success) return noStoreJson({ error: 'invalid_seat_reservation' }, { status: 400 });

    const result = await reserveSeatWithConcurrencyGuard({
      organizationId: organization.id,
      membershipId: parsed.data.membershipId,
      requestedSeatType: parsed.data.seatType,
      expectedContractVersion: parsed.data.expectedContractVersion,
      actorUserId: user.id,
      correlationId: parsed.data.correlationId,
    });

    if (result.outcome === 'capacity_exhausted' || result.outcome === 'version_conflict') {
      return noStoreJson({ error: result.outcome, result }, { status: 409 });
    }
    if (result.outcome === 'membership_not_found' || result.outcome === 'contract_not_found') {
      return noStoreJson({ error: result.outcome }, { status: 404 });
    }
    if (result.outcome !== 'reserved') {
      return noStoreJson({ error: 'seat_reservation_failed', result }, { status: 400 });
    }
    return noStoreJson({ result });
  } catch (error) {
    return secureApiError(error);
  }
}
