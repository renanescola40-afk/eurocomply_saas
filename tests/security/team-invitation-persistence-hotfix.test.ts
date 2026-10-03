import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261003205557_fix_team_invitation_persistence_42702.sql', import.meta.url),
  'utf8',
);

describe('team invitation persistence 42702 hotfix', () => {
  it('replaces ambiguous ON CONFLICT inference with the organization_usage primary key constraint', () => {
    expect(migration).toContain("create_organization_invitation_with_seat_atomic_reconciled");
    expect(migration).toContain("on conflict on constraint organization_usage_pkey do nothing;");
    expect(migration).toContain("expected ambiguous ON CONFLICT fragment was not found");
  });

  it('preserves the reconciled implementation security boundary', () => {
    expect(migration).toContain("p.prosecdef");
    expect(migration).toContain("search_path=pg_catalog, public");
    expect(migration).toContain("has_function_privilege('anon'");
    expect(migration).toContain("has_function_privilege('authenticated'");
    expect(migration).toContain("has_function_privilege('service_role'");
  });
});
