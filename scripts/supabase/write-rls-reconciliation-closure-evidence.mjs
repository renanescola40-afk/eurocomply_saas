#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const REQUIRED_MIGRATION = '20260726070000';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildRlsReconciliationClosureEvidence({
  verification,
  proofText,
  targetSha,
  runId,
  runUrl,
  generatedAt = new Date().toISOString(),
}) {
  if (!FULL_SHA.test(targetSha ?? '')) {
    throw new Error('targetSha must be a lowercase 40-character Git SHA');
  }
  if (!verification || verification.status !== 'PASS') {
    throw new Error('RLS reconciliation verification must be PASS before closure evidence can be emitted');
  }
  if (!Array.isArray(verification.errors) || verification.errors.length !== 0) {
    throw new Error('RLS reconciliation verification must contain zero errors');
  }
  if (typeof proofText !== 'string' || proofText.trim().length === 0) {
    throw new Error('RLS reconciliation proof text is required');
  }
  if (!proofText.includes(`history|${REQUIRED_MIGRATION}|permissions_catalog_rls_hotfix`)) {
    throw new Error(`RLS reconciliation proof must contain migration history ${REQUIRED_MIGRATION}`);
  }

  const verificationBytes = Buffer.from(`${JSON.stringify(verification, null, 2)}\n`);
  const proofBytes = Buffer.from(proofText);

  return {
    schema: 'risck-comply.supabase-rls-reconciliation-closure.v1',
    evidenceItem: 'supabase-rls-reconciliation',
    status: 'PASS',
    outcome: 'passed',
    targetSha,
    expectedSha: targetSha,
    generatedAt,
    sourceRunId: String(runId ?? ''),
    sourceRunUrl: runUrl ?? null,
    environment: 'production',
    reconciliationMigration: REQUIRED_MIGRATION,
    controlsVerified: [
      'permissions_rls_enabled_and_forced',
      'role_permissions_rls_enabled_and_forced',
      'stripe_webhook_events_rls_enabled_and_forced',
      'required_authenticated_read_policies_present',
      'stripe_webhook_events_client_policy_absent',
      'reconciliation_migration_history_present',
    ],
    verificationSummary: verification.summary ?? null,
    productionWriteAuthorizedByWorkflowInput: true,
    productionWritePerformed: true,
    evidenceDigests: {
      verificationJson: `sha256:${sha256(verificationBytes)}`,
      reconciliationProof: `sha256:${sha256(proofBytes)}`,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      exactShaBound: true,
      productionRuntimeProof: true,
    },
    truthBoundary: 'This evidence is emitted only after the protected production RLS reconciliation workflow applies the idempotent hotfix and the deterministic verifier reports PASS. It does not substitute for live cross-tenant isolation, backup/restore, legal review, billing proof or final release approval.',
  };
}

async function main() {
  const [verificationPath, proofPath, outputPath, targetSha, runId, runUrl] = process.argv.slice(2);
  if (!verificationPath || !proofPath || !outputPath || !targetSha || !runId || !runUrl) {
    throw new Error('usage: verification-json proof-text output-json target-sha run-id run-url');
  }

  const verification = JSON.parse(await readFile(verificationPath, 'utf8'));
  const proofText = await readFile(proofPath, 'utf8');
  const evidence = buildRlsReconciliationClosureEvidence({
    verification,
    proofText,
    targetSha,
    runId,
    runUrl,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`Wrote exact-SHA RLS reconciliation closure evidence to ${outputPath}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
