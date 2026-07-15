import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('runtime SHA final-evidence state machine', () => {
  it('records final-validation-runner failures as Open/blocked/No-Go', () => {
    const source = readFileSync('scripts/release/verify-runtime-release-sha.mjs', 'utf8');
    const patchStart = source.indexOf('function patchFinalEvidence');
    const patchEnd = source.indexOf('\n}\n\nconst generatedAt', patchStart);
    const patch = source.slice(patchStart, patchEnd);

    expect(patchStart).toBeGreaterThan(-1);
    expect(patch).toContain("document.evidenceItem === 'final-validation-runner'");
    expect(patch).toContain("path.endsWith('/final-validation-runner.json')");
    expect(patch).toContain("document.outcome = 'blocked'");
    expect(patch).toContain("document.releaseDecision = 'No-Go'");
    expect(patch).toContain('document.failures = appendUnique(document.failures, failureSummary)');
    expect(patch).toContain("document.outcome = 'failed'");
    expect(patch).toContain('document.metadataFailures = appendUnique(document.metadataFailures, failureSummary)');
  });
});
