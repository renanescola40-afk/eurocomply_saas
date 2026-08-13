import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = fs.readFileSync('.github/workflows/ephemeral-supabase-project-smoke.yml', 'utf8');

describe('ephemeral Supabase project PR smoke workflow', () => {
  it('runs only as a read-only pull request workflow and never uses protected secrets', () => {
    expect(workflow).toContain('pull_request:');
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('github.event.pull_request.head.sha');
  });

  it('uses the pinned Supabase CLI and the exact-SHA project schema provisioner', () => {
    expect(workflow).toContain('supabase/setup-cli@46f89843689f213b433d85a0508d1183e1803070');
    expect(workflow).toContain('version: 2.101.0');
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs start-project');
    expect(workflow).toContain('RECOVERY_EPHEMERAL_DATABASE_MODE');
    expect(workflow).toContain('RECOVERY_EPHEMERAL_MIGRATION_COUNT');
  });

  it('validates representative enterprise schema and RLS in the disposable database', () => {
    for (const token of [
      'organizations',
      'organization_members',
      'audit_logs',
      'security_incidents',
      'data_retention_policies',
      'enterprise_scim_connections',
      'supabase_migrations.schema_migrations',
      'relrowsecurity',
      'relforcerowsecurity',
    ]) {
      expect(workflow).toContain(token);
    }
  });

  it('always destroys the disposable project after validation or failure', () => {
    expect(workflow).toMatch(/Remove disposable project database[\s\S]*?if: always\(\)/);
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs stop');
  });
});
