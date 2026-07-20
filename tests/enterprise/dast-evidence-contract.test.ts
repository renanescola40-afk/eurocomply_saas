import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-dast.yml', 'utf8');
const capture = readFileSync('scripts/enterprise/capture-github-checks-evidence.mjs', 'utf8');

describe('enterprise DAST evidence contract', () => {
  it('scans a production-like build of the exact assessed SHA', () => {
    expect(workflow).toContain('name: Enterprise DAST');
    expect(workflow).toContain('github.event.pull_request.head.sha || github.sha');
    expect(workflow).toContain('npm ci --ignore-scripts');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('npm start');
    expect(workflow).toContain('http://127.0.0.1:3000/en');
    expect(workflow).toContain('ghcr.io/zaproxy/zaproxy:2.16.1');
    expect(workflow).toContain('zap-baseline.py');
  });

  it('fails closed on High-risk alerts and retains diagnostics', () => {
    expect(workflow).toContain("Number(alert.riskcode) >= 3");
    expect(workflow).toContain('process.exit(1)');
    expect(workflow).toContain('enterprise-dast-summary.json');
    expect(workflow).toContain('enterprise-dast.sha256');
    expect(workflow).toContain('retention-days: 30');
  });

  it('makes DAST an exact-SHA workflow dependency of the scorecard capture', () => {
    expect(capture).toContain("'Enterprise DAST'");
    expect(capture).toContain("dast: 'Enterprise DAST'");
    expect(capture).toContain("evidenceItem: 'dast-automated'");
    expect(capture).toContain("dastEvidencePath = 'docs/security/evidence/p1/dast-automated.json'");
    expect(capture).toContain("dastRun?.head_sha === targetSha");
  });

  it('keeps the canonical evidence redacted and bounded', () => {
    expect(capture).toContain('rawHttpTrafficStored: false');
    expect(capture).toContain('responseBodiesStored: false');
    expect(capture).toContain('credentialsStored: false');
    expect(capture).toContain('customerDataStored: false');
    expect(capture).not.toContain('dast-report/enterprise-dast.json');
  });
});
