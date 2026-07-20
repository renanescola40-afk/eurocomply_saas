import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runner = readFileSync('scripts/release/run-protected-rollback-validation.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/protected-rollback-runtime-proof.yml', 'utf8');

describe('protected rollback runtime proof', () => {
  it('requires an explicit exact-SHA production approval boundary', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('/compare/${ROLLBACK_TARGET_SHA}...${TARGET_SHA}');
    expect(workflow).toContain('test "$TARGET_STATUS" = "ahead"');
    expect(workflow).toContain('CURRENT_MAIN_VERIFIED=true');
    expect(workflow).toContain('ROLLBACK_TARGET_COMMIT_VERIFIED=true');
    expect(workflow).toContain('ROLLBACK ${TARGET_SHA,,} TO ${ROLLBACK_TARGET_SHA,,}');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('push:');
    expect(workflow).not.toContain('contents: write');
  });

  it('rolls back to a distinct deployment and always attempts restoration', () => {
    expect(runner).toContain("runVercel(['rollback', targetDeployment.href]");
    expect(runner).toContain("runVercel(['promote', currentDeployment.href]");
    expect(runner).toContain('targetSha !== currentSha');
    expect(runner).toContain('targetDeployment?.hostname !== currentDeployment?.hostname');
    expect(runner).toContain('finally {');
    expect(runner).toContain('rollbackAttempted = true;');
    expect(runner).toContain('if (rollbackAttempted && currentDeployment)');
    expect(runner).not.toContain('if (rolledBack && currentDeployment)');
    expect(runner).toContain('current_deployment_restore_failed');
  });

  it('completes immutable target, current deployment and production preflight before provider mutation', () => {
    const preflightIndex = runner.indexOf('rollbackTargetHealth,\n      rollbackTargetProvider,');
    const mutationIndex = runner.indexOf("const rollback = runVercel(['rollback', targetDeployment.href]");

    expect(preflightIndex).toBeGreaterThan(-1);
    expect(mutationIndex).toBeGreaterThan(preflightIndex);

    const immutablePreflight = runner.slice(preflightIndex, mutationIndex);
    expect(immutablePreflight).toContain('deploymentProof(targetDeployment.href, targetSha, healthToken)');
    expect(immutablePreflight).toContain('deploymentProof(currentDeployment.href, currentSha, healthToken)');
    expect(immutablePreflight).toContain('deploymentProof(productionUrl.href, currentSha, healthToken)');
    expect(immutablePreflight).toContain('inspectVercelDeployment(targetDeployment.href, targetSha, token, ownerId, projectId)');
    expect(immutablePreflight).toContain('inspectVercelDeployment(currentDeployment.href, currentSha, token, ownerId, projectId)');
    expect(immutablePreflight).toContain("evidence.failures.push('rollback_target_preflight_failed')");
    expect(immutablePreflight).toContain("evidence.failures.push('current_deployment_preflight_failed')");
    expect(immutablePreflight).toContain("evidence.failures.push('current_production_preflight_failed')");
    expect(immutablePreflight).toContain('evidence.checks.currentMainFresh = await verifyCurrentMain(currentSha, githubToken)');
    expect(immutablePreflight).toContain("evidence.failures.push('current_main_changed_before_rollback')");
  });

  it('accepts only origin-only HTTPS Vercel deployment URLs for mutation targets', () => {
    expect(runner).toContain("url.hostname.endsWith('.vercel.app')");
    expect(runner).toContain("url.hostname !== 'vercel.app'");
    expect(runner).toContain("url.pathname === '/'");
    expect(runner).toContain("safeUrl(env('ROLLBACK_TARGET_DEPLOYMENT_URL'), { vercelDeployment: true })");
    expect(runner).toContain("safeUrl(env('CURRENT_PRODUCTION_DEPLOYMENT_URL'), { vercelDeployment: true })");
    expect(runner).toContain("safeUrl(env('PRODUCTION_URL'), { allowedHostname: CANONICAL_PRODUCTION_HOST })");
    expect(runner).toContain("const CANONICAL_PRODUCTION_HOST = 'risckcomply.com'");
    expect(runner).toContain("const VERCEL_CLI_VERSION = '56.3.2'");
    expect(workflow).not.toContain('VERCEL_CLI_VERSION:');
  });

  it('binds both immutable deployments to the expected Vercel owner and project', () => {
    expect(workflow).toContain('VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}');
    expect(workflow).toContain('VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}');
    expect(runner).toContain("new URL(`/v13/deployments/${encodeURIComponent(deployment.hostname)}`, 'https://api.vercel.com')");
    expect(runner).toContain("endpoint.searchParams.set('withGitRepoInfo', 'true')");
    expect(runner).toContain("endpoint.searchParams.set('teamId', ownerId)");
    expect(runner).toContain('evaluateVercelDeploymentMetadata({');
    expect(runner).toContain('MAX_PROVIDER_RESPONSE_BYTES');
  });

  it('rechecks current main immediately before any provider mutation', () => {
    const freshMainIndex = runner.indexOf('evidence.checks.currentMainFresh = await verifyCurrentMain(currentSha, githubToken)');
    const mutationIndex = runner.indexOf("const rollback = runVercel(['rollback', targetDeployment.href]");
    expect(freshMainIndex).toBeGreaterThan(-1);
    expect(mutationIndex).toBeGreaterThan(freshMainIndex);
    expect(runner.slice(freshMainIndex, mutationIndex)).toContain("evidence.failures.push('current_main_changed_before_rollback')");
    expect(runner).toContain("currentSha === env('TARGET_SHA').toLowerCase()");
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
  });

  it('requires health, no-store and exact build SHA after rollback and restore', () => {
    expect(runner).toContain("new URL('/api/health', baseUrl)");
    expect(runner).toContain("new URL('/api/ready/release', baseUrl)");
    expect(runner).toContain("body?.status === 'ok'");
    expect(runner).toContain('/\\bno-store\\b/i');
    expect(runner).toContain('sanitizeRuntimeReleaseResponse');
    expect(runner).toContain('evaluateRuntimeReleaseSha');
    expect(runner).toContain('expectedCommitSha: expectedSha');
    expect(runner).toContain('expectedBuildSha: expectedSha');
    expect(runner).toContain('MAX_RUNTIME_RESPONSE_BYTES');
    expect(runner).toContain('postRollbackHealth');
    expect(runner).toContain('postRestoreHealth');
  });

  it('stores only redacted result metadata and fails closed', () => {
    for (const token of [
      'containsSensitiveValues: false',
      'rawTokenStored: false',
      'rawDeploymentUrlStored: false',
      'rawProviderResponseStored: false',
      'process.exitCode = 1',
      "console.error('Rollback runtime validation failed closed.')",
    ]) expect(runner).toContain(token);

    expect(runner).not.toContain('stdout: result.stdout');
    expect(runner).not.toContain('stderr: result.stderr');
    expect(runner).toContain('writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\\n`');

    const evidenceStart = runner.indexOf('function evidenceBase');
    const evidenceEnd = runner.indexOf('async function main');
    expect(evidenceStart).toBeGreaterThan(-1);
    expect(evidenceEnd).toBeGreaterThan(evidenceStart);

    const persistedEvidenceShape = runner.slice(evidenceStart, evidenceEnd);
    expect(persistedEvidenceShape).not.toContain('VERCEL_TOKEN');
    expect(persistedEvidenceShape).not.toContain('HEALTHCHECK_TOKEN');
    expect(persistedEvidenceShape).not.toContain('Authorization');
    expect(persistedEvidenceShape).not.toContain('deploymentUrl');
  });
});
