import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const sql=readFileSync('supabase/migrations/20260721133000_post_market_ai_incident_governance.sql','utf8');
const tables=['ai_post_market_plans','ai_post_market_signals','ai_incident_cases','ai_incident_actions'];
describe('post-market AI incident migration',()=>{
  it.each(tables)('creates and forces RLS on %s',(table)=>{
    expect(sql).toContain(`create table if not exists public.${table}`);
    expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain(`alter table public.${table} force row level security`);
  });
  it('enforces same-organization references',()=>{
    expect(sql).toContain('foreign key (organization_id, plan_id)');
    expect(sql).toContain('foreign key (organization_id, signal_id)');
    expect(sql).toContain('foreign key (organization_id, incident_id)');
  });
  it('requires independent approval and digest integrity',()=>{
    expect(sql).toContain('approver_user_id <> owner_user_id');
    expect(sql).toContain("evidence_digest ~ '^[a-f0-9]{64}$'");
    expect(sql).toContain("status <> 'closed'");
  });
});
