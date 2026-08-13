#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_RLS_TABLES = new Set(['permissions', 'role_permissions', 'stripe_webhook_events']);
const REQUIRED_POLICIES = new Set([
  'permissions|permissions_authenticated_read|SELECT|authenticated',
  'role_permissions|role_permissions_authenticated_read|SELECT|authenticated',
]);
const REQUIRED_HISTORY = new Set([
  '20260726070000|permissions_catalog_rls_hotfix',
  '20260812224650|tighten_permissions_catalog_authenticated_grants',
]);
const REQUIRED_GRANTS = new Set([
  'permissions|authenticated|SELECT',
  'role_permissions|authenticated|SELECT',
  'permissions|service_role|SELECT',
  'permissions|service_role|INSERT',
  'permissions|service_role|UPDATE',
  'permissions|service_role|DELETE',
  'role_permissions|service_role|SELECT',
  'role_permissions|service_role|INSERT',
  'role_permissions|service_role|UPDATE',
  'role_permissions|service_role|DELETE',
  'stripe_webhook_events|service_role|SELECT',
  'stripe_webhook_events|service_role|INSERT',
  'stripe_webhook_events|service_role|UPDATE',
  'stripe_webhook_events|service_role|DELETE',
]);
const BOOLEAN_TRUE = new Set(['t', 'true', 'on', '1']);
const CLIENT_ROLES = new Set(['PUBLIC', 'anon', 'authenticated']);

function normalize(value) {
  return String(value ?? '').trim();
}

function isAllowedClientGrant(grant) {
  return grant === 'permissions|authenticated|SELECT' || grant === 'role_permissions|authenticated|SELECT';
}

export function verifyProof(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rls = new Map();
  const policies = new Set();
  const grants = new Set();
  const history = new Set();
  const errors = [];

  for (const line of lines) {
    const parts = line.split('|').map(normalize);
    if (parts[0] === 'rls' && parts.length >= 4) {
      rls.set(parts[1], { enabled: parts[2].toLowerCase(), forced: parts[3].toLowerCase() });
    } else if (parts[0] === 'policy' && parts.length >= 5) {
      policies.add(parts.slice(1, 5).join('|'));
    } else if (parts[0] === 'grant' && parts.length >= 4) {
      grants.add(parts.slice(1, 4).join('|'));
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

  for (const grant of REQUIRED_GRANTS) {
    if (!grants.has(grant)) errors.push(`Missing required privilege evidence: ${grant}`);
  }

  for (const grant of grants) {
    const [, role] = grant.split('|');
    if (CLIENT_ROLES.has(role) && !isAllowedClientGrant(grant)) {
      errors.push(`Unexpected client privilege: ${grant}`);
    }
  }

  for (const requiredHistory of REQUIRED_HISTORY) {
    if (!history.has(requiredHistory)) {
      errors.push(`Missing migration history evidence: ${requiredHistory}`);
    }
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
      requiredGrants: REQUIRED_GRANTS.size,
      observedRequiredGrants: [...REQUIRED_GRANTS].filter((grant) => grants.has(grant)).length,
      unexpectedClientGrants: [...grants].filter((grant) => {
        const [, role] = grant.split('|');
        return CLIENT_ROLES.has(role) && !isAllowedClientGrant(grant);
      }).length,
      requiredMigrationHistory: REQUIRED_HISTORY.size,
      observedRequiredMigrationHistory: [...REQUIRED_HISTORY].filter((entry) => history.has(entry)).length,
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
