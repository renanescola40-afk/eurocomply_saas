import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260727153000_qualified_review_control_center.sql'), 'utf8');

describe('qualified review control center migration', () => {
  it('uses an authenticated tenant-scoped security-invoker projection', () => {
    expect(sql).toContain('with (security_invoker = true)');
    expect(sql).toContain('public.is_organization_member(c.organization_id)');
    expect(sql).toContain('grant select on public.qualified_review_control_center_v1 to authenticated');
    expect(sql).toContain('revoke all on public.qualified_review_control_center_v1 from anon');
  });

  it('requires exactly eight accepted reviews and 51 points', () => {
    expect(sql).toContain("count(distinct a.id) = 8");
    expect(sql).toContain("coalesce(sum(a.weight), 0) = 51");
    expect(sql).toContain("coalesce(sum(a.weight) filter (where a.status = 'accepted'), 0) = 51");
  });
});
