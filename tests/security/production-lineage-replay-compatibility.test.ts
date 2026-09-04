import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260904065919_reconcile_ai_governance_runtime_schema_20260904.sql';
const bridgePath = 'scripts/recovery/run-reviewed-ephemeral-schema-boundary.mjs';

const migrationBytes = readFileSync(migrationPath);
const migration = migrationBytes.toString('utf8');
const bridge = readFileSync(bridgePath, 'utf8');

const productionBackfill = `update public.audit_logs
set actor_user_id = coalesce(actor_user_id, actor_id, user_id)
where actor_user_id is null;`;

describe('Production-lineage disposable replay compatibility', () => {
  it('preserves the exact already-live migration bytes', () => {
    expect(createHash('sha256').update(migrationBytes).digest('hex'))
      .toBe('bceedb8d738c8bda3cb07e9f8849e85a670ea4439ffd669747fb630d980e042d');
    expect(migration).toContain(productionBackfill);
    expect(migration).not.toContain('Disposable schema-effect replay only: clean lineage created audit_logs');
    expect(migration).not.toContain('set actor_user_id = actor_user_id\nwhere false;');
  });

  it('replaces only the Production data-backfill statement during disposable clean-schema replay', () => {
    expect(bridge).toContain('productionLineageCompatibilityRules');
    expect(bridge).toContain('20260904065919_reconcile_ai_governance_runtime_schema_20260904.sql');
    expect(bridge).toContain('coalesce(actor_user_id, actor_id, user_id)');
    expect(bridge).toContain('set actor_user_id = actor_user_id');
    expect(bridge).toContain('where false;');
    expect(bridge).toContain('stageProductionLineageCompatibility(productionLineageCompatibilityItems)');
    expect(bridge).toContain("restoreHistoricalBytes(productionLineageCompatibilityItems, 'production-lineage-compatible')");
  });

  it('keeps the compatibility boundary explicit and countable without changing canonical migration history', () => {
    expect(bridge).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_PRODUCTION_LINEAGE_COMPAT_FILE_COUNT'");
    expect(bridge).toContain('productionLineageCompatibilityRules.length');
  });
});
