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

  it('does not poll protected main-only checks from a pull-request scorecard run', () => {
    const collector = read('scripts/enterprise/capture-github-checks-evidence.mjs');

    expect(collector).toContain("const timeoutMs = process.env.GITHUB_EVENT_NAME === 'pull_request' ? 0 : requestedTimeoutMs");
    expect(collector).toContain("GITHUB_CHECKS_WAIT_MS must be a non-negative finite number");
    expect(collector).toContain('Pull-request scorecard diagnostics do not poll protected main-only workflow history');
    expect(collector).toContain('exclude_pull_requests=true');
  });

  it('preserves exact-SHA evidence semantics through the dedicated selector', () => {
    const collector = read('scripts/enterprise/capture-github-checks-evidence.mjs');
    const selector = read('scripts/enterprise/github-workflow-run-selection.mjs');

    expect(collector).toContain("import { latestCreditEligibleRunsByName } from './github-workflow-run-selection.mjs'");
    expect(collector).toContain('latestCreditEligibleRunsByName(runs, { targetSha })');
    expect(selector).toContain('if (run?.head_sha !== targetSha) continue');
    expect(selector).toContain("run.name === 'Enterprise Production Gate'");
    expect(selector).toContain("run.event === 'workflow_run'");
    expect(selector).toContain("run.conclusion === 'skipped'");
    expect(collector).toContain("source: 'github-actions-api'");
    expect(collector).toContain('generatedFromRealEvidence: true');
    expect(collector).toContain("status: allRequiredPassed ? 'Complete' : 'Open'");
    expect(collector).toContain("outcome: allRequiredPassed ? 'passed' : 'not_verified'");
  });

  it('paginates compact workflow-run responses deeply enough for high-fanout exact-SHA campaigns without weakening the byte limit', () => {
    const collector = read('scripts/enterprise/capture-github-checks-evidence.mjs');

    expect(collector).toContain('const GITHUB_RUNS_PAGE_SIZE = 20');
    expect(collector).toContain('const MAX_GITHUB_RUNS_PAGES = 25');
    expect(collector).toContain('exclude_pull_requests=true');
    expect(collector).toContain('page=${page}');
    expect(collector).toContain('collectedRuns.push(...pageRuns)');
    expect(collector).toContain('requiredWorkflows.every((name) => selected.has(name))');
    expect(collector).toContain('collectedRuns.length >= totalCount');
    expect(collector).not.toContain('actions/runs?head_sha=${encodedSha}&per_page=100');
  });
});
