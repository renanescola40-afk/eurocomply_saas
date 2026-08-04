import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const assessor = readFileSync('scripts/enterprise/assess-conversation-final-closeout.mjs', 'utf8');
const fetcher = readFileSync('scripts/enterprise/fetch-conversation-final-closeout-evidence.mjs', 'utf8');
const summaryRenderer = readFileSync('scripts/enterprise/render-conversation-final-closeout-summary.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-conversation-final-closeout.yml', 'utf8');
const retrievalSchema = JSON.parse(readFileSync(
  'docs/security/evidence/schemas/enterprise-conversation-closeout-retrieval.schema.json',
  'utf8',
));

describe('enterprise conversation final closeout contract', () => {
  it('uses canonical evidence paths instead of nonexistent aliases', () => {
    expect(assessor).toContain('enterprise-runtime-evidence.json');
    expect(assessor).toContain('production-final-validation.json');
    expect(assessor).toContain('release-go-no-go.json');
    expect(assessor).not.toContain('enterprise-runtime-validation.json');
    expect(assessor).not.toContain('enterprise-production-final-validation.json');
    expect(assessor).not.toContain('release-go-no-go-validation.json');
  });

  it('requires the canonical exact-SHA 100-control scorecard and persistent state', () => {
    expect(assessor).toContain('enterprise-readiness-scorecard.json');
    expect(assessor).toContain('persistent-execution-state.json');
    expect(assessor).toContain('validatePersistentExecutionState');
    expect(assessor).toContain('scorecard_controls_not_all_pass');
    expect(assessor).toContain('scorecard_digest_mismatch');
  });

  it('cannot manufacture a 96 percent completion value', () => {
    expect(assessor).not.toContain('complete ? 100 : 96');
    expect(assessor).toContain('official_completion_percent');
    expect(assessor).toContain("decision: complete ? 'CONVERSATION_COMPLETE' : 'CONVERSATION_REMAINS_OPEN'");
  });

  it('retrieves exact-SHA artifacts before assessment', () => {
    expect(fetcher).toContain('enterprise-production-final-evidence-');
    expect(fetcher).toContain('enterprise-readiness-scorecard-');
    expect(fetcher).toContain("run?.head_branch === 'main'");
    expect(fetcher).toContain('ALLOWED_RUN_EVENTS');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('fetch-conversation-final-closeout-evidence.mjs');
    expect(workflow.indexOf('fetch-conversation-final-closeout-evidence.mjs'))
      .toBeLessThan(workflow.indexOf('assess-conversation-final-closeout.mjs'));
  });

  it('requires bounded run and artifact provenance for every retrieved bundle', () => {
    expect(fetcher).toContain('enterprise-conversation-closeout-retrieval.v1');
    expect(fetcher).toContain('runId:');
    expect(fetcher).toContain('artifactId:');
    expect(fetcher).toContain('noSecretsStored: true');
    expect(assessor).toContain('validateRetrievalManifest');
    expect(assessor).toContain('retrieval_sources_incomplete');
    expect(assessor).toContain('artifact_id_invalid');
    expect(retrievalSchema.properties.schema.const)
      .toBe('risck-comply.enterprise-conversation-closeout-retrieval.v1');
    expect(retrievalSchema.properties.noSecretsStored.const).toBe(true);
  });

  it('publishes diagnostic artifacts even when final completion remains blocked', () => {
    expect(workflow).toContain('Assess final closeout without losing diagnostics');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('retrieval-manifest.json');
    expect(workflow).toContain('Upload immutable closeout evidence');
    expect(workflow).toContain('Enforce final completion decision');
    expect(workflow.indexOf('Upload immutable closeout evidence'))
      .toBeLessThan(workflow.indexOf('Enforce final completion decision'));
  });

  it('persists provider-derived provenance only at a fixed private shell boundary', () => {
    expect(workflow).toContain('umask 077');
    expect(workflow).toContain('> "$output/retrieval-manifest.json"');
    expect(fetcher).not.toContain("writeFileSync(manifestPath");
    expect(summaryRenderer).toContain('.replace(/[\\r\\n`]/g,');
    expect(workflow).toContain('render-conversation-final-closeout-summary.mjs');
  });

  it('keeps workflow permissions read-only and uses a pinned runner image', () => {
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('actions: write');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).toContain('runs-on: ubuntu-24.04');
  });

  it('adds an integrity digest and explicit truth boundary', () => {
    expect(assessor).toContain("createHash('sha256')");
    expect(assessor).toContain('truthBoundary:');
    expect(assessor).toContain('sha256:');
  });
});
