import { describe, expect, it } from 'vitest';

import {
  isIgnorableVercelBuildPath,
  shouldIgnoreBuildForChangedFiles,
} from '../../scripts/vercel/ignore-build.mjs';

describe('Vercel ignored build rule', () => {
  it('ignores docs, evidence and agent log only changes', () => {
    const result = shouldIgnoreBuildForChangedFiles([
      'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
      'docs/security/evidence/runtime/vercel-deployment-status-2026-06-30.json',
      'agent_log.json',
      'agent_log.d/2026-06-30T09-10-public-auth-error-audit.json',
      'README.md',
    ]);

    expect(result.ignore).toBe(true);
    expect(result.buildRelevant).toEqual([]);
  });

  it('does not ignore source, configuration, package or script changes', () => {
    const result = shouldIgnoreBuildForChangedFiles([
      'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
      'src/app/[locale]/login/page.tsx',
      'package.json',
      'vercel.json',
      'scripts/vercel/ignore-build.mjs',
    ]);

    expect(result.ignore).toBe(false);
    expect(result.buildRelevant).toEqual([
      'src/app/[locale]/login/page.tsx',
      'package.json',
      'vercel.json',
      'scripts/vercel/ignore-build.mjs',
    ]);
  });

  it('fails open and builds when changed files cannot be detected', () => {
    const result = shouldIgnoreBuildForChangedFiles([]);

    expect(result.ignore).toBe(false);
    expect(result.reason).toContain('fail open');
  });

  it('classifies only the safe release evidence paths as ignorable', () => {
    expect(isIgnorableVercelBuildPath('docs/release/DAY_1_RELEASE_READINESS.md')).toBe(true);
    expect(isIgnorableVercelBuildPath('release-validation/summary.json')).toBe(true);
    expect(isIgnorableVercelBuildPath('src/middleware.ts')).toBe(false);
    expect(isIgnorableVercelBuildPath('next.config.mjs')).toBe(false);
  });
});
