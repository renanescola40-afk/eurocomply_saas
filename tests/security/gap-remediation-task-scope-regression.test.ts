import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/gap-analysis/route.ts', 'utf8');

describe('Gap Analysis remediation task scope regression', () => {
  it('persists generated remediation tasks in the canonical personal scope', () => {
    expect(route).toContain('organization_id: null');
    expect(route).toContain('user_id: userId');
    expect(route).not.toContain("organization_id: organizationId,\n        workspace_id: null,\n        finding_id: finding.id,\n        user_id: null");
  });

  it('loads and compensates only the current user personal remediation tasks', () => {
    expect(route).toContain(".is('organization_id', null)\n    .eq('user_id', userId)\n    .in('finding_id', findingIds)");
    expect(route).toContain(".is('organization_id', null)\n        .eq('user_id', userId)\n        .in('finding_id', findingIds)");
  });
});
