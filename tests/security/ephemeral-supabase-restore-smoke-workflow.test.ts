import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = fs.readFileSync('.github/workflows/ephemeral-supabase-restore-smoke.yml', 'utf8');
const smoke = fs.readFileSync('scripts/recovery/run-ephemeral-restore-smoke.mjs', 'utf8');

describe('ephemeral Supabase logical restore PR smoke', () => {
  it('runs on untrusted pull-request code without protected credentials', () => {
    expect(workflow).toContain('pull_request:');
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('github.event.pull_request.head.sha');
    expect(workflow).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
    expect(workflow).toContain('version: 2.101.0');
  });

  it('replays the canonical source, destroys it, then restores into a clean target', () => {
    const sourceStart = workflow.indexOf('run-ephemeral-project-schema-replay.mjs');
    const dump = workflow.indexOf('run-ephemeral-restore-smoke.mjs dump');
    const sourceStop = workflow.indexOf('Destroy disposable source project');
    const targetStart = workflow.indexOf('manage-ephemeral-recovery-database.mjs start\n', dump);
    const restore = workflow.indexOf('run-ephemeral-restore-smoke.mjs restore');

    expect(sourceStart).toBeGreaterThan(-1);
    expect(dump).toBeGreaterThan(sourceStart);
    expect(sourceStop).toBeGreaterThan(dump);
    expect(targetStart).toBeGreaterThan(sourceStop);
    expect(restore).toBeGreaterThan(targetStart);
    expect(workflow).not.toContain('manage-ephemeral-recovery-database.mjs start-project');
  });

  it('uses the same supported roles schema data sequence as the protected recovery exercise', () => {
    expect(smoke).toContain("'--role-only', '--file', rolesPath");
    expect(smoke).toContain("run('supabase', ['db', 'dump', '--db-url', url, '--file', schemaPath])");
    expect(smoke).toContain("'--data-only', '--use-copy', '--file', dataPath");
    expect(smoke).toContain("'--single-transaction'");
    expect(smoke).toContain("'SET session_replication_role = replica;'");
  });

  it('proves restored synthetic data, auth schema and RLS without storing production data', () => {
    expect(smoke).toContain('__risck_restore_smoke');
    expect(smoke).toContain('risck-ephemeral-restore-smoke-v1');
    expect(smoke).toContain("to_regclass('auth.users') is not null");
    expect(smoke).toContain("c.relname in ('organizations','organization_members','audit_logs')");
    expect(smoke).toContain('c.relrowsecurity');
    expect(smoke).toContain('c.relforcerowsecurity');
  });

  it('deduplicates stale PR restore runs and always removes target plus synthetic dumps', () => {
    expect(workflow).toContain('group: ephemeral-supabase-restore-smoke-pr-${{ github.event.pull_request.number }}');
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).toMatch(/Remove disposable restore target[\s\S]*?if: always\(\)/);
    expect(workflow).toMatch(/Remove synthetic dump files[\s\S]*?if: always\(\)/);
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs stop');
    expect(workflow).toContain('run-ephemeral-restore-smoke.mjs clean');
  });
});
