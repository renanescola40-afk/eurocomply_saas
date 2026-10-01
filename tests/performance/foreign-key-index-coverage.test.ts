import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20260812230541_add_missing_foreign_key_covering_indexes.sql';
const sql = fs.readFileSync(path.join(root, migrationPath), 'utf8');

const expectedIndexes = [
  ['idx_ai_assessments_ai_system_fk', 'ai_assessments', 'public.ai_assessments (ai_system_id)'],
  ['idx_ai_assessments_created_by_fk', 'ai_assessments', 'public.ai_assessments (created_by)'],
  ['idx_ai_incidents_ai_system_fk', 'ai_incidents', 'public.ai_incidents (ai_system_id)'],
  ['idx_ai_incidents_created_by_fk', 'ai_incidents', 'public.ai_incidents (created_by)'],
  ['idx_audit_logs_actor_fk', 'audit_logs', 'public.audit_logs (actor_id)'],
  ['idx_audit_logs_user_fk', 'audit_logs', 'public.audit_logs (user_id)'],
  ['idx_metric_snapshots_org_fk', 'compliance_metric_snapshots', 'public.compliance_metric_snapshots (organization_id)'],
  ['idx_compliance_tasks_assigned_fk', 'compliance_tasks', 'public.compliance_tasks (assigned_to)'],
  ['idx_compliance_tasks_created_by_fk', 'compliance_tasks', 'public.compliance_tasks (created_by)'],
  ['idx_documents_created_by_fk', 'documents', 'public.documents (created_by)'],
  ['idx_ent_recon_events_actor_fk', 'enterprise_entitlement_reconciliation_events', 'public.enterprise_entitlement_reconciliation_events (actor_user_id)'],
  ['idx_ent_snapshots_source_org_fk', 'enterprise_entitlement_snapshots', 'public.enterprise_entitlement_snapshots (source_id, organization_id)'],
  ['idx_seat_events_actor_fk', 'enterprise_seat_events', 'public.enterprise_seat_events (actor_user_id)'],
  ['idx_seat_events_reservation_fk', 'enterprise_seat_events', 'public.enterprise_seat_events (reservation_id)'],
  ['idx_seat_policies_updated_by_fk', 'enterprise_seat_policies', 'public.enterprise_seat_policies (updated_by)'],
  ['idx_seat_reservations_reserved_by_fk', 'enterprise_seat_reservations', 'public.enterprise_seat_reservations (reserved_by)'],
  ['idx_invitations_invited_by_fk', 'invitations', 'public.invitations (invited_by)'],
  ['idx_monitoring_preferences_user_fk', 'monitoring_preferences', 'public.monitoring_preferences (user_id)'],
  ['idx_onboarding_runs_created_by_fk', 'onboarding_activation_runs', 'public.onboarding_activation_runs (created_by)'],
  ['idx_org_members_user_fk', 'organization_members', 'public.organization_members (user_id)'],
  ['idx_organizations_created_by_fk', 'organizations', 'public.organizations (created_by)'],
  ['idx_organizations_owner_fk', 'organizations', 'public.organizations (owner_id)'],
  ['idx_risks_created_by_fk', 'risks', 'public.risks (created_by)'],
  ['idx_risks_owner_fk', 'risks', 'public.risks (owner_id)'],
  ['idx_role_permissions_permission_fk', 'role_permissions', 'public.role_permissions (permission_key)'],
  ['idx_vendors_created_by_fk', 'vendors', 'public.vendors (created_by)'],
  ['idx_vendors_owner_fk', 'vendors', 'public.vendors (owner_id)'],
] as const;

describe('foreign key index coverage migration', () => {
  it('keeps exactly the 27 advisor-backed covering-index definitions', () => {
    expect(expectedIndexes).toHaveLength(27);

    for (const [name, table, target] of expectedIndexes) {
      expect(sql).toContain(`create index if not exists ${name} on ${target}`);
      expect(sql).toContain(`('${name}','${table}')`);
    }

    expect((sql.match(/create index if not exists/g) ?? [])).toHaveLength(27);
  });

  it('only attempts an index when its historical base table exists', () => {
    expect(sql).toContain("to_regclass(format('public.%I', table_name)) is not null");
    expect(sql).toContain('execute create_sql');
  });

  it('keeps composite foreign-key index column order aligned with the constraint', () => {
    expect(sql).toContain(
      'idx_ent_snapshots_source_org_fk on public.enterprise_entitlement_snapshots (source_id, organization_id)',
    );
    expect(sql).not.toContain(
      'idx_ent_snapshots_source_org_fk on public.enterprise_entitlement_snapshots (organization_id, source_id)',
    );
  });

  it('does not remove existing indexes based only on zero usage counters', () => {
    expect(sql).not.toContain('drop index');
    expect(sql).not.toContain('pg_stat_user_indexes');
  });

  it('fails closed for every required index whose base table exists', () => {
    expect(sql).toContain("where to_regclass(format('public.%I', required.table_name)) is not null");
    expect(sql).toContain("and to_regclass('public.' || required.index_name) is null");
    expect(sql).toContain('if missing <> 0 then');
    expect(sql).toContain("raise exception 'missing required foreign-key covering indexes after reconciliation: %'");
  });
});
