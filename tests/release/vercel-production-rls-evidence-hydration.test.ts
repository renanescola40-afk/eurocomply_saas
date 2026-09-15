import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);

describe('Vercel Production exact-SHA runtime evidence hydration', () => {
  it('hydrates fail-closed Supabase RLS evidence before release authorization gates', () => {
    const auditHydration = workflow.indexOf(
      '- name: Hydrate exact-SHA audit-chain runtime evidence',
    );
    const rlsHydration = workflow.indexOf(
      '- name: Hydrate exact-SHA Supabase RLS runtime evidence',
    );
    const authorization = workflow.indexOf(
      '- name: Run pre-deployment release authorization gates',
    );

    expect(auditHydration).toBeGreaterThan(-1);
    expect(rlsHydration).toBeGreaterThan(auditHydration);
    expect(authorization).toBeGreaterThan(rlsHydration);

    const rlsBlock = workflow.slice(rlsHydration, authorization);
    expect(rlsBlock).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(rlsBlock).toContain('TARGET_SHA: ${{ env.RELEASE_SHA }}');
    expect(rlsBlock).toContain("SUPABASE_RLS_RUNTIME_EVIDENCE_REQUIRED: 'true'");
    expect(rlsBlock).toContain(
      'run: node scripts/enterprise/fetch-supabase-rls-evidence.mjs',
    );
  });
});
