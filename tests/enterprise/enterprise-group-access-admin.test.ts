import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260724093000_enterprise_group_access_admin_controls.sql',
  'utf8',
);
const route = readFileSync('src/app/api/team/group-access-policies/route.ts', 'utf8');
const service = readFileSync('src/server/enterprise/group-access-admin.ts', 'utf8');

describe('enterprise group access administration', () => {
  it('stores append-only policy events behind forced RLS', () => {
    expect(migration).toContain('create table if not exists public.enterprise_group_access_policy_events');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke all on public.enterprise_group_access_policy_events from public, anon, authenticated');
    expect(migration).toContain("action in ('previewed','created','updated','disabled')");
  });

  it('previews affected members, conflicts and last-admin impact', () => {
    expect(migration).toContain('preview_enterprise_group_access_policy_change');
    expect(migration).toContain('affected_members');
    expect(migration).toContain('conflict_count');
    expect(migration).toContain('would_remove_last_admin');
    expect(migration).toContain("m.status = 'active' and m.role = 'admin'");
  });

  it('applies policy changes atomically with concurrency and audit reason', () => {
    expect(migration).toContain('apply_enterprise_group_access_policy_change_atomic');
    expect(migration).toContain('p_expected_version');
    expect(migration).toContain("'last_admin_protection'::text");
    expect(migration).toContain("'mapping_conflict'::text");
    expect(migration).toContain('insert into public.enterprise_group_access_policy_events');
    expect(migration).toContain('change_reason = trim(p_reason)');
  });

  it('requires tenant permission, trusted mutation and step-up authentication', () => {
    expect(route).toContain("permission: 'manage_team'");
    expect(route).toContain('requireTrustedMutation(request');
    expect(route).toContain('requireStepUpForRequest({');
    expect(route).toContain("route: '/api/team/group-access-policies'");
    expect(route).toContain('readBoundedJsonRequest(request');
    expect(route).not.toContain('request.json()');
  });

  it('supports preview-only operation and fails closed before applying', () => {
    expect(route).toContain("url.searchParams.get('preview') === 'true'");
    expect(route.indexOf('preview.conflictCount > 0')).toBeLessThan(route.indexOf('applyGroupAccessPolicy({'));
    expect(route.indexOf('preview.wouldRemoveLastAdmin')).toBeLessThan(route.indexOf('applyGroupAccessPolicy({'));
  });

  it('uses service-role RPCs rather than direct table writes', () => {
    expect(service).toContain("rpc('preview_enterprise_group_access_policy_change'");
    expect(service).toContain("rpc('apply_enterprise_group_access_policy_change_atomic'");
    expect(service).not.toContain(".from('organization_members').update");
  });
});