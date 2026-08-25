import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { compileForwardReconciliationManifest } from '../../scripts/supabase/forward-reconciliation-control-plane.mjs';

const rootDir = process.cwd();
const subjectSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('Supabase forward reconciliation control-plane capacity', () => {
  it('compiles the exact current V23/33 governed package', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));

    expect(config.migrations).toHaveLength(33);
    const manifest = await compileForwardReconciliationManifest({ config, rootDir, subjectSha });

    expect(manifest.targetSha).toBe(subjectSha);
    expect(manifest.migrations).toHaveLength(33);
    expect(manifest.changeSet).toBe('2026-08-25-enterprise-data-plane-active-membership-rls-closure-v23');
    expect(manifest.checks.productionWriteAuthorized).toBe(false);
    expect(manifest.checks.migrationHistoryRepairAuthorized).toBe(false);
    expect(manifest.checks.unrestrictedDbPushAuthorized).toBe(false);
  });

  it('remains fail-closed above the reviewed 33-item package ceiling', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));
    const overLimit = {
      ...config,
      migrations: [
        ...config.migrations,
        { filename: '20990101000000_unreviewed_future_migration.sql', purpose: 'must not be accepted' },
      ],
    };

    await expect(
      compileForwardReconciliationManifest({ config: overLimit, rootDir, subjectSha }),
    ).rejects.toThrow('config migrations must contain 1-33 items');
  });
});
