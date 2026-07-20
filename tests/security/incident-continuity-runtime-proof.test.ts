import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/incident-continuity-runtime-proof.yml', 'utf8');
const migration = readFileSync('supabase/migrations/20260720223000_incident_response_continuity.sql', 'utf8');
const runtime = readFileSync('scripts/incident/run-incident-continuity-runtime-proof.mjs', 'utf8');
const validator = readFileSync('scripts/incident/check-incident-continuity-evidence.mjs', 'utf8');
const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages?: Record<string, { version?: string }>;
};

describe('incident response and continuity megapack', () => {
  it('uses protected exact-main manual execution', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-incident-proof');
    expect(workflow).toContain('EXECUTE_INCIDENT_CONTINUITY_PROOF');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('creates tenant-scoped incident, timeline and continuity controls', () => {
    for (const token of [
      'security_incidents','incident_timeline_events','continuity_exercises','force row level security',
      "severity in ('sev1','sev2','sev3','sev4')",'postmortem_due_at','evidence_digest_sha256',
      'independent_reviewer_id','owner_id <> independent_reviewer_id',
    ]) expect(migration).toContain(token);
  });

  it('requires complete CRUD policy coverage', () => {
    const expectedPolicies = [
      'incident members read',
      'incident admins insert',
      'incident admins update',
      'incident owners delete',
      'timeline members read',
      'timeline admins insert',
      'timeline admins update',
      'timeline owners delete',
      'continuity members read',
      'continuity admins insert',
      'continuity admins update',
      'continuity owners delete',
    ];

    for (const policy of expectedPolicies) expect(migration).toContain(policy);
  });

  it('pins the remediated brace-expansion release in the lockfile', () => {
    expect(packageLock.packages?.['node_modules/brace-expansion']?.version).toBe('1.1.16');
  });

  it('produces redacted fail-closed evidence', () => {
    for (const token of [
      'incidentTablesPresent','forcedRlsEnabled','completeCrudPoliciesPresent','oncallRotationConfigured',
      'notificationMatrixReviewed','incidentDataStored: false','timelineContentStored: false',
    ]) expect(runtime).toContain(token);
    for (const token of ['Complete','exact-SHA','postgresql://','incidentDataStored','personalDataStored']) expect(validator).toContain(token);
    expect(runtime).not.toContain('select * from');
  });
});
