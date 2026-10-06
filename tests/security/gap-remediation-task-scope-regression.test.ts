import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/gap-analysis/route.ts', 'utf8');

describe('Gap Analysis remediation task scope regression', () => {
  it('persists generated remediation tasks in the canonical personal scope', () => {
    expect(route).toContain('organization_id: null');
    expect(route).toContain('user_id: userId');
    expect(route).not.toContain("organization_id: organizationId,\n        workspace_id: null,\n        finding_id: finding.id,\n        user_id: null");
  });

const migration = readFileSync(
  'supabase/migrations/20261006140500_reconcile_gap_task_reference_integrity.sql',
  'utf8',
);

  it('keeps finding references tenant-safe for both organization and personal task scopes', () => {
    expect(migration).toContain('enforce_compliance_tasks_reference_integrity');
    expect(migration).toContain('finding.organization_id is not distinct from new.organization_id');
    expect(migration).toContain('finding.user_id = new.user_id');
    expect(migration).toContain('from public, anon, authenticated');
  });

  it('loads and compensates only the current user personal remediation tasks', () => {
    expect(route).toContain(".is('organization_id', null)\n    .eq('user_id', userId)\n    .in('finding_id', findingIds)");
    expect(route).toContain(".is('organization_id', null)\n        .eq('user_id', userId)\n        .in('finding_id', findingIds)");
  });
});
