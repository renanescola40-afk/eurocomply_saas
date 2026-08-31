import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { compileForwardReconciliationManifest } from '../../scripts/supabase/forward-reconciliation-control-plane.mjs';

const rootDir = process.cwd();
const subjectSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('Supabase forward reconciliation control-plane capacity', () => {
  it('compiles the exact current V25 canonical ledger reconciliation package', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));

    expect(config.migrations).toEqual([
      expect.objectContaining({
        filename: '20260831130000_reconcile_deterministic_commercial_contract_source_precedence.sql',
      }),
    ]);
    const manifest = await compileForwardReconciliationManifest({ config, rootDir, subjectSha });

    expect(manifest.targetSha).toBe(subjectSha);
    expect(manifest.migrations).toHaveLength(1);
    expect(manifest.changeSet).toBe('2026-08-31-deterministic-commercial-source-precedence-ledger-reconciliation-v25');
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
