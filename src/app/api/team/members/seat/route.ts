import { createHash } from 'node:crypto';
import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  deprovisionEnterpriseIdentity,
  provisionEnterpriseIdentity,
} from '@/server/enterprise/provisioning';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const seatActionSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('change'),
    memberId: z.string().uuid(),
    seatType: z.enum(['full', 'participant', 'viewer']),
  }),
  z.object({
    operation: z.literal('suspend'),
    memberId: z.string().uuid(),
  }),
  z.object({
    operation: z.literal('reactivate'),
    memberId: z.string().uuid(),
    seatType: z.enum(['full', 'participant', 'viewer']).optional(),
  }),
]);

type MemberRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  seat_type?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

const MAX_JSON_BYTES = 4 * 1024;

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  );
}

function operationKey(input: {
  organizationId: string;
  member: MemberRecord;
  operation: string;
  seatType?: string;
}) {
  const digest = createHash('sha256')
    .update([
      input.organizationId,
      input.member.id,
      input.member.user_id,
      input.member.role ?? '',
      input.member.seat_type ?? 'full',
      input.member.status ?? 'active',
      input.member.updated_at ?? '',
      input.operation,
      input.seatType ?? '',
    ].join(':'))
    .digest('hex');

  return `team-seat:${digest}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `team-member-seat:${organization.id}:${user.id}:${getClientIp(request)}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organization.id,
        action: 'team_member_seat_change',
        route: '/api/team/members/seat',
        limit: 10,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });

    if (mutationDenied) return mutationDenied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: user.id,
      organizationId: organization.id,
    });

    if (!stepUp.ok) return stepUp.response;

    const body = await readBoundedJsonRequest(request, { maxBytes: MAX_JSON_BYTES }).catch(() => null);
    const parsed = seatActionSchema.safeParse(body);

    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_member_seat_payload' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('id', parsed.data.memberId)
      .maybeSingle();

    if (error) return noStoreJson({ error: 'team_member_lookup_failed' }, { status: 503 });
    if (!data) return noStoreJson({ error: 'team_member_not_found' }, { status: 404 });

    const member = data as unknown as MemberRecord;
    if (member.user_id === user.id) {
      return noStoreJson(
        { error: 'self_seat_change_blocked', message: 'You cannot change or suspend your own seat from here.' },
        { status: 400 },
      );
    }

    const currentSeatType = member.seat_type === 'participant' || member.seat_type === 'viewer'
      ? member.seat_type
      : 'full';
    const currentStatus = member.status ?? 'active';
    const idempotencyKey = operationKey({
      organizationId: organization.id,
      member,
      operation: parsed.data.operation,
      seatType: 'seatType' in parsed.data ? parsed.data.seatType : undefined,
    });

    if (parsed.data.operation === 'suspend') {
      const result = await deprovisionEnterpriseIdentity({
        organizationId: organization.id,
        membershipId: member.id,
        actorUserId: user.id,
        source: 'admin',
        idempotencyKey,
      });

      if (result.outcome === 'not_found') {
        return noStoreJson({ error: 'team_member_not_found' }, { status: 404 });
      }

      if (result.outcome === 'invalid_input' || result.outcome === 'invalid_source') {
        return noStoreJson({ error: 'invalid_member_seat_payload' }, { status: 400 });
      }

      if (result.outcome === 'unknown') {
        return noStoreJson({ error: 'member_seat_suspension_unavailable' }, { status: 503 });
      }

      return noStoreJson({
        changed: result.outcome === 'released',
        status: 'suspended',
        seatType: result.releasedSeatType ?? currentSeatType,
        activeMembers: result.activeMembers,
        actorRole: permission.role,
        stepUp: publicStepUpSummary(stepUp.assessment),
      });
    }

    const requestedSeatType = parsed.data.seatType ?? currentSeatType;
    if (parsed.data.operation === 'change' && currentStatus === 'active' && requestedSeatType === currentSeatType) {
      return noStoreJson({
        changed: false,
        status: currentStatus,
        seatType: currentSeatType,
        actorRole: permission.role,
        stepUp: publicStepUpSummary(stepUp.assessment),
      });
    }

    const result = await provisionEnterpriseIdentity({
      organizationId: organization.id,
      userId: member.user_id,
      actorUserId: user.id,
      role: member.role ?? 'viewer',
      seatType: requestedSeatType,
      source: parsed.data.operation === 'reactivate' ? 'reactivation' : 'admin',
      idempotencyKey,
    });

    if (result.outcome === 'member_limit_reached' || result.outcome === 'seat_limit_reached') {
      return noStoreJson(
        {
          error: 'organization_seat_limit_reached',
          seatType: requestedSeatType,
          usage: result.seatUsage,
          limit: result.seatLimit,
        },
        { status: 409 },
      );
    }

    if (result.outcome === 'admin_limit_reached') {
      return noStoreJson({ error: 'organization_admin_limit_reached' }, { status: 409 });
    }

    if (
      result.outcome === 'contract_missing'
      || result.outcome === 'contract_not_active'
      || result.outcome === 'entitlements_missing'
    ) {
      return noStoreJson({ error: 'organization_contract_not_accepting_members' }, { status: 403 });
    }

    if (
      result.outcome === 'invalid_input'
      || result.outcome === 'invalid_idempotency_key'
      || result.outcome === 'invalid_role'
      || result.outcome === 'invalid_seat_type'
      || result.outcome === 'invalid_source'
    ) {
      return noStoreJson({ error: 'invalid_member_seat_payload' }, { status: 400 });
    }

    if (result.outcome === 'unknown') {
      return noStoreJson({ error: 'member_seat_change_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      changed: result.outcome === 'reserved' || result.outcome === 'seat_changed',
      status: 'active',
      seatType: result.seatType ?? requestedSeatType,
      activeMembers: result.activeMembers,
      seatUsage: result.seatUsage,
      seatLimit: result.seatLimit,
      actorRole: permission.role,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}
