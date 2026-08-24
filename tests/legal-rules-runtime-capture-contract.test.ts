import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const scriptSource = readFileSync(resolve('scripts/compliance/capture-legal-rules-runtime-evidence.mjs'), 'utf8');
const workflowSource = readFileSync(resolve('.github/workflows/legal-rules-runtime-validation.yml'), 'utf8');

describe('legal rules runtime capture contract', () => {
  it('requires exact SHA, HTTPS origin and no credential-bearing URL', () => {
    expect(scriptSource).toContain("const FULL_SHA = /^[a-f0-9]{40}$/");
    expect(scriptSource).toContain('DEPLOYMENT_URL must not contain credentials');
    expect(scriptSource).toContain('DEPLOYMENT_URL must use HTTPS outside local development');
    expect(scriptSource).toContain('deployment SHA mismatch');
    expect(scriptSource).toContain('deployment URL mismatch');
  });

  it('requires internal authentication and calls only the protected ops route', () => {
    expect(scriptSource).toContain("required('INTERNAL_CRON_SECRET')");
    expect(scriptSource).toContain('/api/ops/legal-rules-validation');
    expect(scriptSource).toContain('authorization: `Bearer ${internalCronSecret}`');
    expect(scriptSource).toContain("'x-internal-cron-secret': internalCronSecret");
    expect(scriptSource).not.toContain('/api/public/legal-rules-validation');
    expect(workflowSource).toContain('INTERNAL_CRON_SECRET: ${{ secrets.INTERNAL_CRON_SECRET || secrets.CRON_SECRET }}');
    expect(workflowSource).toContain('test -n "$INTERNAL_CRON_SECRET"');
  });

  it('verifies no-store, no cookies, all PASS cases and artifact integrity', () => {
    expect(scriptSource).toContain('/no-store/i.test(cacheControl)');
    expect(scriptSource).toContain("response.headers.has('set-cookie')");
    expect(scriptSource).toContain("testCase.status !== 'PASS'");
    expect(scriptSource).toContain('artifact SHA-256 integrity check failed');
    expect(scriptSource).toContain('request IDs are missing or unsanitised');
    expect(scriptSource).toContain('contains unexpected or missing fields');
  });

  it('does not write network response data directly from JavaScript', () => {
    expect(scriptSource).not.toContain('writeFileSync');
    expect(scriptSource).not.toContain('createWriteStream');
    expect(scriptSource).toContain('process.stdout.write');
    expect(workflowSource).toContain('node scripts/compliance/capture-legal-rules-runtime-evidence.mjs > "$OUTPUT_PATH"');
    expect(workflowSource).toContain('umask 077');
  });

  it('uses pinned actions and retains exact-SHA runtime artifacts', () => {
    expect(workflowSource).toContain('actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0');
    expect(workflowSource).toContain('actions/setup-node@820762786026740c76f36085b0efc47a31fe5020');
    expect(workflowSource).toContain('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
    expect(workflowSource).toContain('retention-days: 365');
    expect(workflowSource).toContain('test "$(git rev-parse HEAD)" = "$EXPECTED_DEPLOYMENT_SHA"');
  });

  it('automatically captures only trusted successful current-main Vercel deployments, including commit-SHA deployments with no ref', () => {
    expect(workflowSource).toContain('deployment_status:');
    expect(workflowSource).toContain("github.event.deployment_status.state == 'success'");
    expect(workflowSource).toContain('github.event.deployment.ref == github.event.repository.default_branch');
    expect(workflowSource).toContain("github.event.deployment.ref == ''");
    expect(workflowSource).toContain("github.event.sender.login == 'vercel[bot]'");
    expect(workflowSource).toContain("process.env.DEPLOYMENT_EVENT_SENDER !== 'vercel[bot]'");
    expect(workflowSource).toContain("const deploymentRef = String(process.env.DEPLOYMENT_EVENT_REF || '')");
    expect(workflowSource).toContain('if (deploymentRef && deploymentRef !== process.env.DEFAULT_BRANCH)');
    expect(workflowSource).toContain("host.endsWith('.vercel.app')");
    expect(workflowSource).toContain("host === 'risckcomply.com'");
    expect(workflowSource).toContain('refs/remotes/origin/${DEFAULT_BRANCH}');
    expect(workflowSource).toContain('github.event.deployment_status.environment_url');
  });

  it('keeps manual dispatch as a controlled fallback', () => {
    expect(workflowSource).toContain('workflow_dispatch:');
    expect(workflowSource).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflowSource).toContain("DEPLOYMENT_URL: ${{ inputs.deployment_url || github.event.deployment_status.environment_url }}");
    expect(workflowSource).toContain("EXPECTED_DEPLOYMENT_SHA: ${{ inputs.expected_sha || github.event.deployment.sha }}");
  });
});
