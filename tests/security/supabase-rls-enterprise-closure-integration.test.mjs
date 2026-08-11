import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { hydrateEnterpriseClosureEvidence } from '../../scripts/release/hydrate-enterprise-100-evidence.mjs';

const SHA = 'a'.repeat(40);

async function createRoots() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rls-enterprise-closure-'));
  const sourceRoot = path.join(root, 'source');
  const outputRoot = path.join(root, 'output');
  await mkdir(path.join(sourceRoot, 'retained', 'release-validation'), { recursive: true });
  return { root, sourceRoot, outputRoot };
}

test('canonical Supabase RLS reconciliation evidence hydrates by declared path with exact SHA', async () => {
  const { root, sourceRoot, outputRoot } = await createRoots();
  try {
    await writeFile(
      path.join(sourceRoot, 'retained', 'release-validation', 'supabase-rls-reconciliation.json'),
      `${JSON.stringify({
        schema: 'risck-comply.supabase-rls-reconciliation-closure.v1',
        evidenceItem: 'supabase-rls-reconciliation',
        status: 'PASS',
        outcome: 'passed',
        targetSha: SHA,
        expectedSha: SHA,
        environment: 'production',
        evidenceIntegrity: { containsSensitiveValues: false, exactShaBound: true },
      }, null, 2)}\n`,
    );

    const manifest = await hydrateEnterpriseClosureEvidence({
      sourceRoot,
      outputRoot,
      targetSha: SHA,
      closureConfig: {
        controls: [{
          id: 'supabase-rls-reconciliation',
          evidence: 'release-validation/supabase-rls-reconciliation.json',
        }],
      },
    });

    assert.equal(manifest.hydratedEvidence, 1);
    assert.equal(manifest.aliasedEvidence, 0);
    assert.equal(manifest.results[0]?.matchedBy, 'declared_path');
    const hydrated = JSON.parse(await readFile(
      path.join(outputRoot, 'release-validation', 'supabase-rls-reconciliation.json'),
      'utf8',
    ));
    assert.equal(hydrated.status, 'PASS');
    assert.equal(hydrated.targetSha, SHA);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stale RLS reconciliation evidence is never hydrated for a newer release SHA', async () => {
  const { root, sourceRoot, outputRoot } = await createRoots();
  try {
    await writeFile(
      path.join(sourceRoot, 'retained', 'release-validation', 'supabase-rls-reconciliation.json'),
      `${JSON.stringify({
        status: 'PASS',
        targetSha: 'b'.repeat(40),
        evidenceIntegrity: { containsSensitiveValues: false },
      }, null, 2)}\n`,
    );

    const manifest = await hydrateEnterpriseClosureEvidence({
      sourceRoot,
      outputRoot,
      targetSha: SHA,
      closureConfig: {
        controls: [{
          id: 'supabase-rls-reconciliation',
          evidence: 'release-validation/supabase-rls-reconciliation.json',
        }],
      },
    });

    assert.equal(manifest.hydratedEvidence, 0);
    assert.equal(manifest.staleEvidence, 1);
    assert.equal(manifest.results[0]?.status, 'STALE');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
