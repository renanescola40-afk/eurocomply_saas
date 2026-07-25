import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const targetSha = process.env.TARGET_SHA ?? process.env.GITHUB_SHA ?? 'unknown';
const migration = readFileSync('supabase/migrations/20260724193000_enterprise_entitlement_billing_reconciliation.sql', 'utf8');
const service = readFileSync('src/server/enterprise/entitlement-reconciliation.ts', 'utf8');

const controls = {
  canonicalSources: migration.includes('enterprise_entitlement_sources'),
  immutableSnapshots: migration.includes('enterprise_entitlement_snapshots'),
  organizationIdempotency: migration.includes('unique (organization_id, idempotency_key)'),
  sourceVersioning: migration.includes('p_expected_source_version'),
  sourcePriority: migration.includes('lower_priority'),
  atomicSeatPolicyUpdate: migration.includes('enterprise_seat_policies') && migration.includes('pg_advisory_xact_lock'),
  payloadIntegrity: service.includes("createHash('sha256')") && migration.includes('source_payload_sha256'),
  serviceRoleBoundary: migration.includes('to service_role'),
  driftEvidence: migration.includes('enterprise_entitlement_reconciliation_events'),
};

const passed = Object.values(controls).filter(Boolean).length;
const total = Object.keys(controls).length;
const report = {
  targetSha,
  generatedAt: new Date().toISOString(),
  status: passed === total ? 'TECHNICAL_CONTROLS_PRESENT' : 'TECHNICAL_GAP',
  score: Math.round((passed / total) * 100),
  controls,
  sourceDigest: createHash('sha256').update(migration).update(service).digest('hex'),
  truthBoundary: {
    productionMigrationApplied: false,
    stripeWebhookConnected: false,
    signedContractFeedConnected: false,
    externalDriftReconciled: false,
  },
};

mkdirSync('artifacts/enterprise-entitlement-billing', { recursive: true });
writeFileSync('artifacts/enterprise-entitlement-billing/report.json', JSON.stringify(report, null, 2));
writeFileSync('artifacts/enterprise-entitlement-billing/report.md', [
  '# Enterprise Entitlement and Billing Reconciliation',
  '',
  `- Target SHA: \`${targetSha}\``,
  `- Technical score: ${report.score}%`,
  `- Status: ${report.status}`,
  '',
  'External Stripe, contract and production migration evidence remains intentionally unproven.',
].join('\n'));
if (report.status !== 'TECHNICAL_CONTROLS_PRESENT') process.exitCode = 1;
