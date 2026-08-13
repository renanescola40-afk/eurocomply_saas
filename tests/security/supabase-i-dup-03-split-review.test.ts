import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const dossier = fs.readFileSync(
  'docs/security/evidence/human-review/split-reviews/i-dup-03-live-object-evidence.md',
  'utf8',
);
const auditMigration = fs.readFileSync(
  'supabase/migrations/20260612_audit_event_hash_chain.sql',
  'utf8',
);
const intelligenceMigration = fs.readFileSync(
  'supabase/migrations/20260612_intelligence_tables.sql',
  'utf8',
);
const replacementMigration = fs.readFileSync(
  'supabase/migrations/20260809135000_enterprise_core_runtime_schema_reconciliation.sql',
  'utf8',
);
const seedMigration = fs.readFileSync(
  'supabase/migrations/20260612_seed_intelligence_items.sql',
  'utf8',
);

describe('Supabase I-DUP-03 technical split review', () => {
  it('keeps the audit hash-chain disposition bound to exact migration objects', () => {
    for (const column of [
      'actor_user_id',
      'previous_hash',
      'event_hash',
      'hash_algorithm',
      'hash_signature',
    ]) {
      expect(auditMigration).toContain(column);
      expect(dossier).toContain(column);
    }

    for (const index of [
      'audit_events_event_hash_key',
      'audit_events_org_created_hash_idx',
      'audit_events_previous_hash_idx',
    ]) {
      expect(auditMigration).toContain(index);
      expect(dossier).toContain(index);
    }

    expect(dossier).toContain('Candidate classification: `ALREADY_PRESENT_IN_SCHEMA`');
  });

  it('records the hardened reconciliation as the Intelligence replacement candidate', () => {
    expect(intelligenceMigration).toContain('create table if not exists public.intelligence_items');
    expect(intelligenceMigration).toContain('auth.uid()');

    expect(replacementMigration).toContain('create table if not exists public.intelligence_items');
    expect(replacementMigration).toContain('create table if not exists public.intelligence_calendar_suggestions');
    expect(replacementMigration).toContain('set search_path = pg_catalog, public');
    expect(replacementMigration).toContain('revoke all on function public.set_intelligence_updated_at() from public, anon, authenticated');
    expect(replacementMigration).toContain('grant select on table public.intelligence_items to authenticated');
    expect(replacementMigration).toContain('app_private.is_org_member(organization_id)');

    expect(dossier).toContain('Candidate classification: `SUPERSEDED`');
    expect(dossier).toContain('20260809135000_enterprise_core_runtime_schema_reconciliation.sql');
  });

  it('keeps the legacy seed outside the production schema prerequisite path', () => {
    expect(seedMigration).toContain('EuroComply Intelligence Desk');
    expect(dossier).toContain('Candidate classification: `ARCHIVE_LEGACY`');
    expect(dossier).toContain('productionWriteAuthorized = false');
    expect(dossier).toContain('independentApprovalPresent = false');
    expect(dossier).toContain('canonicalDecisionAccepted = false');
  });
});
