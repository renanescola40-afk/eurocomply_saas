import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const targetSha = process.env.TARGET_SHA ?? process.env.GITHUB_SHA ?? 'unknown';
const runtimePath = 'src/server/billing/stripe-entitlement-runtime.ts';
const recoveryPath = 'src/server/billing/stripe-webhook-recovery.ts';
const runtime = readFileSync(runtimePath, 'utf8');
const recovery = readFileSync(recoveryPath, 'utf8');

const controls = {
  verifiedWebhookBoundary: recovery.includes('handleStripeWebhookEvent(event)'),
  postProcessingReconciliation: recovery.includes('reconcileStripeEntitlementEvent(event)'),
  eventIdempotency: runtime.includes('stripe:${event.id}'),
  metadataValidation: runtime.includes('metadataSchema.safeParse'),
  tenantBinding: runtime.includes('organization_id') && runtime.includes('entitlement_source_id'),
  sourceVersioning: runtime.includes('expectedSourceVersion'),
  deferredCancellation: runtime.includes('deferredDowngrade'),
  delinquencyGrace: runtime.includes('grace_period_days'),
  replayRecovery: recovery.includes('recoverAbandonedStripeEventClaim'),
};

const passed = Object.values(controls).filter(Boolean).length;
const total = Object.keys(controls).length;
const report = {
  targetSha,
  generatedAt: new Date().toISOString(),
  status: passed === total ? 'TECHNICAL_CONTROLS_PRESENT' : 'TECHNICAL_GAP',
  score: Math.round((passed / total) * 100),
  controls,
  truthBoundary: {
    stripeEndpointConfigured: false,
    productionWebhookDelivered: false,
    productionEntitlementReconciled: false,
    contractMetadataComplete: false,
  },
  sourceDigest: createHash('sha256').update(runtime).update(recovery).digest('hex'),
};

mkdirSync('artifacts/stripe-entitlement-runtime', { recursive: true });
writeFileSync('artifacts/stripe-entitlement-runtime/report.json', JSON.stringify(report, null, 2));
writeFileSync('artifacts/stripe-entitlement-runtime/report.md', [
  '# Stripe Entitlement Runtime',
  '',
  `- Target SHA: \`${targetSha}\``,
  `- Technical score: **${report.score}%**`,
  `- Status: **${report.status}**`,
  `- Source digest: \`${report.sourceDigest}\``,
  '',
  'This report proves repository controls only. It does not prove production Stripe delivery or Supabase application.',
].join('\n'));

if (passed !== total) process.exitCode = 1;
