import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  isIgnorableVercelBuildPath,
  requiresExactShaVercelBuild,
  shouldIgnoreBuildForChangedFiles,
  vercelGitDiffCandidates,
} from '../../scripts/vercel/ignore-build.mjs';

const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  ignoreCommand?: string;
  git?: { deploymentEnabled?: Record<string, boolean> };
};

describe('Vercel ignored build rule', () => {
  it('ignores docs, evidence, tests, workflow and enterprise-only script changes outside production', () => {
    const result = shouldIgnoreBuildForChangedFiles([
      'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
      'docs/security/evidence/runtime/vercel-deployment-status-2026-06-30.json',
      'agent_log.json',
      'agent_log.d/2026-06-30T09-10-public-auth-error-audit.json',
      'README.md',
      '.github/workflows/enterprise-final-closeout-dashboard.yml',
      'tests/enterprise/github-exact-sha-artifact-collector.test.mjs',
      'scripts/enterprise/collect-github-exact-sha-artifacts.mjs',
    ]);

    expect(result.ignore).toBe(true);
    expect(result.buildRelevant).toEqual([]);
  });

  it('does not ignore source, runtime configuration, package or build-hook changes', () => {
    const result = shouldIgnoreBuildForChangedFiles([
      'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
      'src/app/[locale]/login/page.tsx',
      'package.json',
      'vercel.json',
      'scripts/vercel/ignore-build.mjs',
      'scripts/security/check-zod-compat.mjs',
    ]);

    expect(result.ignore).toBe(false);
    expect(result.buildRelevant).toEqual([
      'src/app/[locale]/login/page.tsx',
      'package.json',
      'vercel.json',
      'scripts/vercel/ignore-build.mjs',
      'scripts/security/check-zod-compat.mjs',
    ]);
  });

  it('fails open and builds when changed files cannot be detected', () => {
    const result = shouldIgnoreBuildForChangedFiles([]);

    expect(result.ignore).toBe(false);
    expect(result.reason).toContain('fail open');
  });

  it('classifies only non-runtime paths as ignorable', () => {
    expect(isIgnorableVercelBuildPath('docs/release/DAY_1_RELEASE_READINESS.md')).toBe(true);
    expect(isIgnorableVercelBuildPath('release-validation/summary.json')).toBe(true);
    expect(isIgnorableVercelBuildPath('.github/workflows/ci.yml')).toBe(true);
    expect(isIgnorableVercelBuildPath('tests/security/runtime-proof.test.ts')).toBe(true);
    expect(isIgnorableVercelBuildPath('scripts/enterprise/closeout.mjs')).toBe(true);
    expect(isIgnorableVercelBuildPath('src/middleware.ts')).toBe(false);
    expect(isIgnorableVercelBuildPath('next.config.mjs')).toBe(false);
    expect(isIgnorableVercelBuildPath('scripts/security/check-zod-compat.mjs')).toBe(false);
  });

  it('always builds main and production contexts to preserve exact-SHA provenance', () => {
    expect(requiresExactShaVercelBuild({
      gitRef: 'main',
      targetEnvironment: 'production',
    })).toBe(true);
    expect(requiresExactShaVercelBuild({
      gitRef: 'main',
      targetEnvironment: 'preview',
    })).toBe(true);
    expect(requiresExactShaVercelBuild({
      gitRef: 'release/emergency',
      targetEnvironment: 'production',
    })).toBe(true);
    expect(requiresExactShaVercelBuild({
      gitRef: 'agent/evidence-only',
      targetEnvironment: 'preview',
    })).toBe(false);
  });

  it('diffs from Vercel last successful deployment before commit-parent fallbacks', () => {
    const previous = 'a'.repeat(40);
    expect(vercelGitDiffCandidates(previous)).toEqual([
      ['diff', '--name-only', previous, 'HEAD'],
      ['diff', '--name-only', 'HEAD^', 'HEAD'],
      ['diff', '--name-only', 'HEAD~1', 'HEAD'],
    ]);

    expect(vercelGitDiffCandidates('not-a-sha')).toEqual([
      ['diff', '--name-only', 'HEAD^', 'HEAD'],
      ['diff', '--name-only', 'HEAD~1', 'HEAD'],
    ]);
  });

  it('disables automatic Git deployments so the protected release workflow is the only production authority', () => {
    expect(vercelConfig.ignoreCommand).toBe('node scripts/vercel/ignore-build.mjs');
    expect(vercelConfig.git?.deploymentEnabled).toMatchObject({
      main: false,
      'agent/**': false,
      '*': false,
    });
  });
});
