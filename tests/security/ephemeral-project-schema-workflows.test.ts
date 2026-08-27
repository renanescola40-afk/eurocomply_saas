import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DUPLICATE_REVIEW_REFERENCE,
  INVALID_REVIEW_REFERENCE,
  KNOWN_DUPLICATE_MIGRATION_GROUPS,
  SCHEMA_EFFECT_REPLACED_MIGRATIONS,
  UNAPPLIED_LEGACY_MIGRATIONS,
  UNRESOLVED_INVALID_MIGRATIONS,
  inspectMigrationReplayDebt,
} from '../../scripts/recovery/run-ephemeral-project-schema-replay.mjs';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const replay = fs.readFileSync('scripts/recovery/run-ephemeral-project-schema-replay.mjs', 'utf8');
const reviewedBoundaryBridge = fs.readFileSync(
  'scripts/recovery/run-reviewed-ephemeral-schema-boundary.mjs',
  'utf8',
);
const duplicateReview = fs.readFileSync(DUPLICATE_REVIEW_REFERENCE, 'utf8');
const invalidReview = fs.readFileSync(INVALID_REVIEW_REFERENCE, 'utf8');
const batchNReview = fs.readFileSync(
  'docs/security/evidence/human-review/supabase-migration-mega-batch-n.md',
  'utf8',
);
const groupAccessReconciliation = fs.readFileSync(
  'supabase/migrations/20260724001000_enterprise_group_access_reconciliation.sql',
  'utf8',
);
const ephemeralSmoke = fs.readFileSync('.github/workflows/ephemeral-supabase-project-smoke.yml', 'utf8');
const addOnReplacement = fs.readFileSync(
  'supabase/migrations/20260813124224_reconcile_organization_add_ons.sql',
  'utf8',
);
const finalRlsReplacementFiles = [
  'supabase/migrations/20260619103000_complete_multi_tenant_rls_policies.sql',
  'supabase/migrations/20260629110000_enterprise_tenant_rls_cleanup_indexes.sql',
  'supabase/migrations/20260807091341_reconcile_membership_rls_and_remove_permissive_bypasses.sql',
  'supabase/migrations/20260809135000_enterprise_core_runtime_schema_reconciliation.sql',
];
const finalRlsReplacements = finalRlsReplacementFiles.map((path) => fs.readFileSync(path, 'utf8'));
const schemaWorkflows = [
  '.github/workflows/final-technical-controls-proof.yml',
  '.github/workflows/data-governance-runtime-proof.yml',
  '.github/workflows/incident-continuity-runtime-proof.yml',
  '.github/workflows/procurement-trust-runtime-proof.yml',
  '.github/workflows/enterprise-integrations-runtime-proof.yml',
].map((path) => ({ path, source: fs.readFileSync(path, 'utf8') }));
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');

const duplicateVersions = Object.keys(KNOWN_DUPLICATE_MIGRATION_GROUPS).sort();
const duplicateFiles = Object.values(KNOWN_DUPLICATE_MIGRATION_GROUPS).flat();
const blockedQualifiedReviewDuplicateFiles = [
  '20260723223000_qualified_review_consolidated.sql',
  '20260724001000_qualified_review_decision_controls.sql',
  '20260724103000_qualified_review_api_operations.sql',
];

describe('exact-SHA disposable project schema workflows', () => {
  it('replays a prepared temporary migration tree through pinned Supabase CLI', () => {
    expect(manager).toContain("join(process.cwd(), 'supabase', 'migrations')");
    expect(manager).toContain('cpSync(sourceDir, targetDir, { recursive: true, force: true })');
    expect(manager).toContain("'db', 'reset', '--local', '--no-seed'");
    expect(manager).toContain('verifyExactShaMigrations(dbUrl, expectedVersions)');
  });

  it('binds duplicate replay to the exact 16 owner-reviewed collision groups', () => {
    const debt = inspectMigrationReplayDebt('supabase/migrations');
    expect(debt.duplicateVersions.map(({ version }) => version)).toEqual(duplicateVersions);
    expect(debt.duplicateVersions).toHaveLength(16);
    expect(duplicateFiles).toHaveLength(39);
    for (const { version, files } of debt.duplicateVersions) {
      expect(files).toEqual([
        ...KNOWN_DUPLICATE_MIGRATION_GROUPS[version as keyof typeof KNOWN_DUPLICATE_MIGRATION_GROUPS],
      ].sort());
      expect(duplicateReview).toContain(`version \`${version}\``);
      for (const file of files) expect(duplicateReview).toContain(`\`${file}\``);
    }
  });

  it('keeps legacy and unresolved invalid history excluded from disposable execution', () => {
    expect(UNAPPLIED_LEGACY_MIGRATIONS).toHaveLength(5);
    expect(UNRESOLVED_INVALID_MIGRATIONS).toEqual(['20260619_multi_tenant_rls_hardening.sql']);
    expect(invalidReview).toContain('`20260619_multi_tenant_rls_hardening.sql`');
    expect(invalidReview).toContain('REQUIRES_SPLIT_REVIEW');
    expect(replay).toContain("const UNAPPLIED_LEGACY_VERSION = '20260605'");
    expect(replay).toContain('for (const canonicalName of UNRESOLVED_INVALID_MIGRATIONS)');
  });

  it('suppresses qualified-review duplicate schema effects only behind reviewed prerequisite evidence', () => {
    expect(blockedQualifiedReviewDuplicateFiles).toHaveLength(3);
    expect(duplicateReview).toContain('REQUIRES_SPLIT_REVIEW');
    expect(batchNReview).toContain('N7 | `20260723170000_qualified_review_operations_platform.sql`');
    expect(batchNReview).toContain('public.is_organization_member(uuid)');
    expect(batchNReview).toContain('PREREQUISITE_BLOCKED');
    for (const file of blockedQualifiedReviewDuplicateFiles) {
      expect(duplicateReview).toContain(`\`${file}\``);
      expect(reviewedBoundaryBridge).toContain(file);
    }
    expect(reviewedBoundaryBridge).toContain('stageBlockedDuplicateSchemaEffects');
    expect(reviewedBoundaryBridge).toContain('restoreHistoricalBytes');
    expect(reviewedBoundaryBridge).toContain(
      "appendGithubEnv('RECOVERY_EPHEMERAL_PREREQUISITE_BLOCKED_DUPLICATE_FILE_COUNT'",
    );
    expect(ephemeralSmoke).toContain(
      'RECOVERY_EPHEMERAL_PREREQUISITE_BLOCKED_DUPLICATE_FILE_COUNT\" = \"3',
    );
  });

  it('quotes the reserved current_role output only for the disposable I-DUP-14 replay', () => {
    expect(duplicateReview).toContain('### I-DUP-14');
    expect(duplicateReview).toContain('`20260724001000_enterprise_group_access_reconciliation.sql`');
    expect(groupAccessReconciliation).toContain(
      'create or replace function public.list_enterprise_group_access_reconciliation_candidates(',
    );
    expect(groupAccessReconciliation).toContain('  current_role text,');
    expect(reviewedBoundaryBridge).toContain('stageSyntaxCompatibility');
    expect(reviewedBoundaryBridge).toContain("invalid: '  current_role text,'");
    expect(reviewedBoundaryBridge).toContain("replacement: '  \"current_role\" text,'");
    expect(reviewedBoundaryBridge).toContain(
      "appendGithubEnv('RECOVERY_EPHEMERAL_SYNTAX_COMPAT_FILE_COUNT'",
    );
    expect(ephemeralSmoke).toContain('RECOVERY_EPHEMERAL_SYNTAX_COMPAT_FILE_COUNT\" = \"1');
  });

  it('replaces invalid historical schema effects only through explicit later canonical migrations', () => {
    expect(SCHEMA_EFFECT_REPLACED_MIGRATIONS).toEqual({
      '20260613_organization_add_ons.sql': [
        'supabase/migrations/20260813124224_reconcile_organization_add_ons.sql',
      ],
      '20260620120000_enterprise_multi_tenant_rls_final_lock.sql': finalRlsReplacementFiles,
    });

    expect(addOnReplacement).toContain('create table if not exists public.organization_add_ons');
    expect(addOnReplacement).toContain('force row level security');
    expect(addOnReplacement).toContain('revoke insert, update, delete, truncate, references, trigger');
    expect(addOnReplacement).toContain('grant select on table public.organization_add_ons to authenticated');
    expect(addOnReplacement).toContain('grant all on table public.organization_add_ons to service_role');
    expect(addOnReplacement).toContain('set search_path = pg_catalog');
    expect(addOnReplacement).not.toContain('create policy if not exists');
    expect(addOnReplacement).not.toContain('create trigger if not exists');

    expect(finalRlsReplacements[0]).toContain('Complete multi-tenant RLS policy coverage');
    expect(finalRlsReplacements[1]).toContain('Enterprise tenant RLS cleanup');
    expect(finalRlsReplacements[2]).toContain('app_private.is_org_member');
    expect(finalRlsReplacements[2]).toContain('A permissive tenant RLS bypass policy remains after cleanup');
    expect(finalRlsReplacements[3]).toContain('rls_tasks_select_member');
    expect(finalRlsReplacements[3]).toContain('app_private.has_org_role');
  });

  it('stages only 32 duplicate files and preserves migration-history fail-closed status', () => {
    expect(
      duplicateFiles.length
        - UNAPPLIED_LEGACY_MIGRATIONS.length
        - Object.keys(SCHEMA_EFFECT_REPLACED_MIGRATIONS).length,
    ).toBe(32);
    expect(replay).toContain('allocateReplayVersions(version, executableFiles.length, occupied)');
    expect(replay).toContain('copyFileSync(item.backupPath, item.replayPath)');
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REPLACED_FILE_COUNT'");
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL', 'false')");
    expect(replay).toContain('replay timestamps are not migration-history repair evidence');
    expect(ephemeralSmoke).toContain('RECOVERY_EPHEMERAL_REPLAY_STAGED_FILE_COUNT\" = \"32');
    expect(ephemeralSmoke).toContain('RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REPLACED_FILE_COUNT\" = \"2');
  });

  it('revalidates and hardens Docker bindings after project schema reset', () => {
    const resetIndex = manager.indexOf("'db', 'reset', '--local', '--no-seed'");
    const postResetContainerIndex = manager.indexOf('findDatabaseContainer(projectId)', resetIndex);
    const postResetFirewallIndex = manager.indexOf('hardenWildcardBindings(containerName, projectId, hostPort)', resetIndex);
    const migrationVerifyIndex = manager.indexOf('verifyExactShaMigrations(dbUrl, expectedVersions)', resetIndex);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(postResetContainerIndex).toBeGreaterThan(resetIndex);
    expect(postResetFirewallIndex).toBeGreaterThan(postResetContainerIndex);
    expect(migrationVerifyIndex).toBeGreaterThan(postResetFirewallIndex);
    expect(manager).toContain('if (ruleExists(binary, args)) return false');
  });

  it('uses the reviewed disposable schema-effect replay and cleanup in every schema-only proof', () => {
    for (const { path, source } of schemaWorkflows) {
      expect(source, path).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
      expect(source, path).toContain('run-reviewed-ephemeral-schema-boundary-v4.mjs');
      expect(source, path).not.toContain('run-ephemeral-project-schema-replay.mjs');
      expect(source, path).toContain('manage-ephemeral-recovery-database.mjs stop');
      expect(source, path).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
      expect(source, path).toContain('persist-credentials: false');
    }
  });

  it('keeps Production recovery on the provider-managed restore boundary without local project replay', () => {
    expect(recovery).toContain('verify-supabase-provider-managed-restore.mjs verify');
    expect(recovery).toContain('bind-backup-restore-migration-ledger.mjs');
    expect(recovery).toContain('destroy-supabase-provider-managed-restore.mjs');
    expect(recovery).not.toContain('manage-ephemeral-recovery-database.mjs start');
    expect(recovery).not.toContain('run-ephemeral-project-schema-replay.mjs');
    expect(recovery).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
    expect(recovery).not.toContain('RECOVERY_SOURCE_DATABASE_URL');
    expect(ephemeralSmoke).toContain('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL');
  });
});
