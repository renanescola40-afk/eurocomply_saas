#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const registerPath = path.join('docs', 'security', 'P0_RUNTIME_EVIDENCE_REGISTER.md');
const runner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
const updateRegister = process.argv.includes('--update-register');

const requiredTables = [
  'organizations',
  'organization_members',
  'documents',
  'audit_events',
  'risks',
  'vendors',
  'compliance_tasks',
  'subscriptions',
  'notifications',
];

const requiredOperations = [
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
];

function now() {
  return new Date().toISOString();
}

function tableCoverageFrom(testCases) {
  const tables = requiredTables.map((table) => ({
    table,
    status: 'pending_live_runtime',
    operations: Object.fromEntries(requiredOperations.map((operation) => [operation, false])),
  }));

  return testCases.length > 0 ? testCases : tables;
}

function markRegisterComplete() {
  if (!updateRegister) return false;
  throw new Error('Live RLS validation cannot mark the register Complete until the runtime validator produces passing evidence.');
}

function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function openEvidence(reason) {
  return {
    evidenceItem: 'supabase-live-rls-validation',
    status: 'Open',
    generatedAt: now(),
    runner,
    reviewer: 'security-automation',
    reviewedAt: now(),
    outcome: 'failed',
    failure: reason,
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    evidenceLocations: [evidencePath],
    productionGate: 'Public production remains blocked while this evidence is Open or failed.',
    controlsVerified: [],
    testCases: [],
    tablesReviewed: tableCoverageFrom([]),
    registerPath,
    registerUpdated: false,
    completionRule: `Run ${runner} from the controlled Supabase live RLS validation workflow after target credentials are configured.`,
    requiredOperations,
  };
}

const reason = 'Live Supabase tenant-isolation runtime execution is required before this evidence can be marked Complete.';
writeEvidence(openEvidence(reason));
markRegisterComplete();
console.error(reason);
process.exitCode = 1;
