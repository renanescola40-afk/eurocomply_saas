import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/audit-chain-runtime-proof.yml', 'utf8');
const producer = readFileSync('scripts/security/run-audit-chain-live-validation.mjs', 'utf8');
const preflight = readFileSync('scripts/security/preflight-audit-chain-runtime-proof.mjs', 'utf8');
const fetcher = readFileSync('scripts/enterprise/fetch-audit-chain-runtime-evidence.mjs', 'utf8');

describe('manual ephemeral audit-chain runtime proof', () => {
  it('runs only by explicit dispatch on protected Production and remains exact-SHA bound', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('push:\n    branches: [main]');
    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain('needs: production-environment-governance');
    expect(workflow).toContain('/commits/main');
    expect(workflow).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
  });

  it('preflights signing prerequisites before any live disposable runtime mutation', () => {
    const preflightIndex = workflow.indexOf('run: node scripts/security/preflight-audit-chain-runtime-proof.mjs');
    const liveIndex = workflow.indexOf('run: node scripts/security/run-audit-chain-live-validation.mjs');
    expect(preflightIndex).toBeGreaterThan(-1);
    expect(liveIndex).toBeGreaterThan(preflightIndex);
    expect(workflow).toContain("if: steps.runtime_preflight.outputs.ready == 'true'");
    expect(workflow).toContain("if: steps.runtime_preflight.outputs.ready != 'true'");
    expect(workflow).toContain('Live audit-chain proof was intentionally not executed; no disposable runtime mutation was performed.');
    expect(preflight).toContain('audit_chain_signing_secret_missing');
    expect(preflight).toContain('evidence_pack_signing_secret_missing');
    expect(preflight).toContain('disposableRuntimeMutationPerformed: false');
    expect(preflight).toContain('containsSensitiveValues: false');
  });

  it('removes persistent organization and actor fixture secrets', () => {
    expect(workflow).not.toContain('AUDIT_CHAIN_LIVE_ORGANIZATION_ID');
    expect(workflow).not.toContain('AUTH_RBAC_ORGANIZATION_A_ID');
    expect(workflow).not.toContain('AUDIT_CHAIN_LIVE_ACTOR_USER_ID');
    expect(producer).not.toContain("env('AUDIT', 'CHAIN', 'LIVE', 'ORGANIZATION', 'ID')");
    expect(producer).not.toContain("env('AUDIT', 'CHAIN', 'LIVE', 'ACTOR', 'USER', 'ID')");
    expect(producer).toContain('createEphemeralAuthFixtures');
  });

  it('cleans synthetic audit events before deleting ephemeral auth fixtures and verifies both', () => {
    expect(producer).toContain('cleanupSyntheticAuditEvents');
    expect(producer).toContain('const CLEANUP_CHUNK_SIZE = 50');
    expect(producer).toContain('for (const chunk of chunkIds(ids))');
    expect(producer).toContain(".from('audit_events').delete().in('id', chunk)");
    expect(producer).toContain(".from('audit_events').select('id').in('id', chunk)");
    expect(producer).toContain('cleanupEphemeralAuthFixtures');
    expect(producer).toContain("status: cleanupVerified ? 'Complete' : 'Failed'");
    expect(producer).toContain('auditEventsRemoved: auditCleanup.verified');
    expect(producer).toContain('authFixturesRemoved: authCleanup.verified');
    expect(producer).toContain('syntheticAuditEventsRetained: liveValidation.cleanup?.auditEventsRemoved !== true');
    expect(producer).toContain('ephemeralFixtureCleanupVerified: liveValidation.cleanup?.status === \'Complete\'');
  });

  it('does not serialize credentials, full tenant/user identifiers or raw provider errors', () => {
    expect(producer).toContain('rawIdentifiersStored: false');
    expect(producer).toContain('persistentFixtureCredentialsStored: false');
    expect(producer).toContain('rawAuditPayloadsStored: false');
    expect(producer).not.toContain('organizationIdRedacted');
    expect(producer).not.toContain('errors: concurrentErrors');
  });

  it('allows exact-SHA P0 promotion from automatic push and manual recovery runs', () => {
    expect(fetcher).toContain("new Set(['push', 'workflow_dispatch'])");
    expect(fetcher).toContain("matching.length !== 1");
    expect(fetcher).toContain('ephemeral_fixture_cleanup_not_verified');
  });
});
