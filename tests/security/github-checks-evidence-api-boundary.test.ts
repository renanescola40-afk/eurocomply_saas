import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('GitHub checks evidence API boundary', () => {
  it('bounds and times out responses before JSON parsing', () => {
    const collector = read('scripts/enterprise/capture-github-checks-evidence.mjs');

    expect(collector).toContain('const MAX_GITHUB_API_RESPONSE_BYTES = 1024 * 1024');
    expect(collector).toContain('GITHUB_CHECKS_REQUEST_TIMEOUT_MS');
    expect(collector).toContain("response.headers.get('content-length')");
    expect(collector).toContain('response.body.getReader()');
    expect(collector).toContain('totalBytes > MAX_GITHUB_API_RESPONSE_BYTES');
    expect(collector).toContain("reader.cancel('github_checks_evidence_response_too_large')");
    expect(collector).toContain("new TextDecoder('utf-8', { fatal: true })");
    expect(collector).toContain('JSON.parse(text)');
    expect(collector).toContain("redirect: 'error'");
    expect(collector).toContain('AbortSignal.timeout(githubRequestTimeoutMs)');
    expect(collector).not.toContain('return response.json()');
  });

  it('preserves exact-SHA evidence semantics', () => {
    const collector = read('scripts/enterprise/capture-github-checks-evidence.mjs');

    expect(collector).toContain('if (run.head_sha !== targetSha) continue');
    expect(collector).toContain("source: 'github-actions-api'");
    expect(collector).toContain('generatedFromRealEvidence: true');
    expect(collector).toContain("status: allRequiredPassed ? 'Complete' : 'Open'");
    expect(collector).toContain("outcome: allRequiredPassed ? 'passed' : 'not_verified'");
  });
});
