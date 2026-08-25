import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const exercise = readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');

describe('recovery post-schema managed Auth boundary', () => {
  it('restores only dynamically inventoried application schemas', () => {
    expect(exercise).toContain('function readApplicationSchemas(connection)');
    expect(exercise).toContain("n.nspname not in ('auth','extensions','graphql','graphql_public','realtime','storage','supabase_migrations','vault')");
    expect(exercise).toContain("pg_get_userbyid(n.nspowner) not like 'supabase_%'");
    expect(exercise).toContain('not exists (select 1 from pg_extension e where e.extnamespace = n.oid)');
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
    expect(exercise).toContain('restoreDataIntoEphemeralSupabase(localContainer)');
  });

  it('fails closed if application schema replay mutates provider-managed Auth', () => {
    expect(exercise).toContain("readManagedAuthTables(restore, 'target_pre_schema')");
    expect(exercise).toContain("readManagedAuthTables(restore, 'target_post_schema')");
    expect(exercise).toContain('checks.managedAuthSchemaPreserved = sameRelationInventory');
    expect(exercise).toContain("throw new Error('recovery_target_managed_auth_schema_mutated_by_application_restore')");
    expect(exercise).toContain('const managedAuthPlan = planManagedAuthDataBoundary(source, restore)');
    expect(exercise).toContain("throw new Error('recovery_target_managed_auth_relation_missing_with_data')");
  });

  it('requires the managed Auth catalog to remain stable after data restore too', () => {
    expect(exercise).toContain("readManagedAuthTables(restore, 'target_post_data')");
    expect(exercise).toContain('checks.managedAuthSchemaStableAfterData = sameRelationInventory');
    expect(exercise).toContain("throw new Error('recovery_target_managed_auth_schema_mutated_by_data_restore')");
    expect(exercise).toContain('managedAuthRelationNamesStored: false');
    expect(exercise).toContain('applicationSchemaNamesStored: false');
  });
});
