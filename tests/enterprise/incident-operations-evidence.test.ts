import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const script = readFileSync('scripts/enterprise/build-incident-operations-evidence.mjs', 'utf8');
const ownership = readFileSync('docs/operations/OPERATIONS_OWNERSHIP.md', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');

describe('incident and operations evidence', () => {
  it('requires exact-SHA GitHub provenance and redacted evidence', () => {
    expect(script).toContain("process.env.GITHUB_ACTIONS !== 'true'");
    expect(script).toContain('checked-out SHA must equal targetSha');
    expect(script).toContain('runId must be numeric');
    expect(script).toContain('containsSensitiveValues: false');
    expect(script).toContain('rawIncidentDataStored: false');
  });

  it('validates the complete incident severity and accountable role models', () => {
    for (const severity of ['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']) expect(script).toContain(severity);
    for (const role of ['Incident owner', 'Rollback owner', 'Evidence owner', 'Support owner', 'Customer communication owner']) {
      expect(ownership).toContain(role);
    }
    expect(ownership).toContain('## Release binding requirement');
    expect(ownership).toContain('## Handover and absence');
  });

  it('generates both score-bearing evidence documents before the scorecard', () => {
    expect(script).toContain('incident-response-validation.json');
    expect(script).toContain('operations-ownership.json');
    expect(workflow).toContain('Build exact-SHA incident and operations evidence');
    expect(workflow.indexOf('Build exact-SHA incident and operations evidence'))
      .toBeLessThan(workflow.indexOf('Generate scorecard'));
  });
});
