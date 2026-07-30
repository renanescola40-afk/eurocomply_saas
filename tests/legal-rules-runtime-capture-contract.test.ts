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

  it('verifies no-store, no cookies, all PASS cases and artifact integrity', () => {
    expect(scriptSource).toContain("/no-store/i.test(cacheControl)");
    expect(scriptSource).toContain("response.headers.has('set-cookie')");
    expect(scriptSource).toContain("testCase.status !== 'PASS'");
    expect(scriptSource).toContain('artifact SHA-256 integrity check failed');
    expect(scriptSource).toContain('request IDs are missing or unsanitised');
    expect(scriptSource).toContain('runtime evidence contains unexpected or missing fields');
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
    expect(workflowSource).toContain('actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38');
    expect(workflowSource).toContain('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
    expect(workflowSource).toContain('retention-days: 365');
    expect(workflowSource).toContain('test "$(git rev-parse HEAD)" = "$EXPECTED_DEPLOYMENT_SHA"');
  });
});
