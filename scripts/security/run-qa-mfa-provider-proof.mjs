#!/usr/bin/env node

// QA-only provider proof. This deliberately does not write Enterprise release
// evidence or assert that the hosted application has passed browser/API QA.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runSupabaseMfaLiveValidation } from './run-step-up-mfa-runtime-validation.mjs';

const expectedSha = process.env.ENTERPRISE_EXPECTED_SHA ?? '';
const checkedOutSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(expectedSha) || checkedOutSha !== expectedSha
  || process.env.GITHUB_ACTIONS !== 'true'
  || process.env.GITHUB_REF_NAME !== 'main'
  || process.env.GITHUB_REPOSITORY !== 'renanescola40-afk/eurocomply_saas'
  || !/^\d+$/.test(process.env.GITHUB_RUN_ID ?? '')) {
  throw new Error('qa_mfa_proof_requires_exact_main_github_run');
}

const result = await runSupabaseMfaLiveValidation();
const evidence = {
  schema: 'risck-comply.qa-mfa-provider-proof.v1',
  environment: 'isolated-supabase-qa',
  projectRef: 'zrxrrfbllsxtleyxjpsz',
  sourceSha: checkedOutSha,
  runId: process.env.GITHUB_RUN_ID,
  generatedAt: new Date().toISOString(),
  provider: result,
  applicationBrowserProof: false,
  enterpriseProductionAcceptance: false,
};
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/qa-mfa-provider-proof.json', `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (result.status !== 'Complete') {
  throw new Error(`qa_mfa_provider_proof_${result.reason ?? 'incomplete'}`);
}
console.log('Isolated QA MFA provider proof completed; fixture cleanup verified.');
