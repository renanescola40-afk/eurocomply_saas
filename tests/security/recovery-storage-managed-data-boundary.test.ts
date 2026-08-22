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
    expect(exercise).toContain("'storage.buckets_vectors'");
    expect(exercise).toContain("'storage.vector_indexes'");
    expect(exercise).toContain("'storage.*'");
    expect(exercise).toContain("'--exclude', SUPABASE_MANAGED_DATA_EXCLUDES[2]");
    expect(exercise).toContain('all API services were stopped before any Production snapshot restore');
    expect(exercise).toContain('selected migration postconditions and later Storage runtime/tenant acceptance remain mandatory');
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
