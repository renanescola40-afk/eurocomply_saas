#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_RLS_TABLES = new Set(['permissions', 'role_permissions', 'stripe_webhook_events']);
const REQUIRED_POLICIES = new Set([
  'permissions|permissions_authenticated_read|SELECT|authenticated',
  'role_permissions|role_permissions_authenticated_read|SELECT|authenticated',
]);
const REQUIRED_HISTORY = '20260726070000|permissions_catalog_rls_hotfix';
const BOOLEAN_TRUE = new Set(['t', 'true', 'on', '1']);

function normalize(value) {
  return String(value ?? '').trim();
}

export function verifyProof(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rls = new Map();
  const policies = new Set();
  const history = new Set();
  const errors = [];

  for (const line of lines) {
    const parts = line.split('|').map(normalize);
    if (parts[0] === 'rls' && parts.length >= 4) {
      rls.set(parts[1], { enabled: parts[2].toLowerCase(), forced: parts[3].toLowerCase() });
    } else if (parts[0] === 'policy' && parts.length >= 5) {
      policies.add(parts.slice(1, 5).join('|'));
    } else if (parts[0] === 'history' && parts.length >= 3) {
      history.add(parts.slice(1, 3).join('|'));
    }
  }

  for (const table of REQUIRED_RLS_TABLES) {
    const state = rls.get(table);
    if (!state) {
      errors.push(`Missing RLS evidence for public.${table}`);
      continue;
    }
    if (!BOOLEAN_TRUE.has(state.enabled)) errors.push(`RLS is not enabled for public.${table}`);
    if (!BOOLEAN_TRUE.has(state.forced)) errors.push(`FORCE ROW LEVEL SECURITY is not enabled for public.${table}`);
  }

  for (const policy of REQUIRED_POLICIES) {
    if (!policies.has(policy)) errors.push(`Missing required policy evidence: ${policy}`);
  }

  for (const policy of policies) {
    if (policy.startsWith('stripe_webhook_events|')) {
      errors.push('stripe_webhook_events must remain policy-free and backend-only');
    }
  }

  if (!history.has(REQUIRED_HISTORY)) {
    errors.push(`Missing migration history evidence: ${REQUIRED_HISTORY}`);
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    summary: {
      requiredRlsTables: REQUIRED_RLS_TABLES.size,
      observedRlsTables: [...REQUIRED_RLS_TABLES].filter((table) => rls.has(table)).length,
      requiredPolicies: REQUIRED_POLICIES.size,
      observedRequiredPolicies: [...REQUIRED_POLICIES].filter((policy) => policies.has(policy)).length,
      forbiddenWebhookPolicies: [...policies].filter((policy) => policy.startsWith('stripe_webhook_events|')).length,
      migrationHistoryPresent: history.has(REQUIRED_HISTORY),
    },
  };
}

async function main() {
  const input = process.argv[2] ?? 'reconciliation-proof.txt';
  const output = process.argv[3] ?? 'artifacts/supabase-rls-reconciliation/verification.json';
  const report = verifyProof(await readFile(input, 'utf8'));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);

  process.stdout.write(`Supabase RLS reconciliation verification: ${report.status}\n`);
  for (const error of report.errors) process.stderr.write(`- ${error}\n`);
  if (report.status !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
