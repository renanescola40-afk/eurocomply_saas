#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

import { SECURITY_CI_CHECKS } from '../ci/security-ci-checks.mjs';

const root = process.cwd();
const auditCheck = 'security:npm-audit:all';

if (!SECURITY_CI_CHECKS.includes(auditCheck)) {
  console.error(`Canonical security CI authority must contain ${auditCheck}`);
  process.exit(1);
}

const applicationChecks = SECURITY_CI_CHECKS.filter((check) => check !== auditCheck);
if (applicationChecks.some((check) => check.startsWith('security:npm-audit'))) {
  console.error('Application security command still contains an npm audit invocation');
  process.exit(1);
}

// Common pull-request CI must never run provider-backed RLS probes without the
// protected Supabase environment. Keep the advisory gate fail-closed for the
// repository controls, while live tenant isolation remains enforced by the
// dedicated protected Supabase workflows.
const commands = applicationChecks.flatMap((check) => {
  if (check !== 'security:rls:advisory') return [`npm run ${check}`];
  return [
    'node scripts/security/check-rls.mjs',
    'node scripts/security/audit-supabase-tenant-isolation.mjs',
  ];
});

for (const [index, securityCommand] of commands.entries()) {
  console.log(`::group::Application security gate ${index + 1}/${commands.length}: ${securityCommand}`);
  const result = spawnSync(securityCommand, {
    cwd: root,
    env: process.env,
    shell: true,
    stdio: 'inherit',
    timeout: 10 * 60 * 1000,
  });
  console.log('::endgroup::');

  if (result.error) {
    console.error(`Application security gate failed to execute: ${securityCommand}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.signal) {
    console.error(`Application security gate terminated by signal ${result.signal}: ${securityCommand}`);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    console.error(`Application security gate failed with exit code ${result.status ?? 1}: ${securityCommand}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`Application security CI passed all ${commands.length} audit-free gates.`);
