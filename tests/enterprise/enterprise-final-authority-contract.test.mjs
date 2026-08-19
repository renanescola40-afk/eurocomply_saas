import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { FINAL_AUTHORITY_PRODUCERS } from '../../scripts/enterprise/fetch-enterprise-final-authority-evidence.mjs';
import { buildEnterpriseFinalAuthority } from '../../scripts/release/write-enterprise-final-authority.mjs';

const SHA = 'a'.repeat(40);

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
  }
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
  assert.equal(result.decision, 'ENTERPRISE_100: PASS');
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
  assert.equal(result.decision, 'ENTERPRISE_100: NO_PASS_YET');
  assert.equal(result.productionDecision, 'PRODUCTION_GO: NO_GO');
});

test('workflow does not accept arbitrary run IDs or first JSON selection', () => {
  const workflow = readFileSync('.github/workflows/enterprise-100-final-authority.yml', 'utf8');
  const deprecated = readFileSync('.github/workflows/enterprise-conversation-runtime-closeout.yml', 'utf8');
  assert.match(workflow, /environment: Production/);
  assert.match(workflow, /fetch-enterprise-final-authority-evidence\.mjs/);
  assert.match(workflow, /check-github-environment-governance\.mjs/);
  assert.doesNotMatch(workflow, /stripe_run_id|production_final_run_id|copy_first_json/);
  assert.match(deprecated, /intentionally deprecated/);
  assert.match(deprecated, /exit 1/);
});

test('Enterprise closure contract requires live billing, Stage 4 Supabase, Product QA, provider and external security evidence', () => {
  const config = JSON.parse(readFileSync('config/enterprise-100-closure.json', 'utf8'));
  const byId = new Map(config.controls.map((control) => [control.id, control]));
  assert.equal(byId.get('billing-product-live-closure')?.evidence, 'final-billing-product-live-closeout.json');
  assert.equal(byId.get('supabase-production-acceptance')?.evidence, 'production-acceptance.json');
  assert.equal(byId.get('product-commercial-qa')?.evidence, 'fria-runtime-evidence.json');
  assert.equal(byId.get('production-provider-runtime')?.evidence, 'production-secrets-provider-stores.json');
  assert.equal(byId.get('external-security-assurance')?.evidence, 'external-security-assurance-decision.json');
  assert.equal(byId.get('enterprise-runtime-closeout')?.evidence, 'enterprise-runtime-closeout.json');
});
