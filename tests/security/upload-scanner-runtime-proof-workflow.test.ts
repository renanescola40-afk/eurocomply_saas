import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { classifyClamAvBlockingResponse } from '../../scripts/security/run-upload-scanner-blocking-runtime-validation.mjs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('upload scanner runtime proof orchestration', () => {
  it('publishes a stable exact-SHA proof with a real ClamAV service', () => {
    const workflow = read('.github/workflows/upload-security-ci.yml');

    expect(workflow).toContain('name: RISCK COMPLY Upload Security CI');
    expect(workflow).not.toMatch(/^run-name:/m);
    expect(workflow).toContain('image: clamav/clamav:stable');
    expect(workflow).toContain('TARGET_SHA: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(workflow).toContain('ref: ${{ env.TARGET_SHA }}');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$TARGET_SHA"');
    expect(workflow).toContain('normalize-upload-scanner-runtime-evidence.mjs');
    expect(workflow).toContain('run-upload-scanner-blocking-runtime-validation.mjs');
    expect(workflow).toContain('upload-security-runtime-proof-${{ env.TARGET_SHA }}');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('--update-register');
    expect(workflow).not.toContain('pull_request_target');
  });

  it('re-runs the P0 source of truth after a successful scanner workflow', () => {
    const workflow = read('.github/workflows/p0-runtime-evidence.yml');

    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain('- RISCK COMPLY Upload Security CI');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('github.event.workflow_run.head_sha');
    expect(workflow).toContain('UPLOAD_SCANNER_RUNTIME_SOURCE_RUN_ID');
    expect(workflow).toContain('fetch-upload-scanner-runtime-evidence.mjs');
    expect(workflow).toContain("github.event_name == 'workflow_run' && 'true' || 'false'");
    expect(workflow).toContain('ref: ${{ env.ASSESSED_SHA }}');
    expect(workflow).not.toContain('contents: write');
  });

  it('bounds API, artifact and ZIP inputs before accepting evidence', () => {
    const fetcher = read('scripts/enterprise/fetch-upload-scanner-runtime-evidence.mjs');

    expect(fetcher).toContain('const MAX_API_RESPONSE_BYTES = 1024 * 1024');
    expect(fetcher).toContain('const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024');
    expect(fetcher).toContain('const MAX_ZIP_ENTRIES = 20');
    expect(fetcher).toContain("redirect: 'error'");
    expect(fetcher).toContain('AbortSignal.timeout(15_000)');
    expect(fetcher).toContain("run?.head_branch === 'main'");
    expect(fetcher).toContain("new Set(['push', 'workflow_dispatch'])");
    expect(fetcher).toContain('artifact_zip_unsafe_entry');
    expect(fetcher).toContain('exact_sha_upload_scanner_artifact_not_unique');
    expect(fetcher).toContain('removeStaleEvidence(root)');
    expect(fetcher).not.toContain('response.json()');
  });

  it('classifies live ClamAV blocking responses without persisting signatures', () => {
    expect(classifyClamAvBlockingResponse('stream: Eicar-Test-Signature FOUND')).toBe('blocked');
    expect(classifyClamAvBlockingResponse('stream: OK')).toBe('unexpected_clean');
    expect(classifyClamAvBlockingResponse('stream: read error ERROR')).toBe('scanner_error');
    expect(classifyClamAvBlockingResponse('unknown')).toBe('unrecognized');

    const proof = read('scripts/security/run-upload-scanner-blocking-runtime-validation.mjs');
    expect(proof).not.toContain('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
    expect(proof).toContain('generatedInMemory: true');
    expect(proof).toContain('bytesPersisted: false');
    expect(proof).toContain('responseBodyStored: false');
    expect(proof).toContain('signatureNameStored: false');
  });

  it('keeps the evidence schema strict for provenance and redaction fields', () => {
    const schema = JSON.parse(
      read('docs/security/evidence/schemas/upload-scanner-runtime-evidence.schema.json'),
    );

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.required).toEqual(
      expect.arrayContaining([
        'runtimeContext',
        'sourceWorkflow',
        'liveProviderProof',
        'acceptanceCriteria',
        'evidenceIntegrity',
      ]),
    );
    expect(schema.properties.runtimeContext.properties.commitSha.pattern).toBe(
      '^[a-f0-9]{40}$',
    );
    expect(schema.properties.sourceWorkflow.properties.exactShaBound.const).toBe(true);
    expect(schema.properties.evidenceIntegrity.properties.containsSensitiveValues.const).toBe(false);
    expect(schema.properties.evidenceIntegrity.properties.credentialsStored.const).toBe(false);
    expect(schema.properties.evidenceIntegrity.properties.rawProviderResponseStored.const).toBe(false);
  });
});
