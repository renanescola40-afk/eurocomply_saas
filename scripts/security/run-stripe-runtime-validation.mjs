#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = new Set(process.argv.slice(2));
const writeOpenEvidence = args.has('--write-open-evidence');
const evidenceRelativePath = 'docs/security/evidence/runtime/stripe-billing-validation.json';

if (args.has('--update-register')) {
  throw new Error(
    'Static Stripe contract validation cannot mark runtime evidence Complete. Run a real target-runtime validation and update the register through its reviewed evidence workflow.',
  );
}

const files = {
  checkoutRoute: 'src/app/api/billing/checkout/route.ts',
  portalRoute: 'src/app/api/billing/portal/route.ts',
  stripeWebhookRoute: 'src/app/api/stripe/webhook/route.ts',
  billingWebhookRoute: 'src/app/api/billing/webhook/route.ts',
  webhookHandler: 'src/server/billing/stripe-webhooks.ts',
  webhookRecovery: 'src/server/billing/stripe-webhook-recovery.ts',
  checkoutTest: 'src/app/api/billing/checkout/route.test.ts',
  portalTest: 'src/app/api/billing/portal/route.test.ts',
  stripeWebhookTest: 'src/app/api/stripe/webhook/route.test.ts',
  billingWebhookTest: 'src/app/api/billing/webhook/route.test.ts',
  webhookHandlerTest: 'src/server/billing/stripe-webhooks.test.ts',
  webhookRecoveryTest: 'src/server/billing/stripe-webhook-recovery.test.ts',
  migration: 'supabase/migrations/20260623090000_stripe_webhook_events_enterprise_runtime.sql',
};

function read(relativePath) {
  const absolutePath = join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) throw new Error(`Missing required file: ${relativePath}`);
  return readFileSync(absolutePath, 'utf8');
}

function assertIncludes(name, content, fragments) {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) throw new Error(`${name} is missing required repository control marker: ${fragment}`);
  }
}

function getCommitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  }
}

const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));

assertIncludes('checkout route', source.checkoutRoute, [
  'requireApiUser',
  'getCurrentOrganizationForUser',
  "permission: 'manage_billing'",
  'requireTrustedMutation',
  'requireStepUpForRequest',
  'isSelfServePlan',
  'getStripePriceId',
  "action: 'checkout_created'",
  'locale,',
  'checkout?plan=${plan}&checkout=cancelled',
  "billing_address_collection: 'required'",
  'customer_update',
  'tax_id_collection',
  "payment_method_collection: 'always'",
]);

assertIncludes('billing portal route', source.portalRoute, [
  'requireApiUser',
  'getCurrentOrganizationForUser',
  "permission: 'manage_billing'",
  'requireTrustedMutation',
  'requireStepUpForRequest',
  "action: 'billing_portal_created'",
  'stripe_customer_id',
]);

assertIncludes('Stripe webhook route', source.stripeWebhookRoute, [
  "request.headers.get('stripe-signature')",
  "error: 'missing_signature'",
  'stripe.webhooks.constructEvent',
  "reason: 'invalid_signature'",
  "action: 'webhook_received'",
  "action: 'webhook_rejected'",
  'handleStripeWebhookEventWithRecovery(event)',
]);

assertIncludes('legacy billing webhook route', source.billingWebhookRoute, [
  "request.headers.get('stripe-signature')",
  "error: 'missing_signature'",
  'stripe.webhooks.constructEvent',
  'BILLING_WEBHOOK_TOLERANCE_SECONDS',
  "action: 'webhook_received'",
  "action: 'webhook_rejected'",
  'handleStripeWebhookEventWithRecovery(event)',
]);

assertIncludes('webhook handler', source.webhookHandler, [
  'claimStripeEventForProcessing(event)',
  "from('stripe_events_processed')",
  'organization_id',
  'sanitizeWebhookFailure',
  "action: 'webhook_replayed'",
  "action: 'subscription_synced'",
  'validateOrganizationStripeBinding',
  'getBillingPlanIdForStripePriceId',
]);

assertIncludes('webhook recovery', source.webhookRecovery, [
  'STRIPE_EVENT_PROCESSING_LEASE_MS',
  "status: 'failed'",
  "error: 'processing_lease_expired'",
  ".eq('status', 'processing')",
  ".eq('updated_at', existingEvent.updated_at)",
  'handleStripeWebhookEventWithRecovery',
  "'checkout.session.completed'",
  "'customer.subscription.updated'",
]);

assertIncludes('webhook migration', source.migration, [
  'stripe_events_processed',
  'stripe_webhook_events',
  'organization_id uuid',
  'status text',
  'processed_at timestamptz',
  'error text',
]);

const testCoverage = {
  checkoutWithoutLogin: source.checkoutTest.includes('without an authenticated user'),
  checkoutWithoutPermission: source.checkoutTest.includes('without manage_billing permission'),
  checkoutWithoutStepUp: source.checkoutTest.includes('without a valid step-up token'),
  invalidPlan: source.checkoutTest.includes('non-self-serve plans'),
  portalWithoutLogin: source.portalTest.includes('without an authenticated user'),
  portalWithoutPermission: source.portalTest.includes('without manage_billing permission'),
  portalWithoutStepUp: source.portalTest.includes('without valid step-up'),
  webhookMissingSignature: source.stripeWebhookTest.includes('signature header is missing') && source.billingWebhookTest.includes('signature header is missing'),
  webhookInvalidSignature: source.stripeWebhookTest.includes('invalid Stripe signatures') && source.billingWebhookTest.includes('invalid Stripe signatures'),
  webhookDuplicate: source.webhookHandlerTest.includes('skips duplicate webhook events'),
  subscriptionCreated: source.webhookHandlerTest.includes('customer.subscription.created'),
  subscriptionUpdated: source.webhookHandlerTest.includes('customer.subscription.updated'),
  subscriptionDeleted: source.webhookHandlerTest.includes('customer.subscription.deleted'),
  customerMismatch: source.webhookHandlerTest.includes('Stripe customer does not match organization billing profile'),
  checkoutSessionHardening: source.checkoutRoute.includes("billing_address_collection: 'required'") && source.checkoutRoute.includes('tax_id_collection'),
  staleProcessingLease: source.webhookRecoveryTest.includes('atomically expires and replays an abandoned subscription claim'),
  freshProcessingSuppression: source.webhookRecoveryTest.includes('does not replay a fresh processing claim'),
  recoveryRaceSafety: source.webhookRecoveryTest.includes('another request wins the atomic recovery race'),
  paymentFailedRecoveryExcluded: source.webhookRecoveryTest.includes('without provider idempotency'),
};

const failedCoverage = Object.entries(testCoverage).filter(([, passed]) => !passed).map(([name]) => name);
if (failedCoverage.length > 0) throw new Error(`Missing Stripe billing test coverage markers: ${failedCoverage.join(', ')}`);

const timestamp = new Date().toISOString();
const repositoryValidation = {
  status: 'passed',
  checkedAt: timestamp,
  commitSha: getCommitSha(),
  filesChecked: Object.values(files),
  testCoverage,
  controlsObserved: [
    'Billing mutations require authenticated organization billing authority, step-up and trusted origin',
    'Stripe webhook routes require a bounded signed payload before dispatch',
    'Stripe webhook events use a durable idempotency ledger before subscription mutation',
    'Stale replay-safe processing claims use a bounded atomic recovery lease',
    'Subscription sync validates organization, customer and server-side plan binding',
  ],
};

const evidence = {
  id: 'stripe-billing-validation',
  evidenceItem: 'stripe-billing-validation',
  status: 'Open',
  validationStatus: 'repository_contract_passed_runtime_not_run',
  outcome: 'not_run',
  reviewer: 'RISCK COMPLY repository validation automation',
  reviewedAt: timestamp,
  timestamp,
  generatedAt: timestamp,
  commitSha: repositoryValidation.commitSha,
  repository: process.env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
  summary: 'Stripe billing repository controls and focused tests were validated, but checkout, portal, webhook delivery, ledger persistence, subscription mutation and retry recovery were not executed against a configured target runtime.',
  redactionConfirmation: 'Redaction confirmed for runtime evidence.',
  evidenceLocations: [
    evidenceRelativePath,
    '.github/workflows/stripe-runtime-proof.yml',
    'scripts/security/run-stripe-runtime-validation.mjs',
    ...Object.values(files),
  ],
  controlsVerified: [],
  repositoryValidation,
  runtimeProof: {
    executed: false,
    targetEnvironment: null,
    stripeTestModeConfirmed: false,
    signedWebhookDelivered: false,
    subscriptionMutationObserved: false,
    staleClaimRecoveryObserved: false,
  },
  completionRule: 'Run a reviewed test-mode Stripe validation against the target deployment and database for the exact promoted commit, then attach sanitized workflow provenance and observed results before changing status to Complete.',
  releaseGate: 'Blocked: Stripe billing runtime validation has not been executed for the target environment and exact release commit.',
  evidenceIntegrity: {
    placeholderOnly: true,
    runtimeProofInvented: false,
    customerFacingProof: false,
    containsSensitiveValues: false,
  },
};

if (writeOpenEvidence) {
  const evidencePath = join(repoRoot, evidenceRelativePath);
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  status: repositoryValidation.status,
  validationStatus: evidence.validationStatus,
  evidenceStatus: evidence.status,
  evidenceWritten: writeOpenEvidence,
  evidencePath: evidenceRelativePath,
  commitSha: evidence.commitSha,
  runtimeProofExecuted: false,
}, null, 2));
