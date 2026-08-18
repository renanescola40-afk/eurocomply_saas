#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUTPUT = resolve('release-validation/final-billing-product-live-closeout.json');
const LIFECYCLE_EVIDENCE = resolve('artifacts/billing-lifecycle-runtime-proof/evidence.json');
const FULL_SHA = /^[a-f0-9]{40}$/;

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function componentPassed(name) {
  return env(name) === 'success';
}

function readLifecycleEvidence(path = LIFECYCLE_EVIDENCE) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function buildFinalBillingProductLiveCloseout({
  targetSha = env('TARGET_SHA').toLowerCase(),
  componentOutcomes = {
    portalBootstrap: env('PORTAL_BOOTSTRAP_OUTCOME'),
    stripeControlPlane: env('STRIPE_CONTROL_PLANE_OUTCOME'),
    commercialCatalog: env('COMMERCIAL_CATALOG_OUTCOME'),
    runtimeReleaseSha: env('RUNTIME_RELEASE_SHA_OUTCOME'),
    lifecycleObservation: env('LIFECYCLE_OBSERVATION_OUTCOME'),
    auditChain: env('AUDIT_CHAIN_OUTCOME'),
    lifecycleEvidence: env('LIFECYCLE_EVIDENCE_OUTCOME'),
  },
  lifecycleEvidence = readLifecycleEvidence(),
} = {}) {
  const generatedAt = new Date().toISOString();
  const exactSha = FULL_SHA.test(targetSha);
  const lifecycleComplete = lifecycleEvidence?.status === 'Complete'
    && lifecycleEvidence?.outcome === 'passed'
    && (!Array.isArray(lifecycleEvidence?.failures) || lifecycleEvidence.failures.length === 0);

  const checks = {
    exactReleaseSha: exactSha,
    billingPortalProvisionedOrReused: componentOutcomes.portalBootstrap === 'success',
    stripeControlPlaneProven: componentOutcomes.stripeControlPlane === 'success',
    canonicalCommercialCatalogProven: componentOutcomes.commercialCatalog === 'success',
    exactProductionRuntimeShaProven: componentOutcomes.runtimeReleaseSha === 'success',
    legitimateLifecycleObservedReadOnly: componentOutcomes.lifecycleObservation === 'success',
    billingAuditChainCryptographicallyVerified: componentOutcomes.auditChain === 'success',
    durableLifecycleEvidenceBuilt: componentOutcomes.lifecycleEvidence === 'success' && lifecycleComplete,
  };
  const passed = Object.values(checks).every(Boolean);
  const blockerCodes = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);

  return {
    schema: 'risck-comply.final-billing-product-live-closeout.v1',
    evidenceItem: 'final-billing-product-live-closeout',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'blocked',
    generatedAt,
    commitSha: exactSha ? targetSha : null,
    checks,
    blockerCodes,
    decision: passed ? 'BILLING_PRODUCT_EU_AI_ACT: PASS' : 'BILLING_PRODUCT_EU_AI_ACT: OPEN',
    evidenceIntegrity: {
      containsCustomerIdentifiers: false,
      containsStripeObjectIdentifiers: false,
      containsSecrets: false,
      containsDatabaseConnectionStrings: false,
      containsProviderResponseBodies: false,
    },
    truthBoundary: 'Complete means the exact production SHA passed the live Stripe control plane and canonical catalog proofs and a pre-existing legitimate live billing lifecycle was observed read-only with durable ledger evidence and a verified audit chain. This closeout never creates a customer, Checkout Session, subscription, invoice, payment intent or charge solely for evidence.',
  };
}

async function main() {
  const evidence = buildFinalBillingProductLiveCloseout();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    status: evidence.status,
    outcome: evidence.outcome,
    decision: evidence.decision,
    checks: evidence.checks,
    blockerCodes: evidence.blockerCodes,
  }, null, 2));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
