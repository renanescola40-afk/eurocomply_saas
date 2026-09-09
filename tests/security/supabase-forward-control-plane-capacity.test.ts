import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { compileForwardReconciliationManifest } from '../../scripts/supabase/forward-reconciliation-control-plane.mjs';

const rootDir = process.cwd();
const subjectSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const v42Migration = '20260909143000_harden_data_subject_request_lifecycle.sql';

describe('Supabase forward reconciliation control-plane capacity', () => {
  it('compiles the exact minimal V42 package above the proven V41 Production head', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));

    expect(config.changeSet).toBe('2026-09-09-gdpr-rights-lifecycle-v42');
    expect(config.sourceChangeSet).toBe('2026-09-09-supabase-advisor-rpc-hardening-v41');
    expect(config.migrations.map((migration: { filename: string }) => migration.filename)).toEqual([v42Migration]);
    expect(config.migrations).toHaveLength(1);
    expect(v42Migration.slice(0, 14) > '20260909006900').toBe(true);

    const sql = await readFile(`supabase/migrations/${v42Migration}`, 'utf8');
    expect(sql).toContain("to_regclass('public.data_subject_requests')");
    expect(sql).toContain('alter column due_at drop default');
    expect(sql).toContain('force row level security');
    expect(sql).toContain('revoke insert, update, delete on table public.data_subject_requests from anon, authenticated');
    expect(sql).not.toContain("interval '30 days'");
    expect(sql).not.toMatch(/create\s+table\s+(if\s+not\s+exists\s+)?public\.data_subject_requests/i);

    const manifest = await compileForwardReconciliationManifest({ config, rootDir, subjectSha });

    expect(manifest.targetSha).toBe(subjectSha);
    expect(manifest.migrations.map((migration) => migration.filename)).toEqual([v42Migration]);
    expect(manifest.migrations).toHaveLength(1);
    expect(manifest.changeSet).toBe('2026-09-09-gdpr-rights-lifecycle-v42');
    expect(manifest.checks.productionWriteAuthorized).toBe(false);
    expect(manifest.checks.migrationHistoryRepairAuthorized).toBe(false);
    expect(manifest.checks.unrestrictedDbPushAuthorized).toBe(false);
  });

  it('remains fail-closed above the reviewed 33-item package ceiling', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));
    const overLimit = {
      ...config,
      migrations: Array.from({ length: 34 }, (_, index) => ({
        filename: `20990101${String(index).padStart(6, '0')}_unreviewed_future_migration.sql`,
        purpose: 'must not be accepted',
      })),
    };

    await expect(
      compileForwardReconciliationManifest({ config: overLimit, rootDir, subjectSha }),
    ).rejects.toThrow('config migrations must contain 1-33 items');
  });
});
