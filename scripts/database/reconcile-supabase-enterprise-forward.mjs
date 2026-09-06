#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { compileForwardReconciliationManifest } from '../supabase/forward-reconciliation-control-plane.mjs';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'config', 'supabase-forward-reconciliation.json');
const DEFAULT_REPORT_PATH = join(
  ROOT,
  'docs',
  'security',
  'evidence',
  'runtime',
  'supabase-forward-reconciliation-evidence.json',
);

const EXPECTED_CHANGE_SET = '2026-09-06-final-public-release-payment-storage-hardening-v32';
const V32_PUBLIC_RELEASE_MIGRATION =
  '20260906000000_reconcile_final_public_release_payment_storage_hardening.sql';
const EXPECTED_SELECTED = [V32_PUBLIC_RELEASE_MIGRATION];
const VERIFIED_PRODUCTION_LEDGER_HEAD = '20260905075429';

function fail(message) {
  throw new Error(message);
}

function requireMarkers(source, markers, label) {
  for (const marker of markers) {
    if (!source.includes(marker)) fail(`${label} lost required marker: ${marker}`);
  }
}

function forbidMarkers(source, markers, label) {
  const normalized = source.toLowerCase();
  for (const marker of markers) {
    if (normalized.includes(marker.toLowerCase())) fail(`${label} reopened forbidden boundary: ${marker}`);
  }
}

function currentGitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function validateV32PublicReleaseMigration(source) {
  requireMarkers(source, [
    'live ledger',
    '20260905075429',
    'does not',
    'migration history',
    "to_regprocedure('app_private.has_commercial_authority(uuid)')",
    "to_regprocedure('app_private.is_org_member(uuid)')",
    "to_regprocedure('app_private.has_org_role(uuid,text[])')",
    "to_regprocedure('app_private.evidence_storage_organization_id(text)')",
    "to_regclass('public.evidence_items')",
    "'ai_fria_assessments'",
    "'ai_fria_decisions'",
    "'ai_fria_evidence'",
    "'ai_literacy_programs'",
    "'ai_literacy_courses'",
    "'ai_literacy_assignments'",
    "'ai_literacy_evidence'",
    "'ai_system_history'",
    "'vendor_review_history'",
    "'evidence_item_audit_events'",
    "'email_notification_events'",
    'as restrictive for all to authenticated',
    'using (app_private.has_commercial_authority(organization_id))',
    'with check (app_private.has_commercial_authority(organization_id))',
    'alter table public.%I force row level security',
    'Members can read organization document objects',
    'Members can upload organization document objects',
    'app_private.evidence_storage_organization_id(name)',
    'app_private.is_org_member',
    "array['owner','admin','editor','member']::text[]",
    'file_size_limit = 10485760',
    'allowed_mime_types = array[',
    'evidence_items_file_size_bytes_check',
    'evidence_items_file_mime_type_check',
    'c.convalidated',
    'unexpected direct UPDATE/DELETE policy survived for compliance-documents',
    'compliance-evidence bucket unexpectedly public',
    "notify pgrst, 'reload schema'",
  ], 'V32 final public-release payment/storage reconciliation');

  forbidMarkers(source, [
    'supabase_migrations.schema_migrations',
    'db push --include-all',
    'disable row level security',
    'grant all on public.',
    'grant all on storage.',
    'to anon',
    'drop table ',
    'truncate ',
  ], 'V32 final public-release payment/storage reconciliation');
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (config.changeSet !== EXPECTED_CHANGE_SET) {
    fail(`Unexpected reconciliation changeSet: ${String(config.changeSet)}`);
  }

  const selected = (config.migrations ?? []).map((record) => record?.filename);
  if (JSON.stringify(selected) !== JSON.stringify(EXPECTED_SELECTED)) {
    fail(`bounded selected migration set drifted: expected ${EXPECTED_SELECTED.join(', ')}`);
  }

  const gitSha = currentGitSha();
  if (!gitSha || !/^[a-f0-9]{40}$/.test(gitSha)) fail('Unable to resolve an exact git HEAD');

  const expectedHeadSha = String(process.env.EXPECTED_HEAD_SHA ?? '').trim();
  if (expectedHeadSha) {
    if (!/^[a-f0-9]{40}$/.test(expectedHeadSha)) {
      fail('EXPECTED_HEAD_SHA must be a full 40-character Git SHA');
    }
    if (gitSha !== expectedHeadSha) {
      fail(`Exact-SHA mismatch: expected ${expectedHeadSha}, assessed ${gitSha}`);
    }
  }

  const manifest = await compileForwardReconciliationManifest({
    config,
    rootDir: ROOT,
    subjectSha: expectedHeadSha || gitSha,
  });

  const v32Source = readFileSync(
    join(ROOT, 'supabase', 'migrations', V32_PUBLIC_RELEASE_MIGRATION),
    'utf8',
  );
  validateV32PublicReleaseMigration(v32Source);

  const records = manifest.migrations.map((migration, index) => ({
    position: index + 1,
    filename: migration.filename,
    timestamp: migration.version,
    bytes: migration.sizeBytes,
    sha256: migration.sha256,
  }));

  const report = {
    schema: 'risck-comply.supabase-forward-reconciliation-evidence.v1',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
    gitSha,
    expectedHeadSha: expectedHeadSha || null,
    exactShaVerified: Boolean(expectedHeadSha && gitSha === expectedHeadSha),
    changeSet: EXPECTED_CHANGE_SET,
    selectedCount: records.length,
    selectedSetSha256: manifest.selectionDigest.replace(/^sha256:/, ''),
    productionWriteAuthorized: false,
    migrationHistoryRepairAuthorized: false,
    automaticClassificationPerformed: false,
    humanDecisionRequired: true,
    productionLedgerHeadBeforeSelection: VERIFIED_PRODUCTION_LEDGER_HEAD,
    records,
  };

  const reportPath = String(process.env.SUPABASE_FORWARD_RECONCILIATION_REPORT ?? '').trim()
    || (process.argv.includes('--write') ? DEFAULT_REPORT_PATH : '');
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `selected_count=${records.length}\nselected_set_sha256=${report.selectedSetSha256}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }

  process.stdout.write(`Bounded Supabase forward reconciliation verified: ${records.length} migrations\n`);
  process.stdout.write(`Selected-set SHA-256: ${report.selectedSetSha256}\n`);
  process.stdout.write('Production write authorization: false\n');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
