import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260720044500_vendor_governance_integrity.sql', 'utf8');
const actions = readFileSync('src/server/actions/vendors.ts', 'utf8');

describe('vendor governance integrity', () => {
  it('locks direct browser writes behind the reviewed backend', () => {
    expect(migration).toContain('revoke insert, update, delete on public.vendors from anon, authenticated;');
    expect(migration).toContain('drop policy if exists "Managers can manage vendors"');
  });

  it('enforces actor, approval, lifecycle and review-date integrity', () => {
    expect(migration).toContain('enforce_vendor_governance_integrity');
    expect(migration).toContain("om.role in ('owner', 'admin', 'compliance_manager')");
    expect(migration).toContain('vendors_approval_state_check');
    expect(migration).toContain('vendors_review_dates_check');
    expect(migration).toContain("review_status in ('pending', 'in_review', 'approved', 'rejected')");
  });

  it('maintains immutable organization-scoped review history', () => {
    expect(migration).toContain('create table if not exists public.vendor_review_history');
    expect(migration).toContain('after insert or update or delete on public.vendors');
    expect(migration).toContain('revoke insert, update, delete on public.vendor_review_history from anon, authenticated;');
    expect(migration).toContain('using (public.is_org_member(organization_id))');
  });

  it('retains deletion evidence without false actor attribution', () => {
    const historyDefinition = migration.slice(
      migration.indexOf('create table if not exists public.vendor_review_history'),
      migration.indexOf('create index if not exists vendor_review_history_vendor_idx'),
    );

    expect(historyDefinition).toContain('vendor_id uuid not null');
    expect(historyDefinition).not.toMatch(/vendor_id uuid[^\n]*references public\.vendors/i);
    expect(migration).not.toContain('vendor_id uuid not null references public.vendors(id) on delete cascade');
    expect(migration).toContain('v_actor uuid := auth.uid();');
    expect(migration).not.toContain('coalesce(auth.uid(), new.approved_by');
  });

  it('removes the legacy schema fallback and broad selects', () => {
    expect(actions).not.toContain('legacy_schema_fallback');
    expect(actions).not.toContain("select('*')");
    expect(actions).toContain('vendorColumns');
  });

  it('supports optimistic review concurrency and explicit approval attribution', () => {
    expect(actions).toContain('expectedReviewVersion');
    expect(actions).toContain("query.eq('review_version', payload.expectedReviewVersion)");
    expect(actions).toContain('approved_by: approved ? actorUserId : null');
    expect(actions).toContain('approved_at: approved ? new Date().toISOString() : null');
  });
});