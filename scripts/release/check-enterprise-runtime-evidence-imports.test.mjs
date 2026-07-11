import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('./check-enterprise-runtime-evidence.mjs', import.meta.url),
  'utf8',
);

describe('enterprise runtime evidence gate imports', () => {
  it('imports every validator referenced by the gate', () => {
    expect(source).toContain(
      "import { validateBranchProtectionFreshness } from '../security/validate-branch-protection-freshness.mjs';",
    );
    expect(source).toContain('validateBranchProtectionFreshness(branchProtection)');
  });
});
