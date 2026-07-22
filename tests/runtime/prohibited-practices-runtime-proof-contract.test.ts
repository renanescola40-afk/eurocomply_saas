import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/prohibited-practices-runtime-proof.yml', 'utf8');
const proof = readFileSync('scripts/enterprise/prove-prohibited-practices-two-tenant.sql', 'utf8');

describe('prohibited practices runtime proof contract', () => {
  it('runs only against an explicitly protected proof environment', () => {
    expect(workflow).toContain('environment: enterprise-runtime-proof');
    expect(workflow).toContain('ENTERPRISE_RUNTIME_PROOF_DATABASE_URL');
    expect(workflow).toContain('persist-credentials: false');
  });

  it('requires distinct tenants and rolls back fixtures', () => {
    expect(proof).toContain('runtime_proof_requires_distinct_organizations');
    expect(proof).toContain('cross_tenant_review_visibility_detected');
    expect(proof).toContain('cross_tenant_signal_visibility_detected');
    expect(proof).toContain('expected_eight_signals_found');
    expect(proof.trimEnd()).toMatch(/rollback;$/);
  });

  it('uploads a bounded evidence artifact without secrets', () => {
    expect(workflow).toContain('retention-days: 30');
    expect(workflow).toContain('prohibited-practices-runtime-proof');
    expect(workflow).not.toContain('echo "$DATABASE_URL"');
  });
});
