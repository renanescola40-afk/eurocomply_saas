import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/legal-rules-runtime-capture.yml';
const workflow = readFileSync(workflowPath, 'utf8');

function expectContainsAll(values) {
  for (const value of values) expect(workflow).toContain(value);
}

describe('legal rules runtime capture workflow', () => {
  it('requires an explicit exact-SHA operator confirmation', () => {
    expectContainsAll([
      'workflow_dispatch:',
      'deployment_url:',
      'deployment_sha:',
      'confirm_runtime_capture:',
      "CAPTURE_EXACT_SHA",
      '^[a-f0-9]{40}$',
    ]);
  });

  it('uses the existing protected capture implementation and secret', () => {
    expectContainsAll([
      'secrets.INTERNAL_CRON_SECRET',
      'capture-legal-rules-runtime-evidence.mjs',
      'EXPECTED_DEPLOYMENT_SHA',
      'DEPLOYMENT_URL',
      'persist-credentials: false',
    ]);
    expect(workflow).not.toMatch(/pull_request:\s*\n/);
    expect(workflow).not.toMatch(/push:\s*\n/);
  });

  it('retains exact-SHA proof without granting legal acceptance', () => {
    expectContainsAll([
      'legalAcceptanceGranted: false',
      'countsForRuntimeCoverage: true',
      'retention-days: 90',
      'artifactSha256',
      'archiveFileSha256',
      'Legal acceptance granted: **No**',
    ]);
  });

  it('fails closed on URL, environment, status and SHA mismatches', () => {
    expectContainsAll([
      "deployment_url must use HTTPS",
      "deployment_url must be a clean HTTPS origin",
      'artifact.status !== \'PASS\'',
      'artifact.deploymentSha !== process.env.EXPECTED_DEPLOYMENT_SHA',
      'artifact.environment !== process.env.CAPTURE_ENVIRONMENT',
      'if-no-files-found: error',
    ]);
  });
});
