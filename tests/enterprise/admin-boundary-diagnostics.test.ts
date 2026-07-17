import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const script = readFileSync('scripts/enterprise/check-admin-boundary-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');

describe('enterprise admin boundary diagnostics', () => {
  it('runs both administrative-client boundary gates independently', () => {
    expect(script).toContain('check-supabase-service-role-boundary.mjs');
    expect(script).toContain('check-client-boundaries.mjs');
    expect(script).toContain("STRICT_CLIENT_BOUNDARY_SCAN: '1'");
    expect(script).toContain('for (const check of checks)');
  });

  it('fails closed while identifying the exact failed gate', () => {
    expect(script).toContain('Admin boundary validation failed');
    expect(script).toContain('process.exitCode = 1');
    expect(script).toContain('exit_unknown');
    expect(script).not.toContain('process.exitCode = 0');
  });

  it('executes diagnostics before repository evidence generation', () => {
    const diagnosticIndex = workflow.indexOf('Run administrative-client boundary diagnostics');
    const evidenceIndex = workflow.indexOf('Build exact-SHA repository control evidence');

    expect(diagnosticIndex).toBeGreaterThan(-1);
    expect(evidenceIndex).toBeGreaterThan(diagnosticIndex);
    expect(workflow).toContain('node scripts/enterprise/check-admin-boundary-evidence.mjs');
  });
});
