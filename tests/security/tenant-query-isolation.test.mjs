import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/server', 'src/app/api', 'src/lib'];
const organizationScopedTables = [
  'documents',
  'risks',
  'vendors',
  'tasks',
  'compliance_tasks',
  'audit_events',
  'audit_logs',
  'subscriptions',
  'notifications',
  'organization_members',
  'organization_invites',
  'invitations',
  'ai_systems',
  'ai_incidents',
];
const allowedUserScopedTables = new Set(['profiles', 'users']);
const ignoredPathFragments = [
  `${path.sep}test`,
  `${path.sep}tests`,
  `${path.sep}__tests__`,
  `${path.sep}fixtures`,
  `${path.sep}mocks`,
];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) return [];
    if (ignoredPathFragments.some((fragment) => fullPath.includes(fragment))) return [];
    return [fullPath];
  });
}

function extractQueryChains(source) {
  const chains = [];
  const fromPattern = /\.from\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = fromPattern.exec(source)) != null) {
    const start = match.index;
    const nextFrom = source.slice(start + 6).search(/\.from\(\s*['"]/);
    const end = nextFrom === -1 ? Math.min(source.length, start + 1400) : start + 6 + nextFrom;
    chains.push({ table: match[1], source: source.slice(start, end) });
  }
  return chains;
}

function hasOrganizationGuard(chain) {
  return /\.eq\(\s*['"]organization_id['"]/.test(chain)
    || /\.match\(\s*\{[^}]*organization_id\s*:/.test(chain)
    || /requireOrganizationAccess|requireOrg|assertOrg|assertOrganization|hasOrg|organizationId/.test(chain);
}

function hasOnlyUserGuard(chain) {
  return /\.eq\(\s*['"]user_id['"]/.test(chain) && !hasOrganizationGuard(chain);
}

describe('tenant query isolation', () => {
  it('does not query organization-scoped tables with only user_id guards', () => {
    const violations = [];
    for (const file of roots.flatMap(listFiles)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const chain of extractQueryChains(source)) {
        if (!organizationScopedTables.includes(chain.table)) continue;
        if (allowedUserScopedTables.has(chain.table)) continue;
        if (hasOnlyUserGuard(chain.source)) {
          violations.push(`${file}: ${chain.table} query uses user_id without organization_id`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps API routes behind organization-aware permission helpers', () => {
    const apiFiles = listFiles('src/app/api');
    const mutatingRouteViolations = [];

    for (const file of apiFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const mutatesTenantData = organizationScopedTables.some((table) => source.includes(`.from('${table}')`) || source.includes(`.from("${table}")`));
      const exportsMutatingMethod = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(source);
      const hasPermissionGuard = /requireOrganizationAccess|requireOrg|assertOrg|assertOrganization|hasOrg|organizationId|organization_id/.test(source);

      if (mutatesTenantData && exportsMutatingMethod && !hasPermissionGuard) {
        mutatingRouteViolations.push(`${file}: mutating API route touches tenant data without an organization-aware guard`);
      }
    }

    expect(mutatingRouteViolations).toEqual([]);
  });
});
