import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('runtime SHA final-evidence state machine', () => {
  it('records final-validation-runner failures as Open/blocked/No-Go without execution-only fields', () => {
    const source = readFileSync('scripts/release/verify-runtime-release-sha.mjs', 'utf8');
    const helperStart = source.indexOf('export function applyRuntimeShaBindingStatus');
    const helperEnd = source.indexOf('\n}\n\nfunction patchFinalEvidence', helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helper).toContain("next.evidenceItem === 'final-validation-runner'");
    expect(helper).toContain("next.outcome = 'blocked'");
    expect(helper).toContain("next.releaseDecision = 'No-Go'");
    expect(helper).toContain('next.failures = appendUnique(next.failures, failureSummary)');
    expect(helper).toContain('delete next.overallResult');
    expect(helper).toContain('delete next.metadataFailures');
    expect(helper).toContain("next.outcome = 'failed'");
    expect(helper).toContain("next.overallResult = 'failed'");
    expect(helper).toContain('next.metadataFailures = appendUnique(next.metadataFailures, failureSummary)');
  });

  it('uses the typed helper before writing either final evidence document', () => {
    const source = readFileSync('scripts/release/verify-runtime-release-sha.mjs', 'utf8');
    const patchStart = source.indexOf('function patchFinalEvidence');
    const patchEnd = source.indexOf('\n}\n\nconst generatedAt', patchStart);
    const patch = source.slice(patchStart, patchEnd);

    expect(patch).toContain('const next = applyRuntimeShaBindingStatus(document, bindingEvidence);');
    expect(patch).toContain('writeFileSync(path, `${JSON.stringify(next, null, 2)}\\n`);');
    expect(patch).not.toContain("document.outcome = 'failed'");
    expect(patch).not.toContain("document.overallResult = 'failed'");
  });
});
