import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const readNormalized = (path: string) => read(path).toLowerCase();

describe('enterprise access and release closeout', () => {
  it('retains separation of duties and bounded privileged access', () => {
    const migration = readNormalized('supabase/migrations/20260726123000_enterprise_privileged_access_governance.sql');
    const service = read('src/server/enterprise/privileged-access-governance.ts');

    expect(migration).toContain('requester_user_id');
    expect(migration).toContain('approver_user_id');
    expect(migration).toContain('24 hours');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('for update skip locked');
    expect(service).toContain('decidePrivilegedAccessRequest');
    expect(service).toContain('expirePrivilegedAccess');
  });

  it('retains bounded break-glass access and immutable evidence', () => {
    const migration = readNormalized('supabase/migrations/20260727160000_enterprise_break_glass_governance.sql');
    const service = readNormalized('src/server/enterprise/break-glass-governance.ts');

    expect(migration).toContain('4 hours');
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain('force row level security');
    expect(service).toContain("createhash('sha256')");
    expect(service).toContain('revokebreakglassrequest');
    expect(service).toContain('expirebreakglassrequests');
  });

  it('keeps incident and operational runbooks available', () => {
    expect(read('docs/runbooks/ENTERPRISE_PRIVILEGED_ACCESS_INCIDENT.md')).toMatch(/revoke|revocation/i);
    expect(read('docs/runbooks/ENTERPRISE_BREAK_GLASS_INCIDENT_RUNBOOK.md')).toMatch(/post-incident|review/i);
  });
});
