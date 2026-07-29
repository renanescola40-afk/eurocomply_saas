import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const assessor = readFileSync('scripts/enterprise/assess-conversation-final-closeout.mjs', 'utf8');
const fetcher = readFileSync('scripts/enterprise/fetch-conversation-final-closeout-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-conversation-final-closeout.yml', 'utf8');

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
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('fetch-conversation-final-closeout-evidence.mjs');
    expect(workflow.indexOf('fetch-conversation-final-closeout-evidence.mjs'))
      .toBeLessThan(workflow.indexOf('assess-conversation-final-closeout.mjs'));
  });

  it('adds an integrity digest and explicit truth boundary', () => {
    expect(assessor).toContain("createHash('sha256')");
    expect(assessor).toContain('truthBoundary:');
    expect(assessor).toContain('sha256:');
  });
});
