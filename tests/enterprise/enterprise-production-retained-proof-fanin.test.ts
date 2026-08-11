import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  hydrateEnterpriseRetainedRuntimeEvidence,
  RETAINED_RUNTIME_PRODUCERS,
} from '../../scripts/release/hydrate-enterprise-retained-runtime-evidence.mjs';

const repository = 'renanescola40-afk/eurocomply_saas';
const sha = 'a'.repeat(40);
const roots: string[] = [];

type HydrationOptions = Parameters<typeof hydrateEnterpriseRetainedRuntimeEvidence>[0];
type Fetchers = NonNullable<HydrationOptions['fetchers']>;
type FetchOptions = Parameters<Fetchers['authRbac']>[0];

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'risck-production-fanin-'));
  roots.push(root);
  return root;
}

function fakeFetcher(key: string, calls: Array<Record<string, unknown>>) {
  return async (options: FetchOptions) => {
    calls.push({ key, ...options });
    return key === 'auditChain'
      ? { found: true, runId: '4242', artifactId: '5252', targetSha: sha }
      : { found: false, targetSha: sha };
  };
}

function fakeFetchers(calls: Array<Record<string, unknown>>): Fetchers {
  const fixtures = {
    authRbac: fakeFetcher('authRbac', calls),
    auditChain: fakeFetcher('auditChain', calls),
    productionProvider: fakeFetcher('productionProvider', calls),
    branchProtection: fakeFetcher('branchProtection', calls),
    stepUp: fakeFetcher('stepUp', calls),
    stripePromoted: fakeFetcher('stripePromoted', calls),
  };
  return fixtures as unknown as Fetchers;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('enterprise production retained-proof fan-in', () => {
  it('uses only the explicit release-critical producer allowlist', () => {
    expect(RETAINED_RUNTIME_PRODUCERS.map((producer) => producer.workflowName)).toEqual([
      'Auth RBAC Tenant Proof',
      'Audit Chain Runtime Proof',
      'Production Provider Runtime Proof',
      'Branch Protection Runtime Proof',
      'Step-Up Runtime Proof',
      'Stripe Runtime Evidence Promotion',
    ]);
    expect(RETAINED_RUNTIME_PRODUCERS.every((producer) => producer.workflowPath.startsWith('.github/workflows/'))).toBe(true);
  });

  it('clears repository snapshots before restoring exact-SHA retained evidence', async () => {
    const root = tempRoot();
    for (const producer of RETAINED_RUNTIME_PRODUCERS) {
      for (const path of producer.evidencePaths) {
        const absolute = join(root, path);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, '{"status":"Open","targetSha":"stale"}\n');
      }
    }

    const calls: Array<Record<string, unknown>> = [];
    const manifest = await hydrateEnterpriseRetainedRuntimeEvidence({
      root,
      repository,
      token: 'test-token',
      targetSha: sha,
      fetchers: fakeFetchers(calls),
    });

    expect(calls).toHaveLength(RETAINED_RUNTIME_PRODUCERS.length);
    for (const producer of RETAINED_RUNTIME_PRODUCERS) {
      for (const path of producer.evidencePaths) expect(existsSync(join(root, path))).toBe(false);
    }
    expect(manifest.hydratedProducerCount).toBe(1);
    expect(manifest.missingProducerCount).toBe(RETAINED_RUNTIME_PRODUCERS.length - 1);
    expect(manifest.evidenceIntegrity.statusPromotionPerformedByHydrator).toBe(false);
    const retained = JSON.parse(readFileSync(join(root, 'release-validation/retained-runtime-evidence-hydration.json'), 'utf8'));
    expect(retained.targetSha).toBe(sha);
    expect(retained.status).toBe('Complete');
  });

  it('requires the exact triggering workflow run while keeping sibling producers optional', async () => {
    const root = tempRoot();
    const calls: Array<Record<string, unknown>> = [];
    await hydrateEnterpriseRetainedRuntimeEvidence({
      root,
      repository,
      token: 'test-token',
      targetSha: sha,
      sourceWorkflowName: 'Audit Chain Runtime Proof',
      sourceRunId: '4242',
      fetchers: fakeFetchers(calls),
    });

    const audit = calls.find((call) => call.key === 'auditChain');
    expect(audit).toMatchObject({ sourceRunId: '4242', required: true, targetSha: sha });
    for (const call of calls.filter((candidate) => candidate.key !== 'auditChain')) {
      expect(call).toMatchObject({ sourceRunId: '', required: false, targetSha: sha });
    }
  });

  it('rejects unallowlisted trigger provenance and malformed source bindings', async () => {
    const root = tempRoot();
    await expect(hydrateEnterpriseRetainedRuntimeEvidence({
      root,
      repository,
      token: 'test-token',
      targetSha: sha,
      sourceWorkflowName: 'Untrusted Workflow',
      sourceRunId: '123',
      fetchers: fakeFetchers([]),
    })).rejects.toThrow('source_workflow_not_allowlisted');

    await expect(hydrateEnterpriseRetainedRuntimeEvidence({
      root,
      repository,
      token: 'test-token',
      targetSha: sha,
      sourceWorkflowName: 'Audit Chain Runtime Proof',
      sourceRunId: 'not-a-run-id',
      fetchers: fakeFetchers([]),
    })).rejects.toThrow('source_run_id_invalid');
  });
});
