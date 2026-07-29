import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/enterprise/assess-conversation-final-closeout.mjs', 'utf8');

describe('enterprise conversation final closeout contract', () => {
  it('requires a full release SHA and exact evidence SHA matching', () => {
    expect(source).toContain('RELEASE_SHA must be a full 40-character commit SHA');
    expect(source).toContain("exactSha: extractSha(entry.value)?.toLowerCase() === expectedSha.toLowerCase()");
  });

  it('requires runtime, final and Go/No-Go proof before completion', () => {
    expect(source).toContain('stripeRuntime:');
    expect(source).toContain('enterpriseRuntime:');
    expect(source).toContain('productionFinal:');
    expect(source).toContain('releaseGoNoGo:');
  });

  it('cannot emit completion while blockers remain', () => {
    expect(source).toContain("decision: complete ? 'CONVERSATION_COMPLETE' : 'CONVERSATION_REMAINS_OPEN'");
    expect(source).toContain('completionPercentage: complete ? 100 : 96');
    expect(source).toContain('if (!complete) process.exitCode = 2');
  });

  it('adds an integrity digest and explicit truth boundary', () => {
    expect(source).toContain("createHash('sha256')");
    expect(source).toContain('truthBoundary:');
    expect(source).toContain('sha256: digest');
  });
});
