import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDossiers } from './build-migration-review-dossiers.mjs';

const inventory = {
  schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
  items: [{ filename: '20260101000000_example.sql', version: '20260101000000', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', classificationReasons: ['LOCAL_ONLY_VERSION'] }],
};
const evidence = {
  schema: 'risck-comply.supabase-migration-object-evidence.v1',
  migrations: [{ filename: '20260101000000_example.sql', version: '20260101000000', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', allExtractedObjectsPresent: true, objects: [{ kind: 'TABLE', name: 'public.example', presentInLiveCatalog: true }] }],
};

function build(overrides = {}) {
  return buildDossiers({
    inventory: overrides.inventory ?? inventory,
    inventoryBytes: Buffer.from(JSON.stringify(overrides.inventory ?? inventory)),
    evidence: overrides.evidence ?? evidence,
    evidenceBytes: Buffer.from(JSON.stringify(overrides.evidence ?? evidence)),
    releaseSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  });
}

test('catalog presence never becomes automatic migration credit', () => {
  const dossier = build().dossiers[0];
  assert.equal(dossier.allExtractedObjectsPresent, true);
  assert.equal(dossier.evidenceAssessment.provesMigrationApplied, false);
  assert.equal(dossier.automaticClassification, null);
  assert.equal(dossier.reviewRequired, true);
});

test('missing evidence fails closed', () => {
  assert.throws(() => build({ evidence: { ...evidence, migrations: [] } }), /missing object evidence/);
});

test('digest mismatch fails closed', () => {
  const changed = { ...evidence, migrations: [{ ...evidence.migrations[0], sha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' }] };
  assert.throws(() => build({ evidence: changed }), /evidence digest mismatch/);
});
