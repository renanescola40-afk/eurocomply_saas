import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    path: 'src/server/security/no-store.ts',
    required: [
      'NO_STORE_HEADERS',
      'Cache-Control',
      'no-store',
      'no-cache',
      'must-revalidate',
      'proxy-revalidate',
      'private',
      'Pragma',
      'Expires',
      'Surrogate-Control',
      'applyNoStoreHeaders',
      'noStoreJson',
      'noStoreDownload',
    ],
    forbidden: [],
  },
  {
    path: 'src/server/security/rbac.ts',
    required: [
      'permissionDeniedResponse',
      'noStoreJson',
      'requiredPermission',
      'permission_denied',
      'insufficient_role_permission',
      'organization_membership_required',
      'rbac_check_failed',
    ],
    forbidden: ['NextResponse.json('],
  },
  {
    path: 'src/server/security/rbac.test.ts',
    required: [
      'permissionDeniedResponse',
      'Cache-Control',
      'no-store',
      'Pragma',
      'no-cache',
    ],
    forbidden: [],
  },
  {
    path: 'src/server/billing/upgrade-response.ts',
    required: [
      'upgradeRequiredResponse',
      'Cache-Control',
      'no-store',
      'upgradeUrl',
    ],
    forbidden: [],
  },
  {
    path: 'src/app/api/health/route.ts',
    required: ['noStoreJson', "status: 'ok'", 'X-Content-Type-Options'],
    forbidden: ['NextResponse.json', 'environment:', 'commit:', 'checks:', "application: 'ok'"],
  },
  {
    path: 'src/app/api/health/route.test.ts',
    required: [
      'public health endpoint hardening',
      "not.toHaveProperty('checks')",
      "not.toHaveProperty('environment')",
      "not.toHaveProperty('commit')",
      'no-store',
    ],
    forbidden: [],
  },
  {
    path: 'src/app/api/billing/entitlements/route.ts',
    required: ['noStoreJson', 'organization_required', 'Number.isFinite'],
    forbidden: ['NextResponse.json'],
  },
  {
    path: 'src/app/api/billing/entitlements/route.test.ts',
    required: [
      'billing entitlements response hardening',
      'returns no-store unauthorized responses',
      'returns no-store organization-required responses',
      'normalized numeric limits',
      'no-store',
    ],
    forbidden: [],
  },
];

const delegatedChecks = [
  'scripts/security/check-storage-security.mjs',
];

const failures = [];

function readFile(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function runDelegatedCheck(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing; delegated response/security check cannot run`);
    return;
  }

  const result = spawnSync(process.execPath, [path], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  if (result.error) {
    failures.push(`${path} failed to execute: ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    failures.push(`${path} failed as part of response/security coverage`);
  }
}

console.log('EuroComply security response helper check');
console.log('------------------------------------------');

for (const check of checks) {
  const source = readFile(check.path);
  if (!source) continue;

  for (const token of check.required) {
    if (!source.includes(token)) {
      failures.push(`${check.path} missing required response-security token: ${token}`);
    }
  }

  for (const token of check.forbidden) {
    if (source.includes(token)) {
      failures.push(`${check.path} contains forbidden response-security pattern: ${token}`);
    }
  }
}

for (const checkPath of delegatedChecks) {
  runDelegatedCheck(checkPath);
}

if (failures.length > 0) {
  console.error('Security response helper failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Security response helpers: ok');
}
