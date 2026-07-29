import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('enterprise access and release closeout', () => {
  it('retains separation of duties and bounded privileged access', () => {
    const migration = read('supabase/migrations/20260726123000_enterprise_privileged_access_governance.sql');
    expect(migration).toContain('requester_user_id');
    expect(migration).toContain('approver_user_id');
    expect(migration).toContain('24 hours');
    expect(migration).toContain('FORCE ROW LEVEL SECURITY');
  });

  it('retains bounded break-glass access and immutable evidence', () => {
    const migration = read('supabase/migrations/20260727160000_enterprise_break_glass_governance.sql');
    expect(migration).toContain('4 hours');
    expect(migration).toContain('FOR UPDATE SKIP LOCKED');
    expect(migration).toContain('sha256');
    expect(migration).toContain('FORCE ROW LEVEL SECURITY');
  });

  it('keeps incident and operational runbooks available', () => {
    expect(read('docs/runbooks/PRIVILEGED_ACCESS_INCIDENT.md')).toMatch(/revoke|revocation/i);
    expect(read('docs/runbooks/ENTERPRISE_BREAK_GLASS_INCIDENT_RUNBOOK.md')).toMatch(/post-incident|review/i);
  });
});
