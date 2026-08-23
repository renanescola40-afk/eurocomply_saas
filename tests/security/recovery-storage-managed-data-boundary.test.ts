import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const exercise = fs.readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const primer = fs.readFileSync('scripts/recovery/prime-ephemeral-managed-storage-schema.mjs', 'utf8');

describe('database-only recovery managed-data boundary', () => {
  it('primes managed Storage relations before Production restore and excludes exact current Storage relations', () => {
    expect(exercise).toContain("managedStoragePrimer = 'scripts/recovery/prime-ephemeral-managed-storage-schema.mjs'");
    expect(exercise).toContain("RECOVERY_MANAGED_SCHEMA_PRIME_PHASE: 'pre-production-restore'");
    expect(exercise.indexOf("failurePhase = 'managed_storage_schema_prime'"))
      .toBeLessThan(exercise.indexOf("failurePhase = 'roles_dump'"));
    expect(exercise).toContain('checks.managedStorageSchemaPrimed = true');
    expect(exercise).toContain('function readManagedStorageRelations(connection)');
    expect(exercise).toContain("n.nspname = 'storage'");
    expect(exercise).toContain("c.relkind in ('r','p','f','S','m')");
    expect(exercise).toContain("relations.includes('storage.buckets')");
    expect(exercise).toContain("relations.includes('storage.objects')");
    expect(exercise).toContain("/^storage\\.[a-z0-9_]+$/.test(value)");
    expect(exercise).toContain("failurePhase = 'managed_storage_relation_inventory'");
    expect(exercise).toContain("const managedStorageDataExclude = readManagedStorageRelations(source).join(',')");
    expect(exercise).toContain('checks.managedStorageRelationInventory = true');
    expect(exercise).not.toContain("SUPABASE_MANAGED_DATA_EXCLUDE = 'storage.*'");
    expect(exercise.match(/'--exclude'/g)).toHaveLength(1);
    expect(exercise).toContain("'--exclude', managedDataExclude");
    expect(exercise).toContain("failurePhase = 'data_dump_managed_exclusion_validation'");
    expect(exercise).toContain('assertManagedStorageRowsExcluded(dataDumpPath)');
    expect(exercise).toContain('checks.managedStorageRowsExcluded = true');
    expect(exercise).toContain('all API services were stopped before any Production snapshot restore');
    expect(exercise).toContain('Selected migration postconditions and later Storage runtime/tenant acceptance remain mandatory');
  });

  it('fails closed if Storage inventory is incomplete or contains an unsafe relation name', () => {
    expect(exercise).toContain("throw new Error('recovery_source_storage_relation_inventory_incomplete')");
    expect(exercise).toContain("throw new Error('recovery_source_storage_relation_inventory_unsafe')");
  });

  it('fails closed if a Supabase CLI regression leaves Storage COPY rows in the data dump', () => {
    expect(exercise).toContain('function assertManagedStorageRowsExcluded(path)');
    expect(exercise).toContain('/^COPY\\s+"?storage"?\\./mi');
    expect(exercise).toContain("throw new Error('recovery_storage_rows_present_in_data_dump')");
  });

  it('handles provider-managed Auth schema drift without replaying unsupported managed DDL', () => {
    expect(exercise).toContain('function readManagedAuthTables(connection, boundary)');
    expect(exercise).toContain("n.nspname = 'auth'");
    expect(exercise).toContain("c.relkind in ('r','p','f')");
    expect(exercise).toContain("relations.includes('auth.users')");
    expect(exercise).toContain("/^auth\\.[a-z0-9_]+$/.test(value)");
    expect(exercise).toContain('function planManagedAuthDataBoundary(sourceConnection, targetConnection)');
    expect(exercise).toContain("readManagedAuthTables(sourceConnection, 'source')");
    expect(exercise).toContain("readManagedAuthTables(targetConnection, 'target')");
    expect(exercise).toContain('if (targetSet.has(relation)) continue');
    expect(exercise).toContain('`select count(*) from ${relation};`');
    expect(exercise).toContain("throw new Error('recovery_target_managed_auth_relation_missing_with_data')");
    expect(exercise).toContain("failurePhase = 'managed_auth_relation_inventory'");
    expect(exercise).toContain("const managedAuthDataExclude = managedAuthPlan.sourceOnlyEmptyRelations.join(',')");
    expect(exercise).toContain('const managedDataExclude = [managedStorageDataExclude, managedAuthDataExclude].filter(Boolean).join(\',\')');
    expect(exercise).toContain('assertManagedAuthRowsExcluded(dataDumpPath, managedAuthPlan.sourceOnlyEmptyRelations)');
    expect(exercise).toContain('checks.managedAuthSchemaDriftSafe = true');
    expect(exercise).toContain('checks.managedAuthRowsExcluded = true');
  });

  it('binds managed Auth inventory only after target extension mutations and before data dump', () => {
    const extensionParity = exercise.indexOf("failurePhase = 'extension_parity'");
    const managedAuthInventory = exercise.indexOf("failurePhase = 'managed_auth_relation_inventory'");
    const dataDump = exercise.indexOf("failurePhase = 'data_dump'");
    expect(extensionParity).toBeGreaterThanOrEqual(0);
    expect(managedAuthInventory).toBeGreaterThan(extensionParity);
    expect(dataDump).toBeGreaterThan(managedAuthInventory);
    expect(exercise).toContain('Any target extension mutation must finish before we bind the managed Auth');
    expect(exercise).toContain('Managed Auth inventory is rebound after all target extension mutations');
  });

  it('keeps Auth drift evidence aggregate-only and preserves auth.users integrity', () => {
    expect(exercise).toContain('managedAuthBoundary.sourceRelationCount = managedAuthPlan.sourceRelationCount');
    expect(exercise).toContain('managedAuthBoundary.targetRelationCount = managedAuthPlan.targetRelationCount');
    expect(exercise).toContain('managedAuthBoundary.sourceOnlyEmptyRelationCount = managedAuthPlan.sourceOnlyEmptyRelationCount');
    expect(exercise).toContain('sourceAuthUsers = Number(sql(source, \'select count(*) from auth.users;\'');
    expect(exercise).toContain('restoredAuthUsers = Number(sql(restore, \'select count(*) from auth.users;\'');
    expect(exercise).toContain('checks.authUsersIntegrity = sourceAuthUsers === restoredAuthUsers');
    expect(exercise).toContain('managedAuthRelationNamesStored: false');
    expect(exercise).toContain('any non-empty source-only Auth relation fails closed');
    expect(exercise).toContain('auth.users row-count integrity remains mandatory');
  });

  it('uses Supabase managed migrations only while the target is empty, then returns to DB-only mode', () => {
    expect(primer).toContain("env('RECOVERY_MANAGED_SCHEMA_PRIME_PHASE') !== 'pre-production-restore'");
    expect(primer).toContain("env('RECOVERY_EPHEMERAL_DATABASE_MODE') !== 'restore-target'");
    expect(primer).toContain("to_regclass('storage.buckets')");
    expect(primer).toContain("to_regclass('storage.objects')");
    expect(primer).toContain("'start',");
    expect(primer).toContain("'stop'");
    expect(primer).toContain("'db', 'start'");
    expect(primer).toContain('API services are stopped and the isolated target is database-only');
  });
});