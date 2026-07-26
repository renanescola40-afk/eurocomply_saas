import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260725102000_qualified_review_delivery_closeout.sql', 'utf8');

describe('qualified review delivery closeout migration', () => {
  it('creates tenant-scoped deliveries and promotions', () => {
    expect(sql).toContain('qualified_review_deliveries');
    expect(sql).toContain('qualified_review_promotions');
    expect(sql).toContain('foreign key (assignment_id, organization_id)');
    expect(sql).toContain('foreign key (campaign_id, organization_id)');
  });

  it('forces RLS and denies direct authenticated writes', () => {
    expect(sql).toContain('force row level security');
    expect(sql).toContain('revoke all on public.qualified_review_deliveries, public.qualified_review_promotions from anon, authenticated');
  });

  it('requires exactly 51 valid points for promotion', () => {
    expect(sql).toContain('completed_weight integer not null check (completed_weight = 51)');
    expect(sql).toContain("if v_completed <> 51 then raise exception 'qualified_review_incomplete'");
  });

  it('keeps promotion backend-only', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain('grant execute on function public.promote_qualified_review_campaign');
    expect(sql).toContain('to service_role');
  });
});
