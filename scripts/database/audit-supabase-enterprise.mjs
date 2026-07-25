#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const OUTPUT = join(ROOT, 'docs', 'security', 'evidence', 'runtime', 'supabase-enterprise-assurance.json');
const strict = process.argv.includes('--strict');
const write = process.argv.includes('--write') || process.env.GITHUB_ACTIONS === 'true';

// Findings that pre-date the Supabase Enterprise Assurance gate. They remain
// visible in evidence, but only newly introduced hard failures block CI.
const LEGACY_HARD_FAILURE_BASELINE = new Set([
  'migration-name:supabase/migrations/20260605_compliance_evidence.sql',
  'migration-name:supabase/migrations/20260605_evidence_vault.sql',
  'migration-name:supabase/migrations/20260605_findings_tasks.sql',
  'migration-name:supabase/migrations/20260605_gap_analysis_user_scoped_patch.sql',
  'migration-name:supabase/migrations/20260605_gap_analysis.sql',
  'migration-name:supabase/migrations/20260610_ai_governance_inventory.sql',
  'migration-name:supabase/migrations/20260610_ai_incident_register.sql',
  'migration-name:supabase/migrations/20260610_billing_stripe_sync.sql',
  'migration-name:supabase/migrations/20260610_public_launch_readiness.sql',
  'migration-name:supabase/migrations/20260612_audit_event_hash_chain.sql',
  'migration-name:supabase/migrations/20260612_intelligence_tables.sql',
  'migration-name:supabase/migrations/20260612_seed_intelligence_items.sql',
  'migration-name:supabase/migrations/20260613_audit_event_chained_rpc.sql',
  'migration-name:supabase/migrations/20260613_organization_add_ons.sql',
  'migration-name:supabase/migrations/20260619_multi_tenant_rls_hardening.sql',
  'duplicate-timestamp:supabase/migrations/20260620120000_enterprise_multi_tenant_rls_final_lock.sql',
  'duplicate-timestamp:supabase/migrations/20260623120000_step_up_challenge_store.sql',
  'duplicate-timestamp:supabase/migrations/20260626120000_org_billing_entitlements.sql',
  'duplicate-timestamp:supabase/migrations/20260629113000_onboarding_activation_runs_rls_helper.sql',
  'duplicate-timestamp:supabase/migrations/20260706103000_ai_system_relationship_fields.sql',
  'duplicate-timestamp:supabase/migrations/20260719224500_enforce_organization_invite_creator_scope.sql',
  'duplicate-timestamp:supabase/migrations/20260720190000_eu_ai_act_governance_lifecycle.sql',
  'duplicate-timestamp:supabase/migrations/20260721200000_prohibited_practices_governance.sql',
  'duplicate-timestamp:supabase/migrations/20260723223000_qualified_review_consolidated.sql',
  'duplicate-timestamp:supabase/migrations/20260724001000_qualified_review_decision_controls.sql',
  'duplicate-timestamp:supabase/migrations/20260724103000_enterprise_seat_concurrency.sql',
  'duplicate-timestamp:supabase/migrations/20260724103000_qualified_review_api_operations.sql',
]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

function findingKey(finding) {
  return `${finding.rule}:${finding.path ?? finding.table ?? ''}`;
}

const files = walk(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

const hardFailures = [];
const reviewRequired = [];
const timestamps = new Map();
const migrationRecords = [];
const tenantTables = new Set();
const enabledRlsTables = new Set();
const forcedRlsTables = new Set();
const policiesByTable = new Map();

for (const absolutePath of files) {
  const path = relative(ROOT, absolutePath).replaceAll('\\', '/');
  const name = absolutePath.split(/[\\/]/).pop() ?? path;
  const source = readFileSync(absolutePath, 'utf8');
  const normalized = source.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const timestampMatch = name.match(/^(\d{14})_[a-z0-9][a-z0-9_-]*\.sql$/i);

  if (!timestampMatch) {
    hardFailures.push({ path, rule: 'migration-name', detail: 'Expected YYYYMMDDHHMMSS_description.sql.' });
  } else {
    const timestamp = timestampMatch[1];
    const existing = timestamps.get(timestamp);
    if (existing) hardFailures.push({ path, rule: 'duplicate-timestamp', detail: `Timestamp also used by ${existing}.` });
    timestamps.set(timestamp, path);
  }

  const destructiveRules = [
    ['drop-table', /\bdrop\s+table\b/gi],
    ['drop-schema', /\bdrop\s+schema\b/gi],
    ['truncate', /\btruncate\b/gi],
    ['drop-column', /\bdrop\s+column\b/gi],
    ['alter-column-type', /\balter\s+column\b[\s\S]{0,120}\btype\b/gi],
  ];
  const destructive = [];
  for (const [rule, pattern] of destructiveRules) {
    for (const match of normalized.matchAll(pattern)) destructive.push({ rule, line: lineOf(source, match.index ?? 0) });
  }
  if (destructive.length > 0 && !/enterprise-migration-review:\s*approved/i.test(source)) {
    reviewRequired.push({ path, rule: 'destructive-change', detail: destructive });
  }

  for (const match of normalized.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([^\s(]+)/gi)) {
    const start = match.index ?? 0;
    const body = normalized.slice(start, start + 5000);
    if (/security\s+definer/i.test(body) && !/set\s+search_path\s*=/i.test(body)) {
      hardFailures.push({ path, rule: 'security-definer-search-path', detail: `Function ${match[1]} uses SECURITY DEFINER without SET search_path.` });
    }
  }

  for (const match of normalized.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)) {
    const table = match[1].toLowerCase();
    const segment = normalized.slice(match.index ?? 0, (match.index ?? 0) + 8000);
    if (/\borganization_id\b/i.test(segment) || /\bworkspace_id\b/i.test(segment) || /\btenant_id\b/i.test(segment)) tenantTables.add(table);
  }
  for (const match of normalized.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+enable\s+row\s+level\s+security/gi)) enabledRlsTables.add(match[1].toLowerCase());
  for (const match of normalized.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+force\s+row\s+level\s+security/gi)) forcedRlsTables.add(match[1].toLowerCase());
  for (const match of normalized.matchAll(/create\s+policy\s+[^\s]+\s+on\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)) {
    const table = match[1].toLowerCase();
    policiesByTable.set(table, (policiesByTable.get(table) ?? 0) + 1);
  }

  migrationRecords.push({
    path,
    bytes: Buffer.byteLength(source),
    sha256: sha256(source),
    timestamp: timestampMatch?.[1] ?? null,
    destructiveReviewRequired: destructive.length > 0,
  });
}

for (const table of [...tenantTables].sort()) {
  if (!enabledRlsTables.has(table)) hardFailures.push({ table, rule: 'tenant-table-rls', detail: 'Tenant-scoped table has no repository-visible ENABLE ROW LEVEL SECURITY.' });
  if (!forcedRlsTables.has(table)) reviewRequired.push({ table, rule: 'tenant-table-force-rls', detail: 'Tenant-scoped table has no repository-visible FORCE ROW LEVEL SECURITY.' });
  if (!policiesByTable.has(table)) reviewRequired.push({ table, rule: 'tenant-table-policy', detail: 'Tenant-scoped table has no repository-visible policy.' });
}

const newHardFailures = hardFailures.filter((finding) => !LEGACY_HARD_FAILURE_BASELINE.has(findingKey(finding)));
const legacyHardFailures = hardFailures.filter((finding) => LEGACY_HARD_FAILURE_BASELINE.has(findingKey(finding)));
const status = newHardFailures.length > 0 ? 'Blocked' : reviewRequired.length > 0 || legacyHardFailures.length > 0 ? 'ReviewRequired' : 'Complete';

const report = {
  schema: 'eurocomply.supabase-enterprise-assurance.v1',
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
  commitSha: process.env.GITHUB_SHA ?? null,
  status,
  summary: {
    migrations: files.length,
    tenantTables: tenantTables.size,
    rlsEnabledTables: enabledRlsTables.size,
    forcedRlsTables: forcedRlsTables.size,
    hardFailures: hardFailures.length,
    newHardFailures: newHardFailures.length,
    legacyHardFailures: legacyHardFailures.length,
    reviewRequired: reviewRequired.length,
  },
  controls: {
    deterministicMigrationNames: true,
    duplicateTimestampDetection: true,
    immutableMigrationDigests: true,
    destructiveChangeReviewMarker: 'enterprise-migration-review: approved',
    securityDefinerSearchPathRequired: true,
    tenantRlsInventory: true,
    legacyFindingBaseline: true,
    productionApplicationClaimed: false,
    backupRestoreClaimed: false,
  },
  hardFailures,
  newHardFailures,
  legacyHardFailures,
  reviewRequired,
  migrations: migrationRecords,
};

if (write) {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`Supabase Enterprise Assurance: ${report.status}`);
console.log(JSON.stringify(report.summary));
if (newHardFailures.length) console.error(JSON.stringify(newHardFailures, null, 2));
if (legacyHardFailures.length) console.warn(`Legacy hard-failure baseline: ${legacyHardFailures.length}`);
if (reviewRequired.length) console.warn(JSON.stringify(reviewRequired, null, 2));
if (strict && newHardFailures.length > 0) process.exitCode = 1;
