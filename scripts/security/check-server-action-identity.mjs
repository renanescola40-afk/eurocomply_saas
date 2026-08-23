#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const actionsDir = path.join(root, 'src', 'server', 'actions');

const failures = [];

const DEDICATED_SECURITY_SCANNER_MODULES = new Set([
  'src/server/actions/documents.ts',
  'src/server/actions/document-downloads.ts',
]);

function walk(dir) {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir).flatMap((entry) => {
    const absolutePath = path.join(dir, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      return walk(absolutePath);
    }

    return absolutePath.endsWith('.ts') || absolutePath.endsWith('.tsx') ? [absolutePath] : [];
  });

  return entries;
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function hasTopLevelServerActionDirective(content) {
  const firstStatements = content
    .split('\n')
    .slice(0, 8)
    .join('\n');

  return /['"]use server['"];?/.test(firstStatements);
}

function isServerActionModule(file, content) {
  const rel = relative(file);
  return rel.startsWith('src/server/actions/') || hasTopLevelServerActionDirective(content);
}

const checks = [
  {
    label: 'exported server action parameter named userId',
    pattern: /export\s+async\s+function\s+\w+\s*\([^)]*\buserId\b/s,
  },
  {
    label: 'exported server action parameter named actorUserId',
    pattern: /export\s+async\s+function\s+\w+\s*\([^)]*\bactorUserId\b/s,
  },
  {
    label: 'exported server action parameter named invitedByUserId',
    pattern: /export\s+async\s+function\s+\w+\s*\([^)]*\binvitedByUserId\b/s,
  },
  {
    label: 'server action input schema accepts caller-supplied userId',
    pattern: /\buserId\s*:\s*(?:z\.string\(\)\.uuid\(\)|uuidSchema)\b/s,
  },
  {
    label: 'server action input schema accepts caller-supplied actorUserId',
    pattern: /\bactorUserId\s*:\s*(?:z\.string\(\)\.uuid\(\)|uuidSchema)\b/s,
  },
  {
    label: 'server action throws raw provider error message',
    pattern: /throw\s+new\s+Error\(\s*(?:error|\w+Error)\.message\s*\)/s,
  },
  {
    label: 'server action rethrows raw provider error',
    pattern: /if\s*\([^)]*error[^)]*\)\s*throw\s+error\b/s,
  },
  {
    label: 'server action rethrows raw caught error',
    pattern: /catch\s*\(\s*error\s*\)\s*\{[\s\S]*?throw\s+error\b/s,
  },
];

for (const file of walk(actionsDir)) {
  const content = readFileSync(file, 'utf8');
  const rel = relative(file);

  if (DEDICATED_SECURITY_SCANNER_MODULES.has(rel)) {
    continue;
  }

  if (!isServerActionModule(file, content)) {
    continue;
  }

  for (const check of checks) {
    if (check.pattern.test(content)) {
      failures.push(`${rel}: ${check.label}`);
    }
  }

  const usesPrivilegedTenantOperation = /createAdminClient|assertCurrentUserCan|checkDistributedRateLimit|createSignedUrl/.test(content);
  const derivesCurrentUser = /requireCurrentUser|getCurrentUser/.test(content);

  if (usesPrivilegedTenantOperation && !derivesCurrentUser) {
    failures.push(`${rel}: privileged server action must derive authenticated user server-side`);
  }
}

// Payment-first revenue protection is an identity/authorization invariant too.
// Keep these checks in an already-required CI scanner so a future refactor
// cannot silently reopen operational onboarding or team administration before
// durable commercial authority has been proven.
const onboardingActionPath = path.join(root, 'src', 'server', 'actions', 'onboarding.ts');
const onboardingPagePath = path.join(root, 'src', 'app', '[locale]', 'onboarding', 'page.tsx');
const permissionBridgePath = path.join(root, 'src', 'server', 'auth', 'permissions.ts');

if (existsSync(onboardingActionPath)) {
  const source = readFileSync(onboardingActionPath, 'utf8');
  const completeStart = source.indexOf('export async function completeOnboardingActivation');
  const saveStart = source.indexOf('export async function saveOnboardingDraft');
  const authorityGuard = source.indexOf('await requireLicensedOnboardingAuthority(organizationId)', completeStart);
  const classification = source.indexOf('const classification = classifyAiSystem', completeStart);
  const activationRpc = source.indexOf('supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC', completeStart);
  const invitationDelivery = source.indexOf('await deliverOnboardingInvitations', completeStart);

  if (completeStart < 0 || authorityGuard < 0) {
    failures.push('src/server/actions/onboarding.ts: product activation must require canonical commercial authority');
  } else {
    for (const [label, index] of [
      ['AI classification/product preparation', classification],
      ['atomic product activation RPC', activationRpc],
      ['invitation delivery', invitationDelivery],
    ]) {
      if (index >= 0 && authorityGuard > index) {
        failures.push(`src/server/actions/onboarding.ts: commercial authority must precede ${label}`);
      }
    }
  }

  if (saveStart >= 0 && completeStart > saveStart) {
    const draftSource = source.slice(saveStart, completeStart);
    for (const forbidden of [
      'classifyAiSystem(',
      'ATOMIC_ONBOARDING_ACTIVATION_RPC',
      'deliverOnboardingInvitations(',
      'getRecommendedDocuments(',
      'getSuggestedTasks(',
    ]) {
      if (draftSource.includes(forbidden)) {
        failures.push(`src/server/actions/onboarding.ts: pre-license draft path must not execute paid product operation ${forbidden}`);
      }
    }
  }
}

if (existsSync(onboardingPagePath)) {
  const source = readFileSync(onboardingPagePath, 'utf8');
  const requiredTokens = [
    'requireLicensedOnboardingPageAccess',
    'getOrganizationBillingAuthority',
    "onboarding: 'payment_required'",
    'await requireLicensedOnboardingPageAccess({',
  ];

  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      failures.push(`src/app/[locale]/onboarding/page.tsx: missing payment-first page boundary token ${token}`);
    }
  }
}

if (existsSync(permissionBridgePath)) {
  const source = readFileSync(permissionBridgePath, 'utf8');
  if (!source.includes("manage_team: 'starter'")) {
    failures.push('src/server/auth/permissions.ts: team Server Actions must require licensed Starter authority or higher');
  }
  if (!source.includes('minimumPlan: SERVER_ACTION_MINIMUM_PLAN_BY_PERMISSION[requiredPermission]')) {
    failures.push('src/server/auth/permissions.ts: Server Action permission bridge must forward commercial minimum plan');
  }
}

if (failures.length > 0) {
  console.error('Server action identity checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nDo not accept caller-supplied user identity or commercial state in exported server actions. Derive identity from the authenticated session, verify durable billing authority for paid operations, and sanitize provider errors.');
  process.exit(1);
}

console.log('Server action identity and payment-first commercial boundary checks passed.');
