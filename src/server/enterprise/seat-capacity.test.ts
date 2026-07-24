import { describe, expect, it } from 'vitest';

import { consumeSeatInputSchema, reserveSeatInputSchema } from './seat-capacity';

const organizationId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const memberId = '33333333-3333-4333-8333-333333333333';
const reservationId = '44444444-4444-4444-8444-444444444444';

describe('enterprise seat capacity service', () => {
  it('accepts an idempotent member reservation request', () => {
    const result = reserveSeatInputSchema.parse({
      organizationId,
      seatType: 'full',
      idempotencyKey: 'invite:member:2026-07-24',
      expectedPolicyVersion: 3,
      actorUserId,
      memberId,
      ttlSeconds: 900,
    });
    expect(result.seatType).toBe('full');
    expect(result.expectedPolicyVersion).toBe(3);
  });

  it('accepts an email reservation without retaining raw email in the database contract', () => {
    const result = reserveSeatInputSchema.parse({
      organizationId,
      seatType: 'participant',
      idempotencyKey: 'invite:email:2026-07-24',
      expectedPolicyVersion: 1,
      actorUserId,
      inviteEmail: 'Person@Example.com',
    });
    expect(result.inviteEmail).toBe('Person@Example.com');
  });

  it('rejects requests without a target identity', () => {
    const result = reserveSeatInputSchema.safeParse({
      organizationId,
      seatType: 'viewer',
      idempotencyKey: 'missing-target-identity',
      expectedPolicyVersion: 1,
      actorUserId,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unsafe TTLs and invalid seat types', () => {
    expect(reserveSeatInputSchema.safeParse({
      organizationId,
      seatType: 'owner',
      idempotencyKey: 'invalid-seat-request',
      expectedPolicyVersion: 1,
      actorUserId,
      memberId,
      ttlSeconds: 30,
    }).success).toBe(false);
  });

  it('requires optimistic concurrency when consuming a reservation', () => {
    const result = consumeSeatInputSchema.parse({
      organizationId,
      reservationId,
      memberId,
      expectedMemberSeatVersion: 7,
      actorUserId,
    });
    expect(result.expectedMemberSeatVersion).toBe(7);
  });
});
