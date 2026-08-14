#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const output = 'docs/security/evidence/runtime/stripe-provider-configuration-validation.json';
const releaseSha = String(process.env.ENTERPRISE_EXPECTED_SHA ?? '').trim().toLowerCase();
const repository = String(process.env.GITHUB_REPOSITORY ?? '');
const runId = String(process.env.GITHUB_RUN_ID ?? '');
const branch = String(process.env.ENTERPRISE_EXPECTED_BRANCH ?? '');

if (!/^[0-9a-f]{40}$/.test(releaseSha)) throw new Error('ENTERPRISE_EXPECTED_SHA must be a full commit SHA');
if (repository !== 'renanescola40-afk/eurocomply_saas') throw new Error('Unexpected repository provenance');
if (branch !== 'main') throw new Error('Stripe provider proof must target main');
if (!/^\d+$/.test(runId)) throw new Error('Missing numeric GitHub Actions run id');
if (process.env.STRIPE_PROVIDER_PROBE_PASSED !== 'true') throw new Error('Stripe provider probe did not pass');

const now = new Date().toISOString();
const evidence = {
  schema: 'risck-comply/runtime-evidence/v1',
  evidenceItem: 'stripe-provider-configuration-validation',
  status: 'Complete',
  outcome: 'passed',
  reviewer: 'RISCK COMPLY protected runtime automation',
  reviewedAt: now,
  generatedAt: now,
  repository,
  branch,
  targetSha: releaseSha,
  buildSha: releaseSha,
  environment: 'production-provider-live-mode',
  summary: 'Protected Stripe API validation confirmed live-mode provider access, canonical Essential, Professional and Business monthly EUR prices, and the exact enabled production webhook endpoint with the complete billing event contract for the exact release SHA.',
  controlsVerified: [
    'Stripe production provider proof uses live mode only',
    'Canonical Essential, Professional and Business prices match repository amount, currency, interval and active Product requirements',
    'The exact canonical production webhook endpoint is enabled in live mode',
    'Webhook coverage includes checkout, subscription lifecycle, payment failure and invoice-paid recovery events',
    'Evidence is bound to the exact main-branch release SHA and protected GitHub Actions run',
  ],
  checks: {
    liveModeConfirmed: true,
    accountActive: true,
    essentialPriceActive: true,
    professionalPriceActive: true,
    businessPriceActive: true,
    canonicalPriceMetadataMatches: true,
    exactWebhookEndpointPresent: true,
    requiredWebhookEventsPresent: true,
  },
  failures: [],
  evidenceLocations: [
    'config/billing-commercial-catalog.json',
    'config/stripe-webhook-contract.json',
    'scripts/security/probe-stripe-provider-config.mjs',
    'scripts/security/write-stripe-provider-evidence.mjs',
    '.github/workflows/stripe-provider-proof.yml',
  ],
  redactionConfirmation: 'Redaction confirmed for runtime evidence.',
  evidenceIntegrity: {
    placeholderOnly: false,
    containsSensitiveValues: false,
    stripeSecretStored: false,
    priceIdsStored: false,
    webhookUrlsStored: false,
    providerPayloadStored: false,
    customerDataStored: false,
  },
  limitations: [
    'This proves production Stripe provider configuration, not an end-to-end authenticated checkout or customer-portal transaction.',
    'A matching STRIPE_WEBHOOK_SECRET must still be stored in the production application runtime and signed delivery must be proven separately.',
    'Durable ledger persistence, subscription mutation, duplicate suppression and stale-claim recovery remain separate runtime acceptance checks.',
  ],
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Wrote redacted Stripe provider evidence for ${releaseSha}`);
