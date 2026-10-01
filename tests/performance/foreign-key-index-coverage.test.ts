import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20260812230541_add_missing_foreign_key_covering_indexes.sql';
const sql = fs.readFileSync(path.join(root, migrationPath), 'utf8');

const expectedIndexes = [
  ['idx_ai_assessments_ai_system_fk', 'ai_assessments', "array['ai_system_id']::text[]", 'public.ai_assessments (ai_system_id)'],
  ['idx_ai_assessments_created_by_fk', 'ai_assessments', "array['created_by']::text[]", 'public.ai_assessments (created_by)'],
  ['idx_ai_incidents_ai_system_fk', 'ai_incidents', "array['ai_system_id']::text[]", 'public.ai_incidents (ai_system_id)'],
  ['idx_ai_incidents_created_by_fk', 'ai_incidents', "array['created_by']::text[]", 'public.ai_incidents (created_by)'],
  ['idx_audit_logs_actor_fk', 'audit_logs', "array['actor_id']::text[]", 'public.audit_logs (actor_id)'],
  ['idx_audit_logs_user_fk', 'audit_logs', "array['user_id']::text[]", 'public.audit_logs (user_id)'],
  ['idx_metric_snapshots_org_fk', 'compliance_metric_snapshots', "array['organization_id']::text[]", 'public.compliance_metric_snapshots (organization_id)'],
  ['idx_compliance_tasks_assigned_fk', 'compliance_tasks', "array['assigned_to']::text[]", 'public.compliance_tasks (assigned_to)'],
  ['idx_compliance_tasks_created_by_fk', 'compliance_tasks', "array['created_by']::text[]", 'public.compliance_tasks (created_by)'],
  ['idx_documents_created_by_fk', 'documents', "array['created_by']::text[]", 'public.documents (created_by)'],
  ['idx_ent_recon_events_actor_fk', 'enterprise_entitlement_reconciliation_events', "array['actor_user_id']::text[]", 'public.enterprise_entitlement_reconciliation_events (actor_user_id)'],
  ['idx_ent_snapshots_source_org_fk', 'enterprise_entitlement_snapshots', "array['source_id','organization_id']::text[]", 'public.enterprise_entitlement_snapshots (source_id, organization_id)'],
  ['idx_seat_events_actor_fk', 'enterprise_seat_events', "array['actor_user_id']::text[]", 'public.enterprise_seat_events (actor_user_id)'],
  ['idx_seat_events_reservation_fk', 'enterprise_seat_events', "array['reservation_id']::text[]", 'public.enterprise_seat_events (reservation_id)'],
  ['idx_seat_policies_updated_by_fk', 'enterprise_seat_policies', "array['updated_by']::text[]", 'public.enterprise_seat_policies (updated_by)'],
  ['idx_seat_reservations_reserved_by_fk', 'enterprise_seat_reservations', "array['reserved_by']::text[]", 'public.enterprise_seat_reservations (reserved_by)'],
  ['idx_invitations_invited_by_fk', 'invitations', "array['invited_by']::text[]", 'public.invitations (invited_by)'],
  ['idx_monitoring_preferences_user_fk', 'monitoring_preferences', "array['user_id']::text[]", 'public.monitoring_preferences (user_id)'],
  ['idx_onboarding_runs_created_by_fk', 'onboarding_activation_runs', "array['created_by']::text[]", 'public.onboarding_activation_runs (created_by)'],
  ['idx_org_members_user_fk', 'organization_members', "array['user_id']::text[]", 'public.organization_members (user_id)'],
  ['idx_organizations_created_by_fk', 'organizations', "array['created_by']::text[]", 'public.organizations (created_by)'],
  ['idx_organizations_owner_fk', 'organizations', "array['owner_id']::text[]", 'public.organizations (owner_id)'],
  ['idx_risks_created_by_fk', 'risks', "array['created_by']::text[]", 'public.risks (created_by)'],
  ['idx_risks_owner_fk', 'risks', "array['owner_id']::text[]", 'public.risks (owner_id)'],
  ['idx_role_permissions_permission_fk', 'role_permissions', "array['permission_key']::text[]", 'public.role_permissions (permission_key)'],
  ['idx_vendors_created_by_fk', 'vendors', "array['created_by']::text[]", 'public.vendors (created_by)'],
  ['idx_vendors_owner_fk', 'vendors', "array['owner_id']::text[]", 'public.vendors (owner_id)'],
] as const;

describe('foreign key index coverage migration', () => {
  it('keeps exactly the 27 advisor-backed covering-index definitions', () => {
    expect(expectedIndexes).toHaveLength(27);

    for (const [name, table, columns, target] of expectedIndexes) {
      expect(sql).toContain(`create index if not exists ${name} on ${target}`);
      expect(sql).toContain(`('${name}','${table}',${columns}`);
    }

    expect((sql.match(/create index if not exists/g) ?? [])).toHaveLength(27);
  });

  it('only attempts an index when its historical table and all target columns exist', () => {
    expect(sql).toContain("to_regclass(format('public.%I', v_table_name)) is not null");
    expect(sql).toContain('from unnest(v_target_columns) as required_column(column_name)');
    expect(sql).toContain("from information_schema.columns c");
    expect(sql).toContain("c.table_schema = 'public'");
    expect(sql).toContain('c.table_name = v_table_name');
    expect(sql).toContain('c.column_name = required_column.column_name');
    expect(sql).toContain('if v_missing_columns = 0 then');
    expect(sql).toContain('execute v_create_sql');
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

  it('fails closed for every applicable target whose table and columns exist', () => {
    expect(sql).toContain("to_regclass(format('public.%I', required.table_name)) is not null");
    expect(sql).toContain('from unnest(required.target_columns) as required_column(column_name)');
    expect(sql).toContain("and to_regclass('public.' || required.index_name) is null then");
    expect(sql).toContain('missing := missing + 1');
    expect(sql).toContain('if missing <> 0 then');
    expect(sql).toContain("raise exception 'missing required foreign-key covering indexes after reconciliation: %'");
  });
});
