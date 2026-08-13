import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  UNAPPLIED_UNIQUE_MIGRATIONS,
  UNAPPLIED_UNIQUE_REVIEW_REFERENCE,
} from '../../scripts/recovery/run-ephemeral-project-schema-replay.mjs';

describe('reviewed unapplied workflow migration boundary', () => {
  it('excludes only the reviewed unique workflow migration from disposable replay', () => {
    expect(UNAPPLIED_UNIQUE_MIGRATIONS).toEqual([
      '20260721093000_enterprise_workflow_automation.sql',
    ]);

    const review = fs.readFileSync(UNAPPLIED_UNIQUE_REVIEW_REFERENCE, 'utf8');
    expect(review).toContain('20260721093000_enterprise_workflow_automation.sql');
    expect(review).toContain('unapplied historical migration');
    expect(review).toContain('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL=false');
  });
});