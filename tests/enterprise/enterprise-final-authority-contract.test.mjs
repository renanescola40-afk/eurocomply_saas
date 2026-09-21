import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  FINAL_AUTHORITY_PRODUCERS,
  collectFinalAuthorityEvidence,
  validateAuthoritativeEvidenceDocument,
} from '../../scripts/enterprise/fetch-enterprise-final-authority-evidence.mjs';
import { buildEnterpriseFinalAuthority } from '../../scripts/release/write-enterprise-final-authority.mjs';

const SHA = 'a'.repeat(40);

function validDocumentFor(producer) {
  const expected = producer.evidenceContract;
  const document = {};
  for (const field of ['schema', 'evidenceItem', 'status', 'outcome', 'decision']) {
    if (Object.hasOwn(expected, field)) document[field] = expected[field];
  }
  for (const field of expected.emptyArrayFields || []) document[field] = [];
  return document;
}

test('final authority producers require the five direct domain proofs and no raw test-mode Stripe authority', () => {
  const ids = FINAL_AUTHORITY_PRODUCERS.map((producer) => producer.id);
  assert.deepEqual(ids.sort(), [
    'billing-product-live-closure',
    'external-security-assurance',
    'product-commercial-qa',
    'production-provider-runtime',
    'supabase-production-acceptance',
  ].sort());

  const workflows = FINAL_AUTHORITY_PRODUCERS.map((producer) => producer.workflow);
  assert.ok(workflows.includes('final-billing-product-live-closeout.yml'));
  assert.ok(workflows.includes('supabase-forward-production-acceptance.yml'));
  assert.ok(workflows.includes('product-fria-ephemeral-qa.yml'));
  assert.ok(workflows.includes('production-provider-runtime-proof.yml'));
  assert.ok(workflows.includes('external-security-assurance.yml'));
  assert.ok(!workflows.includes('stripe-runtime-proof.yml'));
  assert.ok(!workflows.includes('enterprise-conversation-runtime-closeout.yml'));

  for (const producer of FINAL_AUTHORITY_PRODUCERS) {
    assert.ok(producer.workflowPath.startsWith('.github/workflows/'));
    assert.ok(producer.artifact(SHA).includes(SHA));
    assert.ok(producer.allowedEvents.length > 0);
    assert.equal(typeof producer.evidenceContract?.schema, 'string');
    for (const source of producer.alternativeSources || []) {
      assert.ok(source.workflowPath.startsWith('.github/workflows/'));
      assert.ok(source.allowedEvents.length > 0);
    }
  }

  const supabase = FINAL_AUTHORITY_PRODUCERS.find((producer) => producer.id === 'supabase-production-acceptance');
  assert.deepEqual(
    supabase?.alternativeSources?.map((source) => source.workflow),
    ['supabase-forward-production-reattestation.yml'],
  );
  assert.deepEqual(
    supabase?.alternativeSources?.map((source) => source.workflowPath),
    ['.github/workflows/supabase-forward-production-reattestation.yml'],
  );
  assert.deepEqual(supabase?.alternativeSources?.[0]?.allowedEvents, ['workflow_dispatch']);

  const external = FINAL_AUTHORITY_PRODUCERS.find((producer) => producer.id === 'external-security-assurance');
  assert.equal(external?.artifact(SHA), `external-security-assurance-accepted-${SHA}`);
  assert.equal(external?.scope, 'external');
  assert.equal(FINAL_AUTHORITY_PRODUCERS.filter((producer) => producer.scope !== 'external').length, 4);
});


test('external producer collection errors remain strict WAITING_EXTERNAL without aborting internal readiness', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'final-authority-external-error-'));
  const manifest = await collectFinalAuthorityEvidence({
    repository: 'renanescola40-afk/eurocomply_saas',
    targetSha: SHA,
    token: 'test-token',
    root,
    collectProducerImpl: async ({ spec }) => {
      if (spec.scope === 'external') throw new Error('simulated_external_provider_error');
      return {
        id: spec.id,
        scope: 'internal',
        status: 'COLLECTED',
        workflow: spec.workflowPath,
        artifactName: spec.artifact(SHA),
        evidenceFile: `${spec.id}/evidence.json`,
      };
    },
  });

  assert.equal(manifest.internalStatus, 'Complete');
  assert.equal(manifest.internalOutcome, 'passed');
  assert.deepEqual(manifest.internalMissingProducerIds, []);
  assert.equal(manifest.externalStatus, 'Open');
  assert.equal(manifest.externalOutcome, 'blocked');
  assert.deepEqual(manifest.externalMissingProducerIds, ['external-security-assurance']);
  assert.equal(manifest.status, 'Open');
  assert.equal(manifest.outcome, 'blocked');
  const external = manifest.producers.find((producer) => producer.id === 'external-security-assurance');
  assert.equal(external?.status, 'ERROR');
  assert.equal(external?.errorCode, 'external_producer_collection_error');
});

test('internal producer collection errors remain fail-closed and abort authority collection', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'final-authority-internal-error-'));
  await assert.rejects(
    collectFinalAuthorityEvidence({
      repository: 'renanescola40-afk/eurocomply_saas',
      targetSha: SHA,
      token: 'test-token',
      root,
      collectProducerImpl: async ({ spec }) => {
        if (spec.id === 'billing-product-live-closure') throw new Error('simulated_internal_error');
        return {
          id: spec.id,
          scope: spec.scope === 'external' ? 'external' : 'internal',
          status: 'COLLECTED',
          workflow: spec.workflowPath,
          artifactName: spec.artifact(SHA),
          evidenceFile: `${spec.id}/evidence.json`,
        };
      },
    }),
    /simulated_internal_error/,
  );
});

test('final authority validates the producer-specific positive evidence contract before collection', () => {
  for (const producer of FINAL_AUTHORITY_PRODUCERS) {
    const document = validDocumentFor(producer);
    const result = validateAuthoritativeEvidenceDocument(producer, document);
    assert.deepEqual(result, { valid: true, failures: [] }, producer.id);
  }
});

test('a successful workflow run cannot promote blocked or semantically wrong evidence', () => {
  for (const producer of FINAL_AUTHORITY_PRODUCERS) {
    const expected = producer.evidenceContract;
    const document = validDocumentFor(producer);

    if (Object.hasOwn(expected, 'status')) document.status = 'Open';
    else if (Object.hasOwn(expected, 'outcome')) document.outcome = 'blocked';
    else document.decision = 'NO_GO';

    const result = validateAuthoritativeEvidenceDocument(producer, document);
    assert.equal(result.valid, false, producer.id);
    assert.ok(result.failures.some((failure) => /(?:status|outcome|decision)_mismatch/.test(failure)), producer.id);
  }
});

test('final authority rejects schema substitution and explicit producer blocker arrays', () => {
  for (const producer of FINAL_AUTHORITY_PRODUCERS) {
    const wrongSchema = validDocumentFor(producer);
    wrongSchema.schema = 'risck-comply.unrelated-evidence.v1';
    const schemaResult = validateAuthoritativeEvidenceDocument(producer, wrongSchema);
    assert.equal(schemaResult.valid, false, producer.id);
    assert.ok(schemaResult.failures.includes('schema_mismatch'), producer.id);

    for (const field of producer.evidenceContract.emptyArrayFields || []) {
      const blocked = validDocumentFor(producer);
      blocked[field] = ['unresolved-control'];
      const blockedResult = validateAuthoritativeEvidenceDocument(producer, blocked);
      assert.equal(blockedResult.valid, false, `${producer.id}:${field}`);
      assert.ok(blockedResult.failures.includes(`${field}_not_empty`), `${producer.id}:${field}`);
    }
  }
});

test('FRIA and external assurance keep their real heterogeneous contracts instead of fake Complete/passed normalization', () => {
  const fria = FINAL_AUTHORITY_PRODUCERS.find((producer) => producer.id === 'product-commercial-qa');
  const external = FINAL_AUTHORITY_PRODUCERS.find((producer) => producer.id === 'external-security-assurance');

  assert.deepEqual(fria?.evidenceContract, {
    schema: 'risck-comply.product-fria-runtime-acceptance.v2',
    outcome: 'passed',
  });
  assert.equal(external?.evidenceContract?.decision, 'ACCEPTED_FOR_ENTERPRISE_PROMOTION');
  assert.deepEqual(external?.evidenceContract?.emptyArrayFields, ['blockers']);
});

test('writer emits Enterprise 100 and Production GO only when closure and source manifest are exact and complete', () => {
  const result = buildEnterpriseFinalAuthority({
    targetSha: SHA,
    closure: {
      decision: 'GO',
      passed: true,
      expectedSha: SHA,
      blockers: [],
      acceptedControls: 16,
      totalControls: 16,
    },
    sourceManifest: {
      status: 'Complete',
      outcome: 'passed',
      targetSha: SHA,
      collectedProducerCount: 5,
      requiredProducerCount: 5,
      missingProducerIds: [],
      producers: [],
    },
  });
  assert.equal(result.decision, 'ENTERPRISE_PRODUCT_READY: PASS');
  assert.equal(result.enterpriseStrictDecision, 'ENTERPRISE_STRICT: PASS');
  assert.equal(result.productionDecision, 'PRODUCTION_GO: PASS');
  assert.equal(result.technicalReleaseClosure, 'TECHNICAL_RELEASE_CLOSURE: PASS');
});

test('writer fails closed when any direct domain authority is missing', () => {
  const result = buildEnterpriseFinalAuthority({
    targetSha: SHA,
    closure: {
      decision: 'GO',
      passed: true,
      expectedSha: SHA,
      blockers: [],
      acceptedControls: 16,
      totalControls: 16,
    },
    sourceManifest: {
      status: 'Open',
      outcome: 'blocked',
      targetSha: SHA,
      collectedProducerCount: 4,
      requiredProducerCount: 5,
      missingProducerIds: ['billing-product-live-closure'],
      producers: [],
    },
  });
  assert.equal(result.decision, 'ENTERPRISE_PRODUCT_READY: NO_PASS_YET');
  assert.equal(result.productionDecision, 'PRODUCTION_GO: NO_GO');
});


test('writer grants internal Product Ready while strict assurance waits for the external producer', () => {
  const result = buildEnterpriseFinalAuthority({
    targetSha: SHA,
    closure: {
      decision: 'NO_GO',
      passed: false,
      internalDecision: 'GO',
      internalPassed: true,
      strictDecision: 'WAITING_EXTERNAL',
      strictPassed: false,
      expectedSha: SHA,
      blockers: ['external-security-assurance:evidence_missing'],
      internalBlockers: [],
      externalBlockers: ['external-security-assurance:evidence_missing'],
      acceptedControls: 15,
      totalControls: 16,
      internalAcceptedControls: 15,
      internalTotalControls: 15,
    },
    sourceManifest: {
      status: 'Open',
      outcome: 'blocked',
      targetSha: SHA,
      collectedProducerCount: 4,
      requiredProducerCount: 5,
      missingProducerIds: ['external-security-assurance'],
      internalStatus: 'Complete',
      internalOutcome: 'passed',
      internalCollectedProducerCount: 4,
      internalRequiredProducerCount: 4,
      internalMissingProducerIds: [],
      externalStatus: 'Open',
      externalOutcome: 'blocked',
      externalCollectedProducerCount: 0,
      externalRequiredProducerCount: 1,
      externalMissingProducerIds: ['external-security-assurance'],
      producers: [],
    },
  });

  assert.equal(result.internalPassed, true);
  assert.equal(result.strictPassed, false);
  assert.equal(result.decision, 'ENTERPRISE_PRODUCT_READY: PASS');
  assert.equal(result.enterpriseStrictDecision, 'ENTERPRISE_STRICT: WAITING_EXTERNAL');
  assert.equal(result.productionDecision, 'PRODUCTION_GO: PASS');
  assert.deepEqual(result.blockers, []);
  assert.ok(result.strictBlockers.includes('strict_domain_sources_incomplete'));
  assert.ok(result.strictBlockers.includes('strict_enterprise_closure_not_go'));
});

test('workflow does not accept arbitrary run IDs and always emits the canonical negative decision', () => {
  const workflow = readFileSync('.github/workflows/enterprise-100-final-authority.yml', 'utf8');
  const deprecated = readFileSync('.github/workflows/enterprise-conversation-runtime-closeout.yml', 'utf8');
  assert.match(workflow, /environment: Production/);
  assert.match(workflow, /fetch-enterprise-final-authority-evidence\.mjs/);
  assert.match(workflow, /check-github-environment-governance\.mjs/);
  assert.match(workflow, /name: Emit sole final Enterprise authority decision\s+if: always\(\)/);
  assert.doesNotMatch(workflow, /stripe_run_id|production_final_run_id|copy_first_json/);
  assert.match(deprecated, /intentionally deprecated/);
  assert.match(deprecated, /exit 1/);
});

test('Enterprise closure contract has 16 unique controls and requires every direct domain authority', () => {
  const config = JSON.parse(readFileSync('config/enterprise-100-closure.json', 'utf8'));
  const ids = config.controls.map((control) => control.id);
  const byId = new Map(config.controls.map((control) => [control.id, control]));

  assert.equal(config.controls.length, 16);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(byId.get('billing-product-live-closure')?.evidence, 'final-billing-product-live-closeout.json');
  assert.equal(byId.get('supabase-production-acceptance')?.evidence, 'production-acceptance.json');
  assert.equal(byId.get('product-commercial-qa')?.evidence, 'fria-runtime-evidence.json');
  assert.equal(byId.get('production-provider-runtime')?.evidence, 'production-secrets-provider-stores.json');
  assert.equal(byId.get('external-security-assurance')?.evidence, 'external-security-assurance-decision.json');
  assert.equal(byId.get('external-security-assurance')?.scope, 'external');
  assert.equal(byId.get('legal-publication')?.scope, 'external');
  assert.equal(byId.get('final-go-no-go')?.scope, 'external');
  assert.equal(byId.get('enterprise-runtime-closeout')?.scope, 'internal');
  assert.equal(config.controls.filter((control) => control.scope === 'internal').length, 13);
  assert.equal(config.controls.filter((control) => control.scope === 'external').length, 3);
  assert.equal(byId.get('enterprise-runtime-closeout')?.evidence, 'enterprise-runtime-closeout.json');
});
