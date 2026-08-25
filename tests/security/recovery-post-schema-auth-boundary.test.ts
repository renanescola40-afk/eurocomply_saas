import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const exercise = readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');

describe('recovery post-schema managed Auth boundary', () => {
  it('restores dynamically inventoried application schemas without dropping mixed extension hosts', () => {
    expect(exercise).toContain('function readApplicationSchemas(connection)');
    expect(exercise).toContain("n.nspname not in ('auth','extensions','graphql','graphql_public','realtime','storage','supabase_migrations','vault')");
    expect(exercise).toContain("pg_get_userbyid(n.nspowner) not like 'supabase_%'");
    expect(exercise).not.toContain('not exists (select 1 from pg_extension e where e.extnamespace = n.oid)');
    expect(exercise).toContain("schemas.includes('public')");
    expect(exercise).toContain('const applicationSchemaCsv = applicationSchemas.join(\',\')');
    expect(exercise).toContain("'--schema', applicationSchemaCsv");
    expect(exercise).not.toContain("'--schema', 'public,app_private'");
  });

  it('splits application schema replay from Production data replay', () => {
    const schemaRestore = exercise.indexOf("failurePhase = 'application_schema_restore'");
    const authRebind = exercise.indexOf("failurePhase = 'managed_auth_post_schema_rebind'");
    const dataDump = exercise.indexOf("failurePhase = 'data_dump'");
    const dataRestore = exercise.indexOf("failurePhase = 'isolated_restore'");

    expect(schemaRestore).toBeGreaterThan(-1);
    expect(authRebind).toBeGreaterThan(schemaRestore);
    expect(dataDump).toBeGreaterThan(authRebind);
    expect(dataRestore).toBeGreaterThan(dataDump);
    expect(exercise).toContain('restoreApplicationSchemaIntoEphemeralSupabase(localContainer)');
    expect(exercise).toContain('restoreDataIntoEphemeralSupabase(localContainer, managedAuthCleanupSql)');
  });

  it('fails closed if application schema replay mutates provider-managed Auth', () => {
    expect(exercise).toContain("readManagedAuthTables(restore, 'target_pre_schema')");
    expect(exercise).toContain("readManagedAuthTables(restore, 'target_post_schema')");
    expect(exercise).toContain('checks.managedAuthSchemaPreserved = sameRelationInventory');
    expect(exercise).toContain("throw new Error('recovery_target_managed_auth_schema_mutated_by_application_restore')");
    expect(exercise).toContain('const managedAuthPlan = planManagedAuthDataBoundary(source, restore)');
    expect(exercise).toContain("throw new Error('recovery_target_managed_auth_relation_missing_with_data')");
  });

  it('reconciles primed managed Auth rows on the disposable target before replay', () => {
    expect(exercise).toContain('const sharedRelations = sourceRelations.filter((relation) => targetSet.has(relation))');
    expect(exercise).toContain("sharedRelations.includes('auth.users')");
    expect(exercise).toContain('function buildManagedAuthCleanupSql(relations)');
    expect(exercise).toContain('return `delete from "auth"."${table}";`');
    expect(exercise).toContain('const managedAuthCleanupSql = buildManagedAuthCleanupSql(managedAuthPlan.sharedRelations)');
    expect(exercise).toContain("'--command', 'SET session_replication_role = replica;'");
    expect(exercise).toContain("'--command', managedAuthCleanupSql");

    const replicaMode = exercise.indexOf("'--command', 'SET session_replication_role = replica;'");
    const cleanup = exercise.indexOf("'--command', managedAuthCleanupSql");
    const replay = exercise.indexOf("'--file', containerPath", cleanup);
    expect(replicaMode).toBeGreaterThan(-1);
    expect(cleanup).toBeGreaterThan(replicaMode);
    expect(replay).toBeGreaterThan(cleanup);
    expect(exercise).toContain("'--single-transaction', '--set', 'ON_ERROR_STOP=1'");
    expect(exercise).toContain('checks.managedAuthPrimedDataReconciled = true');
  });

  it('requires the managed Auth catalog to remain stable after data restore too', () => {
    expect(exercise).toContain("readManagedAuthTables(restore, 'target_post_data')");
    expect(exercise).toContain('checks.managedAuthSchemaStableAfterData = sameRelationInventory');
    expect(exercise).toContain("throw new Error('recovery_target_managed_auth_schema_mutated_by_data_restore')");
    expect(exercise).toContain('managedAuthRelationNamesStored: false');
    expect(exercise).toContain('applicationSchemaNamesStored: false');
  });
});
