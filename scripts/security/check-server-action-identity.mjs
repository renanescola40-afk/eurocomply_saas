#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const actionsDir = path.join(root, 'src', 'server', 'actions');

const failures = [];

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
];

for (const file of walk(actionsDir)) {
  const content = readFileSync(file, 'utf8');

  if (!isServerActionModule(file, content)) {
    continue;
  }

  for (const check of checks) {
    if (check.pattern.test(content)) {
      failures.push(`${relative(file)}: ${check.label}`);
    }
  }

  const usesPrivilegedTenantOperation = /createAdminClient|assertCurrentUserCan|checkDistributedRateLimit|createSignedUrl/.test(content);
  const derivesCurrentUser = /requireCurrentUser|getCurrentUser/.test(content);

  if (usesPrivilegedTenantOperation && !derivesCurrentUser) {
    failures.push(`${relative(file)}: privileged server action must derive authenticated user server-side`);
  }
}

if (failures.length > 0) {
  console.error('Server action identity checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nDo not accept caller-supplied user identity in exported server actions. Derive identity from the authenticated session inside the action and sanitize provider errors.');
  process.exit(1);
}

console.log('Server action identity checks passed.');
