import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const usageConflictMigration = readFileSync(
  new URL('../../supabase/migrations/20261003221000_fix_team_invitation_acceptance_42702.sql', import.meta.url),
  'utf8',
);

const membershipConflictMigration = readFileSync(
  new URL('../../supabase/migrations/20261003221500_fix_team_invitation_membership_conflict_42702.sql', import.meta.url),
  'utf8',
);

describe('team invitation acceptance 42702 closure', () => {
  it('qualifies organization_usage conflict targets across create and accept billing paths', () => {
    expect(usageConflictMigration).toContain('accept_organization_invitation_atomic(text,uuid,text)');
    expect(usageConflictMigration).toContain('accept_billing_organization_invitation_atomic(text,uuid,text)');
    expect(usageConflictMigration).toContain('create_billing_organization_invitation_atomic(uuid,text,text,text,text,uuid,timestamptz)');
    expect(usageConflictMigration).toContain('on conflict on constraint organization_usage_pkey do nothing;');
    expect(usageConflictMigration).toContain('ambiguous invitation ON CONFLICT remains');
  });

  it('qualifies organization_members upserts across both acceptance authorities', () => {
    expect(membershipConflictMigration).toContain('accept_organization_invitation_atomic(text,uuid,text)');
    expect(membershipConflictMigration).toContain('accept_billing_organization_invitation_atomic(text,uuid,text)');
    expect(membershipConflictMigration).toContain(
      'on conflict on constraint organization_members_organization_id_user_id_key do update set',
    );
    expect(membershipConflictMigration).toContain('ambiguous membership conflict target remains');
  });

  it('preserves security-definer and fixed-search-path verification', () => {
    expect(usageConflictMigration).toContain('p.prosecdef');
    expect(usageConflictMigration).toContain('search_path=pg_catalog, public');
    expect(membershipConflictMigration).toContain('p.prosecdef');
    expect(membershipConflictMigration).toContain('search_path=pg_catalog, public');
  });
});
