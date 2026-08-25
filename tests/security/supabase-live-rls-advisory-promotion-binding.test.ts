import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const repo = process.cwd();
const tenantRunner = join(repo, 'scripts/security/run-supabase-live-tenant-isolation.mjs');
const aiAssessmentRunner = join(repo, 'scripts/security/run-supabase-live-ai-assessments-rls.mjs');

function advisoryEnv() {
  return {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci-placeholder-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'ci-placeholder-service-role',
    PROMOTION_RUN_ID: '',
  };
}

function runAdvisory(script: string) {
  return execFileSync(process.execPath, [script, '--advisory'], {
    cwd: repo,
    env: advisoryEnv(),
    encoding: 'utf8',
    timeout: 10_000,
  });
}

describe('promotion-bound advisory live RLS runners', () => {
  it('does not enter the live tenant-isolation runner merely because protected credentials exist', () => {
    const output = runAdvisory(tenantRunner);

    expect(output).toContain('PROMOTION_RUN_ID is not bound to this advisory run');
    expect(output).toContain('No runtime completion is claimed');
  });

  it('does not create live ai_assessments fixtures without an explicit promotion run binding', () => {
    const output = runAdvisory(aiAssessmentRunner);

    expect(output).toContain('PROMOTION_RUN_ID is not bound to this advisory run');
    expect(output).toContain('"evidenceGenerated": false');
  });
});
