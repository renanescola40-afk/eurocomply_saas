import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const exercise = fs.readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const primer = fs.readFileSync('scripts/recovery/prime-ephemeral-managed-storage-schema.mjs', 'utf8');

describe('database-only recovery storage boundary', () => {
  it('primes managed Storage relations before Production restore and excludes Storage row data', () => {
    expect(exercise).toContain("managedStoragePrimer = 'scripts/recovery/prime-ephemeral-managed-storage-schema.mjs'");
    expect(exercise).toContain("RECOVERY_MANAGED_SCHEMA_PRIME_PHASE: 'pre-production-restore'");
    expect(exercise.indexOf("failurePhase = 'managed_storage_schema_prime'"))
      .toBeLessThan(exercise.indexOf("failurePhase = 'roles_dump'"));
    expect(exercise).toContain('checks.managedStorageSchemaPrimed = true');
    expect(exercise).toContain("SUPABASE_MANAGED_DATA_EXCLUDE = 'storage.*'");
    expect(exercise.match(/'--exclude'/g)).toHaveLength(1);
    expect(exercise).toContain("'--exclude', SUPABASE_MANAGED_DATA_EXCLUDE");
    expect(exercise).toContain("failurePhase = 'data_dump_storage_exclusion_validation'");
    expect(exercise).toContain('assertManagedStorageRowsExcluded(dataDumpPath)');
    expect(exercise).toContain('checks.managedStorageRowsExcluded = true');
    expect(exercise).toContain('all API services were stopped before any Production snapshot restore');
    expect(exercise).toContain('selected migration postconditions and later Storage runtime/tenant acceptance remain mandatory');
  });

  it('fails closed if a Supabase CLI regression leaves Storage COPY rows in the data dump', () => {
    expect(exercise).toContain('function assertManagedStorageRowsExcluded(path)');
    expect(exercise).toContain('/^COPY\\s+"?storage"?\\./mi');
    expect(exercise).toContain("throw new Error('recovery_storage_rows_present_in_data_dump')");
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
