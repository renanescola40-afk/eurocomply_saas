import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/eu-ai-act-safe-runtime-promotion.yml', 'utf8');

describe('EU AI Act safe runtime promotion workflow', () => {
  it('uses read-only permissions and immutable action pins', () => {
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toMatch(/actions\/checkout@[a-f0-9]{40}/);
    expect(workflow).toMatch(/actions\/setup-node@[a-f0-9]{40}/);
    expect(workflow).toMatch(/actions\/upload-artifact@[a-f0-9]{40}/);
    expect(workflow).not.toMatch(/uses: .*@v\d+/);
  });

  it('binds checkout, evidence and promoted score to the exact assessed SHA', () => {
    expect(workflow).toContain('ref: ${{ env.TARGET_SHA }}');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$TARGET_SHA"');
    expect(workflow).toContain('generate-eu-ai-act-safe-runtime-bundle.mjs');
    expect(workflow).toContain('EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS');
    expect(workflow).toContain('report.targetSha !== process.env.TARGET_SHA');
  });

  it('never permits the safe lane to declare final GO or 100% runtime', () => {
    expect(workflow).toContain('runtimeEvidenceCoverage < 80 || report.scores.runtimeEvidenceCoverage >= 100');
    expect(workflow).toContain("releaseDecision !== 'EU_AI_ACT_PRODUCT_COVERAGE_NO_GO'");
  });
});
