import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20261104233000_respect_enterprise_access_alert_channel_opt_out.sql',
  'utf8',
);

describe('OPS-04 explicit enterprise alert channel opt-in', () => {
  it('ships as a forward-only corrective migration without altering historical replay files', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.enqueue_enterprise_access_escalations()');
    expect(migration).toContain('BEGIN;');
    expect(migration).toContain('COMMIT;');
    expect(migration).toContain('RETURNS integer');
  });

  it('fails closed when no escalation policy exists for the tenant', () => {
    expect(migration).toMatch(/JOIN public\.enterprise_access_escalation_policies AS p\s+ON p\.organization_id = a\.organization_id/i);
    expect(migration).not.toMatch(/LEFT\s+JOIN public\.enterprise_access_escalation_policies/i);
    expect(migration).not.toMatch(/ELSE\s+'email'/i);
  });

  it('enqueues only for an explicitly enabled webhook or email channel', () => {
    expect(migration).toMatch(/WHEN p\.webhook_enabled IS TRUE THEN 'webhook'/i);
    expect(migration).toMatch(/WHEN p\.email_enabled IS TRUE THEN 'email'/i);
    expect(migration).toMatch(/p\.webhook_enabled IS TRUE\s+OR p\.email_enabled IS TRUE/i);
    expect(migration).toContain("a.status = 'open'");
  });

  it('preserves idempotent queue writes and backend-only RPC execution', () => {
    expect(migration).toMatch(/ON CONFLICT \(organization_id, alert_key, channel\) DO NOTHING/i);
    expect(migration).toMatch(/SET search_path = pg_catalog/i);
    expect(migration).toContain('FROM PUBLIC, anon, authenticated;');
    expect(migration).toContain('TO service_role;');
  });
});
