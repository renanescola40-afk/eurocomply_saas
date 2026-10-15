#!/usr/bin/env node
// Zero-cost, offline source dependency gate. Not an attestation of a migrated database.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LEGAL_ASSURANCE_MIGRATIONS = Object.freeze([
  '20260901002000_legal_assurance_enterprise_v1.sql',
  '20260901003000_legal_assurance_counsel_gates.sql',
  '20260901004000_legal_assurance_package_and_information_atomic.sql',
  '20260901004100_legal_assurance_decision_and_remediation_atomic.sql',
  '20260901005000_legal_assurance_private_artifacts.sql',
]);

const requiredBaseTables = [
  'law_firms', 'counsel_profiles', 'legal_review_requests',
  'legal_review_packages', 'legal_review_decisions', 'legal_review_artifacts',
];
const expectedBrowserDenyPolicies = [
  'No direct legal assurance artifact reads',
  'No direct legal assurance artifact uploads',
  'No direct legal assurance artifact updates',
  'No direct legal assurance artifact deletes',
];

export function checkLegalAssuranceSourceChain(root = process.cwd()) {
  const failures = [];
  const contents = new Map();
  const report = { scope: 'SOURCE_ONLY', runtimeSchemaVerified: false, migrations: LEGAL_ASSURANCE_MIGRATIONS.length };
  const fail = (code) => failures.push(code);

  for (const filename of LEGAL_ASSURANCE_MIGRATIONS) {
    const path = join(root, 'supabase', 'migrations', filename);
    if (!existsSync(path)) {
      fail(`missing_migration:${filename}`);
      continue;
    }
    const source = readFileSync(path, 'utf8');
    contents.set(filename, source);
    const withoutCommentLines = source.split('\n')
      .filter((line) => !/^\s*--/.test(line)).join('\n').trim();
    if (!/^begin\s*;/i.test(withoutCommentLines) || !/commit\s*;\s*$/i.test(withoutCommentLines)) {
      fail(`nontransactional_migration:${filename}`);
    }
  }
  const base = contents.get(LEGAL_ASSURANCE_MIGRATIONS[0]) ?? '';
  for (const table of requiredBaseTables) {
    if (!new RegExp(`\\bcreate\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`, 'i').test(base)) {
      fail(`base_table_definition_missing:${table}`);
    }
  }
  for (const dependency of ['organizations', 'organization_members', 'ai_systems']) {
    if (!base.includes(`to_regclass('public.${dependency}')`)) {
      fail(`base_precondition_missing:${dependency}`);
    }
  }
  const artifacts = contents.get(LEGAL_ASSURANCE_MIGRATIONS[4]) ?? '';
  for (const dependency of ['legal_review_artifacts', 'legal_review_decisions', 'legal_review_requests', 'counsel_profiles']) {
    if (!artifacts.includes(`to_regclass('public.${dependency}')`)) {
      fail(`artifact_precondition_missing:${dependency}`);
    }
  }
  if (!/insert\s+into\s+storage\.buckets/i.test(artifacts) ||
      !artifacts.includes("'legal-assurance-artifacts'") ||
      !/public\s*=\s*false/i.test(artifacts)) {
    fail('private_legal_artifact_bucket_missing');
  }
  // Assess each required statement separately. A single denying policy cannot
  // compensate for another permissive policy: RLS permissive policies OR together.
  // SQL comments are not executable policy definitions.
  const activeArtifactSql = artifacts
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*--[^\n]*$/gm, ' ');
  const legalStoragePolicies = [
    { name: expectedBrowserDenyPolicies[0], operation: 'select', checks: ['using'] },
    { name: expectedBrowserDenyPolicies[1], operation: 'insert', checks: ['with\\s+check'] },
    { name: expectedBrowserDenyPolicies[2], operation: 'update', checks: ['using', 'with\\s+check'] },
    { name: expectedBrowserDenyPolicies[3], operation: 'delete', checks: ['using'] },
  ];
  for (const { name, operation, checks } of legalStoragePolicies) {
    const statement = new RegExp(
      `\\bcreate\\s+policy\\s+"${name}"\\s+on\\s+storage\\.objects\\s+for\\s+${operation}\\s+to\\s+authenticated\\b([\\s\\S]*?);`,
      'i',
    ).exec(activeArtifactSql);
    if (!statement) {
      fail(`missing_browser_deny_policy:${name}`);
      continue;
    }
    for (const clause of checks) {
      const deny = new RegExp(
        `${clause}\\s*\\(\\s*bucket_id\\s*=\\s*'legal-assurance-artifacts'\\s+and\\s+false\\s*\\)`,
        'i',
      );
      if (!deny.test(statement[1])) fail(`browser_storage_deny_predicate_missing:${name}:${clause}`);
    }
  }
  if (!artifacts.includes('app_private.enforce_legal_decision_artifact_reference()') ||
      !artifacts.includes('legal_review_decision_artifact_reference_guard')) {
    fail('artifact_reference_trigger_guard_missing');
  }
  if (!/revoke\s+all\s+on\s+function\s+app_private\.enforce_legal_decision_artifact_reference\(\)/i.test(artifacts)) {
    fail('artifact_guard_privilege_revoke_missing');
  }
  const core = join(root, 'src/server/legal-assurance/core.ts');
  if (!existsSync(core)) fail('legal_feature_flag_core_missing');
  else {
    const source = readFileSync(core, 'utf8');
    if (!source.includes("LEGAL_ASSURANCE_ENABLED") ||
        !/isLegalAssuranceEnabled\(env: Environment = process\.env\)/.test(source) ||
        !/env\[LEGAL_ASSURANCE_ENV_KEY\]\?\.trim\(\)\.toLowerCase\(\) === 'true'/.test(source)) {
      fail('legal_feature_flag_default_off_not_proven');
    }
  }
  return { ...report, status: failures.length ? 'NO_GO_SOURCE' : 'PASS_SOURCE_ONLY', failures };
}

const cli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (cli) {
  const result = checkLegalAssuranceSourceChain();
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'PASS_SOURCE_ONLY') process.exitCode = 1;
}
