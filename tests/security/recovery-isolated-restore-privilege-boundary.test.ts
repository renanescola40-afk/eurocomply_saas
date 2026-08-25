import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const exercise = readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const smoke = readFileSync('scripts/recovery/run-ephemeral-restore-smoke.mjs', 'utf8');

describe('recovery isolated restore privilege boundary', () => {
  it('uses the Supabase bootstrap superuser only on the disposable data replay path', () => {
    expect(exercise).toContain("const isolatedRestoreRole = 'supabase_admin'");
    expect(exercise).toContain('function assertIsolatedRestoreRoleBoundary(container)');
    expect(exercise).toContain("target.rolname = '${isolatedRestoreRole}'");
    expect(exercise).toContain("source.rolname = 'postgres'");
    expect(exercise).toContain('target.rolcanlogin and target.rolsuper and not source.rolsuper');
    expect(exercise).toContain("'-U', isolatedRestoreRole");
    expect(exercise).toContain("'--command', 'SET session_replication_role = replica;'");

    const dataRestore = exercise.indexOf('function restoreDataIntoEphemeralSupabase');
    const roleBoundary = exercise.indexOf('assertIsolatedRestoreRoleBoundary(container);', dataRestore);
    const privilegedReplay = exercise.indexOf("'-U', isolatedRestoreRole", dataRestore);
    const replicaMode = exercise.indexOf("'--command', 'SET session_replication_role = replica;'", dataRestore);

    expect(dataRestore).toBeGreaterThan(-1);
    expect(roleBoundary).toBeGreaterThan(dataRestore);
    expect(privilegedReplay).toBeGreaterThan(roleBoundary);
    expect(replicaMode).toBeGreaterThan(privilegedReplay);
  });

  it('keeps application schema replay on the non-superuser postgres role', () => {
    const schemaRestore = exercise.indexOf('function restoreApplicationSchemaIntoEphemeralSupabase');
    const roleBoundaryHelper = exercise.indexOf('function assertIsolatedRestoreRoleBoundary');
    const schemaBody = exercise.slice(schemaRestore, roleBoundaryHelper);

    expect(schemaRestore).toBeGreaterThan(-1);
    expect(roleBoundaryHelper).toBeGreaterThan(schemaRestore);
    expect(schemaBody).toContain("'-U', 'postgres'");
    expect(schemaBody).not.toContain('isolatedRestoreRole');
    expect(schemaBody).not.toContain('session_replication_role = replica');
  });

  it('fails closed if the disposable target no longer exposes the expected privilege model', () => {
    expect(exercise).toContain("'recovery_isolated_restore_role_boundary_query_failed'");
    expect(exercise).toContain("throw new Error('recovery_isolated_restore_role_boundary_invalid')");
    expect(exercise).toContain('checks.isolatedRestorePrivilegeBoundary = true');
  });

  it('exercises the same privilege split in the synthetic restore smoke', () => {
    expect(smoke).toContain("const isolatedRestoreRole = 'supabase_admin'");
    expect(smoke).toContain('assertIsolatedRestoreRoleBoundary(container);');
    expect(smoke).toContain("'psql', '-U', 'postgres', '-d', 'postgres'");
    expect(smoke).toContain("'psql', '-U', isolatedRestoreRole, '-d', 'postgres'");

    const schemaReplay = smoke.indexOf("'--file', targets[1]");
    const roleBoundary = smoke.indexOf('assertIsolatedRestoreRoleBoundary(container);');
    const dataReplay = smoke.indexOf("'--file', targets[2]");
    expect(schemaReplay).toBeGreaterThan(-1);
    expect(roleBoundary).toBeGreaterThan(schemaReplay);
    expect(dataReplay).toBeGreaterThan(roleBoundary);
  });
});
