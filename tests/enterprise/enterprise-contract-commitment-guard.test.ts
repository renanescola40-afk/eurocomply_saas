import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260721203000_safe_contract_pending_commitments.sql',
  'utf8',
);

describe('enterprise contract committed-usage guard', () => {
  it('serializes contract replacement on the organization usage row', () => {
    expect(migration).toContain('from public.organization_usage as usage');
    expect(migration).toContain('for update;');
    expect(migration.indexOf('for update;')).toBeLessThan(
      migration.indexOf('from public.create_enterprise_contract_atomic('),
    );
  });

  it('counts every valid pending invitation by seat and administrator type', () => {
    expect(migration).toContain('v_pending_members integer');
    expect(migration).toContain("invitation.seat_type = 'full'");
    expect(migration).toContain("invitation.seat_type = 'participant'");
    expect(migration).toContain("invitation.seat_type = 'viewer'");
    expect(migration).toContain("lower(coalesce(invitation.role, '')) in ('owner', 'admin')");
    expect(migration).toContain('invitation.accepted_at is null');
    expect(migration).toContain('invitation.revoked_at is null');
    expect(migration).toContain('invitation.expires_at > now()');
  });

  it('rejects the negotiated contract before deleting compatibility coverage', () => {
    expect(migration).toContain('v_usage.active_members + v_pending_members > p_member_limit');
    expect(migration).toContain('v_usage.full_users + v_pending_full_users > p_full_user_limit');
    expect(migration).toContain('v_usage.participants + v_pending_participants > p_participant_limit');
    expect(migration).toContain('v_usage.viewers + v_pending_viewers > p_viewer_limit');
    expect(migration).toContain('v_usage.active_admins + v_pending_admins > p_admin_limit');
    expect(migration).toContain("'limits_below_current_usage'::text");
    expect(migration.indexOf("'limits_below_current_usage'::text")).toBeLessThan(
      migration.indexOf('from public.create_enterprise_contract_atomic('),
    );
  });
});
