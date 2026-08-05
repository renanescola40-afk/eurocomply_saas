import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('branch protection P0 evidence item contract', () => {
  it('uses the canonical item accepted by the runtime evidence validator', () => {
    const fetcher = read('scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs');
    const validator = read('scripts/security/check-p0-runtime-evidence-files.mjs');

    expect(fetcher).toContain("evidenceItem: 'branch-protection-main'");
    expect(fetcher).not.toContain("evidenceItem: 'branch-protection-validation'");
    expect(validator).toContain("'branch-protection-main'");
  });
});
