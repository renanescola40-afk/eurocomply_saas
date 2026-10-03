import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261003221000_fix_team_invitation_acceptance_42702.sql', import.meta.url),
  'utf8',
);

describe('team invitation acceptance 42702 closure', () => {
  it('qualifies organization_usage conflict targets across create and accept billing paths', () => {
    expect(migration).toContain('accept_organization_invitation_atomic(text,uuid,text)');
    expect(migration).toContain('accept_billing_organization_invitation_atomic(text,uuid,text)');
    expect(migration).toContain('create_billing_organization_invitation_atomic(uuid,text,text,text,text,uuid,timestamptz)');
    expect(migration).toContain('on conflict on constraint organization_usage_pkey do nothing;');
    expect(migration).toContain('ambiguous invitation ON CONFLICT remains');
  });

  it('preserves security-definer and fixed-search-path verification', () => {
    expect(migration).toContain('p.prosecdef');
    expect(migration).toContain('search_path=pg_catalog, public');
  });
});
