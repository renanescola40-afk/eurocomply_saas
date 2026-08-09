import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('upload scanner P0 aggregation', () => {
  it('resolves only a bounded successful exact-SHA main run', () => {
    const aggregator = read('scripts/enterprise/aggregate-upload-scanner-runtime-evidence.mjs');

    expect(aggregator).toContain("const WORKFLOW_FILE = 'upload-security-ci.yml'");
    expect(aggregator).toContain('head_sha=${encodeURIComponent(targetSha)}');
    expect(aggregator).toContain('status=success&branch=main&per_page=20');
    expect(aggregator).toContain('MAX_API_RESPONSE_BYTES = 1024 * 1024');
    expect(aggregator).toContain('AbortSignal.timeout(15_000)');
    expect(aggregator).toContain("redirect: 'error'");
    expect(aggregator).toContain('selectExactShaUploadScannerRun');
    expect(aggregator).not.toContain('per_page=100');
    expect(aggregator).not.toContain('response.json()');
  });

  it('delegates downloads only after resolving one exact run ID', () => {
    const aggregator = read('scripts/enterprise/aggregate-upload-scanner-runtime-evidence.mjs');

    expect(aggregator).toContain('sourceRunId: resolvedRunId');
    expect(aggregator).toContain('fetchUploadScannerRuntimeEvidence');
    expect(aggregator).toContain('rmSync(join(root, EVIDENCE_PATH), { force: true })');
    expect(aggregator).toContain("throw new Error('exact_sha_upload_scanner_run_missing')");
  });

  it('keeps direct PR validation read-only and reserves promotion for workflow handoff', () => {
    const workflow = read('.github/workflows/p0-runtime-evidence.yml');

    expect(workflow).toContain("if: github.event_name == 'workflow_run'");
    expect(workflow).toContain('aggregate-upload-scanner-runtime-evidence.mjs');
    expect(workflow).toContain("github.event.workflow_run.path == '.github/workflows/upload-security-ci.yml'");
    expect(workflow).toContain("github.event.workflow_run.path == '.github/workflows/branch-protection-runtime-proof.yml'");
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');
  });
});
