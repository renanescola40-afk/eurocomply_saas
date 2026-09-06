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

const EXPECTED_CHANGE_SET = '2026-09-06-billing-business-plan-isolation-v36';
const V32_PUBLIC_RELEASE_MIGRATION =
  '20260906000000_reconcile_final_public_release_payment_storage_hardening.sql';
const BILLING_AI_SYSTEM_QUOTA_MIGRATION =
  '20260906003000_billing_ai_system_commercial_quota.sql';
const BILLING_MEMBER_CAPACITY_MIGRATION =
  '20260906003500_billing_self_serve_member_capacity.sql';
const BILLING_DOCUMENT_STORAGE_QUOTA_MIGRATION =
  '20260906004000_billing_document_storage_quota.sql';
const BILLING_ENTITLEMENT_CATALOG_TRUTH_MIGRATION =
  '20260906004500_billing_entitlement_catalog_truth.sql';
const BILLING_INITIAL_CHECKOUT_SINGLEFLIGHT_MIGRATION =
  '20260906005000_billing_initial_checkout_singleflight.sql';
const BILLING_COMPLETED_CHECKOUT_AUTHORITY_GUARD_MIGRATION =
  '20260906006000_billing_completed_checkout_authority_guard.sql';
const BILLING_PROFESSIONAL_PLAN_ISOLATION_MIGRATION =
  '20260906006500_billing_professional_task_plan_isolation.sql';
const BILLING_BUSINESS_PLAN_ISOLATION_MIGRATION =
  '20260906006600_billing_business_feature_plan_isolation.sql';
const EXPECTED_SELECTED = [
  V32_PUBLIC_RELEASE_MIGRATION,
  BILLING_AI_SYSTEM_QUOTA_MIGRATION,
  BILLING_MEMBER_CAPACITY_MIGRATION,
  BILLING_DOCUMENT_STORAGE_QUOTA_MIGRATION,
  BILLING_ENTITLEMENT_CATALOG_TRUTH_MIGRATION,
  BILLING_INITIAL_CHECKOUT_SINGLEFLIGHT_MIGRATION,
  BILLING_COMPLETED_CHECKOUT_AUTHORITY_GUARD_MIGRATION,
  BILLING_PROFESSIONAL_PLAN_ISOLATION_MIGRATION,
  BILLING_BUSINESS_PLAN_ISOLATION_MIGRATION,
];
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

function validateCompletedCheckoutAuthorityGuard(source) {
  requireMarkers(source, [
    "v_existing.status = 'open' or v_existing.lease_expires_at > now()",
    "to_regprocedure('app_private.has_commercial_authority(uuid)')",
    "new.status = 'processed'",
    'new.livemode is true',
    "new.type in ('customer.subscription.created','customer.subscription.updated')",
    'app_private.has_commercial_authority(new.organization_id)',
    'delete from public.billing_checkout_attempts attempt',
    'where app_private.has_commercial_authority(attempt.organization_id)',
    'clear_initial_checkout_after_live_subscription_processed on public.stripe_events_processed',
  ], 'V34 completed Checkout subscription-authority guard');

  forbidMarkers(source, [
    "new.type = 'checkout.session.completed'",
    'disable row level security',
    'grant all on public.',
    'to anon',
    'truncate ',
  ], 'V34 completed Checkout subscription-authority guard');
}

function validateProfessionalPlanIsolation(source) {
  requireMarkers(source, [
    'app_private.has_minimum_commercial_plan',
    "when 'essential' then 1",
    "when 'growth' then 2",
    "when 'business' then 3",
    'alter table public.compliance_tasks force row level security',
    'alter table public.risks force row level security',
    'alter table public.vendors force row level security',
    'alter table public.vendor_review_history force row level security',
    'restrict_compliance_tasks_organization_professional_plan',
    'restrict_risks_professional_plan',
    'restrict_vendors_professional_plan',
    'restrict_vendor_review_history_professional_plan',
    'as restrictive',
    "app_private.has_minimum_commercial_plan(organization_id, 'professional')",
    'organization_id is null',
    "notify pgrst, 'reload schema'",
  ], 'V35 Professional plan-isolation guard');

  forbidMarkers(source, [
    'disable row level security',
    'grant all on public.',
    'grant all on storage.',
    'to anon',
    'drop table ',
    'truncate ',
  ], 'V35 Professional plan-isolation guard');
}

function validateBusinessPlanIsolation(source) {
  requireMarkers(source, [
    "to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)')",
    "'ai_literacy_programs'",
    "'ai_literacy_courses'",
    "'ai_literacy_assignments'",
    "'ai_literacy_evidence'",
    "'ai_qms_systems'",
    "'ai_qms_controls'",
    "'ai_qms_nonconformities'",
    "'ai_qms_audits'",
    "'ai_qms_management_reviews'",
    "'ai_qms_decisions'",
    "as restrictive for all to authenticated",
    "app_private.has_minimum_commercial_plan(organization_id, ''business'')",
    'alter table public.%I force row level security',
    "notify pgrst, 'reload schema'",
  ], 'V36 Business plan-isolation guard');

  forbidMarkers(source, [
    'disable row level security',
    'grant all on public.',
    'grant all on storage.',
    'to anon',
    'drop table ',
    'truncate ',
  ], 'V36 Business plan-isolation guard');
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

  const checkoutAuthoritySource = readFileSync(
    join(ROOT, 'supabase', 'migrations', BILLING_COMPLETED_CHECKOUT_AUTHORITY_GUARD_MIGRATION),
    'utf8',
  );
  validateCompletedCheckoutAuthorityGuard(checkoutAuthoritySource);

  const professionalIsolationSource = readFileSync(
    join(ROOT, 'supabase', 'migrations', BILLING_PROFESSIONAL_PLAN_ISOLATION_MIGRATION),
    'utf8',
  );
  validateProfessionalPlanIsolation(professionalIsolationSource);

  const businessIsolationSource = readFileSync(
    join(ROOT, 'supabase', 'migrations', BILLING_BUSINESS_PLAN_ISOLATION_MIGRATION),
    'utf8',
  );
  validateBusinessPlanIsolation(businessIsolationSource);

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
