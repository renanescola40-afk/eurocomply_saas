import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/vercel-production.yml', 'utf8');

describe('Vercel protected production audit-chain evidence hydration', () => {
  it('hydrates exact-SHA protected audit-chain evidence before the aggregate security gate', () => {
    const hydrationStep = '- name: Hydrate exact-SHA audit-chain runtime evidence';
    const securityGate = '- name: Run full security CI gate';

    expect(workflow).toContain(hydrationStep);
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(workflow).toContain('GITHUB_REPOSITORY: ${{ github.repository }}');
    expect(workflow).toContain('TARGET_SHA: ${{ env.RELEASE_SHA }}');
    expect(workflow).toContain("AUDIT_CHAIN_RUNTIME_EVIDENCE_REQUIRED: 'true'");
    expect(workflow).toContain('run: node scripts/enterprise/fetch-audit-chain-runtime-evidence.mjs');
    expect(workflow.indexOf(hydrationStep)).toBeLessThan(workflow.indexOf(securityGate));
  });
});
