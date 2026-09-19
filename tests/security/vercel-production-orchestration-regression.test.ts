import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);
const rlsFetcher = readFileSync(
  join(process.cwd(), 'scripts/enterprise/fetch-supabase-rls-evidence.mjs'),
  'utf8',
);

describe('Vercel exact-SHA production orchestration regression', () => {
  it('fails fast on exact-SHA runtime evidence before dependency install and build work', () => {
    const setupNode = workflow.indexOf('Setup Node.js');
    const auditEvidence = workflow.indexOf('Hydrate exact-SHA audit-chain runtime evidence');
    const rlsEvidence = workflow.indexOf('Hydrate exact-SHA Supabase RLS runtime evidence');
    const npmCi = workflow.indexOf('Install dependencies deterministically');
    const lint = workflow.indexOf('Run lint gate');
    const build = workflow.indexOf('Run build gate');

    expect(setupNode).toBeGreaterThan(-1);
    expect(auditEvidence).toBeGreaterThan(setupNode);
    expect(rlsEvidence).toBeGreaterThan(auditEvidence);
    expect(npmCi).toBeGreaterThan(rlsEvidence);
    expect(lint).toBeGreaterThan(npmCi);
    expect(build).toBeGreaterThan(lint);
  });

  it('preserves exact-SHA fail-closed RLS evidence enforcement', () => {
    expect(workflow).toContain("SUPABASE_RLS_RUNTIME_EVIDENCE_REQUIRED: 'true'");
    expect(workflow).toContain('TARGET_SHA: ${{ env.RELEASE_SHA }}');
    expect(workflow).toContain('node scripts/enterprise/fetch-supabase-rls-evidence.mjs');
    expect(workflow).not.toContain('continue-on-error: true');
    expect(rlsFetcher).toContain("head_branch === 'main'");
    expect(rlsFetcher).toContain("status === 'completed' && run?.conclusion === 'success'");
    expect(rlsFetcher).toContain('supabase-live-rls-runtime-proof-${targetSha}');
  });

  it('makes missing exact-SHA RLS prerequisites actionable without accepting stale evidence', () => {
    expect(rlsFetcher).toContain('Exact-SHA Supabase RLS evidence missing');
    expect(rlsFetcher).toContain('Complete Production Reattestation or Supabase Forward Promotion for this exact SHA');
    expect(rlsFetcher).toContain('wait for ${expectedArtifact} to be published');
    expect(rlsFetcher).toContain('Do not reuse evidence from another SHA');
    expect(rlsFetcher).toContain('process.exit(1)');
  });

  it('preflights Vercel authentication before pull and never prints the token', () => {
    const auth = workflow.indexOf('Verify Vercel authentication before production access');
    const pull = workflow.indexOf('Link and pull current Vercel production environment');

    expect(auth).toBeGreaterThan(-1);
    expect(pull).toBeGreaterThan(auth);

    const authBoundary = workflow.slice(auth, pull);
    expect(authBoundary).toContain('whoami --token="$VERCEL_TOKEN"');
    expect(authBoundary).toContain('>/dev/null 2>&1');
    expect(authBoundary).toContain('Vercel authentication failed');
    expect(authBoundary).not.toContain('echo "$VERCEL_TOKEN"');
    expect(authBoundary).not.toContain('printf \'%s\' "$VERCEL_TOKEN"');
  });

  it('wires protected immutable rollback inputs without weakening the rollback gate', () => {
    expect(workflow).toContain(
      "RELEASE_ROLLBACK_TARGET_URL: ${{ vars.RELEASE_ROLLBACK_TARGET_URL || secrets['RELEASE_ROLLBACK_TARGET_URL'] || vars.LAST_KNOWN_GOOD_DEPLOYMENT_URL || secrets['LAST_KNOWN_GOOD_DEPLOYMENT_URL'] }}",
    );
    expect(workflow).toContain(
      "RELEASE_ROLLBACK_TARGET_SHA: ${{ vars.RELEASE_ROLLBACK_TARGET_SHA || secrets['RELEASE_ROLLBACK_TARGET_SHA'] || vars.LAST_KNOWN_GOOD_COMMIT_SHA || secrets['LAST_KNOWN_GOOD_COMMIT_SHA'] || vars.LAST_KNOWN_GOOD_SHA || secrets['LAST_KNOWN_GOOD_SHA'] }}",
    );
    expect(workflow).toContain(
      "RELEASE_ROLLBACK_TARGET_VALIDATED: ${{ vars.RELEASE_ROLLBACK_TARGET_VALIDATED || secrets['RELEASE_ROLLBACK_TARGET_VALIDATED'] }}",
    );
    expect(workflow).toContain(
      "VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets['VERCEL_AUTOMATION_BYPASS_SECRET'] }}",
    );
    expect(workflow).toContain('npm run release:rollback:dry-run');
    expect(workflow).not.toContain('continue-on-error: true');
  });

  it('keeps exact current-main revalidation immediately before Vercel mutation and deploy', () => {
    const pull = workflow.indexOf('Link and pull current Vercel production environment');
    const mutationReverify = workflow.indexOf('Reverify current main immediately before production environment mutation');
    const synchronization = workflow.indexOf('Synchronize provider-proof runtime bindings to Vercel production');
    const build = workflow.indexOf('Build Vercel production artifact');
    const finalReverify = workflow.indexOf('Reverify current main immediately before production deployment');
    const deploy = workflow.indexOf('Deploy prebuilt artifact to Vercel production');

    expect(mutationReverify).toBeGreaterThan(pull);
    expect(synchronization).toBeGreaterThan(mutationReverify);
    expect(finalReverify).toBeGreaterThan(build);
    expect(deploy).toBeGreaterThan(finalReverify);

    for (const section of [
      workflow.slice(mutationReverify, synchronization),
      workflow.slice(finalReverify, deploy),
    ]) {
      expect(section).toContain('git fetch --no-tags origin main');
      expect(section).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"');
      expect(section).toContain('test "$(git rev-parse origin/main)" = "${RELEASE_SHA,,}"');
    }
  });
});
